import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

test('the packed workspace offers left management, wide native conversations and progressive evidence details',async()=>{
 assert.ok(process.env.HYDRO_WORKSPACE_RUN,'Set the isolated Next run directory');
 assert.ok(process.env.PLAYWRIGHT_MODULE,'Select the installed Playwright module');
 const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
 const run=resolve(process.env.HYDRO_WORKSPACE_RUN),access=JSON.parse(await readFile(resolve(run,'access.json'),'utf8'));
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(access.url,{waitUntil:'domcontentloaded'});
  const entry=page.getByRole('button',{name:/^(水文研究|Hydrology research)$/});await entry.waitFor({timeout:60000});
  const welcome=page.getByRole('button',{name:/^(继续|Continue)$/});
  try{await welcome.waitFor({state:'visible',timeout:5000});await welcome.click()}catch(error){if(error.name!=='TimeoutError')throw error}
  const onboarding=page.getByRole('dialog',{name:/^(开始使用|Get started)$/});
  await onboarding.waitFor({state:'visible',timeout:10000});await onboarding.getByRole('button',{name:/^(关闭|Close)$/}).click();
  await entry.click();
  const root=page.locator('[data-testid="hydro-workspace"]');await root.waitFor();
  const navigation=root.getByRole('navigation',{name:/^(研究管理|Research management)$/});await navigation.waitFor({timeout:5000});
  const picker=root.locator('.hw-project select');await picker.locator('option').nth(1).waitFor({state:'attached',timeout:15000});
  assert.doesNotMatch(await root.innerText(),/尚无已配置项目/);
  assert.doesNotMatch(await root.innerText(),/选择上方/,'Project guidance must match left or compact navigation');
  await picker.selectOption(await picker.locator('option').nth(1).getAttribute('value'));
  await root.locator('[data-task]').first().waitFor({timeout:15000});
  const left=await navigation.boundingBox(),main=await root.locator('.hw-page').boundingBox();assert.ok(left.x+left.width<=main.x+1);
  assert.equal(await root.locator('pre:visible').count(),0);
  assert.doesNotMatch(await root.locator('.hw-graph').innerText(),/hydromodel\.|torchhydro\.|sha256-|study-/);
  await mkdir(resolve(run,'screenshots'),{recursive:true});await root.screenshot({path:resolve(run,'screenshots/canvas.png')});
  await root.locator('[data-task]').first().click();await root.locator('.hw-task-detail').waitFor();
  assert.equal(await root.locator('.hw-task-detail pre:visible').count(),0);
  assert.equal(await root.locator('.hw-task-detail details[open]').count(),0);
  await root.locator('.hw-task-detail details summary').last().click();await root.locator('.hw-task-detail pre:visible').waitFor();
  await root.locator('.hw-task-detail details summary').last().click();
  await root.getByRole('button',{name:/^(在研究对话中分析|Analyze in research conversation)$/}).click();await root.locator('.hw-context').waitFor();
  assert.match(await root.locator('.hw-context').innerText(),/复制后粘贴|Paste into/);
  const conversations=root.locator('.hw-session-select select');await conversations.locator('option').nth(1).waitFor({state:'attached',timeout:15000});
  await conversations.selectOption(await conversations.locator('option').nth(1).getAttribute('value'));
  const composer=root.locator('.hw-chat-content [contenteditable="true"]').first();await composer.waitFor({timeout:15000});
  assert.equal((await composer.innerText()).trim(),'','Use an empty isolated test composer; preserve existing drafts');
  const draft='工作台布局验收草稿，请勿发送';await composer.fill(draft);
  const chat=await root.locator('.hw-chat-page').boundingBox(),whole=await root.boundingBox();assert.ok(chat.width>=whole.width*.7,JSON.stringify({chat:chat.width,whole:whole.width}));
  for(const label of [/^(文件|Files)$/,/^(产物|Artifacts)$/,/^(实验|Experiments)$/]){
   await root.locator('.hw-header').getByRole('button',{name:label}).click();const dialog=page.getByRole('dialog',{name:label});await dialog.waitFor();
   const closeIcon=await dialog.getByRole('button',{name:/^(收起|Collapse)$/}).locator('svg').boundingBox();assert.ok(closeIcon&&closeIcon.width>=10,'Native modal close glyph must remain readable');
   assert.equal((await root.locator('.hw-chat-page').boundingBox()).width,chat.width);
   await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert.equal(await composer.innerText(),draft);
  }
  await navigation.getByRole('button',{name:/^(数据与模型|Data and models)$/}).click();
  assert.equal(await root.locator('.hw-page pre:visible').count(),0);
  await root.locator('.hw-sidebar-conversation').getByRole('button',{name:/^(研究助手|Assistant)$/}).click();
  assert.equal(await composer.innerText(),draft);await composer.fill('');
  await root.screenshot({path:resolve(run,'screenshots/native-assistant.png')});
  await root.locator('.hw-header').getByRole('button',{name:/^(产物|Artifacts)$/}).click();
  const dialog=page.getByRole('dialog',{name:/^(产物|Artifacts)$/});const artifacts=dialog.locator('.hw-artifacts>button');assert.ok(await artifacts.count()>0);
  await artifacts.first().click();await dialog.locator('.hw-preview').waitFor();
  await dialog.getByText(/内容已读取并通过哈希校验|Content read and hash verified/).waitFor();
  assert.equal(await dialog.locator('.hw-preview pre:visible').count(),0);
  await dialog.locator('.hw-preview summary').click();await dialog.locator('.hw-preview pre:visible').waitFor();
  assert.doesNotMatch(await dialog.locator('.hw-preview pre').innerText(),/ARTIFACT_HASH_MISMATCH|READ_FAILED/);
  await page.keyboard.press('Escape');
  await root.locator('.hw-header').getByRole('button',{name:/^(终端|Terminal)$/}).click();assert.equal(await root.locator('.hw-terminal').isVisible(),true);
  await root.locator('.hw-terminal').getByRole('button',{name:/^(收起|Collapse)$/}).click();
  for(const width of [1024,390]){
   await page.setViewportSize({width,height:1050});await page.waitForFunction(()=>document.querySelector('[data-testid="hydro-workspace"]')?.clientWidth>=Math.min(300,innerWidth-50));
   const size=await root.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));assert.ok(size.scroll<=size.client+1,JSON.stringify({width,...size}));
  }
  await root.getByRole('button',{name:/^(展开研究导航|Open research navigation)$/}).click();
  const mobile=page.getByRole('dialog',{name:/^(研究管理|Research management)$/});await mobile.waitFor();
  await mobile.getByRole('button',{name:/^(环境与算力|Environment and compute)$/}).click();assert.equal(await mobile.count(),0);
  await page.setViewportSize({width:1440,height:1050});await root.screenshot({path:resolve(run,'screenshots/environment.png')});
  assert.deepEqual(errors.filter(x=>/hydro-workspace|hydro\.workspace|SessionProvider|factory|Invalid hook|Module.*not/.test(x)),[]);
  console.log(JSON.stringify({outcome:'passed',leftNavigation:true,wideConversation:chat.width,draftPreserved:true,detailsCollapsed:true,artifactPreview:true,nativeHost:true,widths:[1024,390]}));
 }finally{await browser.close()}
});
