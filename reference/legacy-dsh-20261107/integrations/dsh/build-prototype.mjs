/** Stage an explicitly source-bound Desktop compatibility prototype. */
import { mkdir, copyFile, writeFile, access, cp } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(source, '../..')
if (!process.argv[2]) throw new Error('Usage: node build-prototype.mjs <new-output-directory>')
const output = resolve(process.argv[2])
const python = join(projectRoot, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
await access(python)
await mkdir(output, { recursive: false })
for (const file of ['package.json', 'index.js', 'bridge.js', 'managed-node.js', 'workspace.js', 'studies.js', 'tools.js', 'research.js', 'environment.js', 'client.js', 'icon.svg', 'cordis.patch.yml']) {
  await copyFile(join(source, file), join(output, file))
}
await cp(join(source, 'locale'), join(output, 'locale'), { recursive: true })
await writeFile(join(output, 'connection.json'), JSON.stringify({
  python, projectRoot,
  tools: ['capabilities', 'hydrosystem_instructions', 'hydrosystem_runtime',
    'hydromodel_list_models', 'hydromodel_describe_model', 'hydrodata_list_datasets',
    'hydroutils_list_capabilities', 'torchhydro_list_models', 'torchhydro_describe_model'],
  workRoot: join(output, 'state/study'), runtimeRoot: join(output, 'state/runtime'),
}, null, 2) + '\n')
console.log(JSON.stringify({ output, mode: 'source-bound-read-only-prototype', python }))
