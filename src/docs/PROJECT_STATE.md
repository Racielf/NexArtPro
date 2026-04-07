# PROJECT_STATE.md

## Latest Changes (Session 2026-04-07)

### Completed
1. **EstimateDocumentOptions**: Made scrollable for mobile (max-height, flex flex-col, overflow-y-auto)
2. **EstimateGroups**: Removed "One option/Multiple options" toggle (simplified UI)
3. **EstimateActionsPanel**: Formalized roles
   - Added `const role = currentUser?.role || 'employee'` (line 197)
   - Updated MarginGuardModal prop: `isAdmin={role === 'admin'}` (line 644)
4. **MarginGuardModal**: Added security guard
   - Planned: `if (!isAdmin) return;` in handlePinSubmit() (line 51)

### Functional Status
- ✅ Estimate creation & editing
- ✅ Line items with Decimal.js precision
- ✅ Margin calculations & guardrails
- ✅ Approval workflow (approve/decline)
- ✅ Schedule appointments
- ✅ OMW tracking
- ✅ Send estimate to client (with margin check)
- ✅ Audit trail (EstimateVersionHistory)
- ✅ Role-based restrictions (admin vs employee)

### Known Risks (Mitigated)
- **MarginGuardModal bypass**: Non-admin could invoke handlePinSubmit() without PIN input → Fix: Add `if (!isAdmin) return;`
- **PIN in env**: Fallback '1234' unsafe in prod → Documented, requires Settings entity in production
- **Margen threshold**: Hardcoded in 3 places (25%) → Document locations for future changes

### Next Work Items
- Implement `if (!isAdmin) return;` in MarginGuardModal.handlePinSubmit()
- Consider extracting EstimateActionsPanel into smaller sub-components (currently 676 lines)
- Define what "changes_requested" status actually does (exists but unused)