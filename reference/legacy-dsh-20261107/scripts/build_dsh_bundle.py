"""Build a DSH bundle with the same locked payload as native installers."""
import argparse
import json
from pathlib import Path
import shutil

from installer_payload import ROOT, copy_application, write_manifest


def build(output, *, uv, uv_licenses):
    """Stage a new bundle; scientific dependencies are installed on activation."""
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=False)
    source = ROOT/'integrations/dsh'
    for name in ('package.json', 'index.js', 'bridge.js', 'managed-node.js', 'workspace.js', 'studies.js', 'tools.js', 'research.js', 'environment.js', 'client.js', 'icon.svg', 'cordis.patch.yml', 'README.md'):
        shutil.copy2(source/name, output/name)
    shutil.copytree(source/'locale', output/'locale')
    payload = output/'payload'
    payload.mkdir()
    copy_application(payload, uv=uv)
    # uv marks its export directory ignored. npm would consequently omit the
    # locked wheels and baseline from the distributable package.
    for ignored in payload.rglob('.gitignore'):
        ignored.unlink()
    tools = payload/'hydrosystem/.hydrosystem/tools'
    shutil.copy2(uv, tools/('uv.exe' if __import__('os').name == 'nt' else 'uv'))
    shutil.copytree(uv_licenses, tools/'uv-licenses')
    release_id = write_manifest(payload)
    (output/'connection.json').write_text(json.dumps({'mode': 'managed', 'releaseId': release_id})+'\n', encoding='utf-8')
    return {'bundle': str(output), 'release_id': release_id}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--uv', type=Path, required=True)
    parser.add_argument('--uv-licenses', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(build(args.output, uv=args.uv, uv_licenses=args.uv_licenses)))
