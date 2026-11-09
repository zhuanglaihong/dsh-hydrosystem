/** Build a native Host entry and the DSH module-table browser factory. */
import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const pkg=new URL('../packages/hydro-workspace/',import.meta.url);
const result=await build({entryPoints:[new URL('src/client.tsx',pkg).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,write:false,format:'cjs',platform:'browser',target:'es2022',jsx:'transform',external:['react','@deepseek-ai/*'],loader:{'.css':'text'},minify:false});
const code=result.outputFiles[0].text;
const manifest=JSON.parse(await readFile(new URL('package.json',pkg),'utf8'));
await writeFile(new URL('lib/client.js',pkg),`window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},factory:(require)=>{const module={exports:{}};const exports=module.exports;\n${code}\nreturn module.exports;}});\n`);
console.log('Workspace browser factory built.');
