export type RankCardConfig = {
  font: string;
  primary_color: string;
  text_color: string;
  background_color: string;
  overlay_opacity: number;
  background_preset: string | null;
  background_url: string | null;
  background_data: string | null;
  avatar_ring_color: string;
  avatar_ring_width: number;
};

export type Guild = {
  id: string;
  name: string;
  canManage: boolean;
  iconUrl?: string | null;
};
export type Me = { id: string; guildId: string; expiresAt: string; dbOk?: boolean };
export type Feature = {
  key: string;
  label: string;
  description: string;
  category: 'protection' | 'community' | 'management' | 'utility' | 'social' | 'growth' | 'web3';
  capability: string;
  available: boolean;
  enabled: boolean;
  maturity?: 'operational' | 'beta' | 'planned' | 'blocked' | 'degraded';
  configurable?: boolean;
  premium_required?: boolean;
  premium_unlocked?: boolean;
  config_schema_version?: number;
  configSchemaVersion?: number;
  issues?: Array<{ path: string; code: string; message: string; severity: string }>;
  health?: {
    status?: 'ready' | 'degraded' | 'misconfigured' | 'dependency_down' | 'disabled' | 'premium_required';
    operational: boolean;
    adapter?: string | null;
    dependencies?: string[];
  };
};
export type FeatureConfig = Record<string, unknown>;
export type StudioTemplate = {
  id: string;
  name: string;
  description: string;
  modules: string[];
  config: FeatureConfig;
  version: number;
  created_at: string;
  updated_at: string;
};
export type CustomCommand = {
  guild_id?: string;
  name: string;
  content: string;
  author_id?: string;
  created_at?: number;
};
export type WorkflowRecord = {
  id: number;
  guild_id?: string;
  name: string;
  trigger: string;
  condition: string;
  action: 'reply' | 'react' | string;
  payload: string;
  enabled: boolean;
  created_at?: number;
};
export type LeaderboardEntry = {
  rank: number;
  userId: string;
  xp: number;
};
export type ReminderRecord = {
  id: number;
  targetId: string;
  channelId?: string | null;
  text: string;
  repeat?: string | null;
  remaining?: number | null;
  timezone?: string | null;
  localTime?: string | null;
  executeAt: number;
  status: 'pending' | 'running' | 'dead' | string;
  attempts: number;
  leaseUntil?: number | null;
  lastError?: string | null;
};
export type RolePanelRecord = {
  channel_id?: string;
  message_id: string;
  title?: string;
  role_ids?: string[];
  selection_mode?: string;
  remove_on_unselect?: boolean;
  source?: string;
};
export type YouTubeSubscription = {
  id: number;
  sourceChannelId: string;
  targetChannelId: string;
  messageTemplate: string;
  mention: string;
  enabled: boolean;
  intervalSeconds: number;
  lastVideoId?: string | null;
  nextPollAt: number;
  failureCount: number;
  lastError?: string | null;
};
export type RssSubscription = {
  id: number;
  feedUrl: string;
  targetChannelId: string;
  messageTemplate: string;
  mention: string;
  enabled: boolean;
  intervalSeconds: number;
  lastItemId?: string | null;
  nextPollAt: number;
  failureCount: number;
  lastError?: string | null;
};
export type RssSubscriptionHealth = {
  provider: 'rss';
  subscriptionId: number;
  status: 'ready' | 'degraded' | 'dependency_down';
  checkedAt: number;
  failureCount: number;
  lastError?: string | null;
  message?: string;
  feed?: {
    title: string;
    latestItemId?: string | null;
    latestTitle?: string | null;
  };
};
export type YouTubeSubscriptionHealth = {
  provider: 'youtube';
  subscriptionId: number;
  status: 'ready' | 'degraded' | 'dependency_down';
  checkedAt: number;
  failureCount: number;
  lastError?: string | null;
  message?: string;
  channelId?: string;
  latestVideo?: {
    id: string;
    title: string;
    url: string;
    publishedAt: string;
    channelTitle: string;
  };
};
export type TwitchSubscription = {
  id: number;
  sourceLogin: string;
  sourceUserId: string;
  targetChannelId: string;
  messageTemplate: string;
  mention: string;
  enabled: boolean;
  pendingEventId?: string | null;
  pendingStreamId?: string | null;
  pendingStartedAt?: string | null;
  nextPollAt: number;
  failureCount: number;
  lastError?: string | null;
};
export type TwitchSubscriptionHealth = {
  provider: 'twitch';
  subscriptionId: number;
  status: 'ready' | 'degraded' | 'dependency_down';
  checkedAt: number;
  failureCount: number;
  lastError?: string | null;
  message?: string;
  eventSub?: 'enabled' | 'missing';
  channel?: { id: string; login: string; displayName: string };
};
export type ExternalSubscription = {
  id: number;
  sourceSubreddit?: string;
  sourceHandle?: string;
  sourceLabel?: string;
  username?: string;
  targetChannelId: string;
  messageTemplate: string;
  mention: string;
  enabled: boolean;
  intervalSeconds: number;
  lastPostId?: string | null;
  lastVideoId?: string | null;
  lastMediaId?: string | null;
  lastStreamId?: string | null;
  nextPollAt: number;
  failureCount: number;
  lastError?: string | null;
};
export type ExternalProvider = 'reddit' | 'x' | 'tiktok' | 'instagram' | 'kick' | 'bluesky';
export type TikTokOAuthStatus = {
  connected: boolean;
  openId?: string;
  displayName?: string;
  scopes?: string[];
  accessExpiresAt?: number;
  updatedAt?: number;
};
export type FeatureSchema = {
  version: number;
  source: string;
  sections: Array<{
    title: string;
    description: string;
    fields: Array<{
      key: string;
      label: string;
      kind: string;
      help?: string;
      options?: Array<[string, string] | string>;
      min?: number;
      max?: number;
      maxLength?: number;
      step?: number;
      advanced?: boolean;
    }>;
  }>;
};
export type FeatureDetail = {
  guildId: string;
  key: string;
  enabled: boolean;
  config: FeatureConfig;
  defaults?: FeatureConfig;
  schema?: FeatureSchema;
  revision?: number;
  maturity?: Feature['maturity'];
  configurable?: boolean;
  premiumRequired?: boolean;
  premiumUnlocked?: boolean;
  health?: {
    status?: 'ready' | 'degraded' | 'misconfigured' | 'dependency_down' | 'disabled' | 'premium_required';
    operational: boolean;
    adapter?: string | null;
    dependencies?: string[];
    issues?: Array<{ path: string; code: string; message: string; severity: string }>;
  };
  adapter?: string | null;
  dependencies?: string[];
};
export type GuildContext = {
  guildId: string;
  name: string;
  permissions: string;
  channels: Array<{
    id: string;
    name: string;
    type: string;
    overwritesKnown?: boolean;
    overwriteCount?: number;
    botPermissions?: string | null;
    botPermissionsKnown?: boolean;
  }>;
  roles: Array<{
    id: string;
    name: string;
    position: number;
    managed?: boolean;
    manageable?: boolean;
  }>;
  bot?: {
    available: boolean;
    userId?: string | null;
    roleIds?: string[];
    topRolePosition?: number | null;
    permissions?: string | null;
    permissionBitfieldAvailable?: boolean;
    reason?: string | null;
  };
  hierarchy: { known: boolean; topRolePosition?: number | null; reason?: string | null };
  capabilities: { channelSelectors: boolean; roleSelectors: boolean; permissionPreflight: boolean };
  stale: boolean;
  message?: string | null;
};
export type QuickSetupStepKey = 'welcome' | 'roles' | 'moderation' | 'protection';
export type QuickSetupStep = {
  key: QuickSetupStepKey;
  status: 'pending' | 'applied' | 'skipped';
  updatedAt?: string;
  summary?: string;
  revision?: number;
};
export type QuickSetupState = {
  guildId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'dismissed';
  currentStep: QuickSetupStepKey | null;
  revision: number;
  steps: QuickSetupStep[];
  draft?: Record<string, unknown>;
  createdResources: Array<{
    type: 'channel' | 'role' | 'message';
    name: string;
    id?: string;
    state: 'planned' | 'created' | 'reused';
  }>;
  updatedAt?: string;
};
export type CaseRecord = {
  id: number;
  kind?: string;
  type?: string;
  target_id?: string;
  targetId?: string;
  moderator_id?: string;
  moderatorId?: string;
  reason: string;
  created_at?: number;
  createdAt?: string;
};
export type AuditRecord = {
  action: string;
  actor_id?: string;
  actorId?: string;
  outcome: string;
  created_at?: number;
};
export type ActivityRecord = {
  id: number;
  guild_id: string;
  kind: string;
  user_id: string;
  user_tag?: string | null;
  actor_id?: string | null;
  detail: string;
  created_at: number;
};

