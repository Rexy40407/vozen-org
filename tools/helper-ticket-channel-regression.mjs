// Synthetic APIs only: never creates a real channel or posts a real ticket panel.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
const browser = await chromium.launch();
try {
  for (const scenario of ['create','pt','mobile','no-permissions','collision','permission-error','uncertain','reused','wrong-guild','disabled-feature','save-failure','route-change','guild-switch']) {
    const page = await browser.newPage(scenario === 'mobile' ? {viewport:{width:390,height:844}} : {});
    const pt = scenario === 'pt';
    if (pt) await page.addInitScript(() => localStorage.setItem('vozen.lang', 'pt'));
    let guild = '10', creates = 0, writes = 0, revision = 1;
    let saved = {panelChannel:'20',categoryId:'',staffRole:'',maxOpen:1};
    const enabled = scenario !== 'disabled-feature';
    const feature = {key:'support.tickets',label:'Tickets',category:'support',enabled,available:true};
    const mutations = [];
    await page.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^.*?(?=\/api\/)/, '');
      let value;
      if (request.method() !== 'GET') mutations.push(path);
      if (path === '/api/tickets/channel') {
        creates++;
        assert.equal(request.method(),'POST');
        assert.deepEqual(request.postDataJSON(),{name:'tickets'});
        const requestedGuild = guild;
        await new Promise(resolve => setTimeout(resolve,['route-change','guild-switch'].includes(scenario) ? 1400 : 350));
        const error = {collision:'ticket_channel_name_exists','permission-error':'ticket_bot_permissions_required',uncertain:'ticket_creation_uncertain'}[scenario];
        if (error) { await route.fulfill({status:409,json:{code:error,message:error}}); return; }
        value = {guildId:scenario === 'wrong-guild' ? '99' : requestedGuild,channel:{id:'30',name:'tickets',type:0},reused:scenario === 'reused'};
      } else if (path === '/api/me') value = {id:'qa-user',guildId:guild,dbOk:true};
      else if (path === '/api/guilds') value = {guilds:[{id:'10',name:'Alpha',canManage:true},{id:'11',name:'Beta',canManage:true}]};
      else if (path === '/api/session/switch') { guild = request.postDataJSON().guild_id; value = {ok:true,guildId:guild}; }
      else if (path === '/api/guild-context') value = {guildId:guild,name:'Sample',permissions:'8',channels:[{id:'20',name:'support',type:'text'}],roles:[],bot:{available:true,permissions:scenario === 'no-permissions' ? '2048' : '8'},hierarchy:{known:true},capabilities:{channelSelectors:true,roleSelectors:true,permissionPreflight:true}};
      else if (path === '/api/config/features') value = {guildId:guild,features:[feature]};
      else if (path === '/api/config/features/support.tickets') {
        if (request.method() === 'PUT') {
          writes++;
          const body = request.postDataJSON();
          assert.equal(body.enabled,enabled,'creating a channel must not enable Tickets');
          assert.equal(body.config.panelChannel,'30');
          assert.equal(body.expected_revision,revision);
          if (scenario === 'save-failure') { await route.fulfill({status:503,json:{code:'temporary_failure'}}); return; }
          saved = body.config; revision++;
        }
        value = {...feature,guildId:guild,config:saved,defaults:{},revision,schema:{sections:[{title:'Support workflow',fields:[{key:'panelChannel',label:'Ticket panel channel',kind:'channel'},{key:'categoryId',label:'Ticket category',kind:'category'},{key:'staffRole',label:'Staff role to notify',kind:'role'},{key:'maxOpen',label:'Open tickets per member',kind:'number'}]}]}};
      } else if (path.endsWith('/preflight')) value = {guildId:guild,ok:true,issues:[]};
      else if (path === '/api/quotas') value = {plan:'Free',limits:{},usage:{}};
      else if (path === '/api/stats') value = {guildId:guild,totalCases:0};
      else if (path === '/api/cases') value = {cases:[]};
      else if (path === '/api/audit') value = {events:[]};
      else if (path === '/api/activity') value = {activity:[]};
      else { await route.fulfill({status:503,json:{}}); return; }
      await route.fulfill({json:value});
    });
    await page.goto(`${base}#/config/support.tickets`);
    const setup = page.locator('.ticket-panel-channel');
    const button = setup.getByRole('button',{name:pt ? 'Criar canal para tickets' : 'Create ticket panel channel',exact:true});
    await button.waitFor();
    const selected = page.locator('select').filter({has:page.locator('option', {hasText:pt ? 'Escolhe o canal para o botão' : 'Choose the channel for the Open ticket button'})});
    if (scenario === 'no-permissions') {
      assert.equal(await button.isDisabled(),true);
      assert.equal(creates,0);
    } else {
      const name = setup.getByRole('textbox');
      assert.equal(await name.inputValue(),'tickets');
      await name.fill('../bad'); assert.equal(await button.isDisabled(),true);
      await name.fill('tickets');
      await button.click();
      assert.equal(await setup.getByRole('button').isDisabled(),true);
      if (['route-change','guild-switch'].includes(scenario)) {
        if (scenario === 'route-change') await page.evaluate(() => { window.location.hash = '#/features'; });
        else await page.getByRole('combobox',{name:'Current server',exact:true}).selectOption('11');
        await page.waitForTimeout(1700);
        assert.equal(await page.locator('select option[value="30"]').count(),0,'late response must not change another view or guild');
        assert.equal(writes,0);
      } else if (['collision','permission-error','uncertain','wrong-guild'].includes(scenario)) {
        await setup.getByRole('alert').waitFor();
        assert.equal(await selected.inputValue(),'20');
        assert.equal(writes,0);
        if (scenario === 'collision') assert.match(await setup.getByRole('alert').innerText(),/already exists/);
        if (scenario === 'permission-error') assert.match(await setup.getByRole('alert').innerText(),/permissions/);
      } else {
        await setup.getByRole('status').filter({hasText:pt ? 'está pronto' : 'is ready'}).waitFor();
        assert.equal(await selected.inputValue(),'30');
        await page.waitForTimeout(1500);
        assert.ok(writes > 0,'selection must auto-save');
        assert.equal(saved.panelChannel,scenario === 'save-failure' ? '20' : '30');
        assert.equal(await setup.getByRole('button').count(),0,'hide creation after success');
        if (['create','mobile','pt'].includes(scenario)) {
          await mkdir('output/playwright',{recursive:true});
          await page.screenshot({path:`output/playwright/ticket-channel-${scenario}.png`,fullPage:true});
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
      }
      assert.equal(creates,1,'one deliberate click sends only one creation request');
    }
    assert.ok(mutations.every(path => ['/api/tickets/channel','/api/session/switch','/api/config/features/support.tickets','/api/config/features/support.tickets/preflight'].includes(path)), 'no unexpected mutations');
    console.log(`PASS ticket-channel-${scenario}`);
    await page.close();
  }
} finally { await browser.close(); }
