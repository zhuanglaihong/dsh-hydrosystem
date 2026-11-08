/** Profile-local Study discovery and durable per-conversation selection. */
import { readFile, readdir, realpath, writeFile, rename, mkdir } from 'node:fs/promises'
import { dirname, basename, join, relative, isAbsolute } from 'node:path'
import { randomUUID } from 'node:crypto'

export class StudyBindings {
  constructor(connection, sessions) {
    this.base = dirname(connection.workRoot)
    this.defaultName = basename(connection.workRoot)
    this.sessions = sessions
    this.file = join(connection.runtimeRoot, 'dsh-study-bindings.json')
    this.writing = Promise.resolve()
  }
  /** Load only this node's selection index; scientific records remain in Study. */
  static async open(connection) {
    await mkdir(dirname(connection.workRoot), { recursive: true })
    let sessions = {}
    try {
      const value = JSON.parse(await readFile(join(connection.runtimeRoot, 'dsh-study-bindings.json'), 'utf8'))
      if (value.version !== 1 || !value.sessions || typeof value.sessions !== 'object' || Array.isArray(value.sessions)) throw new Error('INVALID_STUDY_BINDINGS')
      sessions = value.sessions
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    for (const value of Object.values(sessions)) StudyBindings.validate(value)
    return new StudyBindings(connection, new Map(Object.entries(sessions)))
  }
  static validate(name) {
    if (typeof name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(name)) throw new Error('INVALID_STUDY_SELECTION')
  }
  root(sessionId) { return join(this.base, this.sessions.get(sessionId) ?? this.defaultName) }
  async list(sessionId) {
    const rows = [], warnings = []
    const bound = await realpath(this.base)
    for (const entry of (await readdir(bound, { withFileTypes: true })).slice(0, 200)) {
      if (!entry.isDirectory()) continue
      try {
        StudyBindings.validate(entry.name)
        const target = await realpath(join(bound, entry.name, 'study.json'))
        const suffix = relative(bound, target)
        if (suffix.startsWith('..') || isAbsolute(suffix)) throw new Error('STUDY_OUTSIDE_NODE')
        const value = JSON.parse(await readFile(target, 'utf8'))
        if (value.schema_version !== '0.2' || typeof value.study_ref !== 'string' || typeof value.goal !== 'string') throw new Error('INVALID_STUDY_MANIFEST')
        rows.push({ id: entry.name, study_ref: value.study_ref, goal: value.goal, created_at: value.created_at ?? null })
      } catch (error) { if (error.code !== 'ENOENT') warnings.push(`${entry.name}: ${error.message}`) }
    }
    return { selected: this.sessions.get(sessionId) ?? this.defaultName, studies: rows, warnings }
  }
  async select(sessionId, name) {
    StudyBindings.validate(name)
    if (!(await this.list(sessionId)).studies.some(study => study.id === name)) throw new Error('STUDY_NOT_FOUND')
    // Serialize publication so two windows cannot publish an older selection map last.
    const work = this.writing.then(async () => {
      const next = new Map(this.sessions); next.set(sessionId, name)
      await mkdir(dirname(this.file), { recursive: true })
      const temporary = this.file + '.' + randomUUID() + '.tmp'
      await writeFile(temporary, JSON.stringify({ version: 1, sessions: Object.fromEntries(next) }) + '\n')
      await rename(temporary, this.file)
      this.sessions = next
    })
    this.writing = work.catch(() => {})
    await work
    return this.list(sessionId)
  }
}
