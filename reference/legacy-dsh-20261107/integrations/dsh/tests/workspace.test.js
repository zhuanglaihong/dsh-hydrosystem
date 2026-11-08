import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { readWorkspace } from '../workspace.js'

test('workbench preserves scientific termination and validates image evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hydro-workspace-'))
  try {
    await mkdir(join(root, 'activities'))
    await mkdir(join(root, 'objects'))
    const png = Buffer.from('89504e470d0a1a0a', 'hex')
    const hash = createHash('sha256').update(png).digest('hex')
    await writeFile(join(root, 'objects', hash + '.png'), png)
    await writeFile(join(root, 'activities/activity-example.json'), JSON.stringify({
      activity_ref: 'activity-example', study_ref: 'study-example', operation: 'hydromodel.calibrate',
      status: 'succeeded', created_at: '2026-11-05T00:00:00Z',
      result: { objective: { name: 'NSE', value: 0.7 }, stop_reason: 'budget_exhausted',
        parameter_set: { artifact_id: 'parameters-one', kind: 'parameter_set' },
        repeated_parameter_set: { artifact_id: 'parameters-one', kind: 'parameter_set' },
        image_ref: { format: 'png', path: 'objects/' + hash + '.png', content_hash: hash } },
    }))
    const status = { initialized: true, study: { study_ref: 'study-example', goal: 'Demo' } }
    const view = await readWorkspace(root, status)
    assert.deepEqual(view, JSON.parse(JSON.stringify(view)))
    assert.equal(view.activities[0].result.stop_reason, 'budget_exhausted')
    assert.equal(view.artifacts.length, 1)
    assert.equal(view.artifacts[0].reference.artifact_id, 'parameters-one')
    assert.deepEqual(view.counts, { activities: 1, completed: 1, figures: 1 })
    assert.equal(view.images[0].src, 'data:image/png;base64,iVBORw0KGgo=')
    await writeFile(join(root, 'objects', hash + '.png'), 'changed')
    const damaged = await readWorkspace(root, status)
    assert.equal(damaged.images.length, 0)
    assert.match(damaged.warnings[0], /ARTIFACT_HASH_MISMATCH/)
    assert.equal((await readWorkspace(root, { initialized: false, study: null })).activities.length, 0)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('workbench excludes another Study and refuses image paths outside its root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hydro-workspace-scope-'))
  try {
    await mkdir(join(root, 'activities'))
    await writeFile(join(root, 'activities/activity-other.json'), JSON.stringify({
      activity_ref: 'activity-other', study_ref: 'study-other', result: { secret: 'other research' },
    }))
    await writeFile(join(root, 'activities/activity-image.json'), JSON.stringify({
      activity_ref: 'activity-image', study_ref: 'study-selected', status: 'succeeded',
      result: { image_ref: { format: 'png', path: '../outside.png', content_hash: 'a'.repeat(64) } },
    }))
    const view = await readWorkspace(root, { initialized: true, study: { study_ref: 'study-selected' } })
    assert.deepEqual(view.activities.map(a => a.activity_ref), ['activity-image'])
    assert.equal(view.images.length, 0)
    assert.ok(view.warnings.some(w => w.includes('STUDY_ID_MISMATCH')))
    assert.ok(view.warnings.some(w => w.includes('INVALID_IMAGE_REFERENCE')))
  } finally { await rm(root, { recursive: true, force: true }) }
})
