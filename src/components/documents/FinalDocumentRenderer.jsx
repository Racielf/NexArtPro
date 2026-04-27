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

function shortHash(hash) {
  if (!hash || hash.length < 16) return hash || '';
  return `${hash.slice(0, 12)}...${hash.slice(-12)}`;
}

function SignedApprovalStamp({ estimate }) {
  const signer = estimate?.signature_name || estimate?.accepted_by;
  const signedAt = estimate?.signed_at || estimate?.approved_at;
  const audit = estimate?.legal_audit || {};
  const hash = estimate?.final_signed_pdf_sha256 || '';
  const isLocked = estimate?.legal_package_locked || estimate?.locked_after_signature;

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
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 14,
          right: 16,
          border: '2px solid #15803d',
          color: '#166534',
          background: '#ffffff',
          borderRadius: 999,
          padding: '7px 12px',
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          transform: 'rotate(-3deg)',
          boxShadow: '0 4px 10px rgba(22, 101, 52, 0.12)',
        }}>
          Verified Signed Document
        </div>

        <div style={{
          fontSize: 11,
          fontWeight: 800,
          color: '#166534',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 12,
          paddingRight: 190,
        }}>
          Digitally Signed Approval
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Signed by</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#14532d' }}>{signer}</div>
            {estimate?.signature_image && (
              <div style={{ marginTop: 10, background: 'white', border: '1px solid #dcfce7', borderRadius: 8, padding: 10 }}>
                <img
                  src={estimate.signature_image}
                  alt="Client signature"
                  style={{ height: 62, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
            )}
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
              Signature method: {estimate?.signature_method === 'drawn_signature' ? 'Drawn signature' : 'Typed name'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Signed on</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{formatSignedDate(signedAt)}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
              Terms accepted: {estimate?.terms_accepted ? 'Yes' : 'Recorded'}
            </div>
            {isLocked && (
              <div style={{
                display: 'inline-block',
                marginTop: 10,
                padding: '4px 8px',
                borderRadius: 999,
                background: '#dcfce7',
                color: '#166534',
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Legal package locked
              </div>
            )}
            {audit.timezone && <div style={{ fontSize: 10, color: '#64748b', marginTop: 10 }}>Timezone: {audit.timezone}</div>}
            {audit.language && <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>Language: {audit.language}</div>}
            {audit.screen && <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>Screen: {audit.screen}</div>}
          </div>
        </div>

        {hash && (
          <div style={{
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#ffffff',
            border: '1px solid #dcfce7',
          }}>
            <div style={{ fontSize: 10, color: '#166534', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              Verification Fingerprint
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#334155', wordBreak: 'break-all' }}>
              SHA-256: {shortHash(hash)}
            </div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 5 }}>
              Verify this document at /verify-document using the full SHA-256 hash from the legal package.
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.6, margin: '14px 0 0' }}>
          By approving and signing, the client confirmed review of the estimate, included documents, pricing, scope, and terms.
        </p>
        {audit.user_agent && (
          <p style={{ fontSize: 9, color: '#64748b', lineHeight: 1.45, margin: '10px 0 0', wordBreak: 'break-word' }}>
            Audit device: {audit.user_agent}
          </p>
        )}
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
