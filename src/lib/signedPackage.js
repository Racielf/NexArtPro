import JSZip from 'jszip';
import { generateSignedPdfUrl, generateSignedAttachmentUrls } from './estimateDocumentAccess';

async function fetchAsBlob(url) {
  const res = await fetch(url);
  return await res.blob();
}

export async function downloadSignedPackage({ estimate }) {
  if (!estimate?.final_signed_pdf_url) {
    throw new Error('No final signed PDF available');
  }

  const zip = new JSZip();

  const pdfUrl = await generateSignedPdfUrl(estimate.final_signed_pdf_url);
  const pdfBlob = await fetchAsBlob(pdfUrl);
  zip.file(estimate.final_signed_pdf_name || 'signed-estimate.pdf', pdfBlob);

  const attachments = await generateSignedAttachmentUrls(estimate.attachments || []);
  for (const att of attachments) {
    try {
      const blob = await fetchAsBlob(att.signed_url);
      zip.file(`attachments/${att.file_name}`, blob);
    } catch (e) {
      console.warn('Attachment failed:', att.file_name);
    }
  }

  const audit = {
    estimate_id: estimate.id,
    estimate_number: estimate.estimate_number,
    client_name: estimate.client_name,
    client_email: estimate.client_email,
    signed_at: estimate.signed_at,
    signature_name: estimate.signature_name,
    signature_method: estimate.signature_method,
    terms_accepted: estimate.terms_accepted,
    legal_audit: estimate.legal_audit || {},
  };

  zip.file('audit.json', JSON.stringify(audit, null, 2));

  const content = await zip.generateAsync({ type: 'blob' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `signed-package-${estimate.estimate_number}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
