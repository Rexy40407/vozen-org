import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  api,
  restoreOAuthReturnHash,
  type ActivityRecord,
  type AuditRecord,
  type CaseRecord,
  type CustomCommand,
  type Feature,
  type FeatureConfig,
  type FeatureSchema,
  type ExternalProvider,
  type ExternalSubscription,
  type Guild,
  type GuildContext,
  type LeaderboardEntry,
  type Me,
  type QuickSetupState,
  type QuickSetupStepKey,
  type RankCardConfig,
  type ReminderRecord,
  type RolePanelRecord,
  type RssSubscription,
  type RssSubscriptionHealth,
  type StudioTemplate,
  type TwitchSubscription,
  type TwitchSubscriptionHealth,
  type WorkflowRecord,
  type YouTubeSubscription,
  type YouTubeSubscriptionHealth,
} from './api';
import { docsProviderStatusUrl, docsTroubleshootingUrl, docsUrlForFeature } from './docs';

const defaultRankCard: RankCardConfig = {
  font: 'system',
  primary_color: '#8EE5D2',
  text_color: '#F4F7FB',
  background_color: '#101725',
  overlay_opacity: 0.36,
  background_preset: null,
  background_url: null,
  background_data: null,
  avatar_ring_color: '#8EE5D2',
  avatar_ring_width: 4,
};
const swatches = ['#8EE5D2', '#7F9CF5', '#F6AD55', '#F687B3', '#A78BFA', '#F4F7FB'];
const presetOptions = [
  ['aurora-lake', 'Aurora Lake', './rank-card-banners/banner-01-aurora-lake.png'],
  ['neon-rain', 'Neon Rain', './rank-card-banners/banner-02-neon-rain.png'],
  ['enchanted-forest', 'Enchanted Forest', './rank-card-banners/banner-03-enchanted-forest.png'],
  ['desert-ruins', 'Desert Ruins', './rank-card-banners/banner-04-desert-ruins.png'],
  ['coral-cavern', 'Coral Cavern', './rank-card-banners/banner-05-coral-cavern.png'],
  ['sky-islands', 'Sky Islands', './rank-card-banners/banner-06-sky-islands.png'],
  ['volcanic-forge', 'Volcanic Forge', './rank-card-banners/banner-07-volcanic-forge.png'],
  ['moonlit-village', 'Moonlit Village', './rank-card-banners/banner-08-moonlit-village.png'],
  ['starship-hangar', 'Starship Hangar', './rank-card-banners/banner-09-starship-hangar.png'],
  ['lavender-storm', 'Lavender Storm', './rank-card-banners/banner-10-lavender-storm.png'],
] as const;
// Production builds must talk to the Rust API even when GitHub Pages does not
// inject Vite environment variables. Local preview is opt-in so a missing build
// variable cannot silently hide the real catalogue and guild state.
const localPreviewMode =
  (import.meta.env.VITE_HELPER_LOCAL_PREVIEW as string | undefined)?.toLowerCase() === 'true';

type Category =
  'all' | 'protection' | 'community' | 'management' | 'utility' | 'social' | 'growth' | 'web3';
type Route = {
  page: 'overview' | 'servers' | 'features' | 'activity' | 'rank-card' | 'quick-setup' | 'detail';
  key?: string;
};
type ProviderSubscriptionHealth =
  | RssSubscriptionHealth
  | TwitchSubscriptionHealth
  | YouTubeSubscriptionHealth;
type FieldSpec = {
  key: string;
  label: string;
  kind:
    | 'toggle'
    | 'text'
    | 'number'
    | 'select'
    | 'textarea'
    | 'tags'
    | 'channel'
    | 'category'
    | 'channels'
    | 'role'
    | 'roles';
  help?: string;
  options?: Array<[string, string] | string>;
  min?: number;
  max?: number;
  maxLength?: number;
  step?: number;
  advanced?: boolean;
};
type SectionSpec = { title: string; description: string; fields: FieldSpec[] };

// The API adapter owns the schema.  Persisted settings can outlive a schema
// revision, so remove fields that no longer have a runtime projection before
// they reach the editor or a subsequent publish.  Provider adapters with an
// intentionally empty schema keep their dedicated subscription payload intact.
function configForSchema(
  schema: FeatureSchema,
  defaults: FeatureConfig,
  stored: FeatureConfig,
): FeatureConfig {
  const fields = schema.sections.flatMap((section) => section.fields);
  if (fields.length === 0) return { ...defaults, ...stored };
  const supported = new Set(fields.map((field) => field.key));
  return Object.fromEntries(
    Object.entries({ ...defaults, ...stored }).filter(([key]) => supported.has(key)),
  );
}

const pages = [
  { id: 'overview', label: 'Dashboard', icon: '⌂', hint: 'Overview' },
  { id: 'quick-setup', label: 'Quick Setup', icon: '✧', hint: 'Guided setup' },
  { id: 'features', label: 'Features', icon: '✦', hint: 'Configure modules' },
  { id: 'activity', label: 'Activity', icon: '◷', hint: 'Server history' },
  { id: 'rank-card', label: 'XP card', icon: '▣', hint: 'Levels and identity' },
] as const;
const categories: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'protection', label: 'Protection' },
  { id: 'community', label: 'Community' },
  { id: 'management', label: 'Management' },
  { id: 'utility', label: 'Utilities' },
  { id: 'social', label: 'Social alerts' },
  { id: 'growth', label: 'Growth' },
  { id: 'web3', label: 'Web3' },
];
const demoGuilds: Guild[] = [{ id: 'demo', name: 'Demo server', canManage: true }];
const demoFeatures: Feature[] = [
  {
    key: 'protection.antispam',
    label: 'Spam protection',
    description: 'Detects flooding, repeated messages, and excessive mentions.',
    category: 'protection',
    capability: 'security',
    available: true,
    enabled: true,
  },
  {
    key: 'protection.antiscam',
    label: 'Scam protection',
    description: 'Blocks suspicious links, invites, and phishing patterns.',
    category: 'protection',
    capability: 'security',
    available: true,
    enabled: true,
  },
  {
    key: 'protection.anti_raid',
    label: 'Anti-raid',
    description: 'Responds to unusual joins and protects the server.',
    category: 'protection',
    capability: 'security',
    available: true,
    enabled: false,
  },
  {
    key: 'protection.join_gate',
    label: 'Join protection',
    description: 'Applies basic checks to new members.',
    category: 'protection',
    capability: 'security',
    available: true,
    enabled: false,
  },
  {
    key: 'community.levels',
    label: 'Levels & XP',
    description: 'Rewards healthy conversation with XP and levels.',
    category: 'community',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'community.leaderboard',
    label: 'XP leaderboard',
    description: 'Shows community progress with configurable privacy.',
    category: 'community',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'community.starboard',
    label: 'Starboard',
    description: 'Highlights popular community messages.',
    category: 'community',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'community.suggestions',
    label: 'Suggestions',
    description: 'Collects ideas and lets the community vote.',
    category: 'community',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'community.giveaways',
    label: 'Giveaways',
    description: 'Creates giveaways with trackable entries.',
    category: 'community',
    capability: 'events',
    available: true,
    enabled: false,
  },
  {
    key: 'support.tickets',
    label: 'Tickets',
    description: 'Keeps support requests in one place.',
    category: 'management',
    capability: 'support',
    available: true,
    enabled: false,
  },
  {
    key: 'support.welcome',
    label: 'Welcome messages',
    description: 'Welcomes new members with a guided message.',
    category: 'management',
    capability: 'core',
    available: true,
    enabled: false,
  },
  {
    key: 'support.welcome_channel',
    label: 'Welcome channel',
    description: 'Organizes rules, information, and first steps for newcomers.',
    category: 'management',
    capability: 'core',
    available: true,
    enabled: false,
  },
  {
    key: 'management.nickname',
    label: 'Nickname',
    description: 'Sets the name the Helper displays in this server.',
    category: 'management',
    capability: 'core',
    available: true,
    enabled: false,
    maturity: 'operational',
    configurable: true,
  },
  {
    key: 'management.workflows',
    label: 'Automations',
    description: 'Connects a trigger to a response without code.',
    category: 'management',
    capability: 'automate',
    available: true,
    enabled: false,
  },
  {
    key: 'management.polls',
    label: 'Polls',
    description: 'Publishes simple polls for quick decisions.',
    category: 'management',
    capability: 'events',
    available: true,
    enabled: false,
  },
  {
    key: 'insights.stats',
    label: 'Stats channels',
    description: 'Tracks server activity and trends.',
    category: 'management',
    capability: 'insights',
    available: true,
    enabled: false,
  },
  {
    key: 'studio.rank_card',
    label: 'XP card',
    description: 'Personalizes the level card shown in Discord.',
    category: 'community',
    capability: 'studio',
    available: true,
    enabled: true,
  },
];
const additionalFeatures: Feature[] = [
  {
    key: 'management.moderation',
    label: 'Moderation',
    description: 'Centralizes server rules, alerts, and moderation actions.',
    category: 'management',
    capability: 'security',
    available: true,
    enabled: false,
  },
  {
    key: 'management.custom_commands',
    label: 'Custom commands',
    description: 'Creates reusable answers for community questions and routines.',
    category: 'management',
    capability: 'automate',
    available: true,
    enabled: false,
  },
  {
    key: 'management.audit',
    label: 'Audit & permissions',
    description: 'Tracks important changes and keeps your team aligned.',
    category: 'management',
    capability: 'security',
    available: true,
    enabled: false,
  },
  {
    key: 'management.privacy',
    label: 'Privacy & data',
    description: 'View, export, and safely delete your server data.',
    category: 'management',
    capability: 'core',
    available: true,
    enabled: false,
  },
  {
    key: 'management.templates',
    label: 'Templates & import',
    description: 'Save the configuration and reuse it on another server.',
    category: 'management',
    capability: 'core',
    available: true,
    enabled: false,
  },
  {
    key: 'community.role_panels',
    label: 'Role panels',
    description: 'Let members choose roles through simple panels.',
    category: 'community',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'community.events',
    label: 'Server events',
    description: 'Create events, registrations, and check-ins without leaving the dashboard.',
    category: 'community',
    capability: 'events',
    available: true,
    enabled: false,
  },
  {
    key: 'community.achievements',
    label: 'Achievements',
    description: 'Create goals and celebrate community milestones.',
    category: 'community',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'management.invite_tracker',
    label: 'Invite tracker',
    description: 'See who brought new members to the server.',
    category: 'management',
    capability: 'insights',
    available: true,
    enabled: false,
  },
  {
    key: 'utility.help',
    label: 'Help',
    description: 'Explains modules and shows the next step for each team.',
    category: 'utility',
    capability: 'core',
    available: true,
    enabled: true,
  },
  {
    key: 'utility.reminders',
    label: 'Reminders',
    description: 'Schedule reminders for messages, tasks, and events.',
    category: 'utility',
    capability: 'events',
    available: true,
    enabled: false,
  },
  {
    key: 'utility.emojis',
    label: 'Emojis',
    description: 'Organizes and improves custom emoji usage.',
    category: 'utility',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'utility.embeds',
    label: 'Embeds',
    description: 'Creates rich messages for rules, announcements, and useful information.',
    category: 'utility',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'utility.search',
    label: 'Search',
    description: 'Search content, videos, and references without leaving the app.',
    category: 'utility',
    capability: 'utility',
    available: true,
    enabled: false,
  },
  {
    key: 'utility.temp_channels',
    label: 'Temporary channels',
    description: 'Creates voice channels that disappear when no longer used.',
    category: 'utility',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'social.twitch',
    label: 'Twitch alerts',
    description: 'Posts an alert when a channel starts streaming.',
    category: 'social',
    capability: 'alerts',
    available: true,
    enabled: false,
  },
  {
    key: 'social.youtube',
    label: 'YouTube alerts',
    description: 'Notifies the server when a new video is published.',
    category: 'social',
    capability: 'alerts',
    available: true,
    enabled: false,
    maturity: 'beta',
    configurable: true,
  },
  {
    key: 'social.instagram',
    label: 'Instagram alerts',
    description: 'Tracks new posts from selected accounts.',
    category: 'social',
    capability: 'alerts',
    available: true,
    maturity: 'blocked',
    configurable: true,
    enabled: false,
  },
  {
    key: 'social.reddit',
    label: 'Reddit alerts',
    description: 'Sends alerts when a new post appears.',
    category: 'social',
    capability: 'alerts',
    available: true,
    maturity: 'blocked',
    configurable: true,
    enabled: false,
  },
  {
    key: 'social.x',
    label: 'X alerts',
    description: 'Tracks posts from important community accounts.',
    category: 'social',
    capability: 'alerts',
    available: true,
    maturity: 'blocked',
    configurable: true,
    enabled: false,
  },
  {
    key: 'social.tiktok',
    label: 'TikTok alerts',
    description: 'Notifies the server about new videos.',
    category: 'social',
    capability: 'alerts',
    available: true,
    maturity: 'blocked',
    configurable: true,
    enabled: false,
  },
  {
    key: 'social.rss',
    label: 'RSS Feeds',
    description: 'Turns any RSS feed into an automatic update.',
    category: 'social',
    capability: 'alerts',
    available: true,
    enabled: false,
  },
  {
    key: 'social.podcasts',
    label: 'Podcasts',
    description: 'Alerts you when a new podcast episode is published.',
    category: 'social',
    capability: 'alerts',
    available: true,
    enabled: false,
  },
  {
    key: 'social.kick',
    label: 'Kick alerts',
    description: 'Notifies the server when a creator starts streaming.',
    category: 'social',
    capability: 'alerts',
    available: true,
    maturity: 'blocked',
    configurable: true,
    enabled: false,
  },
  {
    key: 'social.bluesky',
    label: 'Bluesky alerts',
    description: 'Tracks new posts from selected profiles.',
    category: 'social',
    capability: 'alerts',
    available: true,
    enabled: false,
  },
  {
    key: 'community.birthdays',
    label: 'Birthdays',
    description: 'Celebrates birthdays automatically, with configurable privacy.',
    category: 'community',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'community.economy',
    label: 'Economy',
    description: 'Creates a virtual economy with rewards and progression.',
    category: 'community',
    capability: 'community',
    available: true,
    enabled: false,
  },
  {
    key: 'growth.monetization',
    label: 'Monetization',
    description: 'Prepares benefits and roles to support the server.',
    category: 'growth',
    capability: 'billing',
    available: true,
    maturity: 'blocked',
    configurable: true,
    enabled: false,
  },
  {
    key: 'web3.nft_stats',
    label: 'NFT statistics',
    description: 'Shows NFT collection data for the community.',
    category: 'web3',
    capability: 'web3',
    available: true,
    enabled: false,
    maturity: 'beta',
    configurable: true,
  },
  {
    key: 'web3.nft_queries',
    label: 'NFT queries',
    description: 'Queries NFT collections directly from the server.',
    category: 'web3',
    capability: 'web3',
    available: true,
    enabled: false,
    maturity: 'beta',
    configurable: true,
  },
  {
    key: 'web3.nft_sales',
    label: 'NFT sales & listings',
    description: 'Tracks sales and listings for selected collections.',
    category: 'web3',
    capability: 'web3',
    available: true,
    enabled: false,
    maturity: 'beta',
    configurable: true,
  },
  {
    key: 'web3.crypto_stats',
    label: 'Crypto statistics',
    description: 'Tracks digital currency indicators.',
    category: 'web3',
    capability: 'web3',
    available: true,
    enabled: false,
  },
  {
    key: 'web3.crypto_queries',
    label: 'Crypto queries',
    description: 'Queries cryptocurrency information inside the server.',
    category: 'web3',
    capability: 'web3',
    available: true,
    enabled: false,
  },
  {
    key: 'web3.gas_tracker',
    label: 'Gas tracker',
    description: 'Shows current network fees for the community.',
    category: 'web3',
    capability: 'web3',
    available: true,
    enabled: false,
    maturity: 'beta',
    configurable: true,
  },
  {
    key: 'web3.gating',
    label: 'Gating',
    description: 'Controls access and roles based on verified collections.',
    category: 'web3',
    capability: 'web3',
    available: true,
    maturity: 'blocked',
    configurable: true,
    enabled: false,
  },
];

// A disconnected production panel must never fall back to the demo catalogue
// with "available" or "active" states.  The Rust API is the source of truth;
// when it cannot be reached we keep the topics visible for navigation, but
// explicitly mark every one as blocked until the live guild state is loaded.
function unavailableFeatureCatalogue(): Feature[] {
  return demoFeatures.concat(additionalFeatures).map((feature) => ({
    ...feature,
    available: false,
    enabled: false,
    maturity: 'blocked',
    configurable: false,
    health: {
      operational: false,
      status: 'dependency_down',
      adapter: null,
      dependencies: ['Rust API'],
    },
    issues: [
      {
        path: '',
        code: 'feature_catalog_unavailable',
        message: 'Feature state unavailable until the Rust API reconnects.',
        severity: 'error',
      },
    ],
  }));
}

const featureCopy: Record<string, Pick<Feature, 'label' | 'description'>> = {
  'protection.antispam': {
    label: 'Spam protection',
    description: 'Detects flooding, repeated messages, and excessive mentions.',
  },
  'protection.antiscam': {
    label: 'Scam protection',
    description: 'Blocks suspicious links, invites, and phishing patterns.',
  },
};
function presentFeature(feature: Feature): Feature {
  return featureCopy[feature.key] ? { ...feature, ...featureCopy[feature.key] } : feature;
}
const defaults: Record<string, FeatureConfig> = {
  'protection.antiscam': {
    blockInvites: true,
    blockedDomains: [],
    blockedKeywords: ['free nitro', 'steam gift', 'claim your prize', 'verify your wallet'],
    ignoredChannels: [],
    ignoredRoles: [],
    logChannel: '',
    timeoutSeconds: 300,
    alertOnly: false,
  },
  'protection.anti_raid': {
    joinThreshold: 10,
    windowSeconds: 10,
    incidentMinutes: 10,
    verification: 'high',
    pauseInvites: true,
    alertOnly: false,
    alertChannel: '',
  },
  'protection.join_gate': {
    minimumAccountDays: 7,
    requireAvatar: false,
    blockedNamePatterns: [],
    action: 'quarantine',
    verifiedRole: '',
    autoRole: '',
    logChannel: '',
  },
  'community.levels': {
    xpMin: 15,
    xpMax: 30,
    cooldownSeconds: 60,
    voiceXpEnabled: false,
    voiceXpPerMinute: 2,
    ignoredChannels: [],
    announceChannel: '',
    announceTemplate: '{member} reached level {level}!',
    stackRoles: true,
    levelRoles: [],
  },
  'community.leaderboard': {
    maxEntries: 10,
    public: true,
  },
  'community.starboard': {
    emoji: '⭐',
    threshold: 3,
    channel: '',
    allowSelfStar: false,
    ignoredChannels: [],
    ignoredRoles: [],
    includeImages: true,
  },
  'community.suggestions': {
    channel: '',
    anonymous: false,
    voteMode: 'up_down',
    cooldownHours: 24,
    requiredRole: '',
    staffChannel: '',
  },
  'community.giveaways': {
    defaultDurationHours: 24,
    defaultWinners: 1,
    requiredRole: '',
  },
  'support.tickets': {
    categoryId: '',
    staffRole: '',
    transcriptChannel: '',
    maxOpen: 1,
    closeAfterHours: 1,
    panelTitle: 'Need support?',
    panelDescription: 'Open a private ticket and the support team will help you.',
  },
  'support.welcome': {
    channel: '',
    message: 'Welcome {member} to {server}!',
    sendDm: false,
    dmMessage: 'Hello {member}, welcome to {server}!',
    autoRole: '',
    delaySeconds: 0,
    farewellChannel: '',
    farewellMessage: 'Goodbye {member}. We hope to see you again!',
    templateId: '',
  },
  'support.welcome_channel': {
    channelId: '',
    message: 'Welcome {member}! Start with the rules, introduce yourself and check the server channels.',
    templateId: '',
  },
  'management.nickname': { nickname: '' },
  'management.workflows': {
    maxWorkflows: 10,
    maxReplyLength: 1000,
    allowMentions: false,
  },
  'management.polls': {
    defaultDurationHours: 24,
    channel: '',
  },
  'insights.stats': {
    windowDays: 7,
    public: false,
    channelId: '',
    intervalMinutes: 15,
    nameTemplate: 'messages-{messages}',
  },
  'utility.emojis': {
    maxEntries: 50,
    animatedOnly: false,
    allowManagement: false,
  },
  'utility.embeds': {
    maxDescription: 2000,
    defaultColor: '',
    defaultFooter: '',
  },
  'utility.search': {
    maxResults: 5,
    allowWikipedia: true,
    allowAniList: true,
    allowBluesky: true,
    allowYouTube: true,
    allowTwitch: true,
  },
  'utility.temp_channels': {
    categoryId: '',
    nameTemplate: "{user}'s room",
    maxActive: 10,
  },
  'social.youtube': {
    sourceChannelId: '',
    targetChannelId: '',
    intervalSeconds: 300,
    messageTemplate: 'New video from {channel}: **{title}**\n{url}',
    mention: '',
  },
  'social.rss': {
    feedUrl: '',
    targetChannelId: '',
    intervalSeconds: 900,
    messageTemplate: 'New post in {feed}: **{title}**\n{url}',
    mention: '',
  },
  'social.podcasts': {
    feedUrl: '',
    targetChannelId: '',
    intervalSeconds: 900,
    messageTemplate: 'New episode from {feed}: **{title}**\n{url}',
    mention: '',
  },
  'social.twitch': {
    sourceLogin: '',
    targetChannelId: '',
    messageTemplate: '{broadcaster} is live!\nhttps://twitch.tv/{login}',
    mention: '',
  },
  'management.moderation': {
    requireReason: true,
    maxPurge: 100,
  },
  'management.custom_commands': {
    triggerPrefix: '!',
    ignoredChannels: [],
    staffOnly: false,
    maxTags: 100,
    maxResponseLength: 1000,
  },
  'management.audit': {
    threshold: 3,
    windowSeconds: 10,
    shadowMode: false,
    logChannel: '',
    includeContent: false,
  },
  'management.privacy': {
    allowMemberExport: true,
    allowMemberErase: true,
    maxExportBytes: 1000000,
  },
  // Templates use the dedicated StudioTemplate manager below.  Do not expose
  // generic JSON switches that are not part of the API's template contract.
  'management.templates': {},
  'community.role_panels': {
    channel: '',
    roleIds: [],
    panelTitle: 'Choose your roles',
    panelDescription: 'Select the options that fit your community.',
    maxRoles: 5,
    selectionMode: 'multiple',
    removeOnUnselect: true,
  },
  'community.events': {
    defaultDurationHours: 2,
    defaultCapacity: 0,
    announcementChannel: '',
    reminders: true,
    reminderHours: 1,
  },
  'utility.help': { showModules: true, showDashboard: true },
  'utility.reminders': {
    maxDelayHours: 168,
    maxTextLength: 500,
    timezone: 'UTC',
    notifyUser: true,
    allowRecurring: false,
    maxRecurrences: 12,
  },
};

