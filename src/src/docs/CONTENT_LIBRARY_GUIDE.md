# Reusable Content Library — User Guide

## Overview

The **Reusable Content Library** lets you save and reuse proposal text blocks across multiple proposals. Build a library of proven language and insert it with a single click.

---

## Where It Is

In **Proposal Editor**, below each of these fields:

- **Scope of Work**
- **What's Included**
- **What's Excluded**
- **Project Timeline**

Look for two small buttons: **Insert** and **Save**.

---

## How to Use

### Save to Library

1. Write or edit your text in a field (e.g., "What's Included")
2. Click **Save** below the textarea
3. Give it a short label (e.g., "Standard Residential Inclusions")
4. Optionally assign a category (e.g., "Residential", "Commercial")
5. Click **Save** — it's now in your library forever

**Example:**
```
Label: "Standard Residential Inclusions"
Category: "Residential"
Content: 
  All labor and installation
  Materials as listed in line items
  Site cleanup and haul-away
  Post-service walkthrough with client
  Warranty on labor
```

---

### Insert from Library

1. Open the field where you want to insert (e.g., "What's Included")
2. Click **Insert** — a list of saved items appears
3. Click an item to insert it
   - If field is empty → replaces with the saved text
   - If field has content → appends with a newline separator
4. Edit freely — the inserted text is a starting point, not locked

**Tip:** You can combine multiple inserts into one field. Click **Insert** multiple times to build custom content.

---

## Managing Your Library

### View All Items

Click **Insert** next to any field to see all saved items of that type.

### Delete an Item

1. Click **Insert** 
2. Find the item
3. Click **Remove** next to it

### Organize with Categories

When saving, assign a category (default: "General"). Categories help organize items:

- Residential
- Commercial
- Maintenance
- Remodel
- Your own categories

---

## Storage & Persistence

- Library is stored in your **browser's local storage**
- Persists across browser sessions (until cache is cleared)
- Not synced across devices (local browser only)
- No backend required — fully private to your browser

---

## Best Practices

1. **Use specific labels** — "Standard residential scope" beats "Scope 1"
2. **Keep content modular** — save small, reusable chunks, not entire proposals
3. **Leverage categories** — organize by project type or complexity
4. **Edit freely** — saved content is a template, always customize for the client
5. **Build over time** — start with a few blocks, grow your library as you write proposals

---

## Supported Content Types

| Type | Field | Use Case |
|------|-------|----------|
| `scope` | Scope of Work | Project description, methodology |
| `inclusion` | What's Included | Deliverables, services, materials |
| `exclusion` | What's Excluded | Out-of-scope items, limitations |
| `timeline` | Project Timeline | Duration, schedule, milestones |

---

## Limitations

- Library is local to your browser (not synced across devices)
- Cannot export or import as files (localStorage only)
- No sharing between team members (each person has their own library)
- Clearing browser cache will clear the library

---

## Tips for Growing Your Library

1. **Start with presets** — apply a preset, tweak it, save as a new item
2. **Reuse proven language** — save the exact text from your best proposals
3. **Version your content** — save "Scope v1", "Scope v2" if you refine language
4. **Combine inserts** — mix and match saved items to create unique proposals fast

---

**Result:** Faster proposal authoring. Consistent language. Fewer typos. More proposals sent. 🚀