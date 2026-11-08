"""Build a pinned dependency payload; never resolve the user's scientific environment."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT/'packages/hydrosystem-plugin'
MAC_UV_URL = 'https://github.com/astral-sh/uv/releases/download/0.9.2/uv-aarch64-apple-darwin.tar.gz'
MAC_UV_SHA256 = '90b1e69da3d04772565dd556ae8e72c86bdb7da85a8dfc2c6b50c400b0e6aa97'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='Explicit hydrosystem release source')
    parser.add_argument('--uv-windows', type=Path, required=True, help='Trusted uv 0.9.2 Windows x64 executable')
    args = parser.parse_args()
    source = args.source.resolve()
    uv = args.uv_windows.resolve()
    assert subprocess.check_output([str(uv), '--version'], text=True).split()[1] == '0.9.2'
    output = PACKAGE/'core'
    if output.exists():
        raise SystemExit('core already exists; preserve it and use a fresh release checkout for another core payload.')
    # Reuse the public release builder, not a second dependency solver or lock.
    scripts = source/'scripts'
    sys.path.insert(0, str(scripts))
    spec = importlib.util.spec_from_file_location('hydrosystem_release_payload', scripts/'installer_payload.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    work = ROOT/'.omx/build'
    work.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='core-', dir=work) as temporary:
        stage = Path(temporary)
        module.copy_application(stage, uv=str(uv))
        # uv's export directory ignore file would hide locked wheels from npm pack.
        (stage/'hydrosystem/.hydrosystem/tools/install/.gitignore').unlink(missing_ok=True)
        release = module.write_manifest(stage)
        declaration = {'schema_version': 1, 'release_id': release,
            'hydrosystem_version': '0.2.0', 'python_version': '3.12.12', 'uv_version': '0.9.2',
            'source_lock_sha256': digest(source/'uv.lock')}
        shutil.copytree(stage, output)
    programs = PACKAGE/'tools'
    win = programs/'win32-x64/uv.exe'
    win.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(uv, win)
    mac_archive = work/'uv-aarch64-apple-darwin-0.9.2.tar.gz'
    if not mac_archive.exists():
        with urllib.request.urlopen(MAC_UV_URL, timeout=120) as response, mac_archive.open('wb') as target:
            shutil.copyfileobj(response, target)
    if digest(mac_archive) != MAC_UV_SHA256:
        raise SystemExit('macOS uv archive checksum mismatch; no release manifest was published.')
    mac = programs/'darwin-arm64/uv'
    mac.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(mac_archive) as archive:
        member = archive.getmember('uv-aarch64-apple-darwin/uv')
        with archive.extractfile(member) as data, mac.open('wb') as target:
            shutil.copyfileobj(data, target)
    mac.chmod(0o755)
    shutil.copytree(source/'packaging/uv-licenses', programs/'licenses')
    declaration['platforms'] = {
        'win32-x64': {'program': 'tools/win32-x64/uv.exe', 'sha256': digest(win)},
        'darwin-arm64': {'program': 'tools/darwin-arm64/uv', 'sha256': digest(mac),
                         'archive_url': MAC_UV_URL, 'archive_sha256': MAC_UV_SHA256},
    }
    (output/'release.json').write_text(json.dumps(declaration, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'outcome': 'prepared', **declaration}))


if __name__ == '__main__':
    main()
