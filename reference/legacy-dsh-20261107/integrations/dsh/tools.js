/** Scientific tools and native DSH jobs, independent of the workbench UI. */
import { randomUUID } from 'node:crypto'
export const name = 'hydrosystem-tools'
export const inject = ['hydrosystemNode', 'tools', 'jobs']
export function apply(ctx) {
  const node = ctx.hydrosystemNode
  for (const tool of node.tools) {
    const worker = tool.execution.pool === 'worker'
    ctx.effect(() => ctx.tools.register({
      name: tool.name,
      description: tool.description + (worker
        ? ' Runs as a DSH background job. Use job_output to obtain the scientific result; job_kill cancels the owned execution. A job handle is not the completed scientific result.' : ''),
      parameters: tool.input_schema,
      output: { schema: {}, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
      async execute(args, exec) {
        if (exec.signal.aborted) throw new Error('Hydrosystem call cancelled before submission.')
        const run = node.forSession(exec.agent?.id)
        const argumentsWithId = { ...args, execution_id: args.execution_id ?? randomUUID() }
        const request = { action: 'call', name: tool.name, arguments: argumentsWithId }
        if (!worker) {
          const result = await run(request, exec.signal)
          if (result.is_error) throw new Error(JSON.stringify(result.value))
          return result.value
        }
        if (!exec.agent) throw new Error('Scientific background work requires an owning Agent session.')
        if (node.busy.has(exec.agent.id)) throw new Error('RESOURCE_BUSY: this conversation already owns a scientific job.')
        node.busy.add(exec.agent.id)
        try {
          const capacity = await run({ action: 'call', name: 'hydrosystem_runtime', arguments: {} }, exec.signal)
          if (capacity.is_error) throw new Error(JSON.stringify(capacity.value))
          const active = capacity.value.active.filter(item => item.pool === 'worker')
          if (active.length >= capacity.value.limits.worker_slots) {
            throw new Error(JSON.stringify({ code: 'RESOURCE_BUSY', retryable: true,
              message: 'Worker capacity is occupied; no work was queued.',
              details: { capacity: capacity.value.limits.worker_slots, active, automatic_retry: false } }))
          }
          if (exec.signal.aborted) throw new Error('Hydrosystem call cancelled before job registration.')
          const jobId = ctx.jobs.start({
            kind: 'hydrosystem', label: tool.name, owner: exec.agent.id,
            toolCall: { callId: exec.callId, rootCallId: exec.rootCallId },
            run(job) {
              const controller = new AbortController()
              job.updateProgress(tool.name)
              const done = run(request, controller.signal).then(result => {
                if (result.is_error) return {
                  status: result.value.code === 'EXECUTION_CANCELLED' ? 'killed' : 'failed',
                  detail: result.value.code, result: JSON.stringify(result.value),
                }
                return { status: 'completed', result: JSON.stringify(result.value) }
              }, error => ({ status: 'failed', detail: error.message })).finally(() => node.busy.delete(exec.agent.id))
              return { cancel: () => controller.abort(), done }
            },
          })
          return { kind: 'background', job_id: jobId, execution_id: argumentsWithId.execution_id,
            operation: tool.name, next_action: 'Read the owned job with job_output; do not resubmit the scientific task.' }
        } catch (error) { node.busy.delete(exec.agent.id); throw error }
      },
    }))
  }
}
