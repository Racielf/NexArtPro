# LOCKED AREAS — NexArtPro

This file documents stable, confirmed-working areas that **must not be changed** unless the
user explicitly authorizes it.

Agents reading this file must treat every section marked **LOCKED / WORKING** as a protected
zone. Before touching any protected file, the agent **must** output the following header in
its response:

```
LOCKED AREA OPENED:
<area name>

Reason:
<exact reason>

Allowed files:
<exact files>
```

Changes inside a locked area must be **minimal** and must **not alter unrelated behavior**.

---

## LOCKED: Company Settings → Sidebar Branding

**Status:** LOCKED / WORKING ✅

**Confirmed working in production (Vercel) as of 2026-05-11.**

### Confirmed behavior

```
Settings → Company
  ↓
Supabase: public.app_users
          username = 'admin'
          company_settings JSONB column
  ↓
loadCompanySettings()          src/lib/companySettings.js
  ↓
useCompanyConfig()             src/hooks/useCompanyConfig.js
  ↓
Sidebar.jsx                    src/components/layout/Sidebar.jsx
  ↓
Sidebar displays:
  • company_settings.logo_url     (preferred logo)
  • company_settings.app_logo_url (fallback logo)
  • company_settings.displayName  (preferred name)
  • company_settings.name         (fallback name)
  • APP_CONFIG.*                  (last-resort fallback)
```

### Live-update behavior

`useCompanyConfig()` subscribes to `onCompanyConfigChange(refresh)` from
`src/lib/companyConfigEvents.js`. When the user saves Settings → Company,
`emitCompanyConfigChange()` fires → `refresh()` re-fetches from Supabase →
React re-renders the Sidebar without a page reload.

### Protected files

| File | Role |
|---|---|
| `src/components/layout/Sidebar.jsx` | Consumes `useCompanyConfig()` for branding |
| `src/hooks/useCompanyConfig.js` | React hook — loads + subscribes to company config |
| `src/lib/companySettings.js` | `loadCompanySettings()` / `saveCompanySettings()` — reads/writes Supabase |
| `src/lib/companyConfigEvents.js` | Event bus for live config updates |
| `src/api/base44Client.js` | Auth layer that resolves the `admin` user row |

### Do NOT modify this area unless the task is directly related to

- Settings → Company (the UI panel)
- `company_settings` Supabase column
- Company logo or app logo display
- Sidebar branding / company identity
- Company identity in invoice/estimate documents or templates

### Before touching this area, the agent must state

```
LOCKED AREA OPENED:
Company Settings / Sidebar Branding

Reason:
[exact reason]

Allowed files:
[exact files]
```

---

## Template for future locked areas

When a new flow is confirmed working in production, document it here using the same format:

```markdown
## LOCKED: <Area Name>

**Status:** LOCKED / WORKING ✅

**Confirmed working in production as of <date>.**

### Confirmed behavior
...

### Protected files
...

### Do NOT modify unless
...
```
