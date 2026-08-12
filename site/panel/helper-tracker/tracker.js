(() => {
  'use strict';

  const API = 'https://api.vozen.org/rust';
  const $ = (id) => document.getElementById(id);
  let sessionBearer = null;
  try {
    sessionBearer = sessionStorage.getItem('vh_session_bearer');
  } catch (_) {
    // Storage is optional. A same-site cookie can still authenticate the request.
  }
  const request = async (path, init = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(sessionBearer ? { Authorization: `Bearer ${sessionBearer}` } : {}),
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  };

  const formatTime = (value) => {
    const timestamp = typeof value === 'number' ? value : Date.parse(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return 'agora';
    return new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' })
      .format(new Date(timestamp));
  };
  const setText = (id, value) => { $(id).textContent = value; };
  const initial = (name) => (String(name || '?').trim().slice(0, 1) || '?').toUpperCase();

  function setState(cardId, status, label) {
    $(cardId).dataset.state = status;
    $(cardId === 'runtimeCard' ? 'runtimeStatus' : 'moduleStatus').textContent = label;
  }

  function clearRows(id) {
    const root = $(id);
    while (root.firstChild) root.removeChild(root.firstChild);
    return root;
  }

  function renderGuilds(guilds, selectedId) {
    const body = clearRows('guildRows');
    setText('guildCount', String(guilds.length));
    $('guildEmpty').hidden = guilds.length > 0;
    guilds.forEach((guild) => {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      const wrap = document.createElement('span');
      wrap.className = 'server';
      const icon = document.createElement('span');
      icon.className = 'server-icon';
      icon.textContent = initial(guild.name);
      const label = document.createElement('span');
      label.textContent = guild.name || 'Servidor sem nome';
      wrap.append(icon, label);
      name.appendChild(wrap);
      const access = document.createElement('td');
      access.className = 'access';
      access.textContent = guild.canManage ? 'Gerível' : 'Sem acesso';
      const state = document.createElement('td');
      state.className = guild.id === selectedId ? 'server-selected' : '';
      state.textContent = guild.id === selectedId ? 'Selecionado' : 'Disponível';
      tr.append(name, access, state);
      body.appendChild(tr);
    });
  }

  function renderActivity(activity) {
    const list = clearRows('activityRows');
    $('activityEmpty').hidden = activity.length > 0;
    activity.slice(0, 10).forEach((event) => {
      const item = document.createElement('li');
      const copy = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = event.kind || 'Ação do Helper';
      const detail = document.createElement('span');
      detail.textContent = event.user_tag || event.detail || event.user_id || 'Sem detalhes';
      copy.append(title, detail);
      const time = document.createElement('time');
      time.textContent = formatTime(event.created_at);
      item.append(copy, time);
      list.appendChild(item);
    });
  }

  function renderUnavailable() {
    setState('runtimeCard', 'error', 'Indisponível');
    setText('runtimeValue', '—');
    setText('runtimeDetail', 'Não foi possível obter a leitura agora.');
    setText('runtimeApi', 'Sem leitura');
    setText('runtimeGuild', '—');
    setState('moduleCard', 'error', 'Indisponível');
    setText('moduleValue', '—');
    setText('moduleDetail', 'Não foi possível obter os módulos agora.');
    setText('modulesEnabled', '—');
    setText('modulesAvailable', '—');
    setText('activityValue', '—');
    setText('activityDetail', 'Não foi possível obter a atividade agora.');
    setText('lastUpdated', 'Tenta atualizar novamente.');
    $('runtimeFill').style.width = '0%';
    $('moduleFill').style.width = '0%';
  }

  async function load() {
    const refresh = $('refreshButton');
    refresh.disabled = true;
    refresh.classList.add('is-loading');
    try {
      const [health, me, guildData, featuresData, stats, activityData, quota] = await Promise.all([
        request('/health'),
        request('/api/me'),
        request('/api/guilds'),
        request('/api/config/features'),
        request('/api/stats'),
        request('/api/activity?limit=24'),
        request('/api/quotas'),
      ]);
      const guilds = Array.isArray(guildData.guilds) ? guildData.guilds : [];
      const features = Array.isArray(featuresData.features) ? featuresData.features : [];
      const activity = Array.isArray(activityData.activity) ? activityData.activity : [];
      const enabled = features.filter((feature) => feature.enabled).length;
      const selected = guilds.find((guild) => guild.id === me.guildId);
      const plan = String(quota.plan || 'Free');

      setState('runtimeCard', 'healthy', health.status === 'ok' ? 'Ligado' : 'A acompanhar');
      setText('runtimeValue', health.status === 'ok' ? 'Online' : '—');
      setText('runtimeDetail', health.status === 'ok' ? 'API do Helper operacional' : 'A API está a responder com atenção necessária.');
      setText('runtimeApi', health.version ? `v${health.version}` : 'Operacional');
      setText('runtimeGuild', selected ? selected.name : 'Servidor atual');
      $('runtimeFill').style.width = health.status === 'ok' ? '100%' : '50%';

      setState('moduleCard', 'healthy', enabled ? 'Ativos' : 'Sem módulos ativos');
      setText('moduleValue', `${enabled}/${features.length}`);
      setText('moduleDetail', `${enabled} módulo${enabled === 1 ? '' : 's'} ativo${enabled === 1 ? '' : 's'} neste servidor`);
      setText('modulesEnabled', String(enabled));
      setText('modulesAvailable', String(features.length));
      $('moduleFill').style.width = `${features.length ? Math.round((enabled / features.length) * 100) : 0}%`;

      setText('activityValue', String(activity.length));
      setText('activityDetail', activity.length === 1 ? '1 ação recente registada' : `${activity.length} ações recentes registadas`);
      setText('selectedGuildName', selected ? selected.name : 'Servidor atual');
      setText('selectedGuildDetail', `${stats.totalCases || 0} caso${Number(stats.totalCases) === 1 ? '' : 's'} de moderação · Plano ${plan}`);
      setText('sessionLabel', `sessão iniciada · ${plan}`);
      setText('lastUpdated', `Atualizado às ${new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`);
      renderGuilds(guilds, me.guildId);
      renderActivity(activity);
      $('authScreen').hidden = true;
      $('panel').hidden = false;
    } catch (error) {
      if (error && error.status === 401) {
        setText('authMessage', 'Entra com o Discord no painel do Helper e volta para este tracker.');
        $('signinButton').hidden = false;
        return;
      }
      renderUnavailable();
      $('authScreen').hidden = true;
      $('panel').hidden = false;
    } finally {
      refresh.disabled = false;
      refresh.classList.remove('is-loading');
    }
  }

  document.querySelectorAll('[data-detail]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = $(button.dataset.detail);
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      target.hidden = open;
    });
  });
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((tab) => tab.classList.toggle('is-active', tab === button));
      document.getElementById('overviewPane').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  $('refreshButton').addEventListener('click', load);
  $('logoutButton').addEventListener('click', async () => {
    try { await request('/api/logout', { method: 'POST' }); } catch (_) { /* stale cookies still leave the browser */ }
    sessionBearer = null;
    try { sessionStorage.removeItem('vh_session_bearer'); } catch (_) { /* storage optional */ }
    $('panel').hidden = true;
    setText('authMessage', 'Sessão terminada.');
    $('signinButton').hidden = false;
    $('authScreen').hidden = false;
  });
  void load();
})();
