"""One bounded JSON request over the fixed public hydrosystem execution core.

Interpreter, deployment files and research roots are launcher arguments. They
cannot be replaced by a model-owned request. No MCP or CLI service is started.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import traceback

from hydrosystem.errors import HydrosystemError
from hydrosystem.runtime.stdio import protocol_stdout


def dispatch(request, binding):
    """Validate transport input, then delegate scientific validation and execution."""
    from hydrosystem.tool_catalog import ToolCatalog
    from hydrosystem.operations import execute

    if not isinstance(request, dict):
        raise ValueError('Request must be a JSON object.')
    action = request.get('action')
    if action == 'read_artifact' and set(request) == {'action','reference'}:
        from hydrosystem.artifacts import ArtifactStore
        from hydrosystem.runtime.study import Study
        ref=request['reference']
        if not isinstance(ref,dict) or ref.get('format')!='json' or not all(isinstance(ref.get(key),str) for key in ('schema','kind')):
            raise ValueError('Use a complete JSON Artifact Reference from the current Study.')
        Study(binding.work_root).open(required=True)
        content=ArtifactStore(binding.work_root,max_bytes=1048576).read_json(ref,schema=ref['schema'],kind=ref['kind'])
        return {'reference':ref,'content':content}
    if action == 'supported' and set(request) == {'action'}:
        from hydrosystem.tool_catalog import supported_definitions
        return {'tools':supported_definitions()}
    if action == 'prepare' and set(request) == {'action','spec'} and binding.configuration_root is not None:
        if binding.cancel_file is not None and binding.cancel_file.exists():
            raise HydrosystemError(code='EXECUTION_CANCELLED',message='Project preparation was cancelled before configuration.',retryable=False)
        from hydrosystem.deployment.research_project import prepare
        return prepare(request['spec'],binding.configuration_root)
    if action == 'inspect' and set(request) == {'action'}:
        from hydrosystem.environment.manager import status
        return {'environment': status(binding.project_root), 'scientific_execution': 'not_run'}
    catalog = ToolCatalog(hydromodel_config=binding.hydromodel_config,
                          data_config=binding.data_config, torchhydro_config=binding.torchhydro_config)
    if action == 'discover' and set(request) == {'action'}:
        return {'tools': catalog.definitions()}
    if action != 'call' or set(request) != {'action', 'name', 'arguments'}:
        raise ValueError('Use discover, inspect, or call with name and arguments.')
    name, arguments = request['name'], request['arguments']
    if not isinstance(name, str) or not isinstance(arguments, dict):
        raise ValueError('Tool name must be a string and arguments an object.')
    if name not in catalog.providers:
        from hydrosystem.tool_catalog import supported_definitions
        if name in {entry['name'] for entry in supported_definitions()}:
            raise HydrosystemError(code='DEPLOYMENT_NOT_CONFIGURED',
                message='This tool is not enabled for the selected research. Inspect capabilities and select or prepare an authorized project first.',
                retryable=False,details={'tool':name,'automatic_retry':False})
    catalog.validate(name, arguments)
    arguments = dict(arguments)
    execution_id = arguments.pop('execution_id', None)
    value=execute(name, arguments, root=binding.work_root,
                   runtime_root=binding.runtime_root, config_path=binding.hydromodel_config,
                   data_config_path=binding.data_config, torchhydro_config_path=binding.torchhydro_config,
                   tool_names=list(catalog.providers), execution_id=execution_id, cancel_path=binding.cancel_file)
    if name.startswith('hydromodel_') and isinstance(value,dict) and isinstance(value.get('task_ref'),str):
        value={**value,'status_query':{'tool':'hydromodel_status','arguments':{'task_ref':value['task_ref']}}}
        ref=value.get('resolved_ref')
        if isinstance(ref,dict) and ref.get('schema')=='hydromodel.adapter.resolved/v2':
            from hydrosystem.artifacts import ArtifactStore
            resolved=ArtifactStore(binding.work_root).read_json(ref,schema=ref['schema'],kind='resolved_task')
            value['effective']={key:resolved[key] for key in ('algorithm','search_space','objective','warmup_steps') if key in resolved}
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['project-root', 'work-root', 'runtime-root']:
        parser.add_argument('--'+name, type=Path, required=True)
    for name in ['hydromodel-config', 'data-config', 'torchhydro-config', 'cancel-file', 'configuration-root']:
        parser.add_argument('--'+name, type=Path)
    binding = parser.parse_args()
    with protocol_stdout() as wire:
        try:
            from hydrosystem.environment.manager import require_verified_custom
            require_verified_custom(binding.project_root.resolve())
            os.chdir(binding.project_root)
            raw = sys.stdin.buffer.read(1048577)
            if len(raw) > 1048576:
                raise ValueError('Worker request exceeds 1 MiB.')
            request = json.loads(raw, parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Non-finite JSON: '+value)))
            response = {'ok': True, 'value': dispatch(request, binding)}
        except HydrosystemError as error:
            details = dict(error.details or {})
            if error.code == 'EXECUTION_CANCELLED':
                from hydrosystem.operations import study_service
                try:
                    details['study_status'] = study_service(binding.work_root,
                        hydromodel_config=binding.hydromodel_config, data_config=binding.data_config,
                        torchhydro_config=binding.torchhydro_config).call({'operation': 'status'})
                except Exception as settlement_error:
                    details['settlement_error'] = {'code': getattr(settlement_error, 'code', 'SETTLEMENT_FAILED'),
                                                   'message': str(settlement_error)}
            response = {'ok': False, 'error': {'code': error.code, 'message': error.message,
                                              'retryable': error.retryable, 'details': details}}
        except (ValueError, TypeError) as error:
            response = {'ok': False, 'error': {'code': 'INVALID_INPUT', 'message': str(error), 'retryable': False}}
        except Exception as error:
            traceback.print_exc(file=sys.stderr)
            response = {'ok': False, 'error': {'code': 'EXECUTION_FAILED', 'message': str(error), 'retryable': False}}
        wire.write(json.dumps(response, ensure_ascii=False, allow_nan=False)+'\n')


if __name__ == '__main__':
    main()
