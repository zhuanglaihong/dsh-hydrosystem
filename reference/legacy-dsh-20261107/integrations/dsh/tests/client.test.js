/** Browser behavior over real React; DSH Remote calls are the external test boundary. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

const dshRoot = process.env.DSH_SOURCE_ROOT
test('workbench navigation, Study selection and environment facts render through the public slots', { skip: !dshRoot }, async () => {
  const require = createRequire(resolve(dshRoot, 'packages/client/ui-renderer/package.json'))
  const rootRequire = createRequire(resolve(dshRoot, 'package.json'))
  const { JSDOM } = rootRequire('jsdom')
  const dom = new JSDOM('<div id="app"></div>', { url: 'https://dsh.test/' })
  const saved = new Map(['window', 'document', 'navigator', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const key of ['window', 'document', 'navigator', 'localStorage']) Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom.window : dom.window[key] })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const React = require('react'), { createRoot } = require('react-dom/client')
  const { act } = React
  const slots = [], opened = [], calls = [], disposers = [], created = [], sessionsOpened = []
  const workspaceSnapshot = { items: [{ workspaceId: 'workspace-one', title: 'Existing workspace', path: '/workspace' }] }
  let selected = 'default'
  const studies = [{ id: 'default', study_ref: 'study-one', goal: '已有率定', created_at: null },
    { id: 'second', study_ref: 'study-two', goal: '另一研究', created_at: null }]
  const execute = async (_id, line) => {
    calls.push(line)
    let value
    if (line.startsWith('/hydro_studies')) {
      const input = line.slice('/hydro_studies'.length).trim()
      if (input) selected = JSON.parse(input).id
      value = { selected, studies, warnings: [] }
    } else if (line === '/hydro_environment') value = { python_version: '3.12.12', interpreter: '/node/.venv/python', virtual_environment: '/node/.venv',
      uv_executable: '/node/uv', lock_digest: 'verified-lock', node: { platform: 'win32', arch: 'x64', cpu_threads: 8, memory_bytes: 17179869184, runtime_root: '/runtime' },
      packages: { hydromodel: { version: '0.4.0', expected: '0.4.0', module_path: '/node/hydromodel', source: { kind: 'registry' } } } }
    else throw new Error('Unexpected Remote call: ' + line)
    return { ok: true, value: { result: { kind: 'success', text: JSON.stringify(value) } } }
  }
  let plugin
  runInNewContext(await readFile(new URL('../client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: definition => { plugin = definition.factory(require) } } },
    localStorage: dom.window.localStorage, setTimeout, clearTimeout,
  })
  plugin.apply({
    effect: fn => { disposers.push(fn()) },
    locale: { register: () => () => {}, bind: () => key => key },
    slots: { inject: (_name, fn) => fn(), register: (definition, component) => { slots.push({ definition, component }); return () => {} } },
    sessions: { create: async options => { created.push(options); return created.length === 1 ? 'query-session' : 'new-conversation' }, using: async (_id, _options, action) => action() },
    workspaces: { list: { snapshot: workspaceSnapshot, listeners: new Set(), getSnapshot() { return this.snapshot },
      subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener) } } },
    remote: { commands: { execute } }, uiWorkspace: { openSession: id => sessionsOpened.push(id) },
    sidebarRightTabs: { register: () => () => {} }, sidebarRight: { openTabIn: (_id, kind) => opened.push(kind) },
  })
  const root = createRoot(dom.window.document.getElementById('app'))
  async function render(slot) { await act(async () => root.render(React.createElement(slot.component, slot.definition.inject('conversation')))) }
  try {
    await render(slots.find(slot => slot.definition.name === 'conversation.session.header.actions'))
    assert.deepEqual([...dom.window.document.querySelectorAll('button')].map(button => button.textContent), ['files', 'artifacts', 'experiments', 'terminal'])
    for (const button of dom.window.document.querySelectorAll('button')) await act(async () => button.click())
    assert.deepEqual(opened, ['files', 'hydro-results', 'hydro-tasks', 'terminal'])
    await render(slots.find(slot => slot.definition.key === 'hydrology-studies'))
    assert.match(dom.window.document.body.textContent, /已有率定/)
    const select = [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === 'selectStudy')
    await act(async () => select.click())
    assert.equal(selected, 'second')
    assert.equal(calls.some(line => line.includes('"action":"select"')), true)
    const start = [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === 'openChat')
    await act(async () => start.click())
    assert.equal(created.at(-1).workspaceId, 'workspace-one')
    assert.equal(created.at(-1).agentPreset, 'hydrology')
    assert.deepEqual(sessionsOpened, ['new-conversation'])
    await render(slots.find(slot => slot.definition.key === 'hydrology-environments'))
    assert.match(dom.window.document.body.textContent, /3\.12\.12/)
    assert.match(dom.window.document.body.textContent, /0\.4\.0/)
    assert.match(dom.window.document.body.textContent, /metadataOnly/)
  } finally {
    await act(async () => root.unmount())
    for (const dispose of disposers.reverse()) if (typeof dispose === 'function') dispose()
    dom.window.close()
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
