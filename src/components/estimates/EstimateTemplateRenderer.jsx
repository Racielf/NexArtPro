import React from 'react';
import useCompanyConfig from '@/hooks/useCompanyConfig';
import { buildEstimateDocumentViewModel } from '@/lib/buildEstimateDocumentViewModel';
import CleanTemplate from './templates/CleanTemplate';
import PremiumTemplate from './templates/PremiumTemplate';
import ModernCardTemplate from './templates/ModernCardTemplate';
import FieldClassicTemplate from './templates/FieldClassicTemplate';

/**
 * EstimateTemplateRenderer — Thin dispatcher.
 *
 * Architecture:
 *   1. buildEstimateDocumentViewModel() prepares all render data
 *   2. Template components consume the view model exclusively
 *   3. This component selects the correct template and passes the vm
 *
 * Template family (v2):
 *   clean        — Modern professional contractor estimate
 *   premium      — Presentation-level formal proposal
 *   modern_card  — Contemporary SaaS-style card layout
 *   field_classic — Contractor field-style compact header layout
 *
 * Legacy backward-compat mapping:
 *   standard, minimal, professional, detailed → clean
 *   executive → premium
 *   modern, compact, pro → modern_card
 */

// Map legacy template keys → new template keys
const TEMPLATE_MAP = {
  // New templates
  clean: 'clean',
  premium: 'premium',
  modern_card: 'modern_card',
  field_classic: 'field_classic',
  // Legacy → new
  standard: 'clean',
  minimal: 'clean',
  professional: 'clean',
  detailed: 'clean',
  executive: 'premium',
  modern: 'modern_card',
  compact: 'modern_card',
  pro: 'modern_card',
};

function resolveTemplate(key) {
  return TEMPLATE_MAP[key] || 'clean';
}

export default function EstimateTemplateRenderer({ estimate, template = 'clean', options = {}, documentType = 'estimate' }) {
  const cc = useCompanyConfig();
  if (!estimate) return null;

  const vm = buildEstimateDocumentViewModel({
    estimate,
    companyConfig: cc,
    documentType,
    template,
    options,
  });
  if (!vm) return null;

  const resolved = resolveTemplate(vm.meta.template || template);

  switch (resolved) {
    case 'premium':
      return <PremiumTemplate vm={vm} />;
    case 'modern_card':
      return <ModernCardTemplate vm={vm} />;
    case 'field_classic':
      return <FieldClassicTemplate vm={vm} />;
    case 'clean':
    default:
      return <CleanTemplate vm={vm} />;
  }
}