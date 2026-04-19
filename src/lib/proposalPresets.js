/**
 * proposalPresets.js
 *
 * Reusable content presets for common proposal scenarios.
 * Each preset prefills proposalDetails fields (scopeOfWork, inclusions, exclusions, timeline).
 * Users can edit freely after applying — presets are a starting point only.
 */

export const PROPOSAL_PRESETS = [
  {
    id: 'residential_service',
    label: 'Residential Service',
    icon: '🏠',
    description: 'Standard home service visit with labor and materials',
    details: {
      scopeOfWork:
        'Provide residential service at the client\'s property. Work includes assessment, labor, and materials as itemized in this proposal. All work will be performed by licensed professionals in compliance with local codes.',
      inclusions:
        'All labor and installation\nMaterials as listed in line items\nSite cleanup and haul-away\nPost-service walkthrough with client\nWarranty on labor',
      exclusions:
        'Permits (unless separately agreed)\nWork beyond the described scope\nPre-existing structural or code issues\nHazardous material removal',
      timeline:
        'Start date to be confirmed upon deposit. Estimated duration: 1–3 business days. Final completion date subject to material availability.',
      pricingOptions: [],
    },
  },
  {
    id: 'small_remodel',
    label: 'Small Remodel',
    icon: '🔨',
    description: 'Interior remodel with demo, build-out, and finish work',
    details: {
      scopeOfWork:
        'Complete interior remodel as described. Scope includes demolition of existing finishes, installation of new materials, and restoration to finished condition. Work to be completed in phases as coordinated with client.',
      inclusions:
        'Demolition and debris removal\nFraming and structural adjustments (as scoped)\nInstallation of all materials listed\nDrywall, taping, and finish prep\nPaint — one coat primer, two coats finish\nFinal inspection walkthrough',
      exclusions:
        'Furniture removal or storage\nDecorating, staging, or artwork\nAppliance installation (unless itemized)\nPermits (quoted separately upon request)\nUnforeseen structural repairs',
      timeline:
        'Project start contingent on signed proposal and deposit. Estimated duration: 5–10 business days. Client must provide site access during scheduled work hours.',
      pricingOptions: [],
    },
  },
  {
    id: 'repair_maintenance',
    label: 'Repair / Maintenance',
    icon: '🔧',
    description: 'Targeted repair or routine maintenance visit',
    details: {
      scopeOfWork:
        'Perform targeted repair and/or routine maintenance service as itemized. Work will be completed efficiently with minimal disruption to the property.',
      inclusions:
        'Diagnosis and assessment\nLabor for all items listed\nReplacement parts and materials as itemized\nTesting and verification after repair\nSite cleanup',
      exclusions:
        'Work not listed in this proposal\nRepairs required due to pre-existing damage\nEmergency or after-hours service (quoted separately)',
      timeline:
        'Scheduled visit: to be confirmed. Typical duration: 2–4 hours on-site. Parts with lead times will be communicated in advance.',
      pricingOptions: [],
    },
  },
  {
    id: 'custom',
    label: 'Custom (Blank)',
    icon: '✏️',
    description: 'Start from scratch with empty fields',
    details: {
      scopeOfWork: '',
      inclusions: '',
      exclusions: '',
      timeline: '',
      pricingOptions: [],
    },
  },
];