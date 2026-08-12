---
title: Permission reference
description: Why the Helper requests Discord permissions.
---
# Permission reference

Permissions are reported by the module adapter and checked against the selected server. A permission at server level can still be blocked by a channel overwrite.

{% for feature in helperDocs.features %}<h2>{{ feature.title }}</h2>{% if feature.permissions and feature.permissions.length %}<ul>{% for permission in feature.permissions %}<li><code>{{ permission }}</code></li>{% endfor %}</ul>{% else %}<p>No extra permission is listed in the manifest.</p>{% endif %}{% endfor %}

