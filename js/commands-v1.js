/* Vozen command catalogue. TTS commands come from the TTS contract; Helper commands
 * mirror the public command data exported by the Helper Rust runtime. */
(function () {
  "use strict";

  const ttsCommands = [
    ["/invite", "Get the link to add Vozen to another server.", "start", "Free", ""],
    ["/setup", "Configure the text channel, auto-read and voice permissions in one guided step.", "start", "Admin", ""],
    ["/join", "Join your current voice channel.", "start", "Free", ""],
    ["/leave", "Leave the voice channel.", "start", "Free", ""],
    ["/tts <text>", "Read a message out loud with your selected voice.", "start", "Free", "Voice channel required"],
    ["/tts-file <text>", "Create a private audio file from short text without joining a call.", "start", "Free", "Max 500 characters"],
    ["/skip", "Skip the audio currently playing.", "start", "Free", ""],
    ["/queue", "View or manage the privacy-safe playback queue.", "start", "Free", "show · remove · clear · pause · resume"],
    ["/shut-up", "Stop Vozen speaking now and clear the whole queue.", "start", "Free", ""],
    ["/laugh", "Make Vozen laugh out loud in your current voice.", "start", "Free", ""],
    ["/sound <clip>", "Play a sound clip in the voice channel.", "start", "Free", ""],
    ["/joke <language>", "Tell a short joke in the language you choose.", "fun", "Free", "Optional engine · optional laughter"],
    ["/rizz <language>", "Drop a pickup line in the language you choose.", "fun", "Premium", "Engine required · optional sound"],
    ["/8-ball <question>", "Ask the magic 8-ball a yes/no question.", "fun", "Free", "Language · engine"],
    ["/fortune", "Read a fortune out loud.", "fun", "Free", "Language · engine"],
    ["/fact", "Tell a random fun fact.", "fun", "Free", "Language · engine"],
    ["/wyr", "Ask a would-you-rather question.", "fun", "Free", "Language · engine"],
    ["/cast", "Randomly cast everyone in your voice call and reveal the result.", "fun", "Free", "Voice channel required"],
    ["/birthday", "Set, show or clear your birthday greeting.", "fun", "Free", "set · show · clear"],
    ["/game play", "Start a voice or text minigame with the server.", "fun", "Free + Premium", "Menu · language · engine"],
    ["/game list", "See the minigames available to this server.", "fun", "Free", ""],
    ["/game stop", "Stop the active minigame.", "fun", "Free", ""],
    ["/randomizer", "Pick one option at random and say it out loud.", "fun", "Free", "Options · language"],
    ["/top-speakers", "See who Vozen has read the most, with daily streaks.", "stats", "Free", ""],
    ["/server-stats", "View server messages, top talkers and game stats.", "stats", "Free + Premium", "Free preview"],
    ["/stats", "Show Vozen bot statistics.", "stats", "Admin", ""],
    ["/bot-stats", "Show public servers, voice sessions and uptime.", "stats", "Free", ""],
    ["/uptime", "See how long Vozen has been online.", "stats", "Free", ""],
    ["/voice", "Manage your personal voice, language, engine and effects.", "settings", "Free + Premium", "set · show · reset · preview"],
    ["/config", "Manage server-wide Vozen settings.", "settings", "Admin", "show · reset · channels · toggles"],
    ["/config language", "Set the language Vozen uses for this server.", "settings", "Admin", ""],
    ["/config default-voice", "Choose the server default voice and engine.", "settings", "Admin", ""],
    ["/config block-word", "Add or remove words Vozen skips while reading.", "settings", "Admin", "add · remove"],
    ["/config greet-language", "Choose the language used for greetings.", "settings", "Admin", ""],
    ["/privacy", "Manage your personal data and opt-out preferences.", "settings", "Free", ""],
    ["/translate", "Configure opt-in text translation.", "settings", "Free", ""],
    ["/pronunciation", "Teach Vozen how to say a word in your messages.", "settings", "Free", "add · list · remove"],
    ["/server-pronunciation", "Manage pronunciations for everyone in the server.", "settings", "Admin + Premium", "Admin · 3 free / 50 Premium"],
    ["/premium", "Check Premium status or activate a server licence.", "premium", "Free", "info · activate · redeem"],
    ["/transcribe", "Start or stop live voice transcription for consenting speakers.", "premium", "Premium", "start · stop"],
    ["/redeem <code>", "Redeem a Vozen gift code.", "premium", "Free", ""],
    ["/help", "Show Vozen's command list in Discord.", "help", "Free", ""],
    ["/vote", "Get the link to vote for Vozen on top.gg.", "help", "Free", ""],
    ["/Speak", "Read a selected message out loud.", "help", "Free", "Message context action"],
    ["/Translate", "Translate a selected message.", "help", "Free", "Message context action"],
    ["/Transcribe voice message", "Transcribe a selected voice message.", "help", "Premium", "Message context action"],
  ].map(([name, description, category, access, usage]) => ({ product: "tts", name, description, category, access, usage }));

  const helperCommands = [
    ["/achievements", "View or manage community achievements.", "community", "Free", ""],
    ["/balance", "Check the economy balance configured for this server.", "community", "Free", ""],
    ["/event-create", "Create a server event with the Helper.", "community", "Admin", "Manage Events"],
    ["/giveaway-start", "Start a giveaway using this server's giveaway settings.", "community", "Admin", ""],
    ["/leaderboard", "Show the server XP leaderboard.", "community", "Free", ""],
    ["/rank", "Show a member's current XP level and rank card.", "community", "Free", ""],
    ["/rolepanel", "Publish or open a configured role panel.", "community", "Admin", "Manage Roles"],
    ["/starboard-set", "Configure the channel and threshold for a starboard.", "community", "Admin", "Manage Messages"],
    ["/suggest", "Submit a suggestion for the community to review.", "community", "Free", ""],
    ["/serverstats", "Show the server statistics summary.", "insights", "Free", ""],
    ["/modlogs", "Open moderation logs for this server.", "management", "Moderator", ""],
    ["/tag", "Create, view or use a configured Helper tag.", "management", "Free", ""],
    ["/invites", "Check invite-tracker information for the server.", "management", "Moderator", ""],
    ["/warn", "Record a warning with a reason.", "management", "Moderator", ""],
    ["/poll", "Create a poll with the Helper.", "management", "Moderator", ""],
    ["/privacy", "Access privacy controls and data requests.", "management", "Free", ""],
    ["/workflow-create", "Create a bounded automation workflow.", "management", "Admin", ""],
    ["/anti-raid", "Review or toggle raid-protection settings.", "protection", "Moderator", ""],
    ["/join-gate", "Review or toggle entry checks for new members.", "protection", "Moderator", ""],
    ["/ticket-panel", "Publish a configured support ticket panel.", "support", "Admin", "Manage Channels"],
    ["/embed", "Create a bounded Discord embed.", "utilities", "Moderator", ""],
    ["/emojis", "List or manage available server emojis.", "utilities", "Moderator", ""],
    ["/help", "Show contextual Helper help in Discord.", "utilities", "Free", ""],
    ["/remind", "Set a reminder through the Helper scheduler.", "utilities", "Free", ""],
    ["/search", "Run an approved, bounded search query.", "utilities", "Free", ""],
    ["/temp-channel", "Create or manage a temporary voice channel.", "utilities", "Moderator", "Manage Channels"],
  ].map(([name, description, category, access, usage]) => ({ product: "helper", name, description, category, access, usage }));

  const catalogue = {
    tts: {
      label: "Vozen TTS",
      search: "Try setup, voice or games",
      note: "Choose a category above or scan the complete TTS command set below.",
      contract: "Every command is registered from the Rust contract used by the live bot.",
      commands: ttsCommands,
      groups: [
        ["start", "Start & voice", "Get Vozen into a call and control the queue."],
        ["fun", "Fun & games", "Make the voice channel playful."],
        ["stats", "Stats & activity", "See what your server is saying."],
        ["settings", "Settings & privacy", "Shape Vozen around your server."],
        ["premium", "Premium", "Extra engines and server-wide upgrades."],
        ["help", "Help & community", "Find support and share Vozen."],
      ],
      steps: [["/setup", "Configure the server once"], ["/join", "Join your current voice channel"], ["/tts", "Say something out loud"]],
      action: "Add Vozen TTS to Discord",
      href: "/dashboard.html?add=1",
      external: false,
    },
    helper: {
      label: "Vozen Helper",
      search: "Try protection, ticket or workflow",
      note: "Choose a category above or explore Helper's current command contract.",
      contract: "Helper commands are exported from the Rust contract used by the live Helper.",
      commands: helperCommands,
      groups: [
        ["protection", "Protection", "Review safety settings before they act in Discord."],
        ["community", "Community", "Run healthy community tools and events."],
        ["support", "Support", "Set up private, auditable support conversations."],
        ["management", "Management", "Moderate, audit and automate the server."],
        ["utilities", "Utilities", "Use small tools that keep work moving."],
        ["insights", "Insights", "See an at-a-glance server activity summary."],
      ],
      steps: [["/help", "See the server tools available to you"], ["/anti-raid", "Review your protection controls"], ["/ticket-panel", "Publish support when your server needs it"]],
      action: "Open Vozen Helper",
      href: "../helper/",
      external: false,
    },
  };

  const groupsEl = document.getElementById("commandGroups");
  const search = document.getElementById("commandSearch");
  const result = document.getElementById("commandResults");
  const filtersEl = document.getElementById("commandFilters");
  const productButtons = [...document.querySelectorAll("[data-command-product]")];
  const asideTitle = document.getElementById("commandAsideTitle");
  const asideSteps = document.getElementById("commandAsideSteps");
  const asideCta = document.getElementById("commandAsideCta");
  const asideNote = document.getElementById("commandAsideNote");
  let product = "tts";
  let activeFilter = "all";

  const locale = () => {
    try {
      const value = localStorage.getItem("vozen.lang") || "en";
      return window.VOZEN_I18N && window.VOZEN_I18N[value] ? value : "en";
    } catch (_) { return "en"; }
  };
  const interpolate = (value, variables) => String(value).replace(/\{(\w+)\}/g, (_, key) => String(variables?.[key] ?? `{${key}}`));
  const t = (key, fallback, variables) => {
    const dictionary = window.VOZEN_I18N || {};
    const value = dictionary[locale()]?.[key] || dictionary.en?.[key] || fallback || key;
    return interpolate(value, variables);
  };
  const groupKeys = {
    start: ["commands.groupStart", "Start & voice"],
    fun: ["commands.groupFun", "Fun & games"],
    stats: ["commands.groupStats", "Stats & activity"],
    settings: ["commands.groupSettings", "Settings & privacy"],
    premium: ["commands.groupPremium", "Premium"],
    help: ["commands.groupHelp", "Help & community"],
    protection: ["commands.groupProtection", "Protection"],
    community: ["commands.groupCommunity", "Community"],
    support: ["commands.groupSupport", "Support"],
    management: ["commands.groupManagement", "Management"],
    utilities: ["commands.groupUtilities", "Utilities"],
    insights: ["commands.groupInsights", "Insights"],
  };
  const genericCategory = (category) => t(`commands.generic.${category}`, "Use {command} to manage this feature.");
  const localizedAccess = (access) => {
    const keys = {
      Free: "commands.freeTag",
      Premium: "commands.premiumTag",
      Admin: "commands.adminTag",
      Moderator: "commands.moderatorTag",
      "Free + Premium": "commands.freePremiumTag",
      "Admin + Premium": "commands.adminPremiumTag",
    };
    return t(keys[access] || "commands.premiumTag", access);
  };
  const localizedCommand = (command) => {
    if (locale() === "en") return { ...command, access: localizedAccess(command.access) };
    return {
      ...command,
      description: genericCategory(command.category).replace("{command}", command.name),
      usage: command.usage ? t("commands.usageAvailable", "Options available in Discord.") : "",
      access: localizedAccess(command.access),
    };
  };
  const applyStaticCopy = () => {
    const copy = [
      [".commands-hero .eyebrow", "commands.catalogueEyebrow"],
      [".commands-hero h1", "commands.heroTitle"],
      [".commands-hero__lead", "commands.heroLead"],
      [".command-finder__kicker", "commands.chooseBot"],
      [".command-finder__intro h2", "commands.exploreTitle"],
      [".command-finder__intro p:last-child", "commands.exploreSub"],
      [".command-product-picker", "commands.botAria", "aria-label"],
      ["[data-command-product=tts] small", "commands.voiceCommunity"],
      ["[data-command-product=helper] small", "commands.serverOperations"],
      [".command-search .sr-only", "commands.search"],
      ["#commandSearch", "commands.searchPlaceholder", "placeholder"],
      ["#commandFilters", "commands.filters", "aria-label"],
      [".commands-section__head .command-finder__kicker", "commands.fullCatalogue"],
      [".commands-aside__block--accent > .command-finder__kicker", "commands.newHere"],
      [".commands-aside__block:not(.commands-aside__block--accent) > .command-finder__kicker", "commands.readingLabels"],
      [".commands-legend li:nth-child(1) span:last-child", "commands.freeHelp"],
      [".commands-legend li:nth-child(2) span:last-child", "commands.premiumHelp"],
      [".commands-legend li:nth-child(3) span:last-child", "commands.adminHelp"],
    ];
    copy.forEach(([selector, key, attribute]) => {
      const element = document.querySelector(selector);
      if (!element) return;
      const value = t(key, element.textContent || element.getAttribute(attribute) || "");
      if (attribute) element.setAttribute(attribute, value);
      else element.textContent = value;
    });
    document.querySelectorAll(".commands-legend .command-tag").forEach((tag) => {
      const raw = tag.textContent.trim();
      tag.textContent = localizedAccess(raw);
    });
  };

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const tagClass = (tag) => tag.toLowerCase().includes("premium") ? "command-tag--premium" : /admin|moderator/i.test(tag) ? "command-tag--admin" : "command-tag--free";
  const current = () => catalogue[product];

  function renderFilters() {
    const item = current();
    filtersEl.innerHTML = [["all", t("commands.all", "All")], ...item.groups.map(([id, title]) => [id, t(groupKeys[id]?.[0] || id, title)])]
      .map(([id, title], index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-filter="${id}" aria-pressed="${index === 0}">${title}</button>`).join("");
    filtersEl.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";
      filtersEl.querySelectorAll("[data-filter]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      render();
    }));
  }

  function renderAside() {
    const item = current();
    const isTts = product === "tts";
    asideTitle.textContent = isTts ? t("commands.threeStepsTts", "Three steps to voice") : t("commands.threeStepsHelper", "Three steps to Helper");
    const stepKeys = {
      "/setup": "commands.step.setup",
      "/join": "commands.step.join",
      "/tts": "commands.step.tts",
      "/help": "commands.step.help",
      "/anti-raid": "commands.step.antiRaid",
      "/ticket-panel": "commands.step.ticketPanel",
    };
    asideSteps.innerHTML = item.steps.map(([command, copy]) => `<li><code>${escapeHtml(command)}</code><span>${escapeHtml(t(stepKeys[command] || "", copy))}</span></li>`).join("");
    asideCta.textContent = isTts ? t("commands.addTts", item.action) : t("commands.addHelper", item.action);
    asideCta.href = item.href;
    asideCta.toggleAttribute("target", item.external);
    asideCta.toggleAttribute("rel", item.external);
    if (item.external) asideCta.setAttribute("rel", "noopener noreferrer");
    asideNote.textContent = isTts ? t("commands.contractTts", item.contract) : t("commands.contractHelper", item.contract);
  }

  function commandRow(command) {
    const localized = localizedCommand(command);
    return `<article class="command-row">
      <div class="command-row__top"><code>${escapeHtml(localized.name)}</code><span class="command-tag ${tagClass(command.access)}">${escapeHtml(localized.access)}</span></div>
      <p>${escapeHtml(localized.description)}</p>
      ${localized.usage ? `<span class="command-row__usage">${escapeHtml(localized.usage)}</span>` : ""}
    </article>`;
  }

  function render() {
    const item = current();
    const query = (search?.value || "").trim().toLowerCase();
    const visible = item.commands.filter((command) => {
      const matchesFilter = activeFilter === "all" || command.category === activeFilter;
      const searchable = `${command.name} ${command.description} ${command.access} ${command.usage}`.toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
    groupsEl.innerHTML = item.groups.map(([id, title, note]) => {
      const items = visible.filter((command) => command.category === id);
      if (!items.length) return "";
      const groupTitle = t(groupKeys[id]?.[0] || id, title);
      const groupNote = t(`commands.group.${id}.note`, note);
      return `<section class="command-group" aria-labelledby="group-${id}">
        <div class="command-group__head"><div><div class="command-group__title"><h3 id="group-${id}">${groupTitle}</h3><span class="command-group__count">${items.length}</span></div><p>${groupNote}</p></div></div>
        <div class="command-list">${items.map(commandRow).join("")}</div>
      </section>`;
    }).join("");
    result.textContent = query || activeFilter !== "all"
      ? t(visible.length === 1 ? "commands.resultsMatchOne" : "commands.resultsMatchMany", "{n} commands match your search.", { n: visible.length })
      : t("commands.resultsAll", "Showing all {n} {product} commands.", { n: visible.length, product: item.label });
    document.querySelectorAll(".command-empty").forEach((empty) => empty.remove());
    if (!visible.length) result.insertAdjacentHTML("afterend", `<p class="command-empty">${escapeHtml(t("commands.noMatch", "No commands match that search. Try a shorter word or choose a different category."))}</p>`);
  }

  function setProduct(nextProduct) {
    product = nextProduct;
    activeFilter = "all";
    search.value = "";
    const item = current();
    search.placeholder = t("commands.searchPlaceholder", item.search);
    document.getElementById("catalogueTitle").textContent = `${t("commands.exploreEvery", "Explore every")} ${item.label} ${t("commands.commandsWord", "command")}`;
    document.getElementById("catalogueNote").textContent = t("commands.catalogueNote", item.note);
    productButtons.forEach((button) => {
      const selected = button.dataset.commandProduct === product;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    renderFilters();
    renderAside();
    render();
  }

  productButtons.forEach((button) => button.addEventListener("click", () => setProduct(button.dataset.commandProduct)));
  search?.addEventListener("input", render);
  window.addEventListener("vozen:languagechange", () => { applyStaticCopy(); setProduct(product); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== search && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      search?.focus();
    }
  });

  applyStaticCopy();
  setProduct(product);
})();
