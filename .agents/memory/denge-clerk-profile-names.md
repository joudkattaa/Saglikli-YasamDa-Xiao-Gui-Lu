---
name: Denge Clerk profile names
description: Why Denge uses user-owned metadata for names instead of native Clerk name writes.
---

Denge's app-owned names belong in Clerk user unsafe metadata, updated through the dedicated metadata API, rather than requiring native first/last-name attributes to be enabled.

**Why:** The managed tenant rejected native name writes with HTTP 422 and `form_param_unknown` for `first_name`, blocking signup completion even though the age save succeeded. Using user-owned profile metadata avoids requiring dashboard configuration.

**How to apply:** Keep signup completion and all name displays consistent with this storage choice. Remove the temporary signup payload after transfer. Never use client-writable metadata for authorization or roles.
