# Walkthrough — Recovery Manual Port & Assignments Sync

All core tasks for recovery manual porting and real-time assignments synchronization have been completed successfully.

---

## 🛠️ Recovery Manual Port (Ported Fixes)

We successfully created the local branch `recovery/manual-port-invoice-estimate-fixes` from `master` and manually ported only the critical fixes from the old branch `rebuild/invoice-full-clone-from-optimistic-flow` without carrying over any history or unneeded legacy code:

### 1. Database Constraint Fallback & Mapping (Client/Customer)
- **Problem**: Estimates were linking to Customer IDs causing database Foreign Key constraint failures because the database table expects IDs from the `Client` table.
- **Ported Fix**: 
  - Integrated a fallback in `EstimateEditor.jsx` to load profile data from the `Customer` table when a matching record is missing in `Client`.
  - Added auto-creation of a shadow `Client` record inside `handleCustomerChange` to satisfy PostgreSQL constraints when linking estimates to a customer.
  - Ported name/full_name automatic mapping to `nexartClient.js` when querying or saving to the `clients` table.

### 2. Approved Status Editing Block (`isLocked`)
- **Problem**: Approved, sent, or signed estimates could be modified, violating integrity rules.
- **Ported Fix**:
  - Implemented the `LOCKED_STATUSES` list and a reactive `isLocked` state in `EstimateEditor.jsx`.
  - Blocked all save, language, template, and client change actions if the estimate is locked.
  - Rendered a visible "Locked" alert banner on the canvas and changed the editor mode to a safe "Read-only Mode" with disabled inputs.
  - Passed the lock state down to `<EstimateGroups>` to freeze item rows and prevent modifying line-item totals.

### 3. Missing Estimate Columns Mapped to JSONB Metadata
- **Problem**: Fields such as cost, profit margins, discount calculations, exclusions, and warranty terms are not columns in the main database schema, risking loss of data on saves.
- **Ported Fix**:
  - Added the complete array of `MISSING_ESTIMATE_COLUMNS` to `nexartClient.js`.
  - Integrated `mapRecordFromDB` and `preparePayloadForDB` to parse and serialize these fields to/from the `metadata` JSONB column automatically during all CRUD actions (`list`, `filter`, `create`, `update`).
  - Added date string serialization fallback to set empty strings to `null` to avoid PostgreSQL casting type errors.

---

## 🔗 NexArtPro CRM & NexArtTime Assignments Sync

We created a direct synchronizer between the CRM and the Time-Tracking database:

### 1. Cross-Project Synchronizer Client
- Created `timeSyncClient.js` inside the NexArtPro project.
- When an admin assigns a worker or changes a Work Order's status in the CRM, the script automatically syncs the worker's profile and Work Order details (WO number, title, client name, status, site coordinates, geofence radius) directly into the time-tracking database.

### 2. Live Synchronization Bindings (CRM Pages)
- Updated `Assignments.jsx`: linked `handleAssign` and `handleStatusChange` so that every change is propagated live to the worker app.

### 3. Worker PWA UI Prioritization (Worker Portal)
- Updated `getActiveWorkOrders` in `supabase.js` to retrieve assignment and location fields.
- Refactored `loadWorkOrders` in `clock.js` to sort the dropdown list so that any Work Order assigned to the logged-in worker appears first with a distinct `[★ ASSIGNED]` badge.

---

## 🧪 Validations & Code Quality
- **Bundler Validation**: Executed `npm run build` and confirmed that the build completes successfully without any compilation errors.
- **Lint Validation**: Cleaned up all unused imports inside `EstimateEditor.jsx` (e.g. `ChevronRight`, `DropdownMenuItem`, `EstimateAttachments`) to maintain a clean lint status on the editor page.
