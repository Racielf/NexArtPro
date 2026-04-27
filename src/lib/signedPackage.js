import JSZip from 'jszip';
import { generateSignedPdfUrl, generateSignedAttachmentUrls } from './estimateDocumentAccess';

async function fetchAsBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return await res.blob();
}

export async function sha256Blob(blob) {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function downloadSignedPackage({ estimate }) {
  if (!estimate?.final_signed_pdf_url) {
    throw new Error('No final signed PDF available');
  }

  const zip = new JSZip();

  const pdfUrl = await generateSignedPdfUrl(estimate.final_signed_pdf_url);
  const pdfBlob = await fetchAsBlob(pdfUrl);
  const computedPdfHash = await sha256Blob(pdfBlob);

  zip.file(estimate.final_signed_pdf_name || 'signed-estimate.pdf', pdfBlob);

  const attachmentManifest = [];
  const attachments = await generateSignedAttachmentUrls(estimate.attachments || []);
  for (const att of attachments) {
    try {
      const blob = await fetchAsBlob(att.signed_url);
      const hash = await sha256Blob(blob);
      const filename = att.file_name || 'attachment';
      zip.file(`attachments/${filename}`, blob);
      attachmentManifest.push({
        id: att.id || '',
        file_name: filename,
        sha256: hash,
        size: blob.size,
      });
    } catch (e) {
      console.warn('Attachment failed:', att.file_name);
      attachmentManifest.push({
        id: att.id || '',
        file_name: att.file_name || 'attachment',
        error: 'Could not include attachment in signed package',
      });
    }
  }

  const storedHash = estimate.final_signed_pdf_sha256 || '';
  const audit = {
    package_type: 'signed_estimate_package',
    generated_at: new Date().toISOString(),
    estimate_id: estimate.id,
    estimate_number: estimate.estimate_number,
    client_name: estimate.client_name,
    client_email: estimate.client_email,
    signed_at: estimate.signed_at,
    signature_name: estimate.signature_name,
    signature_method: estimate.signature_method,
    terms_accepted: estimate.terms_accepted,
    final_signed_pdf: {
      file_name: estimate.final_signed_pdf_name || 'signed-estimate.pdf',
      stored_sha256: storedHash,
      computed_sha256: computedPdfHash,
      verification_status: storedHash ? (storedHash === computedPdfHash ? 'verified' : 'mismatch') : 'not_previously_stored',
    },
    attachments: attachmentManifest,
    legal_audit: estimate.legal_audit || {},
  };

  zip.file('audit.json', JSON.stringify(audit, null, 2));
  zip.file('VERIFY.txt', [
    'Signed Package Verification',
    '',
    `Estimate: ${estimate.estimate_number || ''}`,
    `Final PDF SHA-256: ${computedPdfHash}`,
    storedHash ? `Stored SHA-256: ${storedHash}` : 'Stored SHA-256: not previously stored',
    storedHash ? `Status: ${storedHash === computedPdfHash ? 'VERIFIED' : 'MISMATCH'}` : 'Status: NOT PREVIOUSLY STORED',
    '',
    'To verify later, calculate the SHA-256 hash of the signed PDF and compare it with audit.json.',
  ].join('\n'));

  const content = await zip.generateAsync({ type: 'blob' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `signed-package-${estimate.estimate_number}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
