# Estimate System — Status Log

## Purpose

This document is the continuity checkpoint for the Estimate system in `Racielf/proestimate-fsm`.

Any future chat or agent must read this file before claiming the Estimate system is broken or before redesigning anything.

---

## Verified Phases

### Phase 1 — Estimate Schema

Status: ✅ Applied

`base44/entities/Estimate.jsonc` was expanded additively.

Important:

- No existing fields were deleted.
- No field names were renamed.
- The schema now reflects fields already used by the current Estimate editor and document flow.

Covered fields include:

- discount fields
- deposit fields
- materials fields
- other costs fields
- cost / margin / profit fields
- document terms fields
- contingency fields
- send / view / approve / convert tracking fields

---

### Phase 2 — Calculation Engine

Status: ✅ Applied

`src/lib/estimateEngine.js` is the official calculation engine.

`src/lib/estimateCalculator.js` is now legacy compatibility only and delegates shared calculations to `estimateEngine.js`.

Important rules:

- Do not add new formulas to `estimateCalculator.js`.
- Add or change formulas only in `estimateEngine.js`.
- Do not duplicate financial logic inside templates or UI components.

Official pricing model:

- `unit_price` drives customer-facing totals.
- `unit_cost` is internal cost only.
- `book_price` is reference only and must never drive totals.

---

### Phase 3 — Persistence Layer

Status: ✅ Architecturally verified

`src/components/estimates/EstimateGroups.jsx` currently manages:

- groups
- line items
- materials
- other_costs
- payment_terms
- warranty_terms
- exclusions
- scope_summary
- assumptions
- contingency fields
- notes / internal notes

`src/components/estimates/MaterialsSection.jsx` emits a clean materials array and recalculates each material `line_total`.

`src/components/estimates/OtherCostsSection.jsx` emits a clean internal-cost array.

Important:

- Phase 3 should not be reworked unless a real bug is reproduced.
- A full DB roundtrip test is still recommended before declaring final production QA complete.

---

## Do Not Break

Do not redesign Estimate from scratch.

Do not rename existing fields used by the UI.

Do not move calculation logic into templates.

Do not create a third calculation engine.

Do not remove current support for materials or other costs.

Do not block below-cost sending unless the business rule explicitly changes.

---

## Next Recommended Phase

### Phase 4 — Document Rendering / Visibility

Next work should focus on:

- `buildEstimateDocumentViewModel.js`
- `EstimateTemplateRenderer.jsx`
- document templates
- Review & Send preview
- print / PDF / email consistency
- visibility toggles

Goal:

All document outputs must use the same normalized view model and renderer path.

---

## Rule for Future Audits

If a future chat or agent claims something is broken, it must provide:

1. Exact file path
2. Exact code location or behavior
3. Why it breaks the business flow
4. Minimal fix that does not redesign existing architecture

If those four points are missing, the claim should not be accepted as verified.