const additionalSpecs: Record<string, SectionSpec[]> = {
  'community.leaderboard': [
    {
      title: 'Leaderboard privacy',
      description: 'Control how many members appear in the XP leaderboard.',
      fields: [
        {
          key: 'maxEntries',
          label: 'Members shown',
          kind: 'number',
          min: 1,
          max: 100,
        },
        { key: 'public', label: 'Show the leaderboard publicly', kind: 'toggle' },
      ],
    },
  ],
  'support.welcome_channel': [
    {
      title: 'First steps',
      description: 'Choose where new members find essential information.',
      fields: [
        { key: 'channelId', label: 'Join channel', kind: 'channel' },
        { key: 'message', label: 'First-steps message', kind: 'textarea', maxLength: 2000 },
        { key: 'templateId', label: 'Reusable template', kind: 'select', advanced: true },
      ],
    },
  ],
  'management.moderation': [
    {
      title: 'Moderation safety',
      description: 'Set guardrails used by manual moderation commands.',
      fields: [
        {
          key: 'requireReason',
          label: 'Require a reason',
          kind: 'toggle',
        },
        {
          key: 'maxPurge',
          label: 'Maximum purge count',
          kind: 'number',
          min: 1,
          max: 100,
        },
      ],
    },
  ],
  'management.custom_commands': [
    {
      title: 'Commands and responses',
      description: 'Create short responses for frequently asked questions.',
      fields: [
        { key: 'triggerPrefix', label: 'Command prefix', kind: 'text', maxLength: 3 },
        {
          key: 'maxTags',
          label: 'Maximum saved commands',
          kind: 'number',
          min: 1,
          max: 100,
          help: 'Limits how many responses this server can save.',
          advanced: true,
        },
      ],
    },
    {
      title: 'Usage rules',
      description: 'Control where and who can use the responses.',
      fields: [
        { key: 'ignoredChannels', label: 'channels ignored', kind: 'channels', advanced: true },
        { key: 'staffOnly', label: 'Staff only', kind: 'toggle', advanced: true },
        {
          key: 'maxResponseLength',
          label: 'Maximum response length',
          kind: 'number',
          min: 1,
          max: 2000,
          help: 'Prevents responses that are too long for Discord.',
        },
      ],
    },
  ],
  'management.audit': [
    {
      title: 'Change logging',
      description: 'Choose what your team can review.',
      fields: [
        { key: 'threshold', label: 'Actions before containment', kind: 'number', min: 2, max: 25 },
        { key: 'windowSeconds', label: 'Detection window (seconds)', kind: 'number', min: 3, max: 60 },
        { key: 'shadowMode', label: 'Shadow mode', kind: 'toggle' },
        { key: 'logChannel', label: 'Audit log channel (optional)', kind: 'channel', advanced: true },
        { key: 'includeContent', label: 'Include cached message content', kind: 'toggle', advanced: true },
      ],
    },
  ],
  'management.privacy': [
    {
      title: 'Retention',
      description: 'Defines how long optional data is retained.',
      fields: [
        { key: 'allowMemberErase', label: 'Allow member erasure', kind: 'toggle' },
        { key: 'maxExportBytes', label: 'Maximum export size', kind: 'number', min: 65536, max: 10000000 },
      ],
    },
    {
      title: 'Data requests',
      description: 'Keeps privacy requests clear.',
      fields: [
        { key: 'allowMemberExport', label: 'Allow member exports', kind: 'toggle' },
      ],
    },
  ],
  'social.reddit': [
    {
      title: 'Tracked subreddit',
      description: 'Use the official Reddit API to notify the server about new posts.',
      fields: [
        { key: 'sourceSubreddit', label: 'Subreddit', kind: 'text', help: 'example: discordapp (without r/).' },
        { key: 'targetChannelId', label: 'Discord channel', kind: 'channel' },
      ],
    },
    {
      title: 'Message',
      description: 'Define the alert format and an optional mention.',
      fields: [
        { key: 'messageTemplate', label: 'message', kind: 'textarea', maxLength: 1800 },
        { key: 'mention', label: 'Optional mention', kind: 'text', advanced: true },
        { key: 'intervalSeconds', label: 'Interval (seconds)', kind: 'number', min: 300, max: 86400, advanced: true },
      ],
    },
  ],
  'social.x': [
    {
      title: 'Tracked account',
      description: 'Read posts through the official X API when the application is approved.',
      fields: [
        { key: 'sourceHandle', label: 'X handle', kind: 'text', help: 'example: discord (without @).' },
        { key: 'targetChannelId', label: 'Discord channel', kind: 'channel' },
      ],
    },
    {
      title: 'Message',
      description: 'Customise the alert sent to the server.',
      fields: [
        { key: 'messageTemplate', label: 'message', kind: 'textarea', maxLength: 1800 },
        { key: 'mention', label: 'Optional mention', kind: 'text', advanced: true },
        { key: 'intervalSeconds', label: 'Interval (seconds)', kind: 'number', min: 900, max: 86400, advanced: true },
      ],
    },
  ],
  'social.tiktok': [
    {
      title: 'Tracked creator',
      description: 'Track videos from a creator who authorised Vozen through the Display API.',
      fields: [
        { key: 'username', label: 'Creator name', kind: 'text' },
        { key: 'targetChannelId', label: 'Discord channel', kind: 'channel' },
      ],
    },
    {
      title: 'Message',
      description: 'Define the format of video alerts.',
      fields: [
        { key: 'messageTemplate', label: 'message', kind: 'textarea', maxLength: 1800 },
        { key: 'mention', label: 'Optional mention', kind: 'text', advanced: true },
        { key: 'intervalSeconds', label: 'Interval (seconds)', kind: 'number', min: 900, max: 86400, advanced: true },
      ],
    },
  ],
  'social.instagram': [
    {
      title: 'Tracked account',
      description: 'Track posts from a professional account authorised by Meta.',
      fields: [
        { key: 'username', label: 'Username', kind: 'text' },
        { key: 'targetChannelId', label: 'Discord channel', kind: 'channel' },
      ],
    },
    {
      title: 'Message',
      description: 'Define the format of post alerts.',
      fields: [
        { key: 'messageTemplate', label: 'message', kind: 'textarea', maxLength: 1800 },
        { key: 'mention', label: 'Optional mention', kind: 'text', advanced: true },
        { key: 'intervalSeconds', label: 'Interval (seconds)', kind: 'number', min: 900, max: 86400, advanced: true },
      ],
    },
  ],
  'social.kick': [
    {
      title: 'Tracked channel',
      description: 'Track streams through the official Kick API when available.',
      fields: [
        { key: 'sourceHandle', label: 'Kick handle', kind: 'text', help: 'example: vozen (without @).' },
        { key: 'targetChannelId', label: 'Discord channel', kind: 'channel' },
      ],
    },
    {
      title: 'Message',
      description: 'Customise the stream alert.',
      fields: [
        { key: 'messageTemplate', label: 'message', kind: 'textarea', maxLength: 1800 },
        { key: 'mention', label: 'Optional mention', kind: 'text', advanced: true },
        { key: 'intervalSeconds', label: 'Interval (seconds)', kind: 'number', min: 300, max: 86400, advanced: true },
      ],
    },
  ],
  'growth.monetization': [
    {
      title: 'Server benefit',
      description: 'Defines the support product; server payments remain unavailable until Stripe Connect legal setup is complete.',
      fields: [
        { key: 'productName', label: 'Product name', kind: 'text' },
        { key: 'targetRoleId', label: 'Assigned role', kind: 'role' },
        { key: 'priceCents', label: 'Price (cents)', kind: 'number', min: 50, max: 100000, advanced: true },
        { key: 'currency', label: 'Currency', kind: 'select', options: [['eur', 'EUR'], ['usd', 'USD']], advanced: true },
        { key: 'trialDays', label: 'Trial period (days)', kind: 'number', min: 0, max: 90, advanced: true },
      ],
    },
  ],
  'web3.gating': [
    {
      title: 'Access rule',
      description: 'Configure read-only verification; never enter a seed phrase or private key.',
      fields: [
        { key: 'chain', label: 'Network', kind: 'select', options: [['ethereum', 'Ethereum'], ['polygon', 'Polygon'], ['base', 'Base']] },
        { key: 'contractAddress', label: 'Contract address', kind: 'text' },
        { key: 'assetType', label: 'Asset type', kind: 'select', options: [['erc20', 'ERC-20'], ['erc721', 'ERC-721'], ['erc1155', 'ERC-1155']] },
        { key: 'tokenId', label: 'Token ID', kind: 'text', advanced: true },
        { key: 'targetRoleId', label: 'Assigned role', kind: 'role' },
        { key: 'minimumBalance', label: 'Minimum balance', kind: 'number', min: 0, max: 1000000000, advanced: true },
        { key: 'intervalSeconds', label: 'Verification interval (seconds)', kind: 'number', min: 300, max: 86400, advanced: true },
      ],
    },
  ],
  'community.role_panels': [
    {
      title: 'Role selection panel',
      description: 'Prepare the message where members choose roles.',
      fields: [
        { key: 'channel', label: 'Panel channel', kind: 'channel' },
        { key: 'roleIds', label: 'Role options', kind: 'roles', max: 5 },
        { key: 'panelTitle', label: 'Panel title', kind: 'text' },
        { key: 'panelDescription', label: 'Panel description', kind: 'textarea' },
      ],
    },
    {
      title: 'Limits',
      description: 'Avoid excessive selections.',
      fields: [
          { key: 'maxRoles', label: 'Maximum roles per member', kind: 'number', min: 1, max: 5 },
        { key: 'selectionMode', label: 'Selection mode', kind: 'select', options: [['multiple', 'Several roles'], ['unique', 'One role']] },
        { key: 'removeOnUnselect', label: 'Remove role when unselected', kind: 'toggle' },
      ],
    },
  ],
  'community.events': [
    {
      title: 'Event defaults',
      description: 'Set defaults for creating events with fewer steps.',
      fields: [
        {
          key: 'defaultDurationHours',
          label: 'Default duration (hours)',
          kind: 'number',
          min: 1,
          max: 8760,
        },
        {
          key: 'defaultCapacity',
          label: 'Participant limit',
          kind: 'number',
          min: 0,
          max: 100000,
        },
        { key: 'announcementChannel', label: 'Announcement channel', kind: 'channel' },
      ],
    },
    {
      title: 'Follow-up',
      description: 'Helps members avoid missing the start.',
      fields: [
        { key: 'reminders', label: 'Send reminders', kind: 'toggle' },
        { key: 'reminderHours', label: 'Hours before the event', kind: 'number', min: 1, max: 168, advanced: true },
      ],
    },
  ],
  'utility.help': [
    {
      title: 'Help in the server',
      description: 'Choose how Helper explains its modules.',
      fields: [
        { key: 'showModules', label: 'Show module list', kind: 'toggle' },
        { key: 'showDashboard', label: 'Include dashboard link', kind: 'toggle' },
      ],
    },
  ],
  'utility.reminders': [
    {
      title: 'Reminders',
      description: 'Prepare consistent reminders for the community.',
      fields: [
        {
          key: 'maxDelayHours',
          label: 'Maximum delay (hours)',
          kind: 'number',
          min: 1,
          max: 8760,
        },
        { key: 'maxTextLength', label: 'Maximum message length', kind: 'number', min: 50, max: 500 },
        {
          key: 'timezone',
          label: 'Reminder timezone',
          kind: 'select',
          options: [['UTC', 'UTC'], ['UTC-05:00', 'UTC-05:00'], ['UTC+01:00', 'UTC+01:00'], ['UTC+02:00', 'UTC+02:00'], ['UTC+05:30', 'UTC+05:30'], ['UTC+08:00', 'UTC+08:00']],
        },
        { key: 'notifyUser', label: 'Mention the member when it fires', kind: 'toggle' },
        { key: 'allowRecurring', label: 'Allow recurring reminders', kind: 'toggle' },
        { key: 'maxRecurrences', label: 'Maximum repeats', kind: 'number', min: 1, max: 52 },
      ],
    },
  ],
};