const base =
  (import.meta.env.VITE_HELPER_API_BASE as string | undefined)?.replace(/\/$/, '') ||
  'https://api.vozen.org/rust';
let sessionBearer: string | null = null;
const OAUTH_RETURN_HASH_KEY = 'vh_oauth_return_hash';
const VOZEN_ACCOUNT_TOKEN_KEY = 'vozen.ecosystem.dtoken';
const AUTH_CHANNEL_NAME = 'vozen.ecosystem.auth.v1';
const SESSION_BRIDGE_TIMEOUT_MS = 6_000;
let vozenAccountBootstrapAttempted = false;

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function isSafePanelHash(value: string): boolean {
  return (
    value === '#/' ||
    value === '#/servers' ||
    value === '#/quick-setup' ||
    value === '#/features' ||
    value === '#/activity' ||
    value === '#/rank-card' ||
    /^#\/config\/[a-z0-9._-]{1,160}$/i.test(value)
  );
}

function rememberOAuthReturnHash(): void {
  const hash = window.location.hash;
  if (!isSafePanelHash(hash)) return;
  try {
    sessionStorage.setItem(OAUTH_RETURN_HASH_KEY, hash);
  } catch {
    /* sessionStorage may be unavailable */
  }
}

export function restoreOAuthReturnHash(): void {
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(OAUTH_RETURN_HASH_KEY);
    sessionStorage.removeItem(OAUTH_RETURN_HASH_KEY);
  } catch {
    return;
  }
  if (!saved || !isSafePanelHash(saved) || window.location.hash === saved) return;
  window.location.hash = saved;
}

