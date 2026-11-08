"""Single-request JSON process bridge for local application adapters.

Deployment paths are process arguments, never model-owned request fields.
Scientific requests use the same validated catalog and runtime as MCP/CLI.
"""
import argparse
import json
import os
from pathlib import Path
import sys

from hydrosystem.runtime.stdio import protocol_stdout


def dispatch(request, *, root, runtime_root=None, hydromodel_config=None,
             data_config=None, torchhydro_config=None, tool_names=None, cancel_path=None):
    """Discover tools or execute one authorized public operation."""
    from hydrosystem.contracts import closed, fail
    from hydrosystem.operations import execute
    from hydrosystem.tool_catalog import ToolCatalog
    catalog = ToolCatalog(hydromodel_config=hydromodel_config, data_config=data_config,
                          torchhydro_config=torchhydro_config, tool_names=tool_names)
    request = closed(request, field='bridge', allowed={'action', 'name', 'arguments'}, required={'action'})
    if request['action'] == 'discover':
        if set(request) != {'action'}:
            fail('INVALID_INPUT', 'Discovery accepts only action.')
        return {'tools': catalog.definitions()}
    if request['action'] != 'call' or set(request) != {'action', 'name', 'arguments'}:
        fail('INVALID_INPUT', 'Call requires action, name and arguments.')
    name = request['name']
    if not isinstance(name, str):
        fail('INVALID_INPUT', 'Tool name must be a string.')
    catalog.validate(name, request['arguments'])
    arguments = dict(request['arguments'])
    execution_id = arguments.pop('execution_id', None)
    return execute(name, arguments, root=Path(root), runtime_root=runtime_root,
                   config_path=hydromodel_config, data_config_path=data_config,
                   torchhydro_config_path=torchhydro_config,
                   tool_names=list(catalog.providers), execution_id=execution_id, cancel_path=cancel_path)


def main():
    """Read one bounded JSON request and emit one isolated JSON response."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-root', type=Path, required=True)
    parser.add_argument('--work-root', type=Path, required=True)
    parser.add_argument('--runtime-root', type=Path)
    parser.add_argument('--hydromodel-config', type=Path)
    parser.add_argument('--data-config', type=Path)
    parser.add_argument('--torchhydro-config', type=Path)
    parser.add_argument('--tool', action='append', dest='tool_names')
    parser.add_argument('--cancel-file', type=Path)
    args = parser.parse_args()
    with protocol_stdout() as wire:
        from hydrosystem.errors import HydrosystemError
        try:
            from hydrosystem.environment.manager import require_verified_custom
            try:
                require_verified_custom(args.project_root.resolve())
            except ValueError as exc:
                raise HydrosystemError(code='ENVIRONMENT_NOT_READY', message=str(exc), retryable=False) from exc
            os.chdir(args.project_root)
            raw = sys.stdin.buffer.read(1048577)
            if len(raw) > 1048576:
                raise ValueError('Bridge request exceeds 1 MiB.')
            request = json.loads(raw)
            value = dispatch(request, root=args.work_root, runtime_root=args.runtime_root,
                             hydromodel_config=args.hydromodel_config, data_config=args.data_config,
                             torchhydro_config=args.torchhydro_config, tool_names=args.tool_names,
                             cancel_path=args.cancel_file)
            response = {'is_error': False, 'value': value}
        except HydrosystemError as exc:
            if exc.code == 'EXECUTION_CANCELLED':
                from hydrosystem.operations import study_service
                try:
                    settled = study_service(args.work_root, hydromodel_config=args.hydromodel_config,
                        data_config=args.data_config, torchhydro_config=args.torchhydro_config).call({'operation': 'status'})
                    exc.details = {**exc.details, 'study_status': settled}
                except HydrosystemError as settlement_error:
                    exc.details = {**exc.details, 'settlement_error': {'code': settlement_error.code, 'message': settlement_error.message}}
            response = {'is_error': True, 'value': {'code': exc.code, 'message': exc.message,
                        'retryable': exc.retryable, 'details': exc.details}}
        except (ValueError, TypeError) as exc:
            response = {'is_error': True, 'value': {'code': 'INVALID_INPUT', 'message': str(exc), 'retryable': False}}
        wire.write(json.dumps(response, ensure_ascii=False, allow_nan=False) + '\n')


if __name__ == '__main__':
    main()
