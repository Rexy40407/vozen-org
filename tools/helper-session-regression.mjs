const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
try {
  for (const scenario of ['delayed-session', 'remember-server', 'legacy-bearer', 'retry-detail', 'missing-schema', 'stale-detail', 'uncertain-switch', 'free-card', 'retry-resources', 'wrong-guild-resources', 'stale-resources', 'simulation-video', 'simulation-pt', 'simulation-failure', 'simulation-invalid', 'simulation-mismatch', 'simulation-close', 'simulation-media-error', 'simulation-route-change', 'simulation-timeout', 'channel-create', 'channel-error', 'channel-wrong-guild', 'channel-switch', 'channel-no-permissions', 'channel-mobile', 'channel-pt', 'channel-one-click', 'multiple-resources', 'multiple-mobile', 'multiple-keyboard', 'fields-visible', 'channel-permission-error']) {
    if (process.env.HELPER_SCENARIO && !scenario.startsWith(process.env.HELPER_SCENARIO)) continue;
    const page = await browser.newPage();
    let ready = false, guild = 'a', earlyReads = 0, detailReads = 0, switches = 0;
    let savedConfig;
    let contextReads = 0;
    let simulationReads = 0;
    let simulatedConfig;
    let channelCreates = 0;
    const channelScenario = scenario.startsWith('channel-');
    const multipleScenario = scenario.startsWith('multiple-');
    const resourceScenario = scenario.endsWith('resources');
    const simulationScenario = scenario.startsWith('simulation-');
    const starboard = resourceScenario || simulationScenario || channelScenario || multipleScenario;
    const feature = {key:starboard ? 'community.starboard' : 'community.levels',label:starboard ? 'Starboard' : 'Levels & XP',category:'community',available:true,enabled:true};
    if (scenario === 'simulation-pt' || scenario === 'channel-pt') await page.addInitScript(() => localStorage.setItem('vozen.lang','pt'));
    if (scenario === 'channel-mobile' || scenario === 'multiple-mobile') await page.setViewportSize({width:390,height:844});
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
        if (channelScenario) Object.assign(value,{bot:{available:true,permissions:scenario === 'channel-no-permissions' ? '2048' : '8'},roles:[{id:'mod',name:'Moderator',permissions:'8192'},{id:'member',name:'Member',permissions:'2048'}]});
        if (multipleScenario) Object.assign(value,{bot:{available:true,permissions:'8'},
          channels:[{id:'a-starboard',name:'starboard',type:'text'},{id:'first',name:'general',type:'text'},{id:'second',name:'off-topic',type:'text'},{id:'third',name:'photos',type:'text'}],
          roles:[{id:'high',name:'Green',manageable:false},{id:'managed',name:'Muted',managed:true,manageable:false},{id:'low',name:'Member',manageable:true}]});
      }
      else if (path === '/api/starboard/channel') {
        channelCreates++;
        const body = route.request().postDataJSON();
        assert.deepEqual(body,{name:'starboard',moderatorRoleIds:scenario === 'channel-one-click' ? [] : ['mod']});
        assert.equal(route.request().method(),'POST');
        const requestedGuild = guild;
        await new Promise(resolve => setTimeout(resolve, scenario === 'channel-switch' ? 1500 : 350));
        if (scenario === 'channel-error') { await route.fulfill({status:409,json:{code:'starboard_channel_name_exists'}}); return; }
        if (scenario === 'channel-permission-error') { await route.fulfill({status:403,json:{code:'starboard_bot_permissions_required',message:'starboard_bot_permissions_required',requestId:null}}); return; }
        value = {guildId:scenario === 'channel-wrong-guild' ? 'b' : requestedGuild,channel:{id:`${requestedGuild}-created`,name:'starboard',type:0},reused:false};
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
        if (multipleScenario) {
          value.config = savedConfig ?? {...value.config,ignoredChannels:[],ignoredRoles:[]};
          value.schema.sections[0].fields.push({key:'allowSelfStar',label:'Allow the author reaction',kind:'toggle',advanced:true},{key:'includeImages',label:'Include images',kind:'toggle',advanced:true},{key:'ignoredChannels',label:'Channels ignored',kind:'channels',advanced:true},{key:'ignoredRoles',label:'Roles ignored',kind:'roles',advanced:true},{key:'autoRole',label:'Initial role',kind:'role',advanced:true});
        }
        if (scenario === 'fields-visible') value.schema.sections[0].fields.push({key:'cooldown',label:'Cooldown',kind:'number',advanced:true});
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
    if (multipleScenario) {
      const channels = page.getByRole('group',{name:'Channels ignored',exact:true});
      const roles = page.getByRole('group',{name:'Roles ignored',exact:true});
      await channels.waitFor();
      assert.equal(await page.locator('details.advanced').count(),0);
      assert.equal(await page.getByText('Advanced options',{exact:true}).count(),0);
      if (scenario === 'multiple-keyboard') {
        await channels.getByRole('checkbox',{name:'#general',exact:true}).focus();
        await page.keyboard.press('Space');
        await channels.getByRole('checkbox',{name:'#off-topic',exact:true}).focus();
        await page.keyboard.press('Space');
      } else {
        await channels.getByRole('checkbox',{name:'#general',exact:true}).click();
        await channels.getByRole('checkbox',{name:'#off-topic',exact:true}).click();
      }
      await channels.getByRole('checkbox',{name:'#photos',exact:true}).click();
      await channels.getByRole('checkbox',{name:'#photos',exact:true}).click();
      await roles.getByRole('checkbox',{name:'@Green',exact:true}).click();
      await roles.getByRole('checkbox',{name:'@Muted',exact:true}).click();
      assert.equal(await channels.getByRole('checkbox',{name:'#general',exact:true}).isChecked(),true);
      assert.equal(await channels.getByRole('checkbox',{name:'#off-topic',exact:true}).isChecked(),true);
      assert.equal(await roles.getByRole('checkbox',{name:'@Green',exact:true}).isChecked(),true);
      for (const input of [channels.getByRole('checkbox',{name:'#general',exact:true}),roles.getByRole('checkbox',{name:'@Green',exact:true})]) {
        await input.focus();
        const geometry = await input.evaluate(element => {
          const box = element.getBoundingClientRect();
          return {width:box.width,height:box.height,minHeight:getComputedStyle(element).minHeight};
        });
        assert.equal(geometry.width,18,'checkbox stays 18px wide when focused');
        assert.equal(geometry.height,18,'checkbox must not inherit 44px field height');
        assert.equal(geometry.minHeight,'18px');
      }
      assert.equal(await page.getByRole('region',{name:'Behaviour',exact:true}).getByRole('checkbox').count(),2);
      await page.keyboard.press('Space');
      await page.keyboard.press('Space');
      assert.equal(await roles.getByRole('checkbox',{name:'@Green',exact:true}).evaluate(element =>
        getComputedStyle(element.closest('label')).outlineWidth),'2px','keyboard focus remains visible on the option row');
      const channelBox = await channels.boundingBox(), roleBox = await roles.boundingBox();
      assert.ok(channelBox && roleBox);
      if (scenario === 'multiple-mobile') assert.ok(roleBox.y > channelBox.y + channelBox.height,'mobile exclusions stack');
      else assert.ok(Math.abs(channelBox.y - roleBox.y) < 2,'desktop exclusions aligned');
      assert.notEqual(await page.getByRole('combobox',{name:/Initial role/}).getByRole('option',{name:'🔒 @Green',exact:true}).getAttribute('disabled'),null,'assignment restrictions must remain');
      if (scenario !== 'multiple-keyboard') {
        await mkdir('output/playwright',{recursive:true});
        await page.screenshot({path:`output/playwright/${scenario}.png`,fullPage:true});
        await roles.locator('label').first().screenshot({path:`output/playwright/${scenario}-focused-option.png`});
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      }
      await Promise.all([page.waitForResponse(response => response.request().method() === 'PUT'),page.getByRole('button',{name:'Save changes',exact:true}).click()]);
      assert.deepEqual(savedConfig.ignoredChannels,['first','second']);
      assert.deepEqual([...savedConfig.ignoredRoles].sort(),['high','managed']);
      await page.reload();
      await roles.getByRole('checkbox',{name:'@Green',exact:true}).waitFor();
      assert.equal(await roles.getByRole('checkbox',{name:'@Green',exact:true}).isChecked(),true);
      assert.equal(await channels.getByRole('checkbox',{name:'#off-topic',exact:true}).isChecked(),true);
      console.log(`PASS ${scenario}`);await page.close();continue;
    }
    if (scenario === 'fields-visible') {
      await page.getByRole('spinbutton',{name:/Cooldown/}).waitFor();
      assert.equal(await page.locator('details.advanced').count(),0);
      console.log(`PASS ${scenario}`);await page.close();continue;
    }
    if (channelScenario) {
      const pt = scenario === 'channel-pt';
      const setup = page.locator('.starboard-channel');
      const create = setup.getByRole('button',{name:pt ? 'Criar canal com permissões' : 'Create channel with permissions',exact:true});
      await create.waitFor();
      assert.equal(await setup.locator('summary').count(),0,'creation must not be hidden');
      const channel = page.getByRole('combobox',{name:pt ? /Canal predefinido/ : /Default channel/});
      if (scenario === 'channel-no-permissions') {
        assert.equal(await create.isDisabled(),true);
        assert.equal(channelCreates,0);
      } else {
        const input = setup.getByRole('textbox',{name:pt ? /Nome do canal/ : /Channel name/});
        if (scenario !== 'channel-one-click') {
          await input.fill('../bad');
          assert.equal(await create.isDisabled(),true);
          await input.fill('starboard');
        } else assert.equal(await input.inputValue(),'starboard');
        if (scenario !== 'channel-one-click') await setup.getByRole('checkbox',{name:'Moderator',exact:true}).click();
        assert.equal(await setup.getByRole('checkbox',{name:'Member',exact:true}).count(),0);
        await create.click();
        assert.equal(await setup.getByRole('button').isDisabled(),true,'prevent duplicate clicks');
        if (scenario === 'channel-switch') {
          await page.getByRole('combobox',{name:'Current server',exact:true}).selectOption('b');
          await page.waitForFunction(() => document.querySelector('select[aria-label="Current server"]')?.value === 'b');
          await new Promise(resolve => setTimeout(resolve,1700));
          assert.equal(await page.locator('option[value="a-created"]').count(),0,'late channel must not enter another guild');
        } else if (scenario === 'channel-error' || scenario === 'channel-permission-error' || scenario === 'channel-wrong-guild') {
          await setup.getByRole('alert').waitFor();
          if (scenario === 'channel-permission-error') {
            assert.ok((await setup.getByRole('alert').innerText()).includes('Administrator is not required'));
            assert.ok(!(await setup.getByRole('alert').innerText()).includes('Creation could not be confirmed'));
          }
          assert.equal(await channel.inputValue(),'a-starboard');
          assert.equal(await create.isDisabled(),false);
        } else {
          await setup.getByRole('status').filter({hasText:pt ? 'está pronto' : 'is ready'}).waitFor();
          assert.equal(await channel.inputValue(),'a-created');
          assert.equal(savedConfig,undefined,'creation must not publish configuration');
          if (scenario === 'channel-mobile' || scenario === 'channel-create') {
            await mkdir('output/playwright',{recursive:true});
            await page.screenshot({path:`output/playwright/${scenario}.png`,fullPage:true});
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),'no horizontal overflow');
          }
          await Promise.all([
            page.waitForResponse(response => response.request().method() === 'PUT'),
            page.getByRole('button',{name:pt ? 'Guardar alterações' : 'Save changes',exact:true}).click(),
          ]);
          assert.equal(savedConfig.channel,'a-created');
        }
        assert.equal(channelCreates,1);
      }
      console.log(`PASS ${scenario}`);
      await page.close();
      continue;
    }
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