function persistSessionBearer(token: string | null): void {
  sessionBearer = token;
  try {
    if (token) sessionStorage.setItem('vh_session_bearer', token);
    else sessionStorage.removeItem('vh_session_bearer');
  } catch {
    /* sessionStorage may be unavailable */
  }
}

try {
  sessionBearer = sessionStorage.getItem('vh_session_bearer');
} catch {
  /* optional */
}
const oauthSession = window.location.hash.match(/^#session=([A-Za-z0-9._~-]{32,4096})$/)?.[1];
if (oauthSession) {
  persistSessionBearer(oauthSession);
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/`);
}

export function apiUrl(path: string): string {
  return `${base}${path}`;
}

function vozenAccountToken(): string | null {
  try {
    const value = sessionStorage.getItem(VOZEN_ACCOUNT_TOKEN_KEY);
    return value && /^[A-Za-z0-9._~-]{20,4096}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

async function requestSharedVozenAccountToken(): Promise<string | null> {
  const current = vozenAccountToken();
  if (current || typeof BroadcastChannel !== 'function') return current;
  return new Promise((resolve) => {
    let settled = false;
    let channel: BroadcastChannel | null = null;
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      if (channel) {
        try {
          channel.close();
        } catch {
          /* optional */
        }
      }
      resolve(token);
    };
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.addEventListener('message', (event) => {
        const message = event.data as { type?: string; token?: unknown };
        if (
          message?.type !== 'session' ||
          typeof message.token !== 'string' ||
          !/^[A-Za-z0-9._~-]{20,4096}$/.test(message.token)
        ) {
          return;
        }
        try {
          sessionStorage.setItem(VOZEN_ACCOUNT_TOKEN_KEY, message.token);
        } catch {
          /* optional */
        }
        window.dispatchEvent(new Event('vozen:authsync'));
        finish(message.token);
      });
      channel.postMessage({ type: 'request' });
      window.setTimeout(() => finish(null), 250);
    } catch {
      finish(null);
    }
  });
}

// Exchange the account's Discord token for the signed Helper session cookie.
// The raw token is sent once in an HTTPS request body and is never used as a
// Helper API bearer because the Rust API only accepts its own signed sessions.
type ReadOptions = { signal?: AbortSignal };

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted', 'AbortError');
  }
}

export async function bootstrapVozenAccountSession(signal?: AbortSignal): Promise<boolean> {
  throwIfAborted(signal);
  if (vozenAccountBootstrapAttempted) return false;
  vozenAccountBootstrapAttempted = true;
  const token = await requestSharedVozenAccountToken();
  throwIfAborted(signal);
  if (!token) return false;
  // A fresh first-party account exchange must win over any stale legacy
  // Helper bearer left in this tab from an earlier OAuth flow.
  persistSessionBearer(null);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const abortParent = () => controller?.abort();
  signal?.addEventListener('abort', abortParent, { once: true });
  const timer = controller
    ? window.setTimeout(() => controller.abort(), SESSION_BRIDGE_TIMEOUT_MS)
    : null;
  try {
    const response = await fetch(apiUrl('/api/session/vozen'), {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    return response.ok;
  } catch (cause) {
    if (signal?.aborted) throw cause;
    return false;
  } finally {
    if (timer) window.clearTimeout(timer);
    signal?.removeEventListener('abort', abortParent);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    // Feature maturity and guild health are live state.  Never let the
    // browser reuse a cached catalogue after a backend release or guild
    // switch; otherwise a previously planned module can remain displayed as
    // Planned until the cache expires.
    cache: init?.cache ?? 'no-store',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(sessionBearer ? { Authorization: `Bearer ${sessionBearer}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };
    if (response.status === 401) persistSessionBearer(null);
    throw new ApiError(payload.message ?? payload.code ?? `API ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

async function meOrBootstrap(options?: ReadOptions): Promise<Me> {
  try {
    return await request<Me>('/api/me', options);
  } catch (cause) {
    if (options?.signal?.aborted || (cause instanceof Error && cause.name === 'AbortError')) {
      throw cause;
    }
    if (!(cause instanceof ApiError) || cause.status !== 401) throw cause;
    const restored = await bootstrapVozenAccountSession(options?.signal);
    if (!restored) throw cause;
    return request<Me>('/api/me', options);
  }
}

export const api = {
  bootstrapVozenAccountSession,
  me: (options?: ReadOptions) => request<Me>('/api/me', options),
  meOrBootstrap,
  guilds: (options?: ReadOptions) => request<{ guilds: Guild[] }>('/api/guilds', options),
  guildContext: (options?: ReadOptions) => request<GuildContext>('/api/guild-context', options),
  quickSetup: (options?: ReadOptions) => request<QuickSetupState>('/api/quick-setup', options),
  saveQuickSetupStep: (
    step: QuickSetupStepKey,
    payload: {
      status: 'applied' | 'skipped';
      config?: Record<string, unknown>;
      enabled?: boolean;
      expectedRevision?: number;
    },
  ) =>
    request<QuickSetupState>(`/api/quick-setup/steps/${step}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: payload.status,
        config: payload.config ?? {},
        enabled: payload.enabled ?? true,
        expected_revision: payload.expectedRevision,
      }),
    }),
  dismissQuickSetup: () =>
    request<QuickSetupState>('/api/quick-setup/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }),
  switchGuild: (guildId: string) =>
    request<{ ok: boolean; guildId: string }>('/api/session/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guild_id: guildId }),
    }),
  stats: (options?: ReadOptions) => request<{ totalCases: number; guildId: string }>('/api/stats', options),
  leaderboard: (options?: ReadOptions) =>
    request<{
      guildId: string;
      enabled: boolean;
      public: boolean;
      maxEntries: number;
      entries: LeaderboardEntry[];
    }>('/api/leaderboard', options),
  reminders: (options?: ReadOptions) =>
    request<{ guildId: string; enabled: boolean; reminders: ReminderRecord[] }>(
      '/api/reminders?limit=100', options,
    ),
  cancelReminder: (id: number) =>
    request<{ ok: boolean; id: number }>(`/api/reminders/${id}`, { method: 'DELETE' }),
  retryReminder: (id: number) =>
    request<{ ok: boolean; id: number }>(`/api/reminders/${id}/retry`, { method: 'POST' }),
  cases: (options?: ReadOptions) => request<{ cases: CaseRecord[] }>('/api/cases?limit=8', options),
  audit: (options?: ReadOptions) => request<{ events: AuditRecord[] }>('/api/audit?limit=12', options),
  activity: (options?: ReadOptions) => request<{ activity: ActivityRecord[] }>('/api/activity?limit=24', options),
  quotas: (options?: ReadOptions) =>
    request<{ plan: string; limits: Record<string, number>; usage: Record<string, number> }>(
      '/api/quotas',
      options,
    ),
  modules: (options?: ReadOptions) => request<{ modules: string[] }>('/api/modules', options),
  customCommands: () =>
    request<{
      guildId: string;
      enabled: boolean;
      limit: number;
      maxResponseLength: number;
      commands: CustomCommand[];
    }>('/api/custom-commands'),
  workflows: () =>
    request<{
      guildId: string;
      enabled: boolean;
      planLimit: number;
      maxWorkflows: number;
      maxReplyLength: number;
      workflows: WorkflowRecord[];
    }>('/api/workflows'),
  createWorkflow: (payload: {
    name: string;
    trigger: 'message';
    condition?: string;
    action: 'reply' | 'react';
    payload: string;
  }) =>
    request<{ id: number }>('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  updateWorkflow: (id: number, enabled: boolean) =>
    request<{ ok: boolean; id: number; enabled: boolean }>(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }),
  deleteWorkflow: (id: number) =>
    request<{ ok: boolean }>(`/api/workflows/${id}`, { method: 'DELETE' }),
  createCustomCommand: (name: string, content: string) =>
    request<{ command: CustomCommand }>('/api/custom-commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content }),
    }),
  updateCustomCommand: (name: string, content: string) =>
    request<{ command: CustomCommand }>(`/api/custom-commands/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content }),
    }),
  deleteCustomCommand: (name: string) =>
    request<{ ok: boolean; name: string }>(`/api/custom-commands/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
  rolePanels: (options?: ReadOptions) =>
    request<{ guildId: string; panels: RolePanelRecord[] }>('/api/role-panels', options),
  createRolePanel: (payload: {
    channel: string;
    title: string;
    description: string;
    roleIds: string[];
    selectionMode: 'multiple' | 'unique';
    removeOnUnselect: boolean;
  }) =>
    request<{ messageId: string; config: FeatureConfig }>('/api/role-panels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  updateRolePanel: (messageId: string, payload: {
    channel: string;
    title: string;
    description: string;
    roleIds: string[];
    selectionMode: 'multiple' | 'unique';
    removeOnUnselect: boolean;
  }) =>
    request<{ ok: boolean; messageId: string; config: FeatureConfig }>(
      `/api/role-panels/${encodeURIComponent(messageId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    ),
  deleteRolePanel: (messageId: string) =>
    request<{ ok: boolean; messageId: string }>(`/api/role-panels/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    }),
  repairRolePanel: (messageId: string) =>
    request<{ ok: boolean; messageId: string; config: FeatureConfig }>(
      `/api/role-panels/${encodeURIComponent(messageId)}/repair`,
      { method: 'POST' },
    ),
  features: (options?: ReadOptions) => request<{ guildId: string; features: Feature[] }>('/api/config/features', options),
  updateFeature: (key: string, enabled: boolean) =>
    request<{ ok: boolean; enabled: boolean }>('/api/config/features', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, enabled }),
    }),
  feature: (key: string, options?: ReadOptions) =>
    request<FeatureDetail>(`/api/config/features/${encodeURIComponent(key)}`, options),
  featureHealth: (key: string, options?: ReadOptions) =>
    request<FeatureDetail['health']>(`/api/config/features/${encodeURIComponent(key)}/health`, options),
  featurePreflight: (key: string, config: FeatureConfig, enabled = true) =>
    request<{
      operation: string;
      guildId: string;
      ok: boolean;
      issues: Array<{ path: string; code: string; message: string; severity: string }>;
      checks: Record<string, unknown>;
    }>(`/api/config/features/${encodeURIComponent(key)}/preflight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, enabled }),
    }),
  saveFeature: (key: string, enabled: boolean, config: FeatureConfig, expectedRevision?: number) =>
    request<FeatureDetail>(`/api/config/features/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, config, expected_revision: expectedRevision }),
    }),
  repairFeature: (key: string) =>
    request<FeatureDetail & { repaired?: boolean }>(
      `/api/config/features/${encodeURIComponent(key)}/repair`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  testFeature: (key: string, config: FeatureConfig) =>
    request<{
      ok: boolean;
      key: string;
      preview: FeatureConfig;
      mode: string;
      maturity: string;
      result: {
        key: string;
        would_apply: boolean;
        issues: Array<{ path: string; code: string; message: string; severity: string }>;
        effects: string[];
      };
      decision?: {
        ignored: boolean;
        matched: string[];
        should_act: boolean;
        timeout_seconds: number;
        reason: string;
      } | null;
    }>(`/api/config/features/${encodeURIComponent(key)}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    }),
  preflight: (operation: string, config: FeatureConfig, enabled = true) =>
    request<{
      operation: string;
      guildId: string;
      ok: boolean;
      issues: Array<{ path: string; code: string; message: string; severity: string }>;
      checks: Record<string, unknown>;
    }>('/api/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, config, enabled }),
    }),
  youtubeSubscriptions: (options?: ReadOptions) =>
    request<{ guildId: string; subscriptions: YouTubeSubscription[] }>('/api/config/youtube', options),
  createYoutubeSubscription: (payload: {
    sourceChannelId: string;
    targetChannelId: string;
    messageTemplate: string;
    mention: string;
    intervalSeconds: number;
    enabled: boolean;
  }) =>
    request<YouTubeSubscription>('/api/config/youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_channel_id: payload.sourceChannelId,
        target_channel_id: payload.targetChannelId,
        message_template: payload.messageTemplate,
        mention: payload.mention,
        interval_seconds: payload.intervalSeconds,
        enabled: payload.enabled,
      }),
    }),
  updateYoutubeSubscription: (
    id: number,
    payload: {
      sourceChannelId: string;
      targetChannelId: string;
      messageTemplate: string;
      mention: string;
      intervalSeconds: number;
      enabled: boolean;
    },
  ) =>
    request<YouTubeSubscription>(`/api/config/youtube/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_channel_id: payload.sourceChannelId,
        target_channel_id: payload.targetChannelId,
        message_template: payload.messageTemplate,
        mention: payload.mention,
        interval_seconds: payload.intervalSeconds,
        enabled: payload.enabled,
      }),
    }),
  youtubeHealth: (id: number, options?: ReadOptions) =>
    request<YouTubeSubscriptionHealth>(`/api/config/youtube/${id}/health`, options),
  testYoutubeDelivery: (
    id: number,
    payload: {
      sourceChannelId: string;
      targetChannelId: string;
      messageTemplate: string;
      mention: string;
      intervalSeconds: number;
      enabled: boolean;
    },
  ) =>
    request<{
      provider: 'youtube';
      subscriptionId: number;
      delivered: boolean;
      testedAt: number;
      videoId?: string | null;
    }>(`/api/config/youtube/${id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_channel_id: payload.sourceChannelId,
        target_channel_id: payload.targetChannelId,
        message_template: payload.messageTemplate,
        mention: payload.mention,
        interval_seconds: payload.intervalSeconds,
        enabled: payload.enabled,
      }),
    }),
  rssSubscriptions: (options?: ReadOptions) =>
    request<{ guildId: string; subscriptions: RssSubscription[] }>('/api/config/rss', options),
  rssPreview: (url: string) =>
    request<{
      provider: string;
      feed: {
        url: string;
        title: string;
        latest?: { id: string; title: string; url: string } | null;
      };
    }>(`/api/providers/rss/preview?url=${encodeURIComponent(url)}`),
  createRssSubscription: (payload: {
    feedUrl: string;
    targetChannelId: string;
    messageTemplate: string;
    mention: string;
    intervalSeconds: number;
    enabled: boolean;
  }) =>
    request<RssSubscription>('/api/config/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feed_url: payload.feedUrl,
        target_channel_id: payload.targetChannelId,
        message_template: payload.messageTemplate,
        mention: payload.mention,
        interval_seconds: payload.intervalSeconds,
        enabled: payload.enabled,
      }),
    }),
  updateRssSubscription: (
    id: number,
    payload: {
      feedUrl: string;
      targetChannelId: string;
      messageTemplate: string;
      mention: string;
      intervalSeconds: number;
      enabled: boolean;
    },
  ) =>
    request<RssSubscription>(`/api/config/rss/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feed_url: payload.feedUrl,
        target_channel_id: payload.targetChannelId,
        message_template: payload.messageTemplate,
        mention: payload.mention,
        interval_seconds: payload.intervalSeconds,
        enabled: payload.enabled,
      }),
    }),
  deleteRssSubscription: (id: number) =>
    request<{ deleted: boolean; id: number }>(`/api/config/rss/${id}`, { method: 'DELETE' }),
  rssHealth: (id: number, options?: ReadOptions) =>
    request<RssSubscriptionHealth>(`/api/config/rss/${id}/health`, options),
  testRssDelivery: (
    id: number,
    payload: {
      feedUrl: string;
      targetChannelId: string;
      messageTemplate: string;
      mention: string;
      intervalSeconds: number;
      enabled: boolean;
    },
  ) =>
    request<{
      provider: 'rss';
      subscriptionId: number;
      delivered: boolean;
      testedAt: number;
      itemId?: string | null;
    }>(`/api/config/rss/${id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feed_url: payload.feedUrl,
        target_channel_id: payload.targetChannelId,
        message_template: payload.messageTemplate,
        mention: payload.mention,
        interval_seconds: payload.intervalSeconds,
        enabled: payload.enabled,
      }),
    }),
  twitchSubscriptions: (options?: ReadOptions) =>
    request<{ guildId: string; subscriptions: TwitchSubscription[] }>('/api/config/twitch', options),
  twitchChannel: (login: string) =>
    request<{
      provider: string;
      channel: { id: string; login: string; display_name: string; profile_image_url: string };
    }>(`/api/providers/twitch/channels/${encodeURIComponent(login)}`),
  createTwitchSubscription: (payload: {
    sourceLogin: string;
    targetChannelId: string;
    messageTemplate: string;
    mention: string;
    enabled: boolean;
  }) =>
    request<TwitchSubscription>('/api/config/twitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceLogin: payload.sourceLogin,
        targetChannelId: payload.targetChannelId,
        messageTemplate: payload.messageTemplate,
        mention: payload.mention,
        enabled: payload.enabled,
      }),
    }),
  updateTwitchSubscription: (
    id: number,
    payload: {
      sourceLogin: string;
      targetChannelId: string;
      messageTemplate: string;
      mention: string;
      enabled: boolean;
    },
  ) =>
    request<TwitchSubscription>(`/api/config/twitch/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceLogin: payload.sourceLogin,
        targetChannelId: payload.targetChannelId,
        messageTemplate: payload.messageTemplate,
        mention: payload.mention,
        enabled: payload.enabled,
      }),
    }),
  deleteTwitchSubscription: (id: number) =>
    request<{ deleted: boolean; id: number }>(`/api/config/twitch/${id}`, { method: 'DELETE' }),
  twitchHealth: (id: number, options?: ReadOptions) =>
    request<TwitchSubscriptionHealth>(`/api/config/twitch/${id}/health`, options),
  testTwitchDelivery: (
    id: number,
    payload: {
      sourceLogin: string;
      targetChannelId: string;
      messageTemplate: string;
      mention: string;
      enabled: boolean;
    },
  ) =>
    request<{
      provider: 'twitch';
      subscriptionId: number;
      delivered: boolean;
      testedAt: number;
    }>(`/api/config/twitch/${id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceLogin: payload.sourceLogin,
        targetChannelId: payload.targetChannelId,
        messageTemplate: payload.messageTemplate,
        mention: payload.mention,
        enabled: payload.enabled,
      }),
    }),
  externalSubscriptions: (provider: ExternalProvider, options?: ReadOptions) =>
    request<{ guildId: string; subscriptions: ExternalSubscription[] }>(
      `/api/config/${provider}`, options,
    ),
  createExternalSubscription: (
    provider: ExternalProvider,
    payload: {
      sourceSubreddit?: string;
      sourceHandle?: string;
      sourceLabel?: string;
      username?: string;
      targetChannelId: string;
      messageTemplate: string;
      mention: string;
      intervalSeconds: number;
      enabled: boolean;
    },
  ) =>
    request<ExternalSubscription>(`/api/config/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  updateExternalSubscription: (
    provider: ExternalProvider,
    id: number,
    payload: {
      sourceSubreddit?: string;
      sourceHandle?: string;
      sourceLabel?: string;
      username?: string;
      targetChannelId: string;
      messageTemplate: string;
      mention: string;
      intervalSeconds: number;
      enabled: boolean;
    },
  ) =>
    request<ExternalSubscription>(`/api/config/${provider}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteExternalSubscription: (provider: ExternalProvider, id: number) =>
    request<{ deleted: boolean; id: number }>(`/api/config/${provider}/${id}`, {
      method: 'DELETE',
    }),
  tiktokOAuthStatus: (options?: ReadOptions) =>
    request<TikTokOAuthStatus>('/api/providers/tiktok/oauth/status', options),
  startTikTokOAuth: () =>
    request<{ authorization_url: string }>('/api/providers/tiktok/oauth/start', {
      method: 'POST',
    }),
  disconnectTikTokOAuth: () =>
    request<{ ok: boolean }>('/api/providers/tiktok/oauth/connection', {
      method: 'DELETE',
    }),
  rankCard: (options?: ReadOptions) => request<{ guildId: string; config: RankCardConfig }>('/api/studio/rank-card', options),
  saveRankCard: (config: RankCardConfig) =>
    request<{ guildId: string; config: RankCardConfig }>('/api/studio/rank-card', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }),
  studioTemplates: (options?: ReadOptions) =>
    request<{ guildId: string; templates: StudioTemplate[] }>('/api/studio/templates', options),
  createStudioTemplate: (payload: {
    name: string;
    description: string;
    modules: string[];
    config: FeatureConfig;
  }) =>
    request<{ guildId: string; template: StudioTemplate }>('/api/studio/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteStudioTemplate: (id: string) =>
    request<void>(`/api/studio/templates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  startOAuth: async (guildId = '') => {
    persistSessionBearer(null);
    rememberOAuthReturnHash();
    const verifier =
      crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    try {
      sessionStorage.setItem('vh_oauth_verifier', verifier);
    } catch {
      /* optional storage */
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
    const result = await request<{ authorization_url: string }>('/api/oauth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guild_id: guildId,
        code_challenge: challenge,
        code_verifier: verifier,
      }),
    });
    window.location.assign(result.authorization_url);
  },
};
