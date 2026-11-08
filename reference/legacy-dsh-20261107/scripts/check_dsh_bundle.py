"""Check that npm packaging preserves every hashed installer payload file."""
import argparse
import hashlib
import json
import tarfile


def check(path):
    """Reject missing or altered payload files before a desktop installation."""
    actual = {}
    manifest = None
    with tarfile.open(path, 'r|gz') as archive:
        for member in archive:
            if not member.isfile() or not member.name.startswith('package/payload/'):
                continue
            content = archive.extractfile(member)
            name = member.name.removeprefix('package/payload/')
            if name == 'hydrosystem/.hydrosystem/payload-sha256.json':
                manifest = json.load(content)
            else:
                digest = hashlib.sha256()
                for chunk in iter(lambda: content.read(1048576), b''):
                    digest.update(chunk)
                actual[name] = digest.hexdigest()
    if manifest is None:
        raise ValueError('Missing installer payload manifest.')
    for name, expected in manifest.items():
        if actual.get(name) != expected:
            raise ValueError('Packaged payload checksum differs: '+name)
    return {'outcome': 'passed', 'payload_files': len(manifest)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('tarball')
    print(json.dumps(check(parser.parse_args().tarball)))
