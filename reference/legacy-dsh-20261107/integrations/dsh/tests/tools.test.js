/** A submitted job retains its Study even when the UI later selects another. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../tools.js'

test('job registration locks Study selection and the worker uses the submission-time binding', async () => {
  let tool, job, selected = 'first-study'
  const calls = [], busy = new Set()
  const node = { busy,
    tools: [{ name: 'science', input_schema: { type: 'object' }, description: 'Scientific task', execution: { pool: 'worker' } }],
    forSession() {
      const root = selected
      return async request => {
        calls.push({ root, name: request.name })
        return { is_error: false, value: request.name === 'hydrosystem_runtime'
          ? { active: [], limits: { worker_slots: 1 } } : { task_ref: 'recorded-task' } }
      }
    },
  }
  apply({ hydrosystemNode: node, effect: callback => callback(), tools: { register: value => { tool = value; return () => {} } },
    jobs: { start: value => { job = value; return 'job-one' } } })
  const exec = { agent: { id: 'conversation' }, signal: new AbortController().signal, callId: 'call-one', rootCallId: 'root-one' }
  assert.equal((await tool.execute({}, exec)).job_id, 'job-one')
  assert.equal(busy.has('conversation'), true)
  selected = 'second-study'
  const running = job.run({ updateProgress() {} })
  assert.equal((await running.done).status, 'completed')
  assert.equal(calls.find(call => call.name === 'science').root, 'first-study')
  assert.equal(busy.has('conversation'), false)
})

test('failed job admission releases the conversation and starts no worker', async () => {
  let tool
  const busy = new Set()
  apply({ hydrosystemNode: { busy,
    tools: [{ name: 'science', input_schema: {}, description: 'Task', execution: { pool: 'worker' } }],
    forSession: () => async () => ({ is_error: false, value: { active: [{ pool: 'worker' }], limits: { worker_slots: 1 } } }),
  }, effect: callback => callback(), tools: { register: value => { tool = value; return () => {} } },
  jobs: { start: () => assert.fail('must not start a worker') } })
  await assert.rejects(tool.execute({}, { agent: { id: 'conversation' }, signal: new AbortController().signal }), /RESOURCE_BUSY/)
  assert.equal(busy.size, 0)
})
