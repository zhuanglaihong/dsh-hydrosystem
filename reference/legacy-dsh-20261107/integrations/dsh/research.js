/** Research navigation and evidence queries, separate from scientific tool registration. */
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { readWorkspace } from './workspace.js'
export const name = 'hydrosystem-research'
export const inject = ['hydrosystemNode', 'commands', 'tools']

export function apply(ctx) {
  const node = ctx.hydrosystemNode
  async function workspace(sessionId) {
    const run = node.forSession(sessionId)
    const [status, runtime] = await Promise.all([
      run({ action: 'call', name: 'hydrosystem_study', arguments: { operation: 'status' } }),
      run({ action: 'call', name: 'hydrosystem_runtime', arguments: {} }),
    ])
    if (status.is_error) throw new Error(JSON.stringify(status.value))
    if (runtime.is_error) throw new Error(JSON.stringify(runtime.value))
    return { ...await readWorkspace(node.bindings.root(sessionId), status.value),
      selection: await node.bindings.list(sessionId),
      runtime: { ...runtime.value, active: runtime.value.active.filter(execution => execution.pool === 'worker') } }
  }
  for (const [name, handler] of [
    ['hydro_workspace', async invocation => {
      if (invocation.rawInput.trim()) throw new Error('This command accepts no arguments.')
      return workspace(invocation.agent.id)
    }],
    ['hydro_studies', async invocation => {
      const request = invocation.rawInput.trim() ? JSON.parse(invocation.rawInput) : { action: 'list' }
      const sessionId = invocation.agent.id
      if (request.action === 'list') return node.bindings.list(sessionId)
      if (node.busy.has(sessionId)) throw new Error('STUDY_BUSY: wait for this conversation’s scientific job to finish.')
      if (request.action === 'select' && Object.keys(request).every(key => ['action', 'id'].includes(key))) return node.bindings.select(sessionId, request.id)
      if (request.action === 'create' && Object.keys(request).every(key => ['action', 'goal'].includes(key)) &&
          typeof request.goal === 'string' && request.goal.trim() && request.goal.length <= 2000) {
        const id = 'research-' + randomUUID()
        const connection = { ...node.connection, workRoot: join(node.bindings.base, id) }
        const result = await node.run({ action: 'call', name: 'hydrosystem_study',
          arguments: { operation: 'initialize', goal: request.goal.trim(), new_research: true } }, invocation.signal, connection)
        if (result.is_error) throw new Error(JSON.stringify(result.value))
        return node.bindings.select(sessionId, id)
      }
      throw new Error('INVALID_STUDY_ACTION')
    }],
  ]) ctx.effect(() => ctx.commands.register({
    definitionId: '@iheadwater/dsh-hydrosystem/' + name, name,
    description: name === 'hydro_workspace' ? 'Read this conversation’s hydrology workbench' : 'List, select or explicitly create a hydrology Study',
    ...(name === 'hydro_studies' ? { input: { hint: 'JSON: action=list|select|create' } } : {}),
    async handler(invocation) {
      try { return { kind: 'success', text: JSON.stringify(await handler(invocation)) } }
      catch (error) { return { kind: 'error', text: error.message } }
    },
  }))
  ctx.effect(() => ctx.tools.register({ name: 'hydrosystem_workbench',
    description: 'Read this conversation’s selected Study, recorded activities, scientific results and verified figures. Report exact counts. Does not start research.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: { schema: {}, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(_args, exec) {
      const view = await workspace(exec.agent?.id)
      return { ...view, images: view.images.map(({ src, ...metadata }) => metadata) }
    },
  }))
}