const twitchSpec: SectionSpec[] = [
  {
    title: 'Tracked channel',
    description: 'Enter the Twitch channel name and validate it through the official API before publishing.',
    fields: [
      {
        key: 'sourceLogin',
        label: 'Twitch channel name',
        kind: 'text',
        help: 'Example: rexy40407 (without twitch.tv/).',
      },
      {
        key: 'targetChannelId',
        label: 'Discord channel ID',
        kind: 'text',
        help: 'The channel where the alert will be posted.',
      },
    ],
  },
  {
    title: 'Message',
    description: 'Customise the alert sent when the stream starts.',
    fields: [
      {
        key: 'messageTemplate',
        label: 'Alert message',
        kind: 'textarea',
        help: 'Variables: {broadcaster}, {login}, {url}, {stream_id}, {started_at}.',
      },
      {
        key: 'mention',
        label: 'Optional mention',
        kind: 'text',
        help: 'Empty, @here, @everyone, or the role mention.',
        advanced: true,
      },
    ],
  },
];
additionalSpecs['social.twitch'] = twitchSpec;
// Podcasts use the same validated RSS/Atom transport and editor, but keep a
// separate catalog key so the product surface is discoverable.
additionalSpecs['social.podcasts'] = additionalSpecs['social.rss'];
const spec = (key: string): SectionSpec[] => {
  const map: Record<string, SectionSpec[]> = {
    'protection.antiscam': [
      {
        title: 'Fraud detection',
        description: 'Controls how Helper responds to invites, domains, and suspicious phrases.',
        fields: [
          { key: 'blockInvites', label: 'Block unsolicited Discord invites', kind: 'toggle' },
          { key: 'blockedDomains', label: 'Blocked domains', kind: 'tags', advanced: true },
          { key: 'blockedKeywords', label: 'Blocked phrases', kind: 'tags', advanced: true },
          { key: 'timeoutSeconds', label: 'Timeout (seconds)', kind: 'number', min: 0, max: 86400, advanced: true },
          { key: 'alertOnly', label: 'Monitor only', kind: 'toggle', advanced: true },
        ],
      },
      {
        title: 'Exceptions and logging',
        description: 'Choose real server resources to reduce false positives.',
        fields: [
          { key: 'ignoredChannels', label: 'channels ignored', kind: 'channels', advanced: true },
          { key: 'ignoredRoles', label: 'roles ignored', kind: 'roles', advanced: true },
          { key: 'logChannel', label: 'Log channel', kind: 'channel', advanced: true },
        ],
      },
    ],
    'protection.anti_raid': [
      {
        title: 'Join detection',
        description: 'Set when the sequence of joins is considered the raid.',
        fields: [
          {
            key: 'joinThreshold',
            label: 'Joins to start an alert',
            kind: 'number',
            min: 2,
            max: 100,
          },
          {
            key: 'windowSeconds',
            label: 'Time window (seconds)',
            kind: 'number',
            min: 3,
            max: 60,
          },
          {
            key: 'incidentMinutes',
            label: 'Protection duration (minutes)',
            kind: 'number',
            min: 1,
            max: 120,
          },
        ],
      },
      {
        title: 'Response and recovery',
        description: 'Choose the verification level and where the team is notified.',
        fields: [
          {
            key: 'verification',
            label: 'Verification level',
            kind: 'select',
            options: [
              ['medium', 'medium'],
              ['high', 'High'],
              ['very_high', 'Very high'],
            ],
          },
          { key: 'pauseInvites', label: 'Pause invites during the incident', kind: 'toggle' },
          { key: 'alertOnly', label: 'Alert only', kind: 'toggle', advanced: true },
          { key: 'alertChannel', label: 'Alert channel', kind: 'text', advanced: true },
        ],
      },
    ],
    'protection.join_gate': [
      {
        title: 'Safe joining',
        description: 'Filter new accounts before granting full access.',
        fields: [
          {
            key: 'minimumAccountDays',
            label: 'Minimum account age (days)',
            kind: 'number',
            min: 0,
            max: 365,
          },
          { key: 'requireAvatar', label: 'Require an avatar', kind: 'toggle' },
          {
            key: 'action',
            label: 'Action for suspicious accounts',
            kind: 'select',
            options: [
              ['quarantine', 'Quarantine'],
              ['alert', 'Alert only'],
            ],
          },
        ],
      },
      {
        title: 'Roles and logging',
        description: 'Connect verification to your community flow.',
        fields: [
          { key: 'verifiedRole', label: 'Verified role', kind: 'text' },
          { key: 'autoRole', label: 'Initial role', kind: 'text' },
          {
            key: 'blockedNamePatterns',
            label: 'Blocked name patterns',
            kind: 'tags',
            advanced: true,
          },
          { key: 'logChannel', label: 'Log channel', kind: 'text', advanced: true },
        ],
      },
    ],
    'community.levels': [
      {
        title: 'Progression',
        description: 'Create the fair pace for active members.',
        fields: [
          { key: 'xpMin', label: 'XP minimum by message', kind: 'number', min: 1, max: 1000 },
          { key: 'xpMax', label: 'XP maximum by message', kind: 'number', min: 1, max: 2000 },
          {
            key: 'cooldownSeconds',
            label: 'Cooldown between messages (seconds)',
            kind: 'number',
            min: 0,
            max: 3600,
          },
          { key: 'voiceXpEnabled', label: 'Grant XP in voice channels', kind: 'toggle', advanced: true },
          {
            key: 'voiceXpPerMinute',
            label: 'XP per voice minute',
            kind: 'number',
            min: 0,
            max: 30,
            advanced: true,
          },
          { key: 'stackRoles', label: 'Stack level roles', kind: 'toggle' },
        ],
      },
      {
        title: 'messages and rewards',
        description: 'Customise announcements and roles without editing commands.',
        fields: [
          { key: 'announceChannel', label: 'Announcement channel', kind: 'channel' },
          {
            key: 'announceTemplate',
            label: 'Level-up message',
            kind: 'textarea',
            help: 'Variables: {member}, {level}, {server}.',
            advanced: true,
          },
          { key: 'ignoredChannels', label: 'channels without XP', kind: 'channels', advanced: true },
          { key: 'levelRoles', label: 'rewards by level', kind: 'tags', advanced: true },
        ],
      },
    ],
    'community.starboard': [
      {
        title: 'Highlights',
        description: 'Choose when the message deserves to appear in the special channel.',
        fields: [
          { key: 'emoji', label: 'Highlight emoji', kind: 'text' },
          { key: 'threshold', label: 'Required reactions', kind: 'number', min: 1, max: 100 },
          { key: 'channel', label: 'Starboard channel', kind: 'channel' },
        ],
      },
      {
        title: 'Community rules',
        description: 'Keep highlights relevant and safe.',
        fields: [
          {
            key: 'allowSelfStar',
            label: 'Allow the author reaction',
            kind: 'toggle',
            advanced: true,
          },
          { key: 'includeImages', label: 'Include images', kind: 'toggle', advanced: true },
          { key: 'ignoredChannels', label: 'channels ignored', kind: 'channels', advanced: true },
          { key: 'ignoredRoles', label: 'roles ignored', kind: 'roles', advanced: true },
        ],
      },
    ],
    'community.suggestions': [
      {
        title: 'Idea box',
        description: 'Define how members submit and vote on suggestions.',
        fields: [
          { key: 'channel', label: 'Suggestions channel', kind: 'text' },
          {
            key: 'voteMode',
            label: 'Voting mode',
            kind: 'select',
            options: [
              ['up_down', 'Support / oppose'],
              ['up_only', 'Support only'],
            ],
          },
          { key: 'anonymous', label: 'Allow anonymous suggestions', kind: 'toggle' },
        ],
      },
      {
        title: 'moderation',
        description: 'Give your team context and control over the flow.',
        fields: [
          {
            key: 'cooldownHours',
            label: 'Cooldown per member (hours)',
            kind: 'number',
            min: 0,
            max: 720,
            advanced: true,
          },
          { key: 'requiredRole', label: 'role required', kind: 'text', advanced: true },
          { key: 'staffChannel', label: 'Private staff channel', kind: 'text', advanced: true },
        ],
      },
    ],
    'community.giveaways': [
      {
        title: 'Default values',
        description: 'Speed up giveaway creation in Discord.',
        fields: [
          {
            key: 'defaultDurationHours',
            label: 'Default duration (hours)',
            kind: 'number',
            min: 1,
            max: 168,
          },
          {
            key: 'defaultWinners',
            label: 'Default winners',
            kind: 'number',
            min: 1,
            max: 20,
          },
          { key: 'requiredRole', label: 'role required', kind: 'role' },
        ],
      },
    ],
    'support.tickets': [
      {
        title: 'Support',
        description: 'Prepare the space for your team to answer members.',
        fields: [
          { key: 'categoryId', label: 'Ticket category', kind: 'category' },
          { key: 'staffRole', label: 'Staff role', kind: 'role' },
          { key: 'transcriptChannel', label: 'Transcript channel', kind: 'channel' },
          { key: 'maxOpen', label: 'Open tickets per member', kind: 'number', min: 1, max: 10 },
        ],
      },
      {
        title: 'Opening panel',
        description: 'The first message should clearly explain the next step.',
        fields: [
          { key: 'panelTitle', label: 'Panel title', kind: 'text' },
          { key: 'panelDescription', label: 'Panel description', kind: 'textarea' },
          {
            key: 'closeAfterHours',
            label: 'Close after inactivity (hours)',
            kind: 'number',
            min: 1,
            max: 168,
            advanced: true,
          },
        ],
      },
    ],
    'support.welcome': [
      {
        title: 'Welcome message',
        description: 'Welcome members without editing code.',
        fields: [
          { key: 'channel', label: 'Public channel', kind: 'channel' },
          {
            key: 'message',
            label: 'Public message',
            kind: 'textarea',
            help: 'Variables: {member}, {server}, {count}.',
          },
          { key: 'delaySeconds', label: 'Delay (seconds)', kind: 'number', min: 0, max: 3600 },
        ],
      },
      {
        title: 'Private message and role',
        description: 'Complete onboarding for new members.',
        fields: [
          { key: 'sendDm', label: 'Send private message', kind: 'toggle' },
          { key: 'dmMessage', label: 'Private message', kind: 'textarea', advanced: true },
          { key: 'autoRole', label: 'Initial role', kind: 'role', advanced: true },
        ],
      },
      {
        title: 'leave and templates',
        description: 'Choose where farewells are posted and reuse an approved template.',
        fields: [
          { key: 'farewellChannel', label: 'Farewell channel', kind: 'channel', advanced: true },
          { key: 'farewellMessage', label: 'Farewell message', kind: 'textarea', advanced: true },
          { key: 'templateId', label: 'Reusable template', kind: 'select', advanced: true },
        ],
      },
    ],
    'management.nickname': [
      {
        title: 'Server name',
        description: "Choose how Helper appears in this server's member list.",
        fields: [
          {
            key: 'nickname',
            label: 'Helper nickname',
            kind: 'text',
            maxLength: 32,
            help: 'Up to 32 characters. Leave empty to remove the custom name.',
          },
        ],
      },
    ],
    'management.workflows': [
      {
        title: 'Automation safety limits',
        description: 'Bounded message automations keep your server responsive.',
        fields: [
          {
            key: 'maxWorkflows',
            label: 'Maximum workflows',
            kind: 'number',
            min: 1,
            max: 100,
          },
          {
            key: 'maxReplyLength',
            label: 'Maximum reply length',
            kind: 'number',
            min: 1,
            max: 1500,
          },
          { key: 'allowMentions', label: 'Allow mentions in replies', kind: 'toggle' },
        ],
      },
    ],
    'management.polls': [
      {
        title: 'Polls',
        description: 'Set defaults for quick polls.',
        fields: [
          { key: 'channel', label: 'Default channel', kind: 'channel' },
          {
            key: 'defaultDurationHours',
            label: 'Default duration (hours)',
            kind: 'number',
            min: 1,
            max: 168,
          },
        ],
      },
    ],
    'insights.stats': [
      {
        title: 'Server statistics',
        description: 'Control the period, visibility and optional live counter channel for server statistics.',
        fields: [
          { key: 'windowDays', label: 'Reporting window (days)', kind: 'number', min: 1, max: 30 },
          { key: 'public', label: 'Show publicly', kind: 'toggle' },
          { key: 'channelId', label: 'Live counter channel', kind: 'channel' },
          {
            key: 'intervalMinutes',
            label: 'Counter refresh (minutes)',
            kind: 'number',
            min: 5,
            max: 1440,
            advanced: true,
          },
          { key: 'nameTemplate', label: 'Channel name template', kind: 'text', maxLength: 100 },
        ],
      },
    ],
    'utility.emojis': [
      {
        title: 'Emoji inventory',
        description: 'List custom emojis safely, with optional staff-only rename and delete controls.',
        fields: [
          { key: 'maxEntries', label: 'Emojis shown', kind: 'number', min: 1, max: 100 },
          { key: 'animatedOnly', label: 'Only animated emojis', kind: 'toggle' },
          {
            key: 'allowManagement',
            label: 'Allow staff to rename or delete emojis',
            kind: 'toggle',
            advanced: true,
          },
        ],
      },
    ],
    'utility.embeds': [
      {
        title: 'Safe embed publishing',
        description: 'Publish bounded embeds with mentions disabled by default.',
        fields: [
          { key: 'maxDescription', label: 'Maximum description length', kind: 'number', min: 1, max: 4000 },
          { key: 'defaultColor', label: 'Default colour (hex)', kind: 'text', maxLength: 7 },
          { key: 'defaultFooter', label: 'Default footer', kind: 'text', maxLength: 2048 },
        ],
      },
    ],
    'utility.search': [
      {
        title: 'Approved search sources',
        description: 'Search is limited to documented providers; arbitrary URLs are never fetched.',
        fields: [
          { key: 'maxResults', label: 'Results per search', kind: 'number', min: 1, max: 5 },
          { key: 'allowWikipedia', label: 'Wikipedia', kind: 'toggle' },
          { key: 'allowAniList', label: 'AniList', kind: 'toggle' },
          { key: 'allowBluesky', label: 'Bluesky', kind: 'toggle' },
          { key: 'allowYouTube', label: 'YouTube', kind: 'toggle' },
          { key: 'allowTwitch', label: 'Twitch', kind: 'toggle' },
        ],
      },
    ],
    'utility.temp_channels': [
      {
        title: 'Temporary voice rooms',
        description: 'Create bounded rooms with a predictable name and optional category.',
        fields: [
          { key: 'categoryId', label: 'Category', kind: 'category' },
          { key: 'nameTemplate', label: 'Room name template', kind: 'text', maxLength: 80 },
          { key: 'maxActive', label: 'Maximum active rooms', kind: 'number', min: 1, max: 50 },
        ],
      },
    ],
    'social.rss': [
      {
        title: 'Tracked feed',
        description: 'Enter the public RSS or Atom feed and validate it before saving.',
        fields: [
          {
            key: 'feedUrl',
            label: 'RSS/Atom feed URL',
            kind: 'text',
            help: 'Use an HTTPS URL for the public feed.',
          },
          {
            key: 'targetChannelId',
            label: 'Discord channel ID',
            kind: 'text',
            help: 'The channel where the publication will be sent.',
          },
          {
            key: 'intervalSeconds',
            label: 'Check every (seconds)',
            kind: 'number',
            min: 300,
            max: 86400,
          },
        ],
      },
      {
        title: 'Message',
        description: 'Customise the alert without exposing credentials.',
        fields: [
          {
            key: 'messageTemplate',
            label: 'Alert message',
            kind: 'textarea',
            help: 'Variables: {feed}, {title}, {url}, {published_at}.',
          },
          {
            key: 'mention',
            label: 'Optional mention',
            kind: 'text',
            help: 'Empty, @here, @everyone, or the role mention.',
            advanced: true,
          },
        ],
      },
    ],
    'social.youtube': [
      {
        title: 'Tracked channel',
        description: 'Enter the YouTube channel ID and validate it before saving.',
        fields: [
          {
            key: 'sourceChannelId',
            label: 'YouTube channel ID',
            kind: 'text',
            help: 'Use the ID that usually starts with UC…',
          },
          {
            key: 'targetChannelId',
            label: 'Discord channel ID',
            kind: 'text',
            help: 'The channel where the alert will be posted.',
          },
          {
            key: 'intervalSeconds',
            label: 'Check every (seconds)',
            kind: 'number',
            min: 300,
            max: 86400,
          },
        ],
      },
      {
        title: 'Message',
        description: 'Customise the alert without exposing the API key.',
        fields: [
          {
            key: 'messageTemplate',
            label: 'Alert message',
            kind: 'textarea',
            help: 'Variables: {title}, {url}, {channel}, {published_at}.',
          },
          {
            key: 'mention',
            label: 'Optional mention',
            kind: 'text',
            help: 'Empty, @here, @everyone, or the role mention.',
            advanced: true,
          },
        ],
      },
    ],
  };
  // Keep the offline preview aligned with the Rust adapter contracts.  When
  // the API is available it is still the source of truth; these entries only
  // prevent the fallback page from rendering fields that the runtime ignores.
  if (key === 'insights.stats') {
    return [
      {
        title: 'Server statistics',
        description: 'Control the reporting window and an optional live counter channel.',
        fields: [
          { key: 'windowDays', label: 'Reporting window (days)', kind: 'number', min: 1, max: 30 },
          { key: 'public', label: 'Show publicly', kind: 'toggle' },
          { key: 'channelId', label: 'Live counter channel', kind: 'text' },
          { key: 'intervalMinutes', label: 'Counter refresh (minutes)', kind: 'number', min: 5, max: 1440, advanced: true },
          { key: 'nameTemplate', label: 'Channel name template', kind: 'text', maxLength: 100 },
        ] as FieldSpec[],
      },
    ];
  }
  if (key === 'web3.gas_tracker') {
    return [
      {
        title: 'Gas tracker',
        description: 'Publish read-only gas prices from an approved HTTPS RPC.',
        fields: [
          { key: 'network', label: 'Network', kind: 'select', options: [['ethereum', 'Ethereum'], ['polygon', 'Polygon'], ['arbitrum', 'Arbitrum'], ['base', 'Base']] },
          { key: 'targetChannelId', label: 'Discord channel', kind: 'text' },
          { key: 'intervalSeconds', label: 'Update interval (seconds)', kind: 'number', min: 300, max: 86400 },
          { key: 'messageTemplate', label: 'Statistics message', kind: 'textarea', advanced: true },
        ] as FieldSpec[],
      },
    ];
  }
  if (key === 'web3.nft_stats' || key === 'web3.nft_queries' || key === 'web3.nft_sales') {
    const query = key === 'web3.nft_queries';
    const title = query ? 'NFT collection query' : key === 'web3.nft_sales' ? 'NFT sales and listings' : 'NFT collection statistics';
    return [
      {
        title,
        description: 'Use the official OpenSea read-only API; no wallet or transaction access is required.',
        fields: [
          { key: 'collectionSlug', label: 'OpenSea collection slug', kind: 'text' },
          ...(query
            ? [{ key: 'maxResults', label: 'Maximum events', kind: 'number', min: 1, max: 10, advanced: true }]
            : [
                { key: 'targetChannelId', label: 'Discord channel', kind: 'text' },
                { key: 'intervalSeconds', label: 'Update interval (seconds)', kind: 'number', min: 300, max: 86400 },
                { key: 'messageTemplate', label: 'Statistics message', kind: 'textarea', advanced: true },
                ...(key === 'web3.nft_sales' ? [{ key: 'maxResults', label: 'Maximum events', kind: 'number', min: 1, max: 10, advanced: true }] : []),
              ]),
        ] as FieldSpec[],
      },
    ];
  }
  if (key === 'web3.crypto_stats' || key === 'web3.crypto_queries') {
    const stats = key === 'web3.crypto_stats';
    return [
      {
        title: stats ? 'Crypto statistics' : 'Crypto queries',
        description: 'Use the official CoinGecko read-only API with bounded symbols and results.',
        fields: [
          { key: 'coinIds', label: 'CoinGecko IDs', kind: 'text' },
          { key: 'currency', label: 'Currency', kind: 'text' },
          ...(stats
            ? [{ key: 'targetChannelId', label: 'Discord channel', kind: 'text' }, { key: 'intervalSeconds', label: 'Update interval (seconds)', kind: 'number', min: 300, max: 86400 }, { key: 'messageTemplate', label: 'Statistics message', kind: 'textarea', advanced: true }]
            : [{ key: 'maxResults', label: 'Maximum results', kind: 'number', min: 1, max: 10, advanced: true }]),
        ] as FieldSpec[],
      },
    ];
  }
  if (key === 'social.bluesky') {
    return [
      {
        title: 'Bluesky alerts',
        description: 'Poll a public profile through the official Bluesky AppView API.',
        fields: [
          { key: 'sourceHandle', label: 'Bluesky handle', kind: 'text' },
          { key: 'targetChannelId', label: 'Discord channel', kind: 'text' },
          { key: 'intervalSeconds', label: 'Polling interval (seconds)', kind: 'number', min: 300, max: 86400 },
          { key: 'messageTemplate', label: 'Alert message', kind: 'textarea', advanced: true },
          { key: 'mention', label: 'Optional mention', kind: 'text', advanced: true },
        ] as FieldSpec[],
      },
    ];
  }
  return (
    map[key] ??
    additionalSpecs[key] ?? [
      {
        title: 'Configuration',
        description: 'Adjust this feature for your server.',
        fields: [
          { key: 'notes', label: 'Team notes', kind: 'textarea' },
          { key: 'alertOnly', label: 'Alert only', kind: 'toggle' },
        ],
      },
    ]
  );
};

