/** Hydrosystem tools and scientific jobs over the shared Python interface. */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { invoke } from './bridge.js'
import { prepareNode } from './managed-node.js'
import { StudyBindings } from './studies.js'

export const name = 'hydrosystem-node'
export const inject = []

/** Register bound tools; worker operations use the built-in job registry. */
export async function apply(ctx) {
  let connection = JSON.parse(await readFile(new URL('./connection.json', import.meta.url), 'utf8'))
  const controllers = new Set()
  const pending = new Set()
  let closing = false
  ctx.effect(() => async () => {
    closing = true
    for (const controller of controllers) controller.abort()
    await Promise.allSettled([...pending])
  })
  if (connection.mode === 'managed') {
    const profile = ctx.get('profileContext')
    if (!profile) throw new Error('Managed hydrosystem installation requires a DSH profile.')
    const controller = new AbortController()
    controllers.add(controller)
    const preparing = prepareNode(fileURLToPath(new URL('.', import.meta.url)), profile.dir, connection,
      controller.signal, message => ctx.logger.info(message))
    pending.add(preparing)
    try { connection = await preparing } finally {
      pending.delete(preparing)
      controllers.delete(controller)
    }
  }
  const run = (request, callerSignal, selected = connection) => {
    if (closing) return Promise.reject(new Error('Hydrosystem plugin is stopping.'))
    const controller = new AbortController()
    const cancel = () => controller.abort()
    callerSignal?.addEventListener('abort', cancel, { once: true })
    if (callerSignal?.aborted) cancel()
    controllers.add(controller)
    const work = invoke(selected, request, controller.signal).finally(() => {
      controllers.delete(controller)
      callerSignal?.removeEventListener('abort', cancel)
      pending.delete(work)
    })
    pending.add(work)
    return work
  }
  const discovered = await run({ action: 'discover' })
  if (discovered.is_error) throw new Error(JSON.stringify(discovered.value))
  const bindings = await StudyBindings.open(connection)
  ctx.provide('hydrosystemNode', { connection, tools: discovered.value.tools, bindings, busy: new Set(),
    run, forSession(sessionId) {
      const selected = { ...connection, workRoot: bindings.root(sessionId) }
      return (request, signal) => run(request, signal, selected)
    },
  })
}
