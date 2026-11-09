"""Install the workspace in an isolated Next profile and retain its server for UI acceptance."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import time


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app',type=Path,required=True)
    parser.add_argument('--tarball',type=Path,required=True)
    parser.add_argument('--run-root',type=Path,required=True)
    parser.add_argument('--state-root',type=Path,required=True)
    parser.add_argument('--port',type=int,required=True)
    args=parser.parse_args()
    run=args.run_root.resolve();run.mkdir(parents=True,exist_ok=False)
    env={**os.environ,'ELECTRON_RUN_AS_NODE':'1','DSH_HOME':str(run/'home')}
    command=[str(args.app.resolve()),str(args.app.resolve().parent/'resources/app.asar/lib/desktop-cli.js')]
    result=subprocess.run(command+['plugin','--profile','web','add','file:'+args.tarball.resolve().as_posix()],env=env,capture_output=True,encoding='utf-8',timeout=240)
    (run/'install.log').write_text(result.stdout+result.stderr,encoding='utf-8')
    if result.returncode:raise SystemExit('Workspace install failed; inspect install.log')
    patch=run/'workspace.patch.json';patch.write_text(json.dumps([{'id':'hydro-workspace','config':{'stateRoot':str(args.state_root.resolve())}}]),encoding='utf-8')
    with (run/'host.log').open('w',encoding='utf-8') as log:
        process=subprocess.Popen(command+['--profile','web','--patch',str(patch),'--no-open','--port',str(args.port)],env=env,stdout=log,stderr=log)
        try:
            for _ in range(180):
                content=(run/'host.log').read_text(encoding='utf-8',errors='replace')
                urls=re.findall(r'http://127\.0\.0\.1:'+str(args.port)+r'/[^\s\x1b]*',content)
                if urls:
                    (run/'access.json').write_text(json.dumps({'url':urls[-1],'pid':process.pid}),encoding='utf-8')
                    print('WORKSPACE_HOST_READY',flush=True)
                    break
                if process.poll() is not None:raise SystemExit('Workspace host exited; inspect host.log')
                time.sleep(1)
            else:raise SystemExit('No host URL; inspect host.log')
            while process.poll() is None and not (run/'stop').exists():time.sleep(1)
        finally:
            if process.poll() is None:process.terminate();process.wait(timeout=20)


if __name__=='__main__':main()