function parseRoute(hash: string): Route {
  const value = hash.replace(/^#/, '') || '/';
  if (value === '/' || value === '') return { page: 'overview' };
  if (value === '/servers') return { page: 'servers' };
  if (value === '/quick-setup') return { page: 'quick-setup' };
  if (value === '/features' || value === '/config') return { page: 'features' };
  if (value === '/activity') return { page: 'activity' };
  if (value === '/rank-card') return { page: 'rank-card' };
  if (value.startsWith('/config/'))
    return { page: 'detail', key: decodeURIComponent(value.slice('/config/'.length)) };
  return { page: 'overview' };
}

const quickSetupSteps: Array<{ key: QuickSetupStepKey; label: string; description: string }> = [
  { key: 'welcome', label: 'Welcome newcomers', description: 'Message, channel, and initial role.' },
  { key: 'roles', label: 'Let members choose roles', description: 'Role dashboard with buttons.' },
  { key: 'moderation', label: 'Basic moderation', description: 'Consistent records and actions.' },
  { key: 'protection', label: 'Automated protection', description: 'Anti-spam and anti-raid profiles.' },
];

const externalProviderForFeature = (key: string): ExternalProvider | null => {
  if (key === 'social.reddit') return 'reddit';
  if (key === 'social.x') return 'x';
  if (key === 'social.tiktok') return 'tiktok';
  if (key === 'social.instagram') return 'instagram';
  if (key === 'social.kick') return 'kick';
  if (key === 'social.bluesky') return 'bluesky';
  return null;
};

const externalSourceKey = (provider: ExternalProvider): string => {
  if (provider === 'reddit') return 'sourceSubreddit';
  if (provider === 'tiktok' || provider === 'instagram') return 'username';
  return 'sourceHandle';
};

function defaultQuickSetupState(guildId: string): QuickSetupState {
  return {
    guildId,
    status: 'not_started',
    currentStep: 'welcome',
    revision: 0,
    steps: quickSetupSteps.map(({ key }) => ({ key, status: 'pending' })),
    createdResources: [],
  };
}

type QuickSetupFeatureDefaults = Partial<{
  welcome: FeatureConfig;
  roles: FeatureConfig;
  moderation: FeatureConfig;
  antiRaid: FeatureConfig;
  antiSpam: FeatureConfig;
}>;

function quickSetupDraft(
  featureDefaults: QuickSetupFeatureDefaults,
  useLocalCompatibilityDefaults: boolean,
): Record<QuickSetupStepKey, FeatureConfig> {
  // In the deployed panel the adapter response is authoritative.  The old
  // catalogue remains available only for the explicit local preview so a
  // disconnected designer preview does not pretend to be a server schema.
  const legacy = (key: string) => (useLocalCompatibilityDefaults ? defaults[key] ?? {} : {});
  const api = (key: keyof QuickSetupFeatureDefaults) => featureDefaults[key] ?? {};
  return {
    welcome: { ...legacy('support.welcome'), ...api('welcome'), mode: 'recommended', createChannel: true },
    roles: {
      ...legacy('community.role_panels'),
      ...api('roles'),
      template: 'notifications',
      createChannel: true,
      roleNames: 'Announcements, Events, News',
    },
    moderation: { ...legacy('management.moderation'), ...api('moderation') },
    protection: { profile: 'balanced', logChannel: '', createChannel: true },
  };
}

function App() {
  const [youtubeSubscriptions, setYoutubeSubscriptions] = useState<YouTubeSubscription[]>([]);
  const [rssSubscriptions, setRssSubscriptions] = useState<RssSubscription[]>([]);
  const [twitchSubscriptions, setTwitchSubscriptions] = useState<TwitchSubscription[]>([]);
  const [externalSubscriptions, setExternalSubscriptions] = useState<
    Partial<Record<ExternalProvider, ExternalSubscription[]>>
  >({});
  const [studioTemplates, setStudioTemplates] = useState<StudioTemplate[]>([]);
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const [me, setMe] = useState<Me | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>(() => (localPreviewMode ? demoGuilds : []));
  const [guildContext, setGuildContext] = useState<GuildContext | null>(null);
  const [quickSetup, setQuickSetup] = useState<QuickSetupState | null>(null);
  const [quickSetupDefaults, setQuickSetupDefaults] = useState<QuickSetupFeatureDefaults>({});
  const [features, setFeatures] = useState<Feature[]>(() =>
    localPreviewMode ? demoFeatures.concat(additionalFeatures).map(presentFeature) : [],
  );
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [stats, setStats] = useState({ totalCases: 0 });
  const [quota, setQuota] = useState({
    plan: 'Free',
    limits: {} as Record<string, number>,
    usage: {} as Record<string, number>,
  });
  const [rankConfig, setRankConfig] = useState(defaultRankCard);
  const [savedRankConfig, setSavedRankConfig] = useState(defaultRankCard);
  const [detailConfig, setDetailConfig] = useState<FeatureConfig>({});
  const [savedDetailConfig, setSavedDetailConfig] = useState<FeatureConfig>({});
  const [detailSchema, setDetailSchema] = useState<FeatureSchema | null>(null);
  const [detailEnabled, setDetailEnabled] = useState(false);
  const [detailRevision, setDetailRevision] = useState(0);
  const [providerHealth, setProviderHealth] = useState<ProviderSubscriptionHealth | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'auth' | 'saving'>(
    'loading',
  );
  const [message, setMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Category>('all');
  const [detailLoading, setDetailLoading] = useState(false);

  const navigate = (path: string) => {
    const next = parseRoute(path);
    if (window.location.hash === path) setRoute(next);
    else window.location.hash = path;
  };
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    if (!window.location.hash) window.location.hash = '#/';
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.querySelector<HTMLElement>('[data-route-heading]')?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [route.page, route.key]);
  useEffect(() => {
    if (localPreviewMode) {
      setMe({
        id: 'demo',
        guildId: 'demo',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        dbOk: true,
      });
      setStatus('ready');
      return;
    }
    void Promise.all([
      api.me(),
      api.guilds().catch(() => {
        setMessage('Could not load your servers. Return to your account and try again.');
        return { guilds: [] };
      }),
      api.features().catch(() => {
        // Do not present stale/demo state as the real guild catalogue.  Keep
        // the topics discoverable, but make every state explicitly blocked so
        // a failed API request cannot lead to a misleading publish action.
        setMessage('Feature state is unavailable until the Rust API reconnects.');
        return { guildId: '', features: unavailableFeatureCatalogue() };
      }),
      api.stats().catch(() => ({ totalCases: 0, guildId: '' })),
      api.cases().catch(() => ({ cases: [] })),
      api.audit().catch(() => ({ events: [] })),
      api.activity().catch(() => ({ activity: [] })),
      api.quotas().catch(() => ({ plan: 'Free', limits: {}, usage: {} })),
      api.rankCard().catch(() => ({ guildId: '', config: defaultRankCard })),
    ])
      .then(
        ([
          nextMe,
          nextGuilds,
          nextFeatures,
          nextStats,
          nextCases,
          nextAudit,
          nextActivity,
          nextQuota,
          nextRank,
        ]) => {
          setMe(nextMe);
          setGuilds(nextGuilds.guilds);
          setFeatures(nextFeatures.features.map(presentFeature));
          setStats(nextStats);
          setCases(nextCases.cases);
          setAudit(nextAudit.events);
          setActivity(nextActivity.activity);
          setQuota(nextQuota);
          setRankConfig(nextRank.config);
          setSavedRankConfig(nextRank.config);
          restoreOAuthReturnHash();
          setStatus('ready');
        },
      )
      .catch((cause: unknown) => {
        setMessage(cause instanceof Error ? cause.message : 'Could not load the dashboard.');
        setStatus('error');
      });
  }, []);
  useEffect(() => {
    const guildId = me?.guildId ?? 'demo';
    if (localPreviewMode) {
      try {
        const stored = localStorage.getItem(`vh_quick_setup_${guildId}`);
        setQuickSetup(
          stored ? (JSON.parse(stored) as QuickSetupState) : defaultQuickSetupState(guildId),
        );
      } catch {
        setQuickSetup(defaultQuickSetupState(guildId));
      }
      setGuildContext({
        guildId,
        name: guilds[0]?.name ?? 'Demo server',
        permissions: 'demo',
        channels: [
          { id: 'demo-general', name: 'geral', type: 'text' },
          { id: 'demo-rules', name: 'rules', type: 'text' },
        ],
        roles: [{ id: 'demo-member', name: 'Member', position: 1 }],
        hierarchy: { known: true },
        capabilities: { channelSelectors: true, roleSelectors: true, permissionPreflight: true },
        stale: false,
      });
      setQuickSetupDefaults({
        welcome: defaults['support.welcome'],
        roles: defaults['community.role_panels'],
        moderation: defaults['management.moderation'],
        antiRaid: defaults['protection.anti_raid'],
        antiSpam: defaults['protection.antispam'],
      });
      return;
    }
    void api
      .quickSetup()
      .then(setQuickSetup)
      .catch(() => setQuickSetup(defaultQuickSetupState(guildId)));
    void api
      .guildContext()
      .then(setGuildContext)
      .catch(() => undefined);
    // Quick Setup is a composition of real feature adapters.  Fetch their
    // defaults from Rust instead of reconstructing a second schema in React.
    void Promise.all(
      [
        ['welcome', 'support.welcome'],
        ['roles', 'community.role_panels'],
        ['moderation', 'management.moderation'],
        ['antiRaid', 'protection.anti_raid'],
        ['antiSpam', 'protection.antispam'],
      ].map(async ([name, key]) => {
        try {
          const detail = await api.feature(key);
          return [name, { ...(detail.defaults ?? {}), ...detail.config }] as const;
        } catch {
          return [name, {}] as const;
        }
      }),
    ).then((entries) => {
      setQuickSetupDefaults(Object.fromEntries(entries) as QuickSetupFeatureDefaults);
    });
  }, [me?.guildId, guilds]);
  useEffect(() => {
    if (route.page !== 'overview' || !quickSetup || quickSetup.status !== 'not_started') return;
    const key = `vh_quick_setup_intro_${quickSetup.guildId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* storage optional */
    }
    window.location.hash = '#/quick-setup';
  }, [route.page, quickSetup]);
  async function startLogin() {
    setAuthLoading(true);
    setAuthError('');
    try {
      await api.startOAuth();
    } catch (cause) {
      setAuthError(
        cause instanceof Error ? cause.message : 'Could not start Discord sign-in.',
      );
      setAuthLoading(false);
    }
  }
  useEffect(() => {
    if (!localPreviewMode) {
      void api
        .youtubeSubscriptions()
        .then((result) => setYoutubeSubscriptions(result.subscriptions))
        .catch(() => undefined);
      void api
        .rssSubscriptions()
        .then((result) => setRssSubscriptions(result.subscriptions))
        .catch(() => undefined);
      void api
        .twitchSubscriptions()
        .then((result) => setTwitchSubscriptions(result.subscriptions))
        .catch(() => undefined);
      (['reddit', 'x', 'tiktok', 'instagram', 'kick', 'bluesky'] as ExternalProvider[]).forEach((provider) => {
        void api
          .externalSubscriptions(provider)
          .then((result) =>
            setExternalSubscriptions((current) => ({ ...current, [provider]: result.subscriptions })),
          )
          .catch(() => undefined);
      });
    }
  }, []);
  useEffect(() => {
    if (route.page !== 'detail' || !route.key) return;
    setDetailLoading(true);
    // Production configuration must never be reconstructed from a stale
    // client-side form.  Local defaults remain useful for the explicit
    // preview mode, but the Rust adapter is the only source of truth for the
    // deployed panel.
    const fallback = localPreviewMode ? defaults[route.key] ?? {} : {};
    if (localPreviewMode) {
      setDetailSchema(null);
      setDetailConfig({ ...fallback });
      setSavedDetailConfig({ ...fallback });
      setDetailEnabled(features.find((item) => item.key === route.key)?.enabled ?? false);
      setDetailLoading(false);
      return;
    }
    void api
      .feature(route.key)
      .then((result) => {
        setDetailSchema(result.schema ?? null);
        const apiDefaults = result.defaults ?? {};
        // The API adapter is the source of truth whenever it exposes a schema.
        // Local specs are only a compatibility fallback for the explicit
        // preview mode. In production, an API response without a schema is an
        // adapter outage, not permission to invent controls in the browser.
        const resolvedConfig = result.schema
          ? configForSchema(result.schema, apiDefaults, result.config)
          : localPreviewMode
            ? { ...fallback, ...apiDefaults, ...result.config }
            : { ...apiDefaults, ...result.config };
        setDetailConfig(resolvedConfig);
        setSavedDetailConfig(resolvedConfig);
        setDetailEnabled(result.enabled);
        setDetailRevision(result.revision ?? 0);
      })
      .catch(() => {
        setDetailSchema(null);
        setDetailConfig(localPreviewMode ? { ...fallback } : {});
        setSavedDetailConfig(localPreviewMode ? { ...fallback } : {});
        setDetailEnabled(features.find((item) => item.key === route.key)?.enabled ?? false);
        setDetailRevision(0);
      })
      .finally(() => setDetailLoading(false));
  }, [route.page, route.key, features]);
  useEffect(() => {
    if (
      route.page !== 'detail' ||
      !route.key ||
      !['management.templates', 'support.welcome', 'support.welcome_channel'].includes(route.key) ||
      localPreviewMode
    ) return;
    void api
      .studioTemplates()
      .then((result) => setStudioTemplates(result.templates))
      .catch(() => setStudioTemplates([]));
  }, [route.page, route.key]);
  useEffect(() => {
    const subscription = route.key === 'social.youtube' ? youtubeSubscriptions[0] : undefined;
    if (route.page === 'detail' && route.key === 'social.youtube' && subscription) {
      setDetailConfig((current) => ({
        ...current,
        sourceChannelId: subscription.sourceChannelId,
        targetChannelId: subscription.targetChannelId,
        messageTemplate: subscription.messageTemplate,
        mention: subscription.mention,
        intervalSeconds: subscription.intervalSeconds,
      }));
      setSavedDetailConfig((current) => ({
        ...current,
        sourceChannelId: subscription.sourceChannelId,
        targetChannelId: subscription.targetChannelId,
        messageTemplate: subscription.messageTemplate,
        mention: subscription.mention,
        intervalSeconds: subscription.intervalSeconds,
      }));
      setDetailEnabled(subscription.enabled);
    }
  }, [route.page, route.key, youtubeSubscriptions]);
  useEffect(() => {
    const subscription =
      route.key === 'social.rss' || route.key === 'social.podcasts'
        ? rssSubscriptions[0]
        : undefined;
    if (
      route.page === 'detail' &&
      (route.key === 'social.rss' || route.key === 'social.podcasts') &&
      subscription
    ) {
      setDetailConfig((current) => ({
        ...current,
        feedUrl: subscription.feedUrl,
        targetChannelId: subscription.targetChannelId,
        messageTemplate: subscription.messageTemplate,
        mention: subscription.mention,
        intervalSeconds: subscription.intervalSeconds,
      }));
      setSavedDetailConfig((current) => ({
        ...current,
        feedUrl: subscription.feedUrl,
        targetChannelId: subscription.targetChannelId,
        messageTemplate: subscription.messageTemplate,
        mention: subscription.mention,
        intervalSeconds: subscription.intervalSeconds,
      }));
      setDetailEnabled(subscription.enabled);
    }
  }, [route.page, route.key, rssSubscriptions]);
  useEffect(() => {
    const subscription = route.key === 'social.twitch' ? twitchSubscriptions[0] : undefined;
    if (route.page === 'detail' && route.key === 'social.twitch' && subscription) {
      setDetailConfig((current) => ({
        ...current,
        sourceLogin: subscription.sourceLogin,
        targetChannelId: subscription.targetChannelId,
        messageTemplate: subscription.messageTemplate,
        mention: subscription.mention,
      }));
      setSavedDetailConfig((current) => ({
        ...current,
        sourceLogin: subscription.sourceLogin,
        targetChannelId: subscription.targetChannelId,
        messageTemplate: subscription.messageTemplate,
        mention: subscription.mention,
      }));
      setDetailEnabled(subscription.enabled);
    }
  }, [route.page, route.key, twitchSubscriptions]);
  useEffect(() => {
    setProviderHealth(null);
    if (localPreviewMode || route.page !== 'detail') return;
    let cancelled = false;
    const load = async () => {
      try {
        let health: ProviderSubscriptionHealth | null = null;
        if (route.key === 'social.youtube' && youtubeSubscriptions[0]) {
          health = await api.youtubeHealth(youtubeSubscriptions[0].id);
        } else if (
          (route.key === 'social.rss' || route.key === 'social.podcasts') &&
          rssSubscriptions[0]
        ) {
          health = await api.rssHealth(rssSubscriptions[0].id);
        } else if (route.key === 'social.twitch' && twitchSubscriptions[0]) {
          health = await api.twitchHealth(twitchSubscriptions[0].id);
        }
        if (!cancelled) setProviderHealth(health);
      } catch {
        if (!cancelled) setProviderHealth(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [route.page, route.key, youtubeSubscriptions, rssSubscriptions, twitchSubscriptions]);
  useEffect(() => {
    const provider = route.key ? externalProviderForFeature(route.key) : null;
    const subscription = provider ? externalSubscriptions[provider]?.[0] : undefined;
    if (route.page !== 'detail' || !provider || !subscription) return;
    const sourceKey = externalSourceKey(provider);
    const sourceValue = subscription[sourceKey as keyof ExternalSubscription];
    setDetailConfig((current) => ({
      ...current,
      [sourceKey]: typeof sourceValue === 'string' ? sourceValue : '',
      targetChannelId: subscription.targetChannelId,
      messageTemplate: subscription.messageTemplate,
      mention: subscription.mention,
      intervalSeconds: subscription.intervalSeconds,
    }));
    setSavedDetailConfig((current) => ({
      ...current,
      [sourceKey]: typeof sourceValue === 'string' ? sourceValue : '',
      targetChannelId: subscription.targetChannelId,
      messageTemplate: subscription.messageTemplate,
      mention: subscription.mention,
      intervalSeconds: subscription.intervalSeconds,
    }));
    setDetailEnabled(subscription.enabled);
  }, [route.page, route.key, externalSubscriptions]);

  const currentGuild = guilds.find((guild) => guild.id === me?.guildId) ?? guilds[0];
  const currentFeature = features.find((item) => item.key === route.key);
  const detailDirty = JSON.stringify(detailConfig) !== JSON.stringify(savedDetailConfig);
  const rankDirty = JSON.stringify(rankConfig) !== JSON.stringify(savedRankConfig);
  const dirty =
    route.page === 'detail' ? detailDirty : route.page === 'rank-card' ? rankDirty : false;
  const filteredFeatures = useMemo(() => {
    const unique = Array.from(new Map(features.map((item) => [item.key, item])).values());
    return unique.filter(
      (item) =>
        (filter === 'all' || item.category === filter) &&
        item.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    );
  }, [features, filter, search]);
  async function switchGuild(guildId: string, nextPath?: string) {
    if (localPreviewMode) {
      setMe((current) => (current ? { ...current, guildId } : current));
      if (nextPath) navigate(nextPath);
      return;
    }
    try {
      await api.switchGuild(guildId);
      if (nextPath) window.location.hash = nextPath;
      window.location.reload();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not switch server.');
    }
  }
  async function saveDetail() {
    if (!route.key) return;
    setStatus('saving');
    try {
      if (!localPreviewMode) {
        const preflight = await api.featurePreflight(route.key, detailConfig, detailEnabled);
        if (!preflight.ok) {
          setStatus('ready');
          setMessage(preflight.issues.map((issue) => issue.message).join(' '));
          return;
        }
      }
      const result = localPreviewMode
        ? { enabled: detailEnabled, config: detailConfig, revision: detailRevision }
        : await api.saveFeature(route.key, detailEnabled, detailConfig, detailRevision);
      if (
        !localPreviewMode &&
        route.key === 'community.role_panels' &&
        detailEnabled &&
        typeof detailConfig.channel === 'string' &&
        Array.isArray(detailConfig.roleIds) &&
        detailConfig.roleIds.length > 0
      ) {
        const existingPanels = await api.rolePanels();
        const panelPayload = {
          channel: detailConfig.channel,
          title: String(detailConfig.panelTitle ?? 'Choose your roles'),
          description: String(detailConfig.panelDescription ?? ''),
          roleIds: detailConfig.roleIds.map(String),
          selectionMode: detailConfig.selectionMode === 'unique' ? ('unique' as const) : ('multiple' as const),
          removeOnUnselect: detailConfig.removeOnUnselect !== false,
        };
        if (existingPanels.panels[0]) {
          await api.updateRolePanel(existingPanels.panels[0].message_id, panelPayload);
        } else {
          await api.createRolePanel(panelPayload);
        }
      }
      setFeatures((items) =>
        items.map((item) => (item.key === route.key ? { ...item, enabled: result.enabled } : item)),
      );
      setDetailConfig(result.config);
      setSavedDetailConfig(result.config);
      setDetailRevision(result.revision ?? detailRevision);
      setStatus('ready');
      setMessage(
        localPreviewMode
          ? 'Preview saved in this browser.'
          : 'Configuration published to the server.',
      );
    } catch (cause) {
      setStatus('error');
      setMessage(cause instanceof Error ? cause.message : 'Could not save.');
    }
  }
  async function repairDetail() {
    if (!route.key || localPreviewMode) return;
    setStatus('saving');
    try {
      const result = await api.repairFeature(route.key);
      setDetailConfig(result.config);
      setSavedDetailConfig(result.config);
      setDetailEnabled(result.enabled);
      setDetailRevision(result.revision ?? detailRevision);
      setFeatures((items) =>
        items.map((item) =>
          item.key === route.key
            ? { ...item, enabled: result.enabled, health: result.health, maturity: result.maturity }
            : item,
        ),
      );
      setStatus('ready');
      setMessage('The publication was repaired and the new revision was created.');
    } catch (cause) {
      setStatus('error');
      setMessage(cause instanceof Error ? cause.message : 'Could not repair the publication.');
    }
  }
  async function testDetail() {
    if (!route.key) return;
    try {
      if (route.key === 'social.youtube') {
        const sourceChannelId = String(detailConfig.sourceChannelId ?? '').trim();
        if (!sourceChannelId) {
          setMessage('Enter the YouTube channel ID first.');
          return;
        }
        if (localPreviewMode) {
          setMessage('YouTube channel validation is available when the dashboard is connected to the API.');
          return;
        }
        const subscription = youtubeSubscriptions[0];
        if (!subscription) {
          setMessage('Save the subscription first so the test can be sent to Discord.');
          return;
        }
        const result = await api.testYoutubeDelivery(subscription.id, {
          sourceChannelId,
          targetChannelId: String(detailConfig.targetChannelId ?? subscription.targetChannelId),
          messageTemplate: String(
            detailConfig.messageTemplate ?? subscription.messageTemplate,
          ),
          mention: String(detailConfig.mention ?? subscription.mention),
          intervalSeconds: Number(
            detailConfig.intervalSeconds ?? subscription.intervalSeconds,
          ),
          enabled: Boolean(detailEnabled),
        });
        setMessage(
          result.delivered
            ? 'Test message sent to the configured Discord channel. The YouTube cursor was not changed.'
            : 'The test was not delivered.',
        );
        return;
      }
      if (route.key === 'social.rss' || route.key === 'social.podcasts') {
        const feedUrl = String(detailConfig.feedUrl ?? '').trim();
        if (!feedUrl) {
          setMessage('Enter the RSS/Atom feed URL first.');
          return;
        }
        if (localPreviewMode) {
          setMessage('Feed validation is available when the dashboard is connected to the API.');
          return;
        }
        const subscription = rssSubscriptions[0];
        if (!subscription) {
          setMessage('Save the subscription first so the test can be sent to Discord.');
          return;
        }
        const result = await api.testRssDelivery(subscription.id, {
          feedUrl,
          targetChannelId: String(detailConfig.targetChannelId ?? subscription.targetChannelId),
          messageTemplate: String(
            detailConfig.messageTemplate ?? subscription.messageTemplate,
          ),
          mention: String(detailConfig.mention ?? subscription.mention),
          intervalSeconds: Number(
            detailConfig.intervalSeconds ?? subscription.intervalSeconds,
          ),
          enabled: Boolean(detailEnabled),
        });
        setMessage(
          result.delivered
            ? 'Test message sent to the configured Discord channel. The feed cursor was not changed.'
            : 'The test was not delivered.',
        );
        return;
      }
      if (route.key === 'social.twitch') {
        const login = String(detailConfig.sourceLogin ?? '').trim();
        if (!login) {
          setMessage('Enter the Twitch channel name first.');
          return;
        }
        if (localPreviewMode) {
          setMessage('Twitch channel validation is available when the dashboard is connected to the API.');
          return;
        }
        const subscription = twitchSubscriptions[0];
        if (!subscription) {
          setMessage('Save the subscription first so the test can be sent to Discord.');
          return;
        }
        const result = await api.testTwitchDelivery(subscription.id, {
          sourceLogin: login,
          targetChannelId: String(detailConfig.targetChannelId ?? subscription.targetChannelId),
          messageTemplate: String(
            detailConfig.messageTemplate ?? subscription.messageTemplate,
          ),
          mention: String(detailConfig.mention ?? subscription.mention),
          enabled: Boolean(detailEnabled),
        });
        setMessage(
          result.delivered
            ? 'Test message sent to the configured Discord channel. No EventSub event was consumed.'
            : 'The test was not delivered.',
        );
        return;
      }
      const result = await api.testFeature(route.key, detailConfig);
      const errors = result.result.issues.filter((issue) => issue.severity === 'error');
      const decision = result.decision;
      const decisionText = decision ? ` · ${decision.reason}` : '';
      setMessage(
        errors.length
          ? errors.map((issue) => issue.message).join(' ')
          : result.result.effects.length
            ? `simulation: ${result.result.effects.join(' · ')}${decisionText}`
            : 'Simulation completed — no real action was applied.',
      );
    } catch {
      setMessage(
        route.key === 'social.rss' || route.key === 'social.podcasts'
          ? 'Could not read this feed. Check the URL and try again.'
          : route.key === 'social.twitch'
            ? 'Could not validate the Twitch channel. Check the name and the server credentials.'
            : 'Simulation is available when the API is connected.',
      );
    }
  }
  async function saveRankCard() {
    setStatus('saving');
    try {
      const result = localPreviewMode ? { config: rankConfig } : await api.saveRankCard(rankConfig);
      setRankConfig(result.config);
      setSavedRankConfig(result.config);
      setStatus('ready');
      setMessage(
        localPreviewMode
          ? 'Preview saved in this browser.'
          : 'XP card published in the server.',
      );
    } catch (cause) {
      setStatus('error');
      setMessage(cause instanceof Error ? cause.message : 'Could not publish.');
    }
  }
  async function applyQuickSetupStep(
    step: QuickSetupStepKey,
    config: FeatureConfig,
    enabled = true,
  ): Promise<boolean> {
    setStatus('saving');
    try {
      const writes: Array<{ key: string; config: FeatureConfig; enabled: boolean }> = [];
      if (step === 'welcome') writes.push({ key: 'support.welcome', config, enabled });
      if (step === 'roles') writes.push({ key: 'community.role_panels', config, enabled });
      if (step === 'moderation') writes.push({ key: 'management.moderation', config, enabled });
      if (step === 'protection') {
        const profile = String(config.profile ?? 'balanced');
        const profiles: Record<string, { antispam: FeatureConfig; antiRaid: FeatureConfig }> = {
          monitor: {
            antispam: {
              ...quickSetupDefaults.antiSpam,
              floodCount: 8,
              windowSeconds: 10,
              duplicateLimit: 4,
              timeoutSeconds: 0,
              mentionLimit: 8,
              ignoredChannels: [],
              ignoredRoles: [],
              alertOnly: true,
              logChannel: config.logChannel ?? '',
            },
            antiRaid: {
              ...quickSetupDefaults.antiRaid,
              joinThreshold: 12,
              windowSeconds: 20,
              incidentMinutes: 10,
              verification: 'high',
              pauseInvites: true,
              alertOnly: true,
              alertChannel: config.logChannel ?? '',
            },
          },
          balanced: {
            antispam: {
              ...quickSetupDefaults.antiSpam,
              floodCount: 6,
              windowSeconds: 10,
              duplicateLimit: 3,
              timeoutSeconds: 60,
              mentionLimit: 5,
              ignoredChannels: [],
              ignoredRoles: [],
              alertOnly: false,
              logChannel: config.logChannel ?? '',
            },
            antiRaid: {
              ...quickSetupDefaults.antiRaid,
              joinThreshold: 10,
              windowSeconds: 20,
              incidentMinutes: 10,
              verification: 'high',
              pauseInvites: true,
              alertOnly: true,
              alertChannel: config.logChannel ?? '',
            },
          },
          strict: {
            antispam: {
              ...quickSetupDefaults.antiSpam,
              floodCount: 5,
              windowSeconds: 10,
              duplicateLimit: 2,
              timeoutSeconds: 300,
              mentionLimit: 4,
              ignoredChannels: [],
              ignoredRoles: [],
              alertOnly: false,
              logChannel: config.logChannel ?? '',
            },
            antiRaid: {
              ...quickSetupDefaults.antiRaid,
              joinThreshold: 8,
              windowSeconds: 20,
              incidentMinutes: 10,
              verification: 'high',
              pauseInvites: true,
              alertOnly: false,
              alertChannel: config.logChannel ?? '',
            },
          },
        };
        const selected = profiles[profile] ?? profiles.balanced;
        writes.push({ key: 'protection.antispam', config: selected.antispam, enabled });
        writes.push({ key: 'protection.anti_raid', config: selected.antiRaid, enabled });
      }
      // Welcome and role-panel publication is handled atomically by the
      // Quick Setup endpoint. Protection/moderation still use the regular
      // feature endpoint because their profile expands into multiple policies
      // and must preserve the existing projections.
      if (!localPreviewMode && (step === 'protection' || step === 'moderation'))
        for (const write of writes) await api.saveFeature(write.key, write.enabled, write.config);
      const previous = quickSetup ?? defaultQuickSetupState(me?.guildId ?? 'demo');
      const next = localPreviewMode
        ? {
            ...previous,
            revision: previous.revision + 1,
            status: 'in_progress' as const,
            steps: previous.steps.map((item) =>
              item.key === step ? { ...item, status: 'applied' as const } : item,
            ),
          }
        : await api.saveQuickSetupStep(step, {
            status: 'applied',
            config,
            enabled,
            expectedRevision: previous.revision,
          });
      if (!localPreviewMode && next.draft && step === 'protection') {
        const normalizedConfig = next.draft as FeatureConfig;
        const channelId = String(normalizedConfig.logChannel ?? '').trim();
        if (channelId) {
          const antispam = writes.find((write) => write.key === 'protection.antispam');
          const antiRaid = writes.find((write) => write.key === 'protection.anti_raid');
          if (antispam)
            await api.saveFeature(antispam.key, antispam.enabled, {
              ...antispam.config,
              logChannel: channelId,
            });
          if (antiRaid)
            await api.saveFeature(antiRaid.key, antiRaid.enabled, {
              ...antiRaid.config,
              alertChannel: channelId,
            });
        }
      }
      const normalized = next.steps.every((item) => item.status !== 'pending')
        ? { ...next, status: 'completed' as const, currentStep: null }
        : next;
      setQuickSetup(normalized);
      if (localPreviewMode)
        localStorage.setItem(`vh_quick_setup_${me?.guildId ?? 'demo'}`, JSON.stringify(normalized));
      setFeatures((items) =>
        items.map((item) =>
          writes.some((write) => write.key === item.key) ? { ...item, enabled } : item,
        ),
      );
      setStatus('ready');
      setMessage(
        `${quickSetupSteps.find((item) => item.key === step)?.label ?? 'Step'} applied.`,
      );
      return true;
    } catch (cause) {
      setStatus('error');
      setMessage(cause instanceof Error ? cause.message : 'Could not apply this step.');
      return false;
    }
  }
  async function skipQuickSetupStep(step: QuickSetupStepKey): Promise<boolean> {
    try {
      const previous = quickSetup ?? defaultQuickSetupState(me?.guildId ?? 'demo');
      const next = localPreviewMode
        ? {
            ...previous,
            revision: previous.revision + 1,
            status: 'in_progress' as const,
            steps: previous.steps.map((item) =>
              item.key === step ? { ...item, status: 'skipped' as const } : item,
            ),
          }
        : await api.saveQuickSetupStep(step, {
            status: 'skipped',
            expectedRevision: previous.revision,
          });
      setQuickSetup(next);
      if (localPreviewMode)
        localStorage.setItem(`vh_quick_setup_${me?.guildId ?? 'demo'}`, JSON.stringify(next));
      return true;
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not skip this step.');
      return false;
    }
  }
  async function dismissQuickSetup() {
    try {
      const next = localPreviewMode
        ? {
            ...(quickSetup ?? defaultQuickSetupState(me?.guildId ?? 'demo')),
            status: 'dismissed' as const,
          }
        : await api.dismissQuickSetup();
      setQuickSetup(next);
      if (localPreviewMode)
        localStorage.setItem(`vh_quick_setup_${me?.guildId ?? 'demo'}`, JSON.stringify(next));
    } catch {
      setMessage('Guided setup remains available in the sidebar.');
    }
  }
  if (status === 'loading')
    return (
      <div className="center" role="status" aria-live="polite" aria-busy="true">
        <a className="panel-state-exit" href="/account/">
          ← Exit to account
        </a>
        <div className="loader" />
        <p>Preparing your workspace…</p>
      </div>
    );
  if ((status === 'auth' || status === 'error') && !me)
    return (
      <AuthScreen
        error={status === 'auth' ? authError : message}
        loading={authLoading}
        onLogin={() => void startLogin()}
      />
    );
  if (route.page === 'servers')
    return (
      <ServerPicker
        guilds={guilds}
        selectedGuildId={me?.guildId}
        onSelect={(guildId) => void switchGuild(guildId, '#/')}
      />
    );
  const title =
    route.page === 'detail'
      ? (currentFeature?.label ?? 'Configuration')
      : (pages.find((item) => item.id === route.page)?.label ?? 'Dashboard');
  const subtitle =
    route.page === 'overview'
      ? 'The essentials to get your server ready.'
      : route.page === 'quick-setup'
        ? 'Set up the essentials in short steps, with the review before publishing.'
        : route.page === 'features'
          ? 'Choose the topic to open its full configuration.'
          : route.page === 'activity'
            ? 'See what happened and stay in control.'
            : route.page === 'rank-card'
              ? 'Create the level card with your server identity.'
              : 'server-specific configuration with simple and advanced options.';
  return (
    <div className="shell panel-shell">
      <aside className="sidebar panel-sidebar">
        <div className="logo panel-logo">
          <span>✦</span>
          <div>
            <strong>VOZEN</strong>
            <small>HELPER PANEL</small>
          </div>
        </div>
        <div className="workspace panel-workspace">
          <small>Current server</small>
          <select
            aria-label="Current server"
            value={currentGuild?.id ?? ''}
            onChange={(event) => void switchGuild(event.target.value)}
          >
            {guilds.map((guild) => (
              <option value={guild.id} key={guild.id}>
                {guild.name}
              </option>
            ))}
          </select>
          <p>Changes are isolated to this server.</p>
        </div>
        <nav className="panel-nav" aria-label="Main navigation">
          {pages.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                route.page === item.id || (item.id === 'features' && route.page === 'detail')
                  ? 'nav active'
                  : 'nav'
              }
              aria-current={
                route.page === item.id || (item.id === 'features' && route.page === 'detail')
                  ? 'page'
                  : undefined
              }
              onClick={() => navigate(item.id === 'overview' ? '#/' : `#/${item.id}`)}
            >
              <span>{item.icon}</span>
              <div>
                <b>{item.label}</b>
                <small>{item.hint}</small>
              </div>
            </button>
          ))}
        </nav>
        <a className="panel-account-link" href="/account/">
          ← Exit to account
        </a>
        <div className="runtime">
          <i /> {localPreviewMode ? 'Local preview' : 'Synced with Rust'}
        </div>
      </aside>
      <main className="main panel-main" aria-labelledby="route-heading">
        <header className="panel-header">
          <div>
            <small className="eyebrow">{currentGuild?.name ?? 'WORKSPACE'} · HELPER</small>
            <h1 id="route-heading" data-route-heading tabIndex={-1}>{title}</h1>
            <p className="subtitle">{subtitle}</p>
          </div>
          <div className="header-state">
            <span className="status-dot" />{' '}
            {dirty
              ? 'Unpublished draft'
              : localPreviewMode
                ? 'Demo mode'
                : 'Fully synced'}
          </div>
        </header>
        {message && (
          <div className="toast panel-toast" role="status">
            {message}
            <button type="button" aria-label="Close" onClick={() => setMessage('')}>
              ×
            </button>
          </div>
        )}
        {guildContext && !localPreviewMode && guildContext.stale && (
          <div className="toast panel-toast" role="status">
            Discord context must be refreshed before publishing changes.{' '}
            {guildContext.bot?.reason === 'discord_bot_member_unavailable'
              ? 'Could not verify the Helper role and permissions.'
              : guildContext.message ?? 'Selectors remain available, but preflight is blocked.'}
          </div>
        )}
        {route.page === 'overview' && (
          <Overview
            features={features}
            stats={stats}
            quota={quota}
            cases={cases}
            onOpen={navigate}
          />
        )}
        {route.page === 'quick-setup' && (
          <QuickSetup
            state={quickSetup ?? defaultQuickSetupState(currentGuild?.id ?? 'demo')}
            context={guildContext}
            featureDefaults={quickSetupDefaults}
            localCompatibilityDefaults={localPreviewMode}
            onApply={applyQuickSetupStep}
            onSkip={skipQuickSetupStep}
            onDismiss={() => void dismissQuickSetup()}
            onOpen={navigate}
          />
        )}
        {route.page === 'features' && (
          <FeatureCatalogue
            features={filteredFeatures}
            filter={filter}
            setFilter={setFilter}
            search={search}
            setSearch={setSearch}
            onOpen={(key) =>
              navigate(
                key === 'studio.rank_card' ? '#/rank-card' : `#/config/${encodeURIComponent(key)}`,
              )
            }
          />
        )}
        {route.page === 'activity' && <Activity cases={cases} audit={audit} activity={activity} />}
        {route.page === 'rank-card' && (
          <RankCardEditor
            config={rankConfig}
            patch={(next) => setRankConfig((current) => ({ ...current, ...next }))}
            onSave={() => void saveRankCard()}
            onReset={() => setRankConfig(defaultRankCard)}
            saving={status === 'saving'}
          />
        )}
        {route.page === 'detail' &&
          (detailLoading ? (
            <div className="loading-card card">
              <div className="loader" />
              <span>Loading configuration…</span>
            </div>
          ) : (
            <FeatureDetail
              feature={currentFeature}
              schema={detailSchema}
              context={guildContext}
              config={detailConfig}
              enabled={detailEnabled}
              revision={detailRevision}
              onEnabled={setDetailEnabled}
              onChange={(key, value) =>
                setDetailConfig((current) => ({ ...current, [key]: value }))
              }
              onSave={() => void saveDetail()}
              onRepair={() => void repairDetail()}
              onDiscard={() => {
                setDetailConfig(savedDetailConfig);
                setDetailEnabled(features.find((item) => item.key === route.key)?.enabled ?? false);
              }}
              onTest={() => void testDetail()}
              templates={studioTemplates}
              onTemplatesChange={setStudioTemplates}
              providerHealth={providerHealth}
              saving={status === 'saving'}
              onBack={() => navigate('#/features')}
            />
          ))}
      </main>
    </div>
  );
}

