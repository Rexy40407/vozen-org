---
title: Discord intents
description: Events the Helper needs to observe.
---
# Discord intents

Intents control which Discord events the bot can receive. Privileged intents such as Message Content and Server Members must be enabled in the Discord Developer Portal before a module can observe those events.

{% for feature in helperDocs.features %}{% if feature.intents and feature.intents.length %}<h2>{{ feature.title }}</h2><ul>{% for intent in feature.intents %}<li><code>{{ intent }}</code></li>{% endfor %}</ul>{% endif %}{% endfor %}

