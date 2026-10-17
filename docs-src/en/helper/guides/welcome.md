---
title: Welcome new members
---
# Welcome new members

Choose a public welcome channel, an optional direct message, and a role only after checking hierarchy. For a guided arrival, read the [Welcome channel](/docs/helper/modules/welcome/guided-channel/) page and its current availability banner.

<h2 id="public-welcome-message">Public welcome message</h2>

In the Helper panel, choose your server and open **Welcome messages**. Select the public channel and write the greeting. The example below uses `#welcome` and fictional member Sam.

```text
Welcome {member} to {server}!
```

Preview the message before publishing. Check the bot's permissions in the selected channel, including channel-specific overrides.

<h2 id="optional-direct-message">Optional direct message</h2>

The public greeting and the private greeting are separate settings. Enable the optional DM only if you want one, and review its own message rather than assuming it copies the public greeting.

<h2 id="optional-member-role">Optional member role</h2>

Choose an automatic member role only after checking the server hierarchy. The Helper's highest role must sit above the role it will manage. A public greeting does not require you to add an automatic role.

See [role hierarchy](/docs/helper/troubleshooting/role-hierarchy/) if the selected role cannot be managed.

<h2 id="preview-and-check">Preview and check</h2>

1. Confirm the selected server and public channel.
2. Preview the resolved greeting; review the DM and role separately.
3. Read preflight and resolve any missing permission before publishing.

For a guided rules-and-introductions experience, use the separate [guided welcome channel](/docs/helper/modules/welcome/guided-channel/) module. For a missing greeting, start with [missing permissions](/docs/helper/troubleshooting/missing-permissions/) and the module's health information.

