/** Read-only demo projection of Study 0.2 activity records and verified PNG evidence. */
import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import { join, relative, isAbsolute } from 'node:path'
import { createHash } from 'node:crypto'

/** Return bounded, current research evidence; never start or initialize research. */
export async function readWorkspace(root, status) {
  const view = { updated_at: new Date().toISOString(), study: status.study,
    accounts: status.accounts ?? {}, activities: [], images: [], artifacts: [], warnings: [],
    counts: { activities: 0, completed: 0, figures: 0 } }
  if (!status.initialized) return view
  const bound = await realpath(root)
  async function bounded(path, limit) {
    const target = await realpath(path)
    const suffix = relative(bound, target)
    if (suffix.startsWith('..') || isAbsolute(suffix)) throw new Error('EVIDENCE_OUTSIDE_STUDY')
    if ((await stat(target)).size > limit) throw new Error('EVIDENCE_TOO_LARGE')
    return readFile(target)
  }
  const dir = join(bound, 'activities')
  let names
  try { names = await readdir(dir) } catch (error) {
    if (error.code === 'ENOENT') return view
    throw error
  }
  const dated = await Promise.all(names.filter(name => /^activity-[\w-]+\.json$/.test(name))
    .map(async name => ({ name, time: (await stat(join(dir, name))).mtimeMs })))
  for (const entry of dated.sort((a, b) => b.time - a.time).slice(0, 100)) {
    try {
      const record = JSON.parse(await bounded(join(dir, entry.name), 2 * 1024 * 1024))
      if (record.study_ref !== status.study.study_ref) throw new Error('STUDY_ID_MISMATCH')
      view.activities.push({ activity_ref: record.activity_ref, operation: record.operation,
        status: record.status ?? null, created_at: record.created_at ?? null, finished_at: record.finished_at ?? null,
        result: record.result ?? null, error: record.error ?? null, request: record.request ?? null })
    } catch (error) { view.warnings.push(`${entry.name}: ${error.message}`) }
  }
  const seen = new Set()
  async function collect(value, activity) {
    if (!value || typeof value !== 'object') return
    if (typeof value.artifact_id === 'string' && !view.artifacts.some(item => item.reference.artifact_id === value.artifact_id)) {
      view.artifacts.push({ activity_ref: activity.activity_ref, operation: activity.operation, reference: value })
    }
    if (value.format === 'png' && typeof value.content_hash === 'string') {
      const hash = value.content_hash
      if (seen.has(hash) || view.images.length >= 6) return
      seen.add(hash)
      try {
        if (!/^[a-f0-9]{64}$/.test(hash) || value.path !== `objects/${hash}.png`) throw new Error('INVALID_IMAGE_REFERENCE')
        const bytes = await bounded(join(bound, value.path), 2 * 1024 * 1024)
        if (createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error('ARTIFACT_HASH_MISMATCH')
        if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('INVALID_PNG')
        view.images.push({ activity_ref: activity.activity_ref, operation: activity.operation,
          reference: value, src: `data:image/png;base64,${bytes.toString('base64')}` })
      } catch (error) { view.warnings.push(`${value.path}: ${error.message}`) }
      return
    }
    for (const child of Object.values(value)) await collect(child, activity)
  }
  for (const activity of view.activities) await collect(activity.result, activity)
  view.counts = { activities: view.activities.length,
    completed: view.activities.filter(activity => activity.status === 'succeeded').length,
    figures: view.images.length }
  return view
}
