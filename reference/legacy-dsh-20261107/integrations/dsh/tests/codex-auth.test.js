/** Public command behavior at DSH's external authorization service. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { registerCodexAuth } from '../codex-auth.js'

function host(begin, offered = true) {
  let command, configured = false
  const cleanup = []
  registerCodexAuth({
    effect: callback => { cleanup.push(callback()) },
    commands: { register: value => { command = value; return () => {} } },
    credentials: { describeRecord: async () => ({ configured }) },
    authorization: {
      describe: () => offered ? { methods: [{ id: 'oauth' }] } : undefined,
      begin: request => begin(request, () => { configured = true }),
    },
  })
  return {
    async call(rawInput = '') {
      const result = await command.handler({ rawInput })
      return result.kind === 'success' ? JSON.parse(result.text) : result
    },
    dispose: async () => { for (const stop of cleanup.reverse()) await stop() },
  }
}

test('device authorization uses the DSH flow and reports only its public notice', async () => {
  let finish, calls = 0
  const app = host(async (request, commit) => {
    calls++
    assert.equal(request.key, 'llm-pi-ai/openai-codex')
    assert.equal(request.method, 'oauth')
    assert.equal(await request.interaction.prompt({ kind: 'select', options: [
      { id: 'browser' }, { id: 'device_code' },
    ] }), 'device_code')
    request.interaction.notify({ url: 'https://auth.openai.com/codex/device', code: 'ABCD-1234', message: 'verify' })
    await new Promise(resolve => { finish = resolve })
    commit()
    return { status: 'authorized' }
  })
  try {
    assert.deepEqual(await app.call(), { phase: 'idle', notice: null, configured: false })
    await app.call('start')
    const waiting = await app.call('status')
    assert.equal(waiting.phase, 'waiting')
    assert.deepEqual(waiting.notice, { url: 'https://auth.openai.com/codex/device', code: 'ABCD-1234' })
    await app.call('start')
    assert.equal(calls, 1)
    finish()
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(await app.call('status'), { phase: 'authorized', notice: null, configured: true })
  } finally { finish?.(); await app.dispose() }
})

test('cancel and plugin disposal abort their owned attempts', async () => {
  let aborted = 0
  const app = host(async request => {
    await new Promise(resolve => request.signal.addEventListener('abort', () => { aborted++; resolve() }, { once: true }))
    return { status: 'cancelled' }
  })
  await app.call('start')
  assert.equal((await app.call('cancel')).phase, 'cancelled')
  await app.call('start')
  await app.dispose()
  assert.equal(aborted, 2)
  assert.equal((await app.call('start')).kind, 'error')
})

test('authorization failures clear notices, keep secrets private and permit an explicit retry', async () => {
  let calls = 0
  const app = host(async request => {
    calls++
    request.interaction.notify({ url: 'https://unexpected.example', code: 'DO-NOT-SHOW' })
    throw new Error('provider rejected PRIVATE-TOKEN')
  })
  try {
    await app.call('start')
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(await app.call(), { phase: 'failed', notice: null, configured: false })
    await app.call('start')
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(calls, 2)
    assert.equal(JSON.stringify(await app.call()).includes('PRIVATE-TOKEN'), false)
  } finally { await app.dispose() }
})

test('unsupported grants and unknown commands fail before authorization', async () => {
  const app = host(() => assert.fail('must not authorize'), false)
  try {
    assert.equal((await app.call('start')).kind, 'error')
    assert.equal((await app.call('paste-secret')).kind, 'error')
  } finally { await app.dispose() }
})
