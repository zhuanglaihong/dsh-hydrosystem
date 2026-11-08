/** Release publication must work in Desktop's actual Node runtime. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { stageRelease } from '../managed-node.js'

test('publish and reuse an immutable payload without replacing it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hydrosystem-release-'))
  try {
    const source = join(root, 'package')
    const releases = join(root, 'releases')
    await mkdir(join(source, 'payload'), { recursive: true })
    await writeFile(join(source, 'payload/fixture.txt'), 'locked payload\n')
    const release = await stageRelease(source, releases, '123456abcdef')
    assert.equal(await readFile(join(release, 'fixture.txt'), 'utf8'), 'locked payload\n')
    await writeFile(join(source, 'payload/fixture.txt'), 'different payload\n')
    assert.equal(await stageRelease(source, releases, '123456abcdef'), release)
    assert.equal(await readFile(join(release, 'fixture.txt'), 'utf8'), 'locked payload\n')
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()))
    await rm(root, { recursive: true, force: true })
  }
})
