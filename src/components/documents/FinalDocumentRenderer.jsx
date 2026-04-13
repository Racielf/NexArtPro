import React from 'react';
import EstimateTemplateRenderer from '@/components/estimates/EstimateTemplateRenderer';
import BidDocumentRenderer from '@/components/documents/BidDocumentRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';

/**
 * FinalDocumentRenderer — Punto de entrada único para renderizado final de documentos.
 *
 * Fase 3: Unifica el pipeline de print/PDF y preview.
 * Internamente delega al renderer correcto según document_type,
 * aplicando las opciones de visibilidad y template recibidos.
 *
 * Props:
 * - estimate: Object — Registro completo del estimate
 * - options: Object — Overrides de visibilidad (de Review & Send)
 * - template: string — Clave de template (de Review & Send)
 * - lang: string — Idioma del documento
 *
 * Arquitectura:
 *   BID → BidDocumentRenderer (layout técnico estructurado)
 *   ESTIMATE/PROPOSAL/default → EstimateTemplateRenderer (template-based con VM)
 */
export default function FinalDocumentRenderer({ estimate, options = {}, template, lang }) {
  if (!estimate) return null;

  const mergedOpts = {
    ...DEFAULT_OPTIONS,
    ...estimate?.document_config?.options,
    ...options,
    hideInternalNotes: true,
  };

  const resolvedLang = lang || estimate?.document_language || 'en';

  if (estimate.document_type === 'BID') {
    return (
      <BidDocumentRenderer
        estimate={estimate}
        options={mergedOpts}
        lang={resolvedLang}
      />
    );
  }

  const resolvedTemplate = template || estimate?.document_config?.template || 'clean';

  return (
    <EstimateTemplateRenderer
      estimate={estimate}
      template={resolvedTemplate}
      options={mergedOpts}
      documentType="estimate"
    />
  );
}