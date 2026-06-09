# EXTRACTION_PLAN.md

## Goal
Break down EstimateActionsPanel (677 lines) into focused sub-components without changing behavior.

## Current Structure
EstimateActionsPanel contains:
- Status overview chips (lines 419-426)
- Next best action banner (lines 428-443)
- Action card buttons (Schedule, OMW, Finish, Send, Approve/Delete) (lines 449-498)
- 6 modals (Schedule, Approval, Finish, Delete, MarginGuard) (lines 501-645)
- Collapsible "More Actions" (lines 648-673)

## Extraction Candidates

### 1. StatusOverviewSection
**What**: Chips showing Appointment, Visit, Sent, Approval status
**Lines**: 419-426
**Props**: { hasAppointment, visitDone, isSent, isViewed, isApproved, isDeclined, s }
**File**: `components/estimates/actions/StatusOverviewSection.jsx`

### 2. NextActionBanner
**What**: Colored banner with next recommended step
**Lines**: 428-443
**Props**: { next }
**File**: `components/estimates/actions/NextActionBanner.jsx`

### 3. ActionCardsGrid
**What**: Button row for Schedule, OMW, Finish, Send, Approve
**Lines**: 449-498
**Props**: { estimate, onScheduleClick, onOMWClick, onFinishClick, onSendClick, onApproveClick, marginPct, MIN_SAFE_MARGIN }
**File**: `components/estimates/actions/ActionCardsGrid.jsx`

### 4. MoreActionsCollapsible
**What**: Collapsible "More Actions" with Delete button
**Lines**: 648-673
**Props**: { estimate, onDelete, canDelete, getDeleteBlockReason }
**File**: `components/estimates/actions/MoreActionsCollapsible.jsx`

### 5. Keep as Modal Files (already separate)
- EstimateScheduleModal
- EstimateApprovalModal
- EstimateFinishModal
- EstimateDeleteModal
- MarginGuardModal

## Implementation Order
1. Extract StatusOverviewSection
2. Extract NextActionBanner
3. Extract ActionCardsGrid
4. Extract MoreActionsCollapsible
5. Update EstimateActionsPanel imports & JSX

## Expected Result
- EstimateActionsPanel: ~250 lines (layout + state + handlers)
- 4 new focused components: 40-60 lines each
- Zero behavior changes