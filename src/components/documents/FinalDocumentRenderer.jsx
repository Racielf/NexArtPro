import React from 'react';
import EstimateTemplateRenderer from '@/components/estimates/EstimateTemplateRenderer';
import BidDocumentRenderer from '@/components/documents/BidDocumentRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';

function formatSignedDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function SignedApprovalStamp({ estimate }) {
  const signer = estimate?.signature_name || estimate?.accepted_by;
  const signedAt = estimate?.signed_at || estimate?.approved_at;

  if (!signer || estimate?.status !== 'approved') return null;

  return (
    <div style={{
      fontFamily: "'Inter', Arial, sans-serif",
      background: '#ffffff',
      color: '#0f172a',
      minWidth: 640,
      padding: '0 44px 34px',
    }}>
      <div style={{
        border: '1px solid #bbf7d0',
        background: '#f0fdf4',
        borderRadius: 10,
        padding: '18px 20px',
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          color: '#166534',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 12,
        }}>
          Digitally Signed Approval
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Signed by</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#14532d' }}>{signer}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Typed name signature</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Signed on</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{formatSignedDate(signedAt)}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
              Terms accepted: {estimate?.terms_accepted ? 'Yes' : 'Recorded'}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.6, margin: '14px 0 0' }}>
          By approving and signing, the client confirmed review of the estimate, included documents, pricing, scope, and terms.
        </p>
      </div>
    </div>
  );
}

/**
 * FinalDocumentRenderer — single final rendering entry point for print/PDF/client final documents.
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
  const docType = estimate.document_type;

  if (docType === 'BID') {
    return (
      <>
        <BidDocumentRenderer
          estimate={estimate}
          options={mergedOpts}
          lang={resolvedLang}
        />
        <SignedApprovalStamp estimate={estimate} />
      </>
    );
  }

  const resolvedTemplate = template || estimate?.document_config?.template || 'clean';
  const documentType = docType === 'PROPOSAL' ? 'proposal' : 'estimate';

  return (
    <>
      <EstimateTemplateRenderer
        estimate={estimate}
        template={resolvedTemplate}
        options={mergedOpts}
        documentType={documentType}
      />
      <SignedApprovalStamp estimate={estimate} />
    </>
  );
}
