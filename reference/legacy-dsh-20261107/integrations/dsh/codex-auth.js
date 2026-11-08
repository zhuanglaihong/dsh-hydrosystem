/** Human-only Codex device authorization through DSH's existing credential owner. */
export function registerCodexAuth(ctx) {
  const key = 'llm-pi-ai/openai-codex'
  let phase = 'idle', notice = null, controller, pending, closing = false
  const snapshot = async () => ({ phase, notice,
    configured: (await ctx.credentials.describeRecord(key)).configured })
  async function operate(operation) {
    if (!['status', 'start', 'cancel'].includes(operation)) throw new Error('Use status, start or cancel.')
    if (closing) throw new Error('Codex connection is stopping.')
    if (operation === 'cancel' && pending) {
      controller.abort()
      await pending
    }
    if (operation === 'start') {
      if (pending) return snapshot()
      if (!ctx.authorization.describe(key)?.methods.some(method => method.id === 'oauth')) {
        throw new Error('This DSH version does not offer Codex OAuth.')
      }
      controller = new AbortController()
      phase = 'waiting'; notice = null
      pending = Promise.resolve().then(() => ctx.authorization.begin({
        key, method: 'oauth', signal: controller.signal,
        interaction: {
          notify(value) {
            // Only the public device-verification notice crosses the command log.
            // Provider access/refresh tokens remain inside DSH's credential service.
            if (value.url === 'https://auth.openai.com/codex/device' &&
                typeof value.code === 'string' && /^[A-Za-z0-9-]{1,32}$/.test(value.code)) {
              notice = { url: value.url, code: value.code }
            }
          },
          async prompt(value) {
            if (value.kind === 'select' && value.options.some(option => option.id === 'device_code')) return 'device_code'
            throw new Error('Device authorization is not supported by this provider version.')
          },
        },
      })).then(result => { phase = result.status }, () => { phase = 'failed' })
        .finally(() => { notice = null; pending = undefined })
    }
    return snapshot()
  }
  ctx.effect(() => ctx.commands.register({
    definitionId: '@iheadwater/dsh-hydrosystem/codex-connect', name: 'hydro_codex_connect',
    description: 'Connect the primary Codex model using human device authorization',
    input: { hint: 'status | start | cancel' },
    async handler(invocation) {
      try { return { kind: 'success', text: JSON.stringify(await operate(invocation.rawInput.trim() || 'status')) } }
      catch (error) { return { kind: 'error', text: error.message } }
    },
  }))
  ctx.effect(() => async () => {
    closing = true
    controller?.abort()
    await pending
  })
}
