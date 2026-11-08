"""Install a tarball with the selected Next runtime and probe an isolated host."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', type=Path, required=True)
    parser.add_argument('--tarball', type=Path, required=True)
    parser.add_argument('--run-root', type=Path, required=True)
    parser.add_argument('--state-root', type=Path, required=True)
    parser.add_argument('--port', type=int, required=True)
    parser.add_argument('--science-spec', type=Path)
    args = parser.parse_args()
    app = args.app.resolve()
    entry = app.parent/'resources/app.asar/lib/desktop-cli.js'
    run = args.run_root.resolve()
    run.mkdir(parents=True, exist_ok=False)
    workspace = run/'workspace'
    workspace.mkdir()
    env = {**os.environ, 'ELECTRON_RUN_AS_NODE': '1', 'DSH_HOME': str(run/'home')}
    command = [str(app), str(entry)]
    version = subprocess.check_output(command+['--version'], env=env, encoding='utf-8', timeout=30).strip()
    if version != '0.2.2-rc.1':
        raise SystemExit('This alpha targets DSH 0.2.2-rc.1; selected runtime: '+version)
    installed = subprocess.run(command+['plugin', '--profile', 'web', 'add', 'file:'+args.tarball.resolve().as_posix()],
                               env=env, capture_output=True, encoding='utf-8', timeout=120)
    (run/'install.log').write_text(installed.stdout+installed.stderr, encoding='utf-8')
    if installed.returncode:
        raise SystemExit('Install failed; see '+str(run/'install.log'))
    report = run/'host-result.json'
    patch = run/'probe.patch.yml'
    patch.write_text(json.dumps([
        {'id': 'hydrosystem-native', 'config': {'stateRoot': str(args.state_root.resolve()),
         'researchRoots': [{'id': 'probe-research', 'title': 'Isolated synthetic research', 'root': str(workspace/'research')}]}},
        {'insert': [{'id': 'hydrology-release-probe', 'name': (ROOT/'tests/fixtures/next-probe.mjs').as_uri(),
                     'config': {'report': str(report), 'workspace': str(workspace),
                         **({'scienceSpec':str(args.science_spec.resolve())} if args.science_spec else {})}}]},
    ]), encoding='utf-8')
    with (run/'host.log').open('w', encoding='utf-8') as log:
        process = subprocess.Popen(command+['--profile', 'web', '--patch', str(patch), '--no-open', '--port', str(args.port)],
                                   env=env, stdout=log, stderr=log)
        try:
            for _ in range(1800 if args.science_spec else 120):
                if report.exists() or process.poll() is not None:
                    break
                time.sleep(1)
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=15)
    if not report.exists():
        raise SystemExit('No host report; see '+str(run/'host.log'))
    result = json.loads(report.read_text(encoding='utf-8'))
    print(json.dumps({'runtime': version, 'report': str(report), 'outcome': result['outcome']}, ensure_ascii=False))
    if result['outcome'] != 'passed':
        raise SystemExit(result)


if __name__ == '__main__':
    main()
