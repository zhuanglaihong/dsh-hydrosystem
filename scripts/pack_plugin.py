"""Pack the actual npm artifact and verify its published resources and payload."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT/'packages/hydrosystem-plugin'


def main():
    release = json.loads((PACKAGE/'core/release.json').read_text(encoding='utf-8'))
    for tool in release['platforms'].values():
        assert hashlib.sha256((PACKAGE/tool['program']).read_bytes()).hexdigest() == tool['sha256']
    output = ROOT/'artifacts'
    output.mkdir(exist_ok=True)
    npm = shutil.which('npm')
    assert npm, 'npm is required only by maintainers to create the release tarball'
    process = subprocess.run([npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', str(output)],
        cwd=PACKAGE, capture_output=True, text=True, timeout=120)
    if process.returncode:
        raise SystemExit(process.stdout+process.stderr)
    packed, = json.loads(process.stdout)
    tarball = output/packed['filename']
    with tarfile.open(tarball) as archive:
        names = set(archive.getnames())
        for name in ['lib/index.js', 'python/worker.py', 'core/release.json', 'cordis.patch.yml', 'icon.svg',
                     'locale/zh.json', 'locale/en.json', 'LICENSE', *[x['program'] for x in release['platforms'].values()]]:
            assert 'package/'+name in names, name
        assert not any(name.startswith('package/reference/') or '/node_modules/' in name
                       or '/.venv/' in name or '/__pycache__/' in name for name in names)
        payload = json.load(archive.extractfile('package/core/hydrosystem/.hydrosystem/payload-sha256.json'))
        for name, expected in payload.items():
            actual = hashlib.sha256(archive.extractfile('package/core/'+name).read()).hexdigest()
            assert actual == expected, name
    result = {'outcome': 'passed', 'tarball': str(tarball), 'payload_files': len(payload),
              'sha256': hashlib.sha256(tarball.read_bytes()).hexdigest(), 'bytes': tarball.stat().st_size}
    (output/'package-result.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
