# MASTER_CONTEXT.md

## Project Overview
Base44 FSM Pro — Field Service Management application built on React + Base44 platform.

## Current Phase
Phase 1.2 (Estimate Audit & Security Refinement)

## Key Modules
- **Estimates Editor**: Multi-panel editor with grouped line items, pricing engine (Decimal.js), approval workflow
- **Margin Guards**: Internal guardrails (25% minimum safe margin) with PIN-based admin override
- **Audit Trail**: EstimateVersionHistory + EstimateAuditLog for all changes
- **Roles**: admin | agent (recently formalized)

## Tech Stack
- Frontend: React 18 + Tailwind CSS + shadcn/ui
- State: React Query + custom hooks
- Database: Base44 entities (estimates, work orders, invoices, appointments, etc.)
- Backend: Deno functions + Base44 SDK

## Critical Files
- `pages/EstimateEditor.jsx` — Main estimate editor
- `components/estimates/EstimateActionsPanel.jsx` — Status workflow + role logic
- `components/estimates/EstimateGroups.jsx` — Line items engine
- `components/estimates/internal/MarginGuardModal.jsx` — PIN-based approval
- `lib/estimateEngine.js` — Decimal.js calculation engine
- `lib/estimateAuditLog.js` — Audit logging

## Current Architecture
- **2-panel layout**: Sidebar (customer) + Canvas (line items)
- **Real-time calculations**: Decimal.js prevents float errors
- **Approval flow**: draft → scheduled → on_my_way → visit_completed → sent → viewed → approved/declined → converted
- **Guardrails**: Margin < 25% blocks non-admin from sending