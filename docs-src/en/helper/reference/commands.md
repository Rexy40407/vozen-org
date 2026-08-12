---
title: Command reference
description: Commands exported from the Helper technical manifest.
---
# Command reference

The command list below is generated from the Helper manifest. An empty list means the module is configured from the panel or that no public command is currently documented.

{% for feature in helperDocs.features %}<h2 id="{{ feature.slug | replace('/', '-') }}">{{ feature.title }}</h2>{% if feature.commands and feature.commands.length %}<ul>{% for command in feature.commands %}<li><code>{{ command }}</code></li>{% endfor %}</ul>{% else %}<p>No public command listed.</p>{% endif %}{% endfor %}

