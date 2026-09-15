const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
try {
  for (const scenario of ['delayed-session', 'remember-server', 'legacy-bearer', 'retry-detail', 'missing-schema', 'stale-detail', 'uncertain-switch']) {
    const page = await browser.newPage();
    let ready = false, guild = 'a', earlyReads = 0, detailReads = 0, switches = 0;
    const feature = {key:'community.levels',label:'Levels & XP',category:'community',available:true,enabled:true};
    if (scenario === 'legacy-bearer') await page.addInitScript(() => {
      if (!sessionStorage.getItem('qa-seeded')) {
        sessionStorage.setItem('qa-seeded','1');
        sessionStorage.setItem('vh_session_bearer','legacy-test-session-token-00000000000000');
      }
    });
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname.replace(/^.*?(?=\/api\/)/, '');
      let value = {};
      if (path === '/api/me') {
        assert.ok(!(guild === 'b' && route.request().headers().authorization), 'old bearer must not override the rotated cookie');
        ready = false;
        await new Promise(resolve => setTimeout(resolve, 300));
        ready = true; value = {id:'qa-user',guildId:guild,dbOk:true};
      } else if (path === '/api/guilds') value = {guilds:[{id:'a',name:'Alpha',canManage:true},{id:'b',name:'Beta',canManage:true}]};
      else if (path === '/api/session/switch') {
        switches++; guild = route.request().postDataJSON().guild_id;
        if (scenario === 'uncertain-switch') { await route.fulfill({status:503,json:{code:'lost_response'}}); return; }
        value = {ok:true,guildId:guild};
      } else if (path === '/api/config/features') value = {guildId:guild,features:[feature]};
      else if (path === '/api/config/features/community.levels') {
        detailReads++;
        const number = detailReads;
        if (!ready) { earlyReads++; await route.fulfill({status:401,json:{code:'session_not_ready'}}); return; }
        if (scenario === 'retry-detail' && detailReads === 1) { await route.fulfill({status:503,json:{code:'temporary_failure'}}); return; }
        if (scenario === 'stale-detail' && number === 1) await new Promise(resolve => setTimeout(resolve, 600));
        value = {...feature,config:{xpMin:(guild === 'b' || (scenario === 'stale-detail' && number > 1)) ? 42 : 15},defaults:{},schema:{sections:[{title:'XP progression',fields:[{key:'xpMin',label:'Minimum XP',kind:'number'}]}]},revision:1};
        if (scenario === 'missing-schema' && number === 1) delete value.schema;
      } else if (path === '/api/stats') value = {guildId:guild,totalCases:0};
      else if (path === '/api/cases') value = {cases:[]};
      else if (path === '/api/audit') value = {events:[]};
      else if (path === '/api/activity') value = {activity:[]};
      else if (path === '/api/quotas') value = {plan:'Free',limits:{},usage:{}};
      else if (path === '/api/studio/rank-card') { await route.fulfill({status:503,json:{}}); return; }
      else { await route.fulfill({status:503,json:{}}); return; }
      await route.fulfill({json:value});
    });
    await page.goto(`${base}#/config/community.levels`);
    if (scenario === 'stale-detail') {
      while (!detailReads) await new Promise(resolve => setTimeout(resolve, 10));
      await page.goto(`${base}#/features`);
      await page.getByRole('heading',{name:'Levels & XP',exact:true}).waitFor();
      await page.goto(`${base}#/config/community.levels`);
    }
    if (scenario === 'retry-detail' || scenario === 'missing-schema') await page.getByRole('button',{name:'Retry configuration',exact:true}).click();
    try { await page.getByRole('spinbutton',{name:'XP minimum by message',exact:true}).waitFor({timeout:5000}); }
    catch (error) { console.log({scenario,earlyReads,detailReads}); console.log(await page.locator('body').innerText()); throw error; }
    assert.equal(earlyReads,0,'configuration must wait for the session');
    if (scenario === 'uncertain-switch') {
      await page.getByRole('combobox',{name:'Current server',exact:true}).selectOption('b');
      await page.getByRole('spinbutton',{name:'XP minimum by message',exact:true}).waitFor({state:'hidden'});
      await new Promise(resolve => setTimeout(resolve, 500));
      assert.equal(await page.getByRole('spinbutton').count(),0,'old form must not be writable after an uncertain cookie rotation');
    }
    if (scenario === 'stale-detail') {
      await new Promise(resolve => setTimeout(resolve, 700));
      assert.equal(await page.getByRole('spinbutton',{name:'XP minimum by message',exact:true}).inputValue(),'42');
    }
    if (scenario === 'remember-server' || scenario === 'legacy-bearer') {
      await page.getByRole('combobox',{name:'Current server',exact:true}).selectOption('b');
      await page.waitForFunction(() => document.querySelector('select[aria-label="Current server"]')?.value === 'b');
      await page.getByRole('spinbutton',{name:'XP minimum by message',exact:true}).waitFor();
      guild = 'a'; // Renewed/shared cookie points elsewhere; remembered selection must win.
      await page.reload();
      await page.waitForFunction(() => document.querySelector('select[aria-label="Current server"]')?.value === 'b');
      assert.equal(await page.getByRole('spinbutton',{name:'XP minimum by message',exact:true}).inputValue(),'42');
      assert.equal(switches,2);
    }
    console.log(`PASS ${scenario}`);
    await page.close();
  }
} finally { await browser.close(); }
