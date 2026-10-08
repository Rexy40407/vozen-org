const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
try {
  for (const scenario of ['delayed-session', 'remember-server', 'legacy-bearer', 'retry-detail', 'missing-schema', 'stale-detail', 'uncertain-switch', 'free-card', 'retry-resources', 'wrong-guild-resources', 'stale-resources', 'simulation-video', 'simulation-pt', 'simulation-failure', 'simulation-invalid', 'simulation-mismatch', 'simulation-close', 'simulation-media-error', 'simulation-route-change', 'simulation-timeout']) {
    const page = await browser.newPage();
    let ready = false, guild = 'a', earlyReads = 0, detailReads = 0, switches = 0;
    let savedConfig;
    let contextReads = 0;
    let simulationReads = 0;
    let simulatedConfig;
    const resourceScenario = scenario.endsWith('resources');
    const simulationScenario = scenario.startsWith('simulation-');
    const starboard = resourceScenario || simulationScenario;
    const feature = {key:starboard ? 'community.starboard' : 'community.levels',label:starboard ? 'Starboard' : 'Levels & XP',category:'community',available:true,enabled:true};
    if (scenario === 'simulation-pt') await page.addInitScript(() => localStorage.setItem('vozen.lang','pt'));
    if (scenario === 'simulation-video') await page.emulateMedia({reducedMotion:'reduce'});
    if (scenario === 'simulation-timeout') await page.addInitScript(() => {
      const original = window.setTimeout;
      window.setTimeout = (callback, delay, ...args) => original(callback, delay === 20000 ? 200 : delay, ...args);
    });
    if (scenario === 'simulation-media-error') await page.route('**/feature-demos/*.webm', route => route.fulfill({status:404,body:''}));
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
      else if (path === '/api/guild-context') {
        contextReads++;
        if (scenario === 'retry-resources' && contextReads === 1) {
          await route.fulfill({status:503,json:{code:'temporary_failure'}}); return;
        }
        value = {guildId:scenario === 'wrong-guild-resources' && contextReads === 1 ? 'b' : guild,
          name:'Alpha',permissions:'8',channels:[{id:`${guild}-starboard`,name:'starboard',type:'text'}],roles:[],
          hierarchy:{known:true},capabilities:{channelSelectors:!(scenario === 'stale-resources' && contextReads === 1),roleSelectors:true,permissionPreflight:true},
          stale:scenario === 'stale-resources' && contextReads === 1};
      }
      else if (path === '/api/session/switch') {
        switches++; guild = route.request().postDataJSON().guild_id;
        if (scenario === 'uncertain-switch') { await route.fulfill({status:503,json:{code:'lost_response'}}); return; }
        value = {ok:true,guildId:guild};
      } else if (path === '/api/config/features') value = {guildId:guild,features:[feature]};
      else if (path === `/api/config/features/${feature.key}`) {
        if (route.request().method() === 'PUT') savedConfig = route.request().postDataJSON().config;
        detailReads++;
        const number = detailReads;
        if (!ready) { earlyReads++; await route.fulfill({status:401,json:{code:'session_not_ready'}}); return; }
        if (scenario === 'retry-detail' && detailReads === 1) { await route.fulfill({status:503,json:{code:'temporary_failure'}}); return; }
        if (scenario === 'stale-detail' && number === 1) await new Promise(resolve => setTimeout(resolve, 600));
        value = {...feature,config:{xpMin:(guild === 'b' || (scenario === 'stale-detail' && number > 1)) ? 42 : 15},defaults:{},schema:{sections:[{title:'XP progression',fields:[{key:'xpMin',label:'Minimum XP',kind:'number'}]}]},revision:1};
        if (starboard) value = {...feature,guildId:guild,config:savedConfig ?? {channel:'a-starboard',threshold:3,emoji:'⭐'},defaults:{},schema:{sections:[{title:'Starboard',fields:[{key:'channel',label:'Default channel',kind:'channel'},{key:'threshold',label:'Required reactions',kind:'number',min:1,max:100},{key:'emoji',label:'Highlight emoji',kind:'text'}]}]},revision:1};
        if (scenario === 'missing-schema' && number === 1) delete value.schema;
      } else if (path === `/api/config/features/${feature.key}/simulate`) {
        simulationReads++;
        simulatedConfig = route.request().postDataJSON().config;
        assert.equal(route.request().method(),'POST');
        if (scenario === 'simulation-failure' && simulationReads === 1) { await route.fulfill({status:503,json:{code:'unavailable'}}); return; }
        if (scenario === 'simulation-close' || scenario === 'simulation-route-change' || scenario === 'simulation-timeout') await new Promise(resolve => setTimeout(resolve, 700));
        value = {ok:true,key:scenario === 'simulation-mismatch' ? 'community.levels' : feature.key,
          result:{would_apply:scenario !== 'simulation-invalid',effects:['Technical QA effect'],issues:scenario === 'simulation-invalid' ? [{severity:'error',message:'Select a channel'}] : []}};
      } else if (path.endsWith('/preflight')) value = {ok:true,issues:[]};
      else if (path === '/api/stats') value = {guildId:guild,totalCases:0};
      else if (path === '/api/cases') value = {cases:[]};
      else if (path === '/api/audit') value = {events:[]};
      else if (path === '/api/activity') value = {activity:[]};
      else if (path === '/api/quotas') value = {plan:'Free',limits:{},usage:{}};
      else if (path === '/api/studio/rank-card') { await route.fulfill({status:503,json:{}}); return; }
      else { await route.fulfill({status:503,json:{}}); return; }
      await route.fulfill({json:value});
    });
    await page.goto(`${base}#/config/${feature.key}`);
    if (simulationScenario) {
      const pt = scenario === 'simulation-pt';
      const simulate = page.getByRole('button',{name:pt ? 'Simular configuração' : 'Simulate configuration',exact:true});
      const threshold = page.getByRole('spinbutton',{name:pt ? 'Reações necessárias' : 'Required reactions',exact:true});
      if (!pt) await threshold.fill('5');
      await simulate.click();
      const dialog = page.getByRole('dialog',{name:pt ? 'Mural de estrelas' : 'Starboard',exact:true});
      await dialog.waitFor();
      const video = dialog.locator('video');
      assert.equal(await video.count(),1,'simulation must open a video, not a technical toast');
      if (scenario === 'simulation-close') {
        await page.waitForFunction(() => document.querySelector('.feature-simulation [role="status"]') !== null);
        await page.keyboard.press('Escape');
        await dialog.waitFor({state:'hidden'});
        await new Promise(resolve => setTimeout(resolve, 800));
        assert.equal(await dialog.count(),0,'late response must not reopen a closed dialog');
        assert.equal(await threshold.inputValue(),'5');
        assert.equal(await simulate.evaluate(element => element === document.activeElement),true);
      } else if (scenario === 'simulation-route-change') {
        await page.evaluate(() => { window.location.hash = '#/features'; });
        await dialog.waitFor({state:'hidden'});
        await new Promise(resolve => setTimeout(resolve, 800));
        assert.equal(await dialog.count(),0,'leaving the feature must discard its simulation');
      } else {
        if (scenario === 'simulation-media-error') await dialog.getByRole('alert').filter({hasText:'video could not load'}).waitFor();
        else {
          await page.waitForFunction(() => document.querySelector('.feature-simulation video')?.readyState >= 2);
          const duration = await video.evaluate(element => element.duration);
          assert.ok(Number.isFinite(duration) && duration > 9 && duration < 11,'demo must have a playable finite 10-second duration');
          assert.equal(await video.evaluate(element => element.paused),true,'demo must be user initiated, including reduced motion');
          assert.equal(await video.evaluate(element => element.currentSrc.endsWith(`starboard-${document.documentElement.lang === 'pt' ? 'pt' : 'en'}.webm`)),true);
          await video.evaluate(element => element.play());
          await page.waitForFunction(() => document.querySelector('.feature-simulation video')?.currentTime > .5);
          await video.evaluate(element => element.pause());
        }
        if (scenario === 'simulation-failure' || scenario === 'simulation-mismatch' || scenario === 'simulation-timeout') {
          await dialog.getByRole('alert').filter({hasText:'Could not validate'}).waitFor();
          if (scenario === 'simulation-failure') await dialog.getByRole('button',{name:'Retry validation',exact:true}).click();
        }
        if (scenario === 'simulation-invalid') await dialog.getByText('The draft needs changes before publishing.',{exact:true}).waitFor();
        else if (scenario !== 'simulation-mismatch' && scenario !== 'simulation-timeout') await dialog.getByText(pt ? 'A simulação da API aplicaria estas definições. Nada foi guardado ou enviado.' : 'The API simulation would apply this draft. Nothing has been saved or sent.',{exact:true}).waitFor();
        await dialog.getByRole('button',{name:pt ? 'Fechar demonstração' : 'Close demonstration',exact:true}).click();
        await dialog.waitFor({state:'hidden'});
        if (!pt) assert.equal(await threshold.inputValue(),'5','simulation must preserve unsaved settings');
      }
      assert.equal(savedConfig,undefined,'simulation must not save the feature');
      assert.equal(simulationReads,scenario === 'simulation-failure' ? 2 : 1);
      if (!pt) assert.equal(simulatedConfig.threshold,5,'API must simulate the actual unsaved draft');
      console.log(`PASS ${scenario}`);
      await page.close();
      continue;
    }
    if (resourceScenario) {
      const channel = page.getByRole('combobox',{name:/Default channel/});
      const threshold = page.getByRole('spinbutton',{name:'Required reactions',exact:true});
      await page.getByRole('button',{name:'Reload channels and roles',exact:true}).waitFor();
      assert.equal(await channel.isDisabled(),true,'failed/stale/cross-guild context must not enable selectors');
      await threshold.fill('5');
      await page.getByRole('button',{name:'Reload channels and roles',exact:true}).click();
      await channel.selectOption('a-starboard');
      assert.equal(await threshold.inputValue(),'5','resource retry must retain the unsaved configuration');
      assert.equal(await page.getByRole('button',{name:'Reload channels and roles',exact:true}).count(),0);
      await Promise.all([
        page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith('/api/config/features/community.starboard')),
        page.getByRole('button',{name:'Save changes',exact:true}).click(),
      ]);
      assert.equal(savedConfig.channel,'a-starboard');
      assert.equal(savedConfig.threshold,5);
      assert.equal(savedConfig.emoji,'⭐');
      assert.equal(contextReads,2);
      console.log(`PASS ${scenario}`);
      await page.close();
      continue;
    }
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
    if (scenario === 'delayed-session') {
      await page.getByRole('button',{name:'Simulate configuration',exact:true}).click();
      const dialog = page.getByRole('dialog',{name:'Levels & XP',exact:true});
      await dialog.getByText('The API simulation would apply this draft. Nothing has been saved or sent.',{exact:true}).waitFor();
      assert.equal(await dialog.locator('video').count(),0,'do not show a Starboard video for another feature');
      assert.equal(await dialog.getByText('Technical QA effect',{exact:true}).isVisible(),false,'technical effects should be collapsed');
      await page.keyboard.press('Escape');
      await dialog.waitFor({state:'hidden'});
    }
    if (scenario === 'free-card') {
      await page.getByRole('checkbox',{name:'Show the banner in the level-up message',exact:true}).click();
      assert.equal(await page.getByRole('dialog').isVisible(),false);
      assert.equal(await page.getByRole('button',{name:'Moonlit Village',exact:true}).count(),0);
      await Promise.all([
        page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith('/api/config/features/community.levels')),
        page.getByRole('button',{name:'Save changes',exact:true}).click(),
      ]);
      assert.equal(savedConfig.bannerEnabled,true);
      assert.equal('rankCard' in savedConfig,false,'free save cannot include customization');
    }
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
