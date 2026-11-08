"""The process bridge preserves scientific results and structured failures."""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def call(tmp_path, request, *, extra=()):
    process = subprocess.run(
        [sys.executable, '-m', 'hydrosystem.bridge', '--project-root', str(ROOT),
         '--work-root', str(tmp_path/'study'), '--runtime-root', str(tmp_path/'runtime'), *extra],
        input=json.dumps(request), text=True, capture_output=True, timeout=60, cwd=ROOT,
    )
    assert process.returncode == 0, process.stderr
    return json.loads(process.stdout)


def test_bridge_discovers_only_authorized_tools_without_starting_study(tmp_path):
    result = call(tmp_path, {'action': 'discover'})
    assert not result['is_error']
    assert len(result['value']['tools']) == 13
    assert not (tmp_path/'study/study.json').exists()


def test_bridge_calls_real_metrics_and_returns_structured_validation_error(tmp_path):
    result = call(tmp_path, {'action': 'call', 'name': 'hydroutils_compute_metrics', 'arguments': {
        'profile': 'hydroutils.streamflow-metrics/v1',
        'observed': [1, 2, 3, 4], 'simulated': [1, 2, 3, 4],
    }})
    assert not result['is_error'], result
    assert result['value']['metrics'] == {'NSE': 1.0, 'KGE': 1.0, 'RMSE': 0.0}
    invalid = call(tmp_path, {'action': 'call', 'name': 'capabilities', 'arguments': {'unknown': True}})
    assert invalid['is_error']
    assert invalid['value']['code'] == 'INVALID_INPUT'


def test_cancelled_bridge_reports_reconciled_study_status(tmp_path):
    cancel = tmp_path/'cancel'
    cancel.touch()
    result = call(tmp_path, {'action': 'call', 'name': 'capabilities', 'arguments': {}},
                  extra=['--cancel-file', str(cancel)])
    assert result['is_error']
    assert result['value']['code'] == 'EXECUTION_CANCELLED'
    assert 'study_status' in result['value']['details']
    assert 'settlement_error' not in result['value']['details']
