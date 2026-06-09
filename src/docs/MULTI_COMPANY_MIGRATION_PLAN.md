# Multi-Company SaaS Migration Plan

## Status: STRUCTURE PREPARED (Non-Breaking)

This document outlines the migration path from single-company to multi-company SaaS without breaking current functionality.

---

## CURRENT STATE

### Single Company (Hard-coded)
- Company name: "R.C Art Construction LLC"
- Hard-coded in multiple places
- No company context/session
- No company entity in database

---

## PHASE 1: STRUCTURE PREPARATION ✅ COMPLETED

### New Files Created
1. **`src/types/Company.ts`**
   - TypeScript interface for Company
   - Defines: id, name, email, phone, address, logo_url, website

2. **`src/lib/companyContext.js`**
   - `DEFAULT_COMPANY` constant
   - `getCurrentCompany()` - Gets active company (currently always DEFAULT_COMPANY)
   - `getCompanyName()` - Single source of truth for company name
   - `getCompanyContact()` - Centralized contact info

3. **`src/lib/companyBranding.js`**
   - `getDocumentBrandingConfig()` - Returns branding config for documents
   - `getDocumentCompanyName()` - Company name for headers
   - `getDocumentAddress()` - Contact information
   - `getDocumentFooterText()` - Footer text with company + system branding

---

## FILES REQUIRING UPDATES (Future Migration)

### High Priority (User-Facing Documents)

#### 1. **Estimates Documents**
- **File**: `src/components/estimates/EstimateDocumentConfigured.jsx`
- **Current**: Hard-coded "R.C Art Construction LLC" (line 77)
- **Current**: Hard-coded address "Portland, OR 97201" (line 83)
- **Current**: Hard-coded email "info@rcartconstruction.com" (line 83)
- **Future Change**:
  ```javascript
  // Replace:
  import { getDocumentBrandingConfig } from '@/lib/companyBranding';
  const branding = getDocumentBrandingConfig();
  // Use: branding.companyName, branding.companyAddress, etc.
  ```

#### 2. **Invoices Documents**
- **File**: `src/pages/Invoices.jsx`
- **Current**: Hard-coded "R.C Art Construction LLC" (line 52)
- **Current**: Hard-coded address (line 83 in print function)
- **Future Change**: Use `getDocumentBrandingConfig()` in `handlePrint()`

#### 3. **Final Document Renderer**
- **File**: `src/components/documents/FinalDocumentRenderer.jsx`
- **Current**: Hard-coded "R.C Art Construction LLC" (line 23)
- **Current**: Hard-coded address (line 25)
- **Future Change**: Accept `companyBranding` as prop or import from context

### Medium Priority (Internal UI)

#### 4. **Sidebar**
- **File**: `src/components/layout/Sidebar.jsx`
- **Current**: Shows "NexArt Pro" (line 69)
- **Current**: Shows "R.C Art Construction" (line 70)
- **Future Enhancement**: Could display actual company name if multi-company

#### 5. **Estimate Actions Panel**
- **File**: `src/components/estimates/EstimateActionsPanel.jsx`
- **Status**: Uses dynamic estimate data (no hardcoded company name)
- **Future Change**: Could add company selector/switcher if multi-company

### Low Priority (Config)

#### 6. **App Config**
- **File**: `src/config/app.ts`
- **Current**: `companyName: "R.C Art Construction LLC"`
- **Future Change**: Could be replaced by company context (currently kept for system name)

---

## MIGRATION ROADMAP

### Phase 1: ✅ Structure (DONE)
- [x] Create Company type
- [x] Create company context helpers
- [x] Create company branding helpers
- [x] Document all hardcoded locations

### Phase 2: (NEXT - Replace Hardcoded References)
- [ ] Update EstimateDocumentConfigured.jsx to use `getDocumentBrandingConfig()`
- [ ] Update Invoices.jsx to use company context
- [ ] Update FinalDocumentRenderer.jsx to use company context
- [ ] Update Sidebar.jsx to support company display (optional)

### Phase 3: (Create Company Entity)
- [ ] Add `Company` entity to database schema
- [ ] Create company management UI
- [ ] Add company_id to User entity
- [ ] Create API endpoint to fetch user's company

### Phase 4: (Authentication & Session)
- [ ] Add company context to AuthContext
- [ ] Fetch company from API on login
- [ ] Filter all entities by company_id
- [ ] Add company isolation to security rules

### Phase 5: (Multi-Company Support)
- [ ] Allow users to belong to multiple companies
- [ ] Add company switcher UI
- [ ] Add company invitation system
- [ ] Add company billing/subscription

---

## CURRENT HARDCODED VALUES

### Company Name
- ✅ Centralized in `companyContext.js` as `DEFAULT_COMPANY.name`
- Still used directly in:
  - `EstimateDocumentConfigured.jsx` (line 77)
  - `Invoices.jsx` (line 52)
  - `FinalDocumentRenderer.jsx` (line 23)

### Company Address
- Used directly in:
  - `EstimateDocumentConfigured.jsx` (line 83)
  - `Invoices.jsx` (print function)
  - `FinalDocumentRenderer.jsx` (line 25)

### Company Email
- Used directly in:
  - `EstimateDocumentConfigured.jsx` (line 83)
  - `Invoices.jsx` (print function)
  - `FinalDocumentRenderer.jsx` (line 25)

### Company Phone
- Used directly in:
  - `EstimateDocumentConfigured.jsx` (line 83)
  - `Invoices.jsx` (print function)
  - `FinalDocumentRenderer.jsx` (line 25)

---

## NON-BREAKING GUARANTEE

✅ **Current functionality is preserved**
- All hardcoded values remain in place
- No existing code is modified
- New context functions are available for gradual migration
- `getCurrentCompany()` always returns `DEFAULT_COMPANY`
- Zero impact on running system

---

## MIGRATION EXAMPLE (Phase 2)

### Before
```javascript
// EstimateDocumentConfigured.jsx
<div style={{ color: 'white', fontWeight: 800, fontSize: 20 }}>
  R.C Art Construction LLC
</div>
<div style={{ color: '#64748b', fontSize: 12 }}>
  Portland, OR 97201<br />
  info@rcartconstruction.com
</div>
```

### After
```javascript
import { getDocumentBrandingConfig } from '@/lib/companyBranding';

const EstimateDocumentConfigured = ({ estimate, visibility = {} }) => {
  const branding = getDocumentBrandingConfig();
  
  return (
    <div style={{ ... }}>
      <div style={{ color: 'white', fontWeight: 800, fontSize: 20 }}>
        {branding.companyName}
      </div>
      <div style={{ color: '#64748b', fontSize: 12 }}>
        {branding.companyAddress}<br />
        {branding.companyEmail}
      </div>
    </div>
  );
};
```

---

## FUTURE: Company Entity Schema

```typescript
{
  "name": "Company",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string" },
    "phone": { "type": "string" },
    "address": { "type": "string" },
    "city": { "type": "string" },
    "state": { "type": "string" },
    "zip": { "type": "string" },
    "logo_url": { "type": "string" },
    "website": { "type": "string" },
    "subscription_tier": { 
      "type": "string",
      "enum": ["free", "pro", "enterprise"]
    },
    "is_active": { "type": "boolean", "default": true }
  }
}
```

---

## NOTES

- **No database migration needed yet** — Prepare structure first
- **No API calls yet** — Uses DEFAULT_COMPANY hardcoded
- **Non-breaking** — Existing code unchanged
- **Ready for gradual migration** — New helpers available immediately
- **Future-proof** — Structure supports full multi-company SaaS