function QuickSetup({
  state,
  context,
  featureDefaults,
  localCompatibilityDefaults,
  onApply,
  onSkip,
  onDismiss,
  onOpen,
}: {
  state: QuickSetupState;
  context: GuildContext | null;
  featureDefaults: QuickSetupFeatureDefaults;
  localCompatibilityDefaults: boolean;
  onApply: (step: QuickSetupStepKey, config: FeatureConfig, enabled?: boolean) => Promise<boolean>;
  onSkip: (step: QuickSetupStepKey) => Promise<boolean>;
  onDismiss: () => void;
  onOpen: (path: string) => void;
}) {
  const [started, setStarted] = useState(
    state.status === 'in_progress' || state.status === 'completed',
  );
  const [index, setIndex] = useState(
    Math.max(
      0,
      quickSetupSteps.findIndex((item) => item.key === state.currentStep),
    ),
  );
  const [applying, setApplying] = useState(false);
  const [draft, setDraft] = useState<Record<QuickSetupStepKey, FeatureConfig>>(() =>
    quickSetupDraft(featureDefaults, localCompatibilityDefaults),
  );
  useEffect(() => {
    setDraft(quickSetupDraft(featureDefaults, localCompatibilityDefaults));
  }, [featureDefaults, localCompatibilityDefaults]);
  useEffect(() => {
    setStarted(state.status === 'in_progress' || state.status === 'completed');
    const next = quickSetupSteps.findIndex((item) => item.key === state.currentStep);
    if (next >= 0) setIndex(next);
  }, [state.status, state.currentStep]);
  const current = quickSetupSteps[index] ?? quickSetupSteps[0];
  const completed =
    state.status === 'completed' || state.steps.every((item) => item.status !== 'pending');
  const patch = (key: string, value: unknown) =>
    setDraft((currentDraft) => ({
      ...currentDraft,
      [current.key]: { ...currentDraft[current.key], [key]: value },
    }));
  const apply = async () => {
    setApplying(true);
    const ok = await onApply(
      current.key,
      draft[current.key],
      current.key !== 'welcome' || draft[current.key].mode !== 'off',
    );
    setApplying(false);
    if (ok && index < quickSetupSteps.length - 1) setIndex((value) => value + 1);
  };
  const skip = async () => {
    setApplying(true);
    const ok = await onSkip(current.key);
    setApplying(false);
    if (ok && index < quickSetupSteps.length - 1) setIndex((value) => value + 1);
  };
  if (!started && !completed)
    return (
      <section className="quick-setup-page">
        <div className="quick-setup-hero card">
          <div className="quick-setup-mark">✧</div>
          <small className="eyebrow">GUIDED SETUP · 2–4 MIN</small>
          <h2>Get the essentials running.</h2>
          <p>
            Choose the basics for your server. Vozen shows each change before applying it and
            saves your progress for this server.
          </p>
          <div className="quick-setup-meta">
            <span>
              server: <b>{context?.name ?? state.guildId}</b>
            </span>
            <span>
              {context?.capabilities.permissionPreflight
                ? 'Permissions verified'
                : 'Permission check pending'}
            </span>
          </div>
          <div className="actions">
            <button type="button" className="secondary" onClick={onDismiss}>
              Not now
            </button>
            <button type="button" className="primary" onClick={() => setStarted(true)}>
              Prepare server <span>→</span>
            </button>
          </div>
        </div>
      </section>
    );
  if (completed)
    return (
      <section className="quick-setup-page">
        <div className="quick-setup-complete card">
          <span className="success-mark">✓</span>
          <small className="eyebrow">SERVER READY</small>
          <h2>You’re all set.</h2>
          <p>
            Your Quick Setup choices were saved. You can return here whenever you want to review
            the essentials.
          </p>
          <div className="setup-summary">
            {state.steps.map((step) => (
              <div key={step.key}>
                <span className={step.status === 'applied' ? 'summary-icon done' : 'summary-icon'}>
                  {step.status === 'applied' ? '✓' : '–'}
                </span>
                <div>
                  <b>{quickSetupSteps.find((item) => item.key === step.key)?.label}</b>
                  <small>
                    {step.status === 'applied' ? 'Applied to server' : 'Skipped in this session'}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className="premium-panel">
            <small className="eyebrow">GO FURTHER</small>
            <h3>Premium features for the next step</h3>
            <div className="premium-grid">
              <PremiumCard
                icon="↗"
                title="Levels & XP"
                text="Rewards, level announcements, and XP cards."
              />
              <PremiumCard
                icon="□"
                title="Tickets advanced"
                text="Teams, transcripts, and SLAs for support."
              />
              <PremiumCard
                icon="⌁"
                title="Automations"
                text="Connect server events to custom actions."
              />
            </div>
            <button type="button" className="secondary" onClick={() => onOpen('#/features')}>
              View all features
            </button>
          </div>
        </div>
      </section>
    );
  const currentConfig = draft[current.key];
  const channels = context?.channels ?? [];
  const roles = context?.roles ?? [];
  const resourceName =
    current.key === 'welcome'
      ? '#welcome'
      : current.key === 'roles'
        ? '#choose-roles'
        : '#vozen-alerts';
  return (
    <section className="quick-setup-page">
      <div className="quick-setup-head">
        <div>
          <small className="eyebrow">
            QUICK SETUP · {index + 1} OF {quickSetupSteps.length}
          </small>
          <h2>Configure the essentials for your server.</h2>
          <p>We apply one step at a time. Going back does not undo published changes.</p>
        </div>
          <button type="button" className="link-button" onClick={onDismiss}>
          Exit for now
        </button>
      </div>
      <div className="setup-progress" aria-label="Setup progress">
        {quickSetupSteps.map((step, stepIndex) => (
          <button
            key={step.key}
            type="button"
            className={
              stepIndex === index
                ? 'progress-step active'
                : state.steps.find((item) => item.key === step.key)?.status === 'applied'
                  ? 'progress-step done'
                  : 'progress-step'
            }
            onClick={() => stepIndex <= index && setIndex(stepIndex)}
          >
            <span>
              {state.steps.find((item) => item.key === step.key)?.status === 'applied'
                ? '✓'
                : stepIndex + 1}
            </span>
            <b>{step.label}</b>
          </button>
        ))}
      </div>
      <div className="quick-setup-layout">
        <div className="quick-setup-form card">
          <small className="eyebrow">STEP {index + 1}</small>
          <h3>{current.label}</h3>
          <p className="setup-description">{current.description}</p>
          {current.key === 'welcome' && (
            <>
              <div className="choice-grid">
                <Choice
                  selected={currentConfig.mode === 'recommended'}
                  title="Recommended message"
                  text="A short, clear welcome that is ready to use."
                  onClick={() => patch('mode', 'recommended')}
                />
                <Choice
                  selected={currentConfig.mode === 'custom'}
                  title="Custom message"
                  text="Write your message and choose the options."
                  onClick={() => patch('mode', 'custom')}
                />
                <Choice
                  selected={currentConfig.mode === 'off'}
                  title="Disable"
                  text="Do not publish join messages."
                  onClick={() => patch('mode', 'off')}
                />
              </div>
              {currentConfig.mode !== 'off' && (
                <>
                  <SelectField
                    label="join channel"
                    value={String(currentConfig.channel ?? '')}
                    options={channels}
                    placeholder="Choose a channel"
                    onChange={(value) => patch('channel', value)}
                  />
                  <label className="field toggle-field">
                    <span>
                      <b>Create #welcome if it does not exist</b>
                      <small>Vozen shows the creation in the summary before you confirm.</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.createChannel)}
                      onChange={(event) => patch('createChannel', event.target.checked)}
                    />
                  </label>
                  <label className="field">
                    <span>
                      <b>Public message</b>
                      <small>
                        Use {`{member}`} and {`{server}`}.
                      </small>
                    </span>
                    <textarea
                      rows={3}
                      value={String(currentConfig.message ?? '')}
                      onChange={(event) => patch('message', event.target.value)}
                    />
                  </label>
                </>
              )}
            </>
          )}
          {current.key === 'roles' && (
            <>
              <div className="template-row">
                <b>Choose a starting point</b>
                <div>
                  {[
                    ['notifications', 'notifications'],
                    ['interests', 'Interests'],
                    ['languages', 'Languages'],
                  ].map(([id, label]) => (
                    <button
                      type="button"
                      key={id}
                      className={currentConfig.template === id ? 'template selected' : 'template'}
                      onClick={() => patch('template', id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <SelectField
                label="panel channel"
                value={String(currentConfig.channel ?? '')}
                options={channels}
                placeholder="Choose a channel"
                onChange={(value) => patch('channel', value)}
              />
              <label className="field toggle-field">
                <span>
                  <b>Create #choose-roles if it does not exist</b>
                  <small>Roles have no administrative permissions.</small>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(currentConfig.createChannel)}
                  onChange={(event) => patch('createChannel', event.target.checked)}
                />
              </label>
              <label className="field">
                <span>
                  <b>Role names</b>
                  <small>Separate names with commas.</small>
                </span>
                <input
                  value={String(currentConfig.roleNames ?? '')}
                  onChange={(event) => patch('roleNames', event.target.value)}
                />
              </label>
            </>
          )}
          {current.key === 'moderation' && (
            <>
              <label className="field toggle-field">
                <span>
                  <b>Require a reason for actions</b>
                  <small>Help your team keep the audit trail clear and consistent.</small>
                </span>
                <input
                  type="checkbox"
                  checked={currentConfig.requireReason !== false}
                  onChange={(event) => patch('requireReason', event.target.checked)}
                />
              </label>
              <label className="field">
                <span>
                  <b>Cleanup limit per action</b>
                  <small>Protects against accidental purges and respects Discord limits.</small>
                </span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={Number(currentConfig.maxPurge ?? 100)}
                  onChange={(event) => patch('maxPurge', Number(event.target.value))}
                />
              </label>
              <div className="notice">
                Audit rules and the log channel are configured under Audit &
                Permissions to avoid duplicate settings.
              </div>
            </>
          )}
          {current.key === 'protection' && (
            <>
              <div className="choice-grid">
                <Choice
                  selected={currentConfig.profile === 'monitor'}
                  title="Monitor"
                  text="Alert the team without punishing members."
                  onClick={() => patch('profile', 'monitor')}
                />
                <Choice
                  selected={currentConfig.profile === 'balanced'}
                  title="Balanced"
                  text="Recommended for most servers."
                  onClick={() => patch('profile', 'balanced')}
                />
                <Choice
                  selected={currentConfig.profile === 'strict'}
                  title="Hardened"
                  text="Tighter limits for larger communities."
                  onClick={() => patch('profile', 'strict')}
                />
              </div>
              <SelectField
                label="alert channel"
                value={String(currentConfig.logChannel ?? '')}
                options={channels}
                placeholder="Choose a channel"
                onChange={(value) => patch('logChannel', value)}
              />
              <label className="field toggle-field">
                <span>
                  <b>Create #vozen-alerts if it does not exist</b>
                  <small>The name is only a suggestion; review it before applying.</small>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(currentConfig.createChannel)}
                  onChange={(event) => patch('createChannel', event.target.checked)}
                />
              </label>
              <div className="notice">
                The profile changes anti-spam and anti-raid with transparent, reversible values.
              </div>
            </>
          )}
        </div>
        <aside className="quick-setup-aside card">
          <small className="eyebrow">BEFORE APPLYING</small>
          <h3>Preview</h3>
          <div className="discord-preview">
            <span className="preview-avatar">✦</span>
            <div>
              <b>
                {current.key === 'roles'
                  ? 'Dashboard of choices'
                  : current.key === 'protection'
                    ? 'Protection of the server'
                    : current.key === 'moderation'
                      ? 'Moderation record'
                      : 'Welcome to the server'}
              </b>
              <p>
                {current.key === 'roles'
                  ? 'Choose the options that fit your community.'
                  : current.key === 'protection'
                    ? 'Profile ' +
                      String(currentConfig.profile ?? 'balanced') +
                      ' · reversible actions.'
                    : current.key === 'moderation'
                      ? 'The team actions remain logged.'
                      : String(currentConfig.message ?? 'Your community starts here.')}
              </p>
            </div>
          </div>
          {Boolean(currentConfig.createChannel) && current.key !== 'protection' && (
            <div className="resource-preview">
              <span>+</span>
              <div>
                <b>Create {resourceName}</b>
                <small>It will be confirmed before publishing.</small>
              </div>
            </div>
          )}
          {roles.length > 0 && current.key === 'roles' && (
            <small className="muted-note">{roles.length} roles available to reuse.</small>
          )}
          <div className="sticky-actions">
            <button type="button" className="secondary" onClick={() => void skip()} disabled={applying}>
              skip
            </button>
            <button type="button" className="primary" onClick={() => void apply()} disabled={applying}>
              {applying ? 'Applying…' : 'Confirm and apply'}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Choice({
  selected,
  title,
  text,
  onClick,
}: {
  selected: boolean;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? 'setup-choice selected' : 'setup-choice'}
      onClick={onClick}
    >
      <span className="choice-dot" />
      <div>
        <b>{title}</b>
        <small>{text}</small>
      </div>
    </button>
  );
}
function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; name: string }>;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>
        <b>{label}</b>
        <small>
          {options.length
            ? 'Select an existing resource.'
            : 'Discord resource data is not available yet.'}
        </small>
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option value={option.id} key={option.id}>
            #{option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function PremiumCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <article className="premium-card">
      <span>{icon}</span>
      <b>{title}</b>
      <p>{text}</p>
      <small>Premium</small>
    </article>
  );
}

function ServerPicker({
  guilds,
  selectedGuildId,
  onSelect,
}: {
  guilds: Guild[];
  selectedGuildId?: string;
  onSelect: (guildId: string) => void;
}) {
  const manageableGuilds = guilds.filter((guild) => guild.canManage);
  return (
    <main className="helper-server-picker" aria-labelledby="server-picker-title">
      <a className="helper-server-picker__exit" href="/account/">
        ← Exit to account
      </a>
      <section className="helper-server-picker__surface">
        <small className="eyebrow">HELPER WORKSPACE</small>
        <h1 id="server-picker-title" data-route-heading tabIndex={-1}>
          Pick a server
        </h1>
        <p className="helper-server-picker__intro">
          Choose a server where you manage Vozen Helper. We will open that server&apos;s dashboard
          next.
        </p>
        <div className="helper-server-picker__heading">
          <div>
            <b>Your servers</b>
            <small>Only servers you can manage are shown.</small>
          </div>
          <span aria-label={`${manageableGuilds.length} available servers`}>
            {manageableGuilds.length}
          </span>
        </div>
        {manageableGuilds.length ? (
          <div className="helper-server-picker__list">
            {manageableGuilds.map((guild) => (
              <button
                className="helper-server-picker__server"
                key={guild.id}
                type="button"
                onClick={() => onSelect(guild.id)}
              >
                <span className="helper-server-picker__initial" aria-hidden="true">
                  {guild.name.trim().slice(0, 2).toUpperCase() || 'VH'}
                </span>
                <span className="helper-server-picker__copy">
                  <strong>{guild.name}</strong>
                  <small>
                    {guild.id === selectedGuildId ? 'Current workspace' : 'Open Helper dashboard'}
                  </small>
                </span>
                <span className="helper-server-picker__arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        ) : (
          <section className="helper-server-picker__empty" aria-live="polite">
            <h2>No manageable servers found</h2>
            <p>Return to your account, refresh the Discord connection, then try again.</p>
            <a href="/account/">Return to account</a>
          </section>
        )}
      </section>
    </main>
  );
}

function AuthScreen({
  error,
  loading,
  onLogin,
}: {
  error: string;
  loading: boolean;
  onLogin: () => void;
}) {
  const visibleError = /unauthenticated|API 401/i.test(error) ? '' : error;
  return (
    <main className="auth-shell" aria-labelledby="auth-title">
      <a className="auth-account-exit" href="/account/">
        ← Exit to account
      </a>
      <div className="auth-brand">
        <span>✦</span>
        <div>
          <strong>VOZEN</strong>
          <small>HELPER PANEL</small>
        </div>
      </div>
      <section className="auth-card card">
        <div className="auth-icon">✦</div>
        <small className="eyebrow">ACESSO safe</small>
        <h1 id="auth-title">Sign in to your dashboard</h1>
        <p>Use your Discord account to manage the Helper and configure your servers.</p>
        <button
          type="button"
          className="primary auth-button"
          onClick={onLogin}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Connecting to Discord…' : 'Continue with Discord'}
        </button>
        {visibleError && (
          <p className="auth-error" role="alert">
            {visibleError}
          </p>
        )}
        <small className="auth-note">
          Access is protected and only shows servers where you have management permission.
        </small>
      </section>
    </main>
  );
}

function Overview({
  features,
  stats,
  quota,
  cases,
  onOpen,
}: {
  features: Feature[];
  stats: { totalCases: number };
  quota: { plan: string; limits: Record<string, number>; usage: Record<string, number> };
  cases: CaseRecord[];
  onOpen: (path: string) => void;
}) {
  const enabled = features.filter((feature) => feature.enabled).length;
  return (
    <>
      <section className="welcome card">
        <div>
          <small className="eyebrow">COMMAND CENTER</small>
          <h2>Your server, under control.</h2>
          <p>
            See what needs attention and configure Helper in simple steps. Every change stays
            connected to your server.
          </p>
          <button type="button" className="primary" onClick={() => onOpen('#/features')}>
            Configure Helper
          </button>
        </div>
        <div className="setup-steps">
          <button type="button" onClick={() => onOpen('#/config/protection.antispam')}>
            <span>1</span>
            <div>
              <b>Protect the server</b>
              <small>{enabled} active features</small>
            </div>
            <em>›</em>
          </button>
          <button type="button" onClick={() => onOpen('#/config/support.welcome')}>
            <span>2</span>
            <div>
              <b>Welcome new members</b>
              <small>Message and initial role</small>
            </div>
            <em>›</em>
          </button>
          <button type="button" onClick={() => onOpen('#/config/community.levels')}>
            <span>3</span>
            <div>
              <b>Bring your community to life</b>
              <small>Levels, XP, and rewards</small>
            </div>
            <em>›</em>
          </button>
        </div>
      </section>
      <div className="metrics">
        <Metric value={String(enabled)} label="active features" />
        <Metric value={String(stats.totalCases)} label="moderation cases" />
        <Metric value={String(cases.length)} label="recent events" />
        <Metric value={quota.plan} label="current plan" />
      </div>
      <section className="section-heading">
        <div>
          <small className="eyebrow">RECOMMENDED</small>
          <h2>What would you like to do first?</h2>
        </div>
        <button type="button" className="link-button" onClick={() => onOpen('#/features')}>
          View everything →
        </button>
      </section>
      <div className="quick-grid">
        <Quick
          icon="🛡"
          title="Protect the server"
          text="Anti-spam, anti-raid, and join protection."
          onClick={() => onOpen('#/config/protection.antispam')}
        />
        <Quick
          icon="✦"
          title="Bring your community to life"
          text="Levels, suggestions, giveaways, and starboard."
          onClick={() => onOpen('#/config/community.levels')}
        />
        <Quick
          icon="▣"
          title="Create an identity"
          text="Choose colors, typography, and a safe banner."
          onClick={() => onOpen('#/rank-card')}
        />
      </div>
      <section className="quota card">
        <div>
          <small className="eyebrow">PLAN LIMITS</small>
          <h3>Use the Helper with room to grow</h3>
          <p>The current plan shows limits before an action is blocked.</p>
        </div>
        <div className="quota-items">
          <Quota
            label="Workflows"
            used={quota.usage.workflows ?? 0}
            limit={quota.limits.workflows ?? 0}
          />
          <Quota
            label="Templates"
            used={quota.usage.templates ?? 0}
            limit={quota.limits.templates ?? 0}
          />
          <Quota
            label="Role panels"
            used={quota.usage.role_panels ?? 0}
            limit={quota.limits.role_panels ?? 0}
          />
        </div>
      </section>
    </>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function Quota({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="quota-item">
      <div>
        <span>{label}</span>
        <b>
          {used} / {limit || '—'}
        </b>
      </div>
      <i>
        <em style={{ width: `${percent}%` }} />
      </i>
    </div>
  );
}
function Quick({
  icon,
  title,
  text,
  onClick,
}: {
  icon: string;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="quick card" onClick={onClick}>
      <span className="quick-icon">{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <b>→</b>
    </button>
  );
}

function FeatureCatalogue({
  features,
  filter,
  setFilter,
  search,
  setSearch,
  onOpen,
}: {
  features: Feature[];
  filter: Category;
  setFilter: (value: Category) => void;
  search: string;
  setSearch: (value: string) => void;
  onOpen: (key: string) => void;
}) {
  const uniqueFeatures = Array.from(new Map(features.map((item) => [item.key, item])).values());
  const maturityCounts = uniqueFeatures.reduce(
    (counts, feature) => {
      const maturity = feature.maturity ?? (feature.available ? 'operational' : 'planned');
      counts[maturity] = (counts[maturity] ?? 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );
  const operationalCount = maturityCounts.operational ?? 0;
  const betaCount = maturityCounts.beta ?? 0;
  const requirementCount = maturityCounts.blocked ?? 0;
  // Every adapter-backed topic has a real configuration page, including
  // integrations that are blocked until credentials or an approval exist.
  // Keep “configurable” aligned with the API contract (52 topics), while the
  // card itself still prevents publication and explains the blocked
  // dependency.  Excluding blocked entries here made the panel report 45 and
  // suggested that seven topics were missing rather than waiting on a
  // legitimate external requirement.
  const configurableCount = uniqueFeatures.filter(
    (feature) => feature.configurable !== false,
  ).length;
  return (
    <section>
      <div className="catalog-toolbar">
        <div>
          <small className="eyebrow">HELPER CATALOG</small>
          <h2>Choose what your server needs</h2>
          <p>
            Open a topic to see essential options, advanced settings, and a safe simulation
            safe.
          </p>
        </div>
        <input
          className="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search features…"
          aria-label="Search features"
          autoComplete="off"
        />
      </div>
      <div className="feature-summary" aria-label="Feature catalogue status">
        <span className="summary-item">
          <b>{uniqueFeatures.length}</b> modules in the catalog
        </span>
        <span className="summary-item summary-configurable">
          <b>{configurableCount}</b> configurable
        </span>
        <span className="summary-item summary-ready">
          <b>{operationalCount}</b> operational
        </span>
        <span className="summary-item summary-beta">
          <b>{betaCount}</b> in beta
        </span>
        {requirementCount > 0 && (
          <span className="summary-item summary-requirements">
            <b>{requirementCount}</b> await credentials or approval
          </span>
        )}
      </div>
      <div className="filters">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={filter === category.id ? 'filter active' : 'filter'}
            aria-pressed={filter === category.id}
            onClick={() => setFilter(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>
      <div className="feature-grid">
        {uniqueFeatures.map((feature) => {
          const maturity = feature.maturity ?? (feature.available ? 'operational' : 'planned');
          const configurable = feature.configurable ?? feature.available;
          // A blocked feature may expose a contract so the user can inspect
          // its requirements, but it must never look publishable until its
          // external dependency/approval is ready.
          const canConfigure = configurable && maturity !== 'blocked';
          const healthStatus = feature.health?.status;
          const dependencies = feature.health?.dependencies ?? [];
          const docsUrl = docsUrlForFeature(feature.key);
          const label =
            healthStatus === 'misconfigured'
              ? 'Check configuration'
              : healthStatus === 'degraded'
                ? 'Degraded'
                : healthStatus === 'dependency_down'
                  ? 'Missing dependency'
                  : maturity === 'operational'
              ? feature.enabled
                ? 'Active'
                : 'Available'
              : maturity === 'beta'
                ? 'Beta'
                : maturity === 'blocked'
                  ? 'Blocked'
                  : maturity === 'degraded'
                    ? 'Needs attention'
                    : 'Planned';
          return (
            <article className="feature card" key={feature.key}>
              <div className="feature-top">
                <span className={`feature-icon ${feature.category}`}>
                  {feature.category === 'protection'
                    ? '◈'
                    : feature.category === 'community'
                      ? '✦'
                      : '▤'}
                </span>
                <span
                  className={
                    feature.enabled && maturity === 'operational'
                      ? 'pill on'
                      : maturity === 'blocked'
                        ? 'pill muted'
                        : 'pill'
                  }
                >
                  {label}
                </span>
              </div>
              <h3>{feature.label}</h3>
              <p>{feature.description}</p>
              {maturity === 'blocked' && feature.issues?.[0]?.message && (
                <p className="tip feature-requirement">{feature.issues[0].message}</p>
              )}
              {maturity === 'blocked' && dependencies.length > 0 && (
                <details className="feature-dependencies">
                  <summary>Activation requirements</summary>
                  <ul>
                    {dependencies.slice(0, 4).map((dependency) => (
                      <li key={dependency}>{dependency}</li>
                    ))}
                  </ul>
                </details>
              )}
              <button
                type="button"
                className="secondary full"
                disabled={!canConfigure && maturity !== 'blocked'}
                onClick={() => onOpen(feature.key)}
              >
                {feature.key === 'studio.rank_card'
                  ? 'Customise'
                  : canConfigure
                    ? 'configure'
                    : maturity === 'blocked'
                      ? 'View requirements'
                    : 'View plan'}
              </button>
              {docsUrl && (
                <a className="link-button feature-doc-link" href={docsUrl} target="_blank" rel="noopener noreferrer">
                  Learn how this works
                </a>
              )}
            </article>
          );
        })}
      </div>
      {!features.length && (
        <div className="empty card">No features match this filter.</div>
      )}
    </section>
  );
}

function FeatureDetail({
  feature,
  schema,
  context,
  config,
  enabled,
  revision,
  onEnabled,
  onChange,
  onSave,
  onRepair,
  onDiscard,
  onTest,
  templates,
  onTemplatesChange,
  providerHealth,
  saving,
  onBack,
}: {
  feature?: Feature;
  schema: FeatureSchema | null;
  context: GuildContext | null;
  config: FeatureConfig;
  enabled: boolean;
  revision: number;
  onEnabled: (value: boolean) => void;
  onChange: (key: string, value: unknown) => void;
  onSave: () => void;
  onRepair: () => void;
  onDiscard: () => void;
  onTest: () => void;
  templates: StudioTemplate[];
  onTemplatesChange: (templates: StudioTemplate[]) => void;
  providerHealth: ProviderSubscriptionHealth | null;
  saving: boolean;
  onBack: () => void;
}) {
  const templateOptions: [string, string][] = [
    ['', 'No template'],
    ...templates.map((template) => [template.id, `${template.name} (v${template.version})`] as [string, string]),
  ];
  const sections: SectionSpec[] = schema?.sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => ({
      ...field,
      kind: field.kind as FieldSpec['kind'],
      options: field.key === 'templateId' ? templateOptions : field.options,
    })),
  })) ?? (localPreviewMode ? spec(feature?.key ?? '') : []);
  // Keep blocked providers discoverable, but do not expose a save/enable
  // form that can only fail at publication time. Their detail page is a
  // requirements view until the backend reports a non-blocked maturity.
  const configurable = (feature?.configurable ?? true) && feature?.maturity !== 'blocked';
  const docsUrl = docsUrlForFeature(feature?.key);
  if (!configurable)
    return (
      <section className="detail-page">
        <button type="button" className="back-link" onClick={onBack}>
          ← Back to features
        </button>
        <div className="detail-intro card">
          <div>
            <small className="eyebrow">{feature?.maturity === 'blocked' ? 'REQUISITOS EXTERNOS' : 'ROADMAP'}</small>
            <h2>{feature?.label ?? 'Feature'}</h2>
            <p>{feature?.description ?? 'This area is in the Vozen Helper roadmap.'}</p>
            <p className="tip">
              {feature?.issues?.[0]?.message ??
                'The operational adapter is not available for this server yet. Activation remains unavailable until integration, permissions, and rollback are ready.'}
            </p>
            {feature?.health?.dependencies && feature.health.dependencies.length > 0 && (
              <div className="requirement-list">
                <strong>What is missing</strong>
                <ul>
                  {feature.health.dependencies.map((dependency) => (
                    <li key={dependency}>{dependency}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {docsUrl && (
            <a className="link-button" href={docsUrl} target="_blank" rel="noopener noreferrer">
              Read the documentation
            </a>
          )}
        </div>
      </section>
    );
  if (!schema && !localPreviewMode)
    return (
      <section className="detail-page">
        <button type="button" className="back-link" onClick={onBack}>
          ← Back to features
        </button>
        <div className="detail-intro card">
          <div>
            <small className="eyebrow">ADAPTER UNAVAILABLE</small>
            <h2>{feature?.label ?? 'Feature'}</h2>
            <p>
              The dashboard did not receive this feature contract. Refresh the page or check the
              API status before publishing changes.
            </p>
          </div>
          {docsUrl && (
            <a className="link-button" href={docsUrl} target="_blank" rel="noopener noreferrer">
              Read the documentation
            </a>
          )}
        </div>
      </section>
    );
  return (
    <section className="detail-page">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back to features
      </button>
      <div className="detail-intro card">
        <div>
          <small className="eyebrow">
            CONFIGURATION ·{' '}
            {feature?.category === 'protection'
              ? 'Protection'
              : feature?.category === 'community'
                ? 'Community'
                : 'Management'}
          </small>
          <h2>{feature?.label ?? 'Feature'}</h2>
          <p>{feature?.description ?? 'Adjust this feature for your server.'}</p>
        </div>
        <label className="switch-row">
          <span>
            <b>{enabled ? 'Active' : 'Disabled'}</b>
            <small>The Helper applies this configuration on the server.</small>
          </span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabled(event.target.checked)}
          />
        </label>
        {docsUrl && (
          <a className="link-button" href={docsUrl} target="_blank" rel="noopener noreferrer">
            Learn how this works
          </a>
        )}
      </div>
      <div className="detail-layout">
        <div className="detail-sections">
          {feature?.key === 'management.templates' && (
            <TemplateManager
              templates={templates}
              onChange={onTemplatesChange}
              localPreviewMode={localPreviewMode}
            />
          )}
          {feature?.key === 'management.custom_commands' && (
            <CustomCommandManager localPreviewMode={localPreviewMode} />
          )}
          {feature?.key === 'management.workflows' && (
            <WorkflowManager enabled={enabled} localPreviewMode={localPreviewMode} />
          )}
          {feature?.key === 'community.leaderboard' && (
            <LeaderboardPreview enabled={enabled} localPreviewMode={localPreviewMode} />
          )}
          {feature?.key === 'utility.reminders' && (
            <RemindersManager enabled={enabled} localPreviewMode={localPreviewMode} />
          )}
          {feature?.key === 'community.role_panels' && (
            <RolePanelManager context={context} localPreviewMode={localPreviewMode} />
          )}
          {sections.map((section) => (
            <ConfigSection
              key={section.title}
              section={section}
              config={config}
              context={context}
              onChange={onChange}
            />
          ))}
        </div>
        <aside className="detail-aside card">
          <div>
            <small className="eyebrow">BEFORE PUBLISHING</small>
            <h3>Review safely</h3>
            <p>
              Use the simulation to see what would happen. It never deletes messages or punishes
              members.
            </p>
          </div>
          <button type="button" className="secondary full" onClick={onTest}>
            {feature?.key === 'social.youtube' ||
            feature?.key === 'social.twitch' ||
            feature?.key === 'social.rss' ||
            feature?.key === 'social.podcasts'
              ? 'Send a test to Discord'
              : 'Simulate configuration'}
          </button>
          {providerHealth && <ProviderHealthPanel health={providerHealth} />}
          {!localPreviewMode &&
            feature?.health?.status &&
            feature.health.status !== 'ready' &&
            revision > 0 && (
              <button type="button" className="secondary full" onClick={onRepair} disabled={saving}>
                Repair publication
              </button>
            )}
          <div className="tip">
            <b>Need help?</b>
            <a className="link-button" href={docsTroubleshootingUrl('missing-permissions')} target="_blank" rel="noopener noreferrer">
              Why is this permission needed?
            </a>
            <a className="link-button" href={docsTroubleshootingUrl('restore-configuration')} target="_blank" rel="noopener noreferrer">
              Rollback instructions
            </a>
            <span>Advanced fields are collapsed to keep the first step simple.</span>
          </div>
        </aside>
      </div>
      <div className="sticky-actions">
        <button type="button" className="secondary" onClick={onDiscard} disabled={saving}>
          Discard
        </button>
        <button type="button" className="primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </section>
  );
}

function ProviderHealthPanel({ health }: { health: ProviderSubscriptionHealth }) {
  const labels: Record<ProviderSubscriptionHealth['status'], string> = {
    ready: 'Ready',
    degraded: 'Degraded',
    dependency_down: 'Dependency unavailable',
  };
  const provider = health.provider === 'rss' ? 'RSS' : health.provider === 'youtube' ? 'YouTube' : 'Twitch';
  const source =
    health.provider === 'youtube'
      ? health.latestVideo?.title
      : health.provider === 'rss'
        ? health.feed?.latestTitle
        : health.channel?.displayName;
  return (
    <div className={`provider-health ${health.status}`} role="status">
      <div className="provider-health-heading">
        <span className="eyebrow">HEALTH · {provider}</span>
        <strong>{labels[health.status]}</strong>
      </div>
      <p>
        {health.message ??
          (health.status === 'ready'
            ? 'The provider responded and this subscription can be tested.'
            : 'Check the configured credentials and provider.')}
      </p>
      {source && <small>Latest source: {source}</small>}
      {health.failureCount > 0 && <small>Consecutive failures: {health.failureCount}</small>}
      {health.lastError && <small className="provider-health-error">Latest error: {health.lastError}</small>}
      <a className="link-button" href={docsProviderStatusUrl()} target="_blank" rel="noopener noreferrer">
        Provider status
      </a>
    </div>
  );
}

function TemplateManager({
  templates,
  onChange,
  localPreviewMode,
}: {
  templates: StudioTemplate[];
  onChange: (templates: StudioTemplate[]) => void;
  localPreviewMode: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [modules, setModules] = useState<string[]>(['core', 'security', 'support']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const moduleOptions = [
    ['core', 'Core'],
    ['security', 'Protection'],
    ['support', 'Support'],
    ['events', 'Events'],
    ['community', 'Community'],
    ['automate', 'Automation'],
    ['insights', 'Insights'],
    ['studio', 'Studio'],
  ] as const;
  async function createTemplate() {
    if (localPreviewMode || !name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.createStudioTemplate({
        name: name.trim(),
        description: description.trim(),
        modules,
        config: { content: content.trim() },
      });
      onChange([...templates, result.template]);
      setName('');
      setDescription('');
      setContent('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the template.');
    } finally {
      setBusy(false);
    }
  }
  async function removeTemplate(id: string) {
    if (localPreviewMode || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteStudioTemplate(id);
      onChange(templates.filter((template) => template.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the template.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="config-section card">
      <div className="section-heading">
        <div>
          <small className="eyebrow">REAL SERVER TEMPLATES</small>
          <h3>Save a reusable server setup</h3>
          <p>
            {localPreviewMode
              ? 'Connect the panel to a Helper API to create templates for a real guild.'
              : 'Templates are stored for this guild only. Secrets and tokens are never exported.'}
          </p>
        </div>
      </div>
      <div className="field-grid">
        <label className="field">
          <span><b>Template name</b><small>Use a clear name your team will recognise.</small></span>
          <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span><b>Description</b><small>Optional context for the next administrator.</small></span>
          <input value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="field">
          <span><b>Default message</b><small>Optional content used by welcome, goodbye and guided-channel templates. Supports {'{member}'} and {'{server}'}.</small></span>
          <textarea value={content} maxLength={2000} rows={3} onChange={(event) => setContent(event.target.value)} />
        </label>
      </div>
      <div className="template-module-grid" aria-label="Template modules">
        {moduleOptions.map(([value, label]) => (
          <label className="toggle-field" key={value}>
            <span><b>{label}</b></span>
            <input
              type="checkbox"
              checked={modules.includes(value)}
              onChange={(event) => setModules((current) => event.target.checked ? [...new Set([...current, value])] : current.filter((item) => item !== value))}
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        className="secondary"
        onClick={() => void createTemplate()}
        disabled={localPreviewMode || busy || !name.trim()}
      >
        {busy ? 'Saving…' : 'Save template'}
      </button>
      {error && <p className="tip" role="alert">{error}</p>}
      {templates.length > 0 && (
        <div className="template-list">
          {templates.map((template) => (
            <div className="template-row" key={template.id}>
              <div><b>{template.name}</b><small>{template.description || 'No description'} · v{template.version}</small></div>
              <button
                type="button"
                className="ghost"
                onClick={() => void removeTemplate(template.id)}
                disabled={localPreviewMode || busy}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CustomCommandManager({ localPreviewMode }: { localPreviewMode: boolean }) {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [maxResponseLength, setMaxResponseLength] = useState(1000);
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!localPreviewMode);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localPreviewMode) return;
    let cancelled = false;
    void api.customCommands()
      .then((result) => {
        if (cancelled) return;
        setCommands(result.commands);
        setLimit(result.limit);
        setMaxResponseLength(result.maxResponseLength);
        setEnabled(result.enabled);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load custom commands.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [localPreviewMode]);

  function resetForm() {
    setName('');
    setContent('');
    setEditingName(null);
  }

  function beginEdit(command: CustomCommand) {
    setEditingName(command.name);
    setName(command.name);
    setContent(command.content);
    setError('');
  }

  async function saveCommand() {
    const normalizedName = name.trim().toLowerCase();
    if (localPreviewMode || busy || !normalizedName || !content.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = editingName
        ? await api.updateCustomCommand(editingName, content.trim())
        : await api.createCustomCommand(normalizedName, content.trim());
      setCommands((current) => editingName
        ? current.map((command) => command.name === editingName ? result.command : command)
        : [...current, result.command].sort((a, b) => a.name.localeCompare(b.name)));
      resetForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the custom command.');
    } finally {
      setBusy(false);
    }
  }

  async function removeCommand(commandName: string) {
    if (localPreviewMode || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteCustomCommand(commandName);
      setCommands((current) => current.filter((command) => command.name !== commandName));
      if (editingName === commandName) resetForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the custom command.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="config-section card">
      <div className="section-heading">
        <div>
          <small className="eyebrow">SERVER RESPONSES</small>
          <h3>Comandos custom</h3>
          <p>
            Create simple responses for your server. The prefix and limits are configured above;
            here you manage the content the Helper actually publishes.
          </p>
        </div>
      </div>
      <div className="tip">
        <b>Available variables</b>
        <span>{'{user}'}, {'{channel}'}, {'{server}'} and {'{args}'}. global mentions are neutralized by the Helper.</span>
      </div>
      {!localPreviewMode && !loading && !enabled && (
        <p className="tip" role="status">Enable this feature and save the settings above to manage commands.</p>
      )}
      {loading && <p className="tip" role="status">Loading commands for this server…</p>}
      <div className="field-grid">
        <label className="field">
          <span><b>{editingName ? 'Command name' : 'New command'}</b><small>Use only letters, numbers, hyphens, or underscores. Maximum 32 characters.</small></span>
          <input
            value={name}
            maxLength={32}
            disabled={Boolean(editingName) || localPreviewMode || busy || !enabled}
            onChange={(event) => setName(event.target.value)}
            placeholder="rules"
          />
        </label>
        <label className="field">
          <span><b>Response</b><small>Up to {maxResponseLength} characters. The configured prefix will be used in Discord.</small></span>
          <textarea
            value={content}
            maxLength={maxResponseLength}
            rows={3}
            disabled={localPreviewMode || busy || !enabled}
            onChange={(event) => setContent(event.target.value)}
            placeholder="View #rules to learn the server rules."
          />
        </label>
      </div>
      <div className="inline-actions">
        <button type="button" className="secondary" onClick={() => void saveCommand()} disabled={localPreviewMode || busy || !enabled || !name.trim() || !content.trim()}>
          {busy ? 'Saving…' : editingName ? 'Save command' : 'Add command'}
        </button>
        {editingName && <button type="button" className="ghost" onClick={resetForm} disabled={busy}>Cancel edit</button>}
        <small>{commands.length}/{limit} commands used</small>
      </div>
      {error && <p className="tip" role="alert">{error}</p>}
      {!localPreviewMode && !loading && commands.length === 0 && <p className="tip">No commands yet. Add the first one above.</p>}
      {commands.length > 0 && (
        <div className="template-list" aria-label="Custom commands">
          {commands.map((command) => (
            <div className="template-row" key={command.name}>
              <div><b>{command.name}</b><small>{command.content}</small></div>
              <div className="inline-actions">
                <button type="button" className="ghost" onClick={() => beginEdit(command)} disabled={busy}>edit</button>
                <button type="button" className="ghost" onClick={() => void removeCommand(command.name)} disabled={busy}>delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LeaderboardPreview({
  enabled,
  localPreviewMode,
}: {
  enabled: boolean;
  localPreviewMode: boolean;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [maxEntries, setMaxEntries] = useState(10);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(!localPreviewMode);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localPreviewMode) return;
    let cancelled = false;
    void api.leaderboard()
      .then((result) => {
        if (cancelled) return;
        setEntries(result.entries);
        setMaxEntries(result.maxEntries);
        setIsPublic(result.public);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load the leaderboard.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [localPreviewMode]);

  return (
    <section className="config-section card">
      <div className="section-heading">
        <div>
          <small className="eyebrow">XP COMMUNITY</small>
          <h3>Leaderboard preview</h3>
          <p>Preview the same opt-out-aware ranking that the Helper publishes with <code>/leaderboard</code>.</p>
        </div>
        <span className="status-pill">{isPublic ? 'Public' : 'Private'}</span>
      </div>
      {!localPreviewMode && !enabled && (
        <p className="tip" role="status">Enable the XP leaderboard and save the settings to publish it in Discord.</p>
      )}
      {loading && <p className="tip" role="status">Loading the latest XP ranking…</p>}
      {error && <p className="tip" role="alert">{error}</p>}
      {!loading && enabled && entries.length === 0 && (
        <p className="tip">No eligible XP data yet. Members can opt out with <code>/leaderboard-privacy</code>.</p>
      )}
      {entries.length > 0 && (
        <div className="template-list" aria-label="XP leaderboard preview">
          {entries.map((entry) => (
            <div className="template-row" key={`${entry.userId}-${entry.rank}`}>
              <div>
                <b>#{entry.rank} · {entry.userId}</b>
                <small>{entry.xp.toLocaleString()} XP</small>
              </div>
              <span className="status-pill">{entry.rank <= maxEntries ? 'Included' : 'Hidden'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RemindersManager({
  enabled,
  localPreviewMode,
}: {
  enabled: boolean;
  localPreviewMode: boolean;
}) {
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(!localPreviewMode);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localPreviewMode) return;
    let cancelled = false;
    void api.reminders()
      .then((result) => {
        if (cancelled) return;
        setReminders(result.reminders);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load reminders.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [localPreviewMode]);

  async function cancel(id: number) {
    if (localPreviewMode || busyAction !== null || !enabled) return;
    setBusyAction(`cancel:${id}`);
    setError('');
    try {
      await api.cancelReminder(id);
      setReminders((current) => current.filter((reminder) => reminder.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not cancel the reminder.');
    } finally {
      setBusyAction(null);
    }
  }

  async function retry(id: number) {
    if (localPreviewMode || busyAction !== null || !enabled) return;
    setBusyAction(`retry:${id}`);
    setError('');
    try {
      await api.retryReminder(id);
      setReminders((current) => current.map((reminder) => (
        reminder.id === id
          ? { ...reminder, status: 'pending', attempts: 0, lastError: null, leaseUntil: null, executeAt: Date.now() }
          : reminder
      )));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not retry the reminder.');
    } finally {
      setBusyAction(null);
    }
  }

  const statusCounts = reminders.reduce<Record<string, number>>((counts, reminder) => {
    counts[reminder.status] = (counts[reminder.status] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <section className="config-section card">
      <div className="section-heading">
        <div>
          <small className="eyebrow">SCHEDULED ACTIONS</small>
          <h3>Pending reminders</h3>
          <p>See reminders created with <code>/remind</code> and cancel them before they are sent.</p>
        </div>
        <span className="status-pill">
          {reminders.length} scheduled
          {statusCounts.dead ? ` · ${statusCounts.dead} failed` : ''}
        </span>
      </div>
      {!localPreviewMode && !enabled && (
        <p className="tip" role="status">Enable reminders and save the policy before scheduling new messages.</p>
      )}
      {loading && <p className="tip" role="status">Loading scheduled reminders…</p>}
      {error && <p className="tip" role="alert">{error}</p>}
      {!loading && reminders.length === 0 && (
        <p className="tip">No pending reminders. Members can create one with <code>/remind</code> in Discord.</p>
      )}
      {reminders.length > 0 && (
        <div className="template-list" aria-label="Pending reminders">
          {reminders.map((reminder) => (
            <div className="template-row" key={reminder.id}>
              <div>
                <b>#{reminder.id} · {new Date(reminder.executeAt).toLocaleString()}</b>
                <small>
                  {reminder.text || 'Reminder'}
                  {reminder.repeat ? ` · repeats ${reminder.repeat}${reminder.remaining == null ? '' : ` (${reminder.remaining} left)`}` : ''}
                  {reminder.timezone ? ` · ${reminder.timezone}` : ''}
                </small>
                <span className={`status-pill reminder-status-${reminder.status}`}>
                  {reminder.status === 'dead' ? 'Failed — retry required' : reminder.status}
                  {reminder.attempts > 0 ? ` · ${reminder.attempts} attempt${reminder.attempts === 1 ? '' : 's'}` : ''}
                </span>
                {reminder.lastError ? <small className="tip">{reminder.lastError}</small> : null}
              </div>
              <div className="button-row">
                {reminder.status === 'dead' && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => void retry(reminder.id)}
                    disabled={localPreviewMode || !enabled || busyAction !== null}
                  >
                    {busyAction === `retry:${reminder.id}` ? 'Retrying...' : 'Retry now'}
                  </button>
                )}
                <button
                type="button"
                className="ghost"
                onClick={() => void cancel(reminder.id)}
                disabled={localPreviewMode || !enabled || busyAction !== null}
              >
                {busyAction === `cancel:${reminder.id}` ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WorkflowManager({
  enabled,
  localPreviewMode,
}: {
  enabled: boolean;
  localPreviewMode: boolean;
}) {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [limit, setLimit] = useState(10);
  const [maxReplyLength, setMaxReplyLength] = useState(1000);
  const [name, setName] = useState('');
  const [condition, setCondition] = useState('');
  const [action, setAction] = useState<'reply' | 'react'>('reply');
  const [payload, setPayload] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!localPreviewMode);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localPreviewMode) return;
    let cancelled = false;
    void api.workflows()
      .then((result) => {
        if (cancelled) return;
        setWorkflows(result.workflows);
        setLimit(result.maxWorkflows);
        setMaxReplyLength(result.maxReplyLength);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load workflows.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [localPreviewMode]);

  async function create() {
    const trimmedName = name.trim();
    const trimmedCondition = condition.trim();
    const trimmedPayload = payload.trim();
    if (localPreviewMode || busy || !enabled || !trimmedName || !trimmedPayload) return;
    if (action === 'reply' && trimmedPayload.length > maxReplyLength) {
      setError(`Reply must be ${maxReplyLength} characters or fewer.`);
      return;
    }
    if (action === 'react' && (trimmedPayload.length > 16 || /[<>]/.test(trimmedPayload))) {
      setError('Reactions use one Unicode emoji or a short safe token (maximum 16 characters).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api.createWorkflow({
        name: trimmedName,
        trigger: 'message',
        condition: trimmedCondition || undefined,
        action,
        payload: trimmedPayload,
      });
      setWorkflows((current) => [
        {
          id: result.id,
          name: trimmedName,
          trigger: 'message',
          condition: trimmedCondition,
          action,
          payload: trimmedPayload,
          enabled: true,
        },
        ...current,
      ]);
      setName('');
      setCondition('');
      setPayload('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the workflow.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(workflow: WorkflowRecord) {
    if (localPreviewMode || busy || !enabled) return;
    setBusy(true);
    setError('');
    try {
      await api.updateWorkflow(workflow.id, !workflow.enabled);
      setWorkflows((current) => current.map((item) =>
        item.id === workflow.id ? { ...item, enabled: !item.enabled } : item,
      ));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the workflow.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(workflow: WorkflowRecord) {
    if (localPreviewMode || busy || !enabled) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteWorkflow(workflow.id);
      setWorkflows((current) => current.filter((item) => item.id !== workflow.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the workflow.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="config-section card">
      <div className="section-heading">
        <div>
          <small className="eyebrow">REAL AUTOMATIONS</small>
          <h3>Workflow builder</h3>
          <p>Create safe message rules: when text contains a condition, the Helper replies or adds a reaction.</p>
        </div>
      </div>
      {!localPreviewMode && !enabled && (
        <p className="tip" role="status">Enable this feature and save the settings above to manage automations.</p>
      )}
      {loading && <p className="tip" role="status">Loading automations for this server…</p>}
      <div className="field-grid">
        <label className="field">
          <span><b>name</b><small>A short name to find the rule.</small></span>
          <input value={name} maxLength={50} disabled={localPreviewMode || busy || !enabled} onChange={(event) => setName(event.target.value)} placeholder="welcome-reply" />
        </label>
        <label className="field">
          <span><b>When the message contains</b><small>Plain text, no executable code.</small></span>
          <input value={condition} maxLength={200} disabled={localPreviewMode || busy || !enabled} onChange={(event) => setCondition(event.target.value)} placeholder="rules" />
        </label>
        <label className="field">
          <span><b>Action</b><small>Actions are limited to prevent loops and spam.</small></span>
          <select value={action} disabled={localPreviewMode || busy || !enabled} onChange={(event) => setAction(event.target.value as 'reply' | 'react')}>
            <option value="reply">Reply to the message</option>
            <option value="react">Add reaction</option>
          </select>
        </label>
        <label className="field">
          <span><b>{action === 'reply' ? 'response' : 'Emoji/reaction'}</b><small>{action === 'reply' ? `Up to ${maxReplyLength} characters.` : 'Unicode emoji, up to 16 characters; custom emojis remain blocked for security.'}</small></span>
          <textarea value={payload} maxLength={action === 'reply' ? maxReplyLength : 16} rows={2} disabled={localPreviewMode || busy || !enabled} onChange={(event) => setPayload(event.target.value)} placeholder={action === 'reply' ? 'view #rules for learn the rules.' : '✅'} />
        </label>
      </div>
      <div className="inline-actions">
        <button type="button" className="secondary" onClick={() => void create()} disabled={localPreviewMode || busy || !enabled || !name.trim() || !payload.trim()}>
          {busy ? 'Saving…' : 'Add automation'}
        </button>
        <small>{workflows.length}/{limit} automations used</small>
      </div>
      {error && <p className="tip" role="alert">{error}</p>}
      {!localPreviewMode && !loading && workflows.length === 0 && <p className="tip">No automations yet. Add the first one above.</p>}
      {workflows.length > 0 && (
        <div className="template-list" aria-label="server workflows">
          {workflows.map((workflow) => (
            <div className="template-row" key={workflow.id}>
              <div>
                <b>{workflow.name}</b>
                <small>when contains “{workflow.condition || 'any text'}” · {workflow.action === 'react' ? `reacts with ${workflow.payload}` : `replies: ${workflow.payload}`}</small>
              </div>
              <div className="inline-actions">
                <button type="button" className="ghost" onClick={() => void toggle(workflow)} disabled={busy || localPreviewMode || !enabled}>{workflow.enabled ? 'Disable' : 'Enable'}</button>
                <button type="button" className="ghost" onClick={() => void remove(workflow)} disabled={busy || localPreviewMode || !enabled}>delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RolePanelManager({
  context,
  localPreviewMode,
}: {
  context: GuildContext | null;
  localPreviewMode: boolean;
}) {
  const [panels, setPanels] = useState<RolePanelRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!localPreviewMode);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localPreviewMode) return;
    let cancelled = false;
    void api.rolePanels()
      .then((result) => {
        if (!cancelled) setPanels(result.panels);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load role panels.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [localPreviewMode]);

  const channelName = (id?: string) => context?.channels.find((channel) => channel.id === id)?.name;
  const roleNames = (ids?: string[]) =>
    (ids ?? []).map((id) => context?.roles.find((role) => role.id === id)?.name ?? id).join(', ');

  async function remove(messageId: string) {
    if (localPreviewMode || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteRolePanel(messageId);
      setPanels((current) => current.filter((panel) => panel.message_id !== messageId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the role panel.');
    } finally {
      setBusy(false);
    }
  }

  async function repair(messageId: string) {
    if (localPreviewMode || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.repairRolePanel(messageId);
      setPanels((current) => current.map((panel) => panel.message_id === messageId
        ? { ...panel, message_id: result.messageId }
        : panel));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not repair the role panel.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="config-section card">
      <div className="section-heading">
        <div>
          <small className="eyebrow">REAL DISCORD PANELS</small>
          <h3>Role panel manager</h3>
          <p>
            Saving the configuration publishes a real panel. Here you can confirm where it is,
            repair a deleted message, or remove it without deleting roles.
          </p>
        </div>
      </div>
      {loading && <p className="tip" role="status">Loading panels for this server…</p>}
      {!localPreviewMode && !loading && panels.length === 0 && (
        <p className="tip">No panel has been published yet. Choose a channel and roles above, then save.</p>
      )}
      {panels.length > 0 && (
        <div className="template-list" aria-label="Role panels">
          {panels.map((panel) => (
            <div className="template-row" key={panel.message_id}>
              <div>
                <b>{panel.title || 'Role panel'}</b>
                <small>
                  #{channelName(panel.channel_id) ?? panel.channel_id ?? 'unknown channel'} · {roleNames(panel.role_ids) || 'no roles'} · {panel.selection_mode === 'unique' ? 'one choice' : 'multiple choices'}
                </small>
              </div>
              <div className="inline-actions">
                <button type="button" className="ghost" onClick={() => void repair(panel.message_id)} disabled={busy}>Repair</button>
                <button type="button" className="ghost" onClick={() => void remove(panel.message_id)} disabled={busy}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="tip" role="alert">{error}</p>}
    </section>
  );
}

function ConfigSection({
  section,
  config,
  context,
  onChange,
}: {
  section: SectionSpec;
  config: FeatureConfig;
  context: GuildContext | null;
  onChange: (key: string, value: unknown) => void;
}) {
  const advanced = section.fields.filter((field) => field.advanced);
  const basic = section.fields.filter((field) => !field.advanced);
  return (
    <section className="config-section card">
      <div className="section-heading">
        <div>
          <small className="eyebrow">CONFIGURATION</small>
          <h3>{section.title}</h3>
          <p>{section.description}</p>
        </div>
      </div>
      <div className="field-grid">
        {basic.map((field) => (
          <FieldControl
            field={field}
            key={field.key}
            value={config[field.key]}
            context={context}
            onChange={onChange}
          />
        ))}
      </div>
      {advanced.length > 0 && (
        <details className="advanced">
          <summary>
            Advanced options <span>{advanced.length} settings</span>
          </summary>
          <div className="field-grid">
            {advanced.map((field) => (
              <FieldControl
                field={field}
                key={field.key}
                value={config[field.key]}
                context={context}
                onChange={onChange}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
function FieldControl({
  field,
  value,
  context,
  onChange,
}: {
  field: FieldSpec;
  value: unknown;
  context: GuildContext | null;
  onChange: (key: string, value: unknown) => void;
}) {
  const normalized = value ?? (field.kind === 'toggle' ? false : field.kind === 'tags' || field.kind === 'channels' || field.kind === 'roles' ? [] : '');
  const resourceOptions = field.kind === 'category'
    ? (context?.channels ?? []).filter((option) => option.type === 'category')
    : field.kind === 'channel' || field.kind === 'channels'
      ? (context?.channels ?? []).filter((option) => option.type !== 'category')
      : (context?.roles ?? []);
  const multiple = field.kind === 'channels' || field.kind === 'roles';
  if (field.kind === 'channel' || field.kind === 'category' || field.kind === 'channels' || field.kind === 'role' || field.kind === 'roles')
    return (
      <label className="field">
        <span>
          <b>{field.label}</b>
          <small>{field.help ?? (resourceOptions.length ? 'Select an existing resource.' : 'Discord resource data is not available yet.')}</small>
        </span>
        <select
          value={multiple ? (Array.isArray(normalized) ? normalized.map(String) : []) : String(normalized)}
          multiple={multiple}
          size={multiple ? Math.min(5, Math.max(2, resourceOptions.length)) : undefined}
          onChange={(event) => {
            const selected = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
            onChange(field.key, multiple ? selected : (selected[0] ?? ''));
          }}
          disabled={!context?.capabilities.channelSelectors && (field.kind === 'channel' || field.kind === 'category' || field.kind === 'channels') || !context?.capabilities.roleSelectors && (field.kind === 'role' || field.kind === 'roles')}
        >
          {!multiple && <option value="">Choose a resource</option>}
          {resourceOptions.map((option) => <option value={option.id} key={option.id}>{field.kind === 'role' || field.kind === 'roles' ? `@${option.name}` : field.kind === 'category' ? `▾ ${option.name}` : `#${option.name}`}</option>)}
        </select>
      </label>
    );
  if (field.kind === 'toggle')
    return (
      <label className="field toggle-field">
        <span>
          <b>{field.label}</b>
          {field.help && <small>{field.help}</small>}
        </span>
        <input
          type="checkbox"
          checked={Boolean(normalized)}
          onChange={(event) => onChange(field.key, event.target.checked)}
        />
      </label>
    );
  if (field.kind === 'textarea')
    return (
      <label className="field">
        <span>
          <b>{field.label}</b>
          {field.help && <small>{field.help}</small>}
        </span>
        <textarea
          value={String(normalized)}
          onChange={(event) => onChange(field.key, event.target.value)}
          rows={3}
        />
      </label>
    );
  if (field.kind === 'tags')
    return (
      <label className="field">
        <span>
          <b>{field.label}</b>
          <small>{field.help ?? 'Separate multiple values with commas.'}</small>
        </span>
        <input
          value={Array.isArray(normalized) ? normalized.join(', ') : String(normalized)}
          onChange={(event) =>
            onChange(
              field.key,
              event.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            )
          }
        />
      </label>
    );
  if (field.kind === 'select')
    return (
      <label className="field">
        <span>
          <b>{field.label}</b>
          {field.help && <small>{field.help}</small>}
        </span>
        <select
          value={String(normalized)}
          onChange={(event) => onChange(field.key, event.target.value)}
        >
          {field.options?.map((entry) => {
            const [option, label] = Array.isArray(entry) ? entry : [entry, entry];
            return (
              <option value={option} key={option}>
                {label}
              </option>
            );
          })}
        </select>
      </label>
    );
  return (
    <label className="field">
      <span>
        <b>{field.label}</b>
        {field.help && <small>{field.help}</small>}
      </span>
      <input
        type={field.kind}
        min={field.min}
        max={field.max}
        maxLength={field.maxLength}
        step={field.step ?? 1}
        value={field.kind === 'number' ? Number(normalized) : String(normalized)}
        onChange={(event) =>
          onChange(
            field.key,
            field.kind === 'number' ? Number(event.target.value) : event.target.value,
          )
        }
      />
    </label>
  );
}

function Activity({
  cases,
  audit,
  activity,
}: {
  cases: CaseRecord[];
  audit: AuditRecord[];
  activity: ActivityRecord[];
}) {
  return (
    <section className="activity">
      <div className="section-heading">
        <div>
          <small className="eyebrow">TRANSPARENCY</small>
          <h2>Recent activity</h2>
          <p>Every action shows what happened without hiding important details.</p>
        </div>
      </div>
      <div className="table card">
        <div className="table-head">
          <span>Action</span>
          <span>Target / actor</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        {cases.map((item) => (
          <div className="table-row" key={`case-${item.id}`}>
            <span>
              <b className="tag danger">{item.kind ?? item.type ?? 'moderation'}</b>
            </span>
            <span>{item.target_id ?? item.targetId ?? '—'}</span>
            <span>{item.reason || 'in the reason provided'}</span>
            <span>{formatDate(item.created_at ?? item.createdAt)}</span>
          </div>
        ))}
        {audit.map((item, index) => (
          <div className="table-row" key={`audit-${index}`}>
            <span>
              <b className="tag">{item.action}</b>
            </span>
            <span>{item.actor_id ?? item.actorId ?? '—'}</span>
            <span>{item.outcome}</span>
            <span>{formatDate(item.created_at)}</span>
          </div>
        ))}
        {activity.map((item) => (
          <div className="table-row" key={`activity-${item.id}`}>
            <span>
              <b className="tag">{item.kind.replaceAll('_', ' ')}</b>
            </span>
            <span>{item.user_tag ?? item.user_id}</span>
            <span>Metadata only · {item.detail}</span>
            <span>{formatDate(item.created_at)}</span>
          </div>
        ))}
        {!cases.length && !audit.length && !activity.length && (
          <div className="empty">No activity to show.</div>
        )}
      </div>
    </section>
  );
}
function formatDate(value?: number | string) {
  if (!value) return '—';
  const date =
    typeof value === 'number'
      ? new Date(value < 2_000_000_000 ? value * 1000 : value)
      : new Date(value);
  return Number.isNaN(date.valueOf())
    ? '—'
    : date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function RankCardEditor({
  config,
  patch,
  onSave,
  onReset,
  saving,
}: {
  config: RankCardConfig;
  patch: (next: Partial<RankCardConfig>) => void;
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
}) {
  return (
    <section className="editor-grid panel-editor-grid">
      <div className="card preview-panel panel-preview-panel">
        <div className="card-title">
          <div>
            <small className="eyebrow">LIVE PREVIEW</small>
            <h2>This is how it appears in Discord</h2>
          </div>
          <span className="live-dot">● live</span>
        </div>
        <RankPreview config={config} />
      </div>
      <div className="card controls panel-controls">
        <div className="card-title">
          <div>
            <small className="eyebrow">SAFE EDITOR</small>
            <h2>XP card identity</h2>
            <p>Use only Vozen-curated banners or a solid color.</p>
          </div>
        </div>
        <label>
          Font
          <select value={config.font} onChange={(event) => patch({ font: event.target.value })}>
            <option value="system">System</option>
            <option value="inter">Inter</option>
            <option value="roboto">Roboto</option>
            <option value="poppins">Poppins</option>
            <option value="space_grotesk">Space Grotesk</option>
            <option value="lexend">Lexend</option>
          </select>
        </label>
        <ColorField
          label="Primary color"
          value={config.primary_color}
          swatches={swatches}
          onChange={(value) => patch({ primary_color: value, avatar_ring_color: value })}
        />
        <ColorField
          label="Text color"
          value={config.text_color}
          swatches={swatches}
          onChange={(value) => patch({ text_color: value })}
        />
        <label>
          Overlay opacity <output>{Math.round(config.overlay_opacity * 100)}%</output>
          <input
            type="range"
            min="0"
            max="0.85"
            step="0.01"
            value={config.overlay_opacity}
            onChange={(event) => patch({ overlay_opacity: Number(event.target.value) })}
          />
        </label>
        <BackgroundPicker config={config} patch={patch} />
        <div className="actions rank-actions">
          <button type="button" className="secondary" onClick={onReset}>
            Restore
          </button>
          <button type="button" className="primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </section>
  );
}
function BackgroundPicker({
  config,
  patch,
}: {
  config: RankCardConfig;
  patch: (next: Partial<RankCardConfig>) => void;
}) {
  const preset = config.background_preset;
  return (
    <div className="background-picker">
      <div className="field-label">
        <span>XP card background</span>
        <small>{preset ? 'Curated banner' : 'Solid colour'}</small>
      </div>
      <div className="background-modes">
        <button
          type="button"
          className={!preset ? 'mode selected' : 'mode'}
          onClick={() =>
            patch({ background_preset: null, background_url: null, background_data: null })
          }
        >
          Solid color
        </button>
        <button
          type="button"
          className={preset ? 'mode selected' : 'mode'}
          onClick={() =>
            patch({
              background_preset: preset ?? presetOptions[0][0],
              background_url: null,
              background_data: null,
            })
          }
        >
          Banners
        </button>
      </div>
      {preset ? (
        <div className="banner-grid">
          {presetOptions.map(([id, label, path]) => (
            <button
              type="button"
              className={preset === id ? 'banner-option selected' : 'banner-option'}
              key={id}
              onClick={() =>
                patch({ background_preset: id, background_url: null, background_data: null })
              }
            >
              <img src={path} alt="" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      ) : (
        <ColorField
          label="Choose a background color"
          value={config.background_color}
          swatches={['#101725', '#172033', '#1F2937', '#312E46', '#3B2434', '#243A36']}
          onChange={(value) => patch({ background_color: value })}
        />
      )}
    </div>
  );
}
function ColorField({
  label,
  value,
  swatches: colors,
  onChange,
}: {
  label: string;
  value: string;
  swatches: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="color-field">
      <div className="field-label">
        <span>{label}</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      </div>
      <div className="swatches">
        {colors.map((color) => (
          <button
            type="button"
            aria-label={`${label}: ${color}`}
            title={color}
            key={color}
            className={color.toLowerCase() === value.toLowerCase() ? 'swatch selected' : 'swatch'}
            style={{ '--swatch-color': color } as CSSProperties}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </div>
  );
}
function RankPreview({ config }: { config: RankCardConfig }) {
  const background = presetOptions.find(([id]) => id === config.background_preset)?.[2];
  const backgroundImage = background
    ? `linear-gradient(rgba(0,0,0,${config.overlay_opacity}), rgba(0,0,0,${config.overlay_opacity})), url(${JSON.stringify(background)})`
    : undefined;
  return (
    <div
      className="rank-preview"
      style={{
        backgroundColor: config.background_color,
        backgroundImage,
        fontFamily: config.font === 'system' ? 'system-ui' : config.font.replace('_', ' '),
      }}
    >
      <div
        className="rank-avatar"
        style={{ borderColor: config.avatar_ring_color, borderWidth: config.avatar_ring_width }}
      >
        <span>✦</span>
      </div>
      <div className="rank-content">
        <div className="rank-top">
          <strong style={{ color: config.text_color }}>Lunara</strong>
          <div>
            <b style={{ color: config.primary_color }}>Rank #17</b>
            <b style={{ color: config.text_color }}>Level 8</b>
          </div>
        </div>
        <p style={{ color: config.primary_color }}>lunara#4821</p>
        <div className="xp-meta">
          <span style={{ color: config.text_color }}>429 / 1337 XP</span>
          <span style={{ color: config.text_color }}>32%</span>
        </div>
        <div className="xp-track">
          <i style={{ background: config.primary_color, width: '32%' }} />
        </div>
      </div>
    </div>
  );
}

export default App;
