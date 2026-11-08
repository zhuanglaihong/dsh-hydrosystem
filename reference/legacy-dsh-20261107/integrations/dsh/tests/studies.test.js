/** Study selection preserves real filesystem evidence and per-session isolation. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { StudyBindings } from '../studies.js'
import { apply } from '../research.js'

test('selection survives restart, stays per conversation and rejects missing or escaping roots', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hydro-studies-'))
  const connection = { workRoot: join(root, 'studies/default'), runtimeRoot: join(root, 'runtime') }
  try {
    for (const id of ['default', 'second']) {
      await mkdir(join(root, 'studies', id), { recursive: true })
      await writeFile(join(root, 'studies', id, 'study.json'), JSON.stringify({ schema_version: '0.2', study_ref: 'study-' + id, goal: id }))
    }
    const bindings = await StudyBindings.open(connection)
    assert.equal((await bindings.list('a')).studies.length, 2)
    await Promise.all([bindings.select('a', 'second'), bindings.select('b', 'default')])
    const restored = await StudyBindings.open(connection)
    assert.equal(restored.root('a'), join(root, 'studies/second'))
    assert.equal(restored.root('b'), connection.workRoot)
    assert.equal(restored.root('new-conversation'), connection.workRoot)
    await assert.rejects(restored.select('a', '../runtime'), /INVALID_STUDY_SELECTION/)
    await assert.rejects(restored.select('a', 'missing'), /STUDY_NOT_FOUND/)
    assert.equal(JSON.parse(await readFile(join(root, 'studies/default/study.json'))).goal, 'default')
    await writeFile(join(root, 'runtime/dsh-study-bindings.json'), '{broken')
    await assert.rejects(StudyBindings.open(connection))
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()))
    await rm(root, { recursive: true, force: true })
  }
})

test('study command refuses switching a busy conversation before changing its binding', async () => {
  const commands = new Map(), busy = new Set(['running-session'])
  let selected = false
  apply({
    hydrosystemNode: { busy, bindings: { list: async () => ({ studies: [] }), select: async () => { selected = true } } },
    effect: callback => callback(),
    commands: { register: command => { commands.set(command.name, command); return () => {} } },
    tools: { register: () => () => {} },
  })
  const result = await commands.get('hydro_studies').handler({ agent: { id: 'running-session' }, rawInput: '{"action":"select","id":"second"}' })
  assert.equal(result.kind, 'error')
  assert.match(result.text, /STUDY_BUSY/)
  assert.equal(selected, false)
  const invalid = await commands.get('hydro_studies').handler({ agent: { id: 'idle' }, rawInput: '{"action":"create","goal":"  "}' })
  assert.equal(invalid.kind, 'error')
})

test('workbench excludes its own control query from the active scientific jobs', async () => {
  const commands = new Map()
  apply({
    hydrosystemNode: {
      bindings: { root: () => '/not-read-without-a-study', list: async () => ({ studies: [] }) },
      forSession: () => async request => ({ is_error: false, value: request.name === 'hydrosystem_study'
        ? { initialized: false, study: null } : { active: [{ pool: 'control', operation: 'hydrosystem_runtime' }] } }),
    },
    effect: callback => callback(), commands: { register: command => { commands.set(command.name, command); return () => {} } },
    tools: { register: () => () => {} },
  })
  const result = await commands.get('hydro_workspace').handler({ rawInput: '', agent: { id: 'conversation' } })
  assert.equal(result.kind, 'success')
  assert.deepEqual(JSON.parse(result.text).runtime.active, [])
})
