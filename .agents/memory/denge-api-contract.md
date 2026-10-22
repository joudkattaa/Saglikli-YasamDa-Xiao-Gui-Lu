---
name: Denge API contract
description: Keep OpenAPI calendar dates and generated React Query types aligned with the shared workspace.
---

For calendar-day fields stored by Drizzle as `date(..., { mode: "string" })`, describe the OpenAPI value as a plain string rather than `format: date`. Orval can otherwise generate JavaScript `Date` types that do not match the app's `YYYY-MM-DD` values.

Set Orval's query version explicitly to 5 for generated TanStack Query hooks. The separate API-spec package may not infer the consuming app's installed query version.

**Why:** The contract, generated client, and database use different representations unless calendar-date and query-version behavior are pinned.

**How to apply:** Before changing the Denge API contract or regenerating hooks, preserve calendar-day strings and verify the generated hooks target TanStack Query 5.
