import { base44 } from '@/api/base44Client';
import { generateEstimatePdfBase64 } from '@/lib/estimatePrint';
import { convertApprovedEstimateToWorkOrder } from '@/lib/estimateToWorkOrder';
import { notifyEstimateDeclined, notifyEstimateSigned } from '@/lib/businessNotifications';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

function base64ToPdfBlob(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/pdf' });
}

async function sha256HexFromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildSignatureCertificate({ estimate, pkg, certificate, signerName, signedAt, pdfHash, finalPdfUrl, finalPdfName }) {
  return {
    certificate_type: 'electronic_signature_certificate',
    generated_at: certificate?.generated_at || new Date().toISOString(),
    provider: 'nexartsign',
    signing_package_id: pkg?.id || '',
    signing_certificate_id: certificate?.id || '',
    document_id: estimate.id,
    document_type: estimate.document_type || 'ESTIMATE',
    estimate_number: estimate.estimate_number,
    signer_name: signerName || estimate.signature_name || estimate.accepted_by || '',
    signer_email: pkg?.signer_email || estimate.client_email || '',
    signer_client_name: estimate.client_name || '',
    company_signature_name: estimate.company_signature_name || appConfig.company.name,
    company_signature_email: estimate.company_signature_email || appConfig.company.email,
    company_signed_at: estimate.company_signed_at || pkg?.sent_at || '',
    signed_at: signedAt || estimate.signed_at || '',
    signature_method: estimate.signature_method || 'typed_name',
    terms_accepted: true,
    document_total: estimate.total || 0,
    final_signed_pdf_url: finalPdfUrl || '',
    final_signed_pdf_name: finalPdfName || '',
    document_hash_algorithm: 'SHA-256',
    document_hash: pdfHash || '',
    signed_pdf_hash_algorithm: 'SHA-256',
    signed_pdf_hash: pdfHash || '',
    audit: {
      certificate_id: certificate?.id || '',
      certificate_number: certificate?.certificate_number || '',
      ip_address: certificate?.ip_address || '',
      user_agent: certificate?.user_agent || '',
      audit_trail: certificate?.audit_trail || [],
    },
    integrity_statement: 'This certificate records the SHA-256 hash of the frozen signed PDF generated at approval time. Any PDF modification after signing will produce a different hash.',
  };
}

async function getFirstRow(entityName, query) {
  const rows = await base44.entities[entityName].filter(query).catch(() => []);
  return rows?.[0] || null;
}

async function sendFinalSignedCopyEmail(estimate, pkg) {
  if (!estimate?.client_email || !estimate?.final_signed_pdf_url || !pkg?.token) return;
  await base44.functions.invoke('sendSignedEstimateCopy', { token: pkg.token });
}

export async function finalizeSignedEstimateFromPackage({ packageId, estimateId, signerName }) {
  const [estimate, pkg, certificate] = await Promise.all([
    getFirstRow('Estimate', { id: estimateId }),
    getFirstRow('SigningPackage', { id: packageId }),
    getFirstRow('SigningCertificate', { signing_package_id: packageId }),
  ]);

  if (!estimate) throw new Error('Estimate not found for signing finalization');
  if (!pkg) throw new Error('Signing package not found for signing finalization');

  const signedAt = pkg.signed_at || estimate.signed_at || new Date().toISOString();
  const signer = (signerName || pkg.signer_name || estimate.signature_name || estimate.accepted_by || estimate.client_name || '').trim();

  let finalFields = {
    status: estimate.status === 'converted' ? 'converted' : 'signed',
    signature_status: 'signed',
    signature_provider: 'internal',
    signing_package_id: packageId,
    accepted_by: signer,
    signature_name: signer,
    signed_at: signedAt,
    approved_at: estimate.approved_at || signedAt,
    terms_accepted: true,
    signature_method: estimate.signature_method || 'typed_name',
    locked_after_signature: true,
    legal_package_locked: true,
    final_signed_at: signedAt,
    company_signature_name: estimate.company_signature_name || appConfig.company.name,
    company_signature_email: estimate.company_signature_email || appConfig.company.email,
    company_signature_role: estimate.company_signature_role || 'authorized_representative',
    company_signed_at: estimate.company_signed_at || pkg.sent_at || estimate.sent_at || signedAt,
  };

  try {
    const pdf = await generateEstimatePdfBase64(
      {
        ...estimate,
        status: 'signed',
        signature_name: signer,
        accepted_by: signer,
        signed_at: signedAt,
        company_signature_name: finalFields.company_signature_name,
        company_signature_email: finalFields.company_signature_email,
        company_signature_role: finalFields.company_signature_role,
        company_signed_at: finalFields.company_signed_at,
        terms_accepted: true,
      },
      estimate?.document_config?.options,
      estimate?.document_config?.template
    );
    const pdfHash = await sha256HexFromBase64(pdf.base64);
    const blob = base64ToPdfBlob(pdf.base64);
    const uploadRes = await base44.integrations.Core.UploadFile({ file: blob });
    const finalSignedPdfUrl = uploadRes?.file_url || pkg.final_pdf_url || '';
    const finalSignedPdfName = pdf.filename || pkg.final_pdf_name || `Signed-Estimate-${estimate.estimate_number}.pdf`;
    const signatureCertificate = buildSignatureCertificate({
      estimate,
      pkg: { ...pkg, final_pdf_url: finalSignedPdfUrl, final_pdf_name: finalSignedPdfName },
      certificate,
      signerName: signer,
      signedAt,
      pdfHash,
      finalPdfUrl: finalSignedPdfUrl,
      finalPdfName: finalSignedPdfName,
    });

    finalFields = {
      ...finalFields,
      final_signed_pdf_url: finalSignedPdfUrl,
      final_signed_pdf_name: finalSignedPdfName,
      document_hash: pdfHash,
      document_hash_algorithm: 'SHA-256',
      signed_pdf_hash: pdfHash,
      signed_pdf_hash_algorithm: 'SHA-256',
      signature_certificate: signatureCertificate,
      certificate_generated_at: signatureCertificate.generated_at,
    };

    await base44.entities.SigningPackage.update(pkg.id, {
      final_pdf_url: finalSignedPdfUrl,
      final_pdf_name: finalSignedPdfName,
      final_pdf_hash: pdfHash,
      certificate_id: certificate?.id || pkg.certificate_id || '',
      audit_summary: signatureCertificate.audit,
    }).catch(() => {});
  } catch (err) {
    console.warn('[finalizeSignedEstimateFromPackage] final PDF freeze failed:', err?.message);
  }

  await base44.entities.Estimate.update(estimate.id, finalFields);

  const updatedEstimate = { ...estimate, ...finalFields };

  await sendFinalSignedCopyEmail(updatedEstimate, pkg).catch(err => {
    console.warn('[finalizeSignedEstimateFromPackage] signed copy email failed:', err?.message);
  });

  await notifyEstimateSigned(updatedEstimate, {
    signerName: signer,
    signerEmail: pkg.signer_email || estimate.client_email || '',
  }).catch(err => {
    console.warn('[finalizeSignedEstimateFromPackage] business notification failed:', err?.message);
  });

  if (!updatedEstimate.converted_work_order_id) {
    try {
      const conversion = await convertApprovedEstimateToWorkOrder(updatedEstimate, { actor: 'nexartsign' });
      return {
        estimate: {
          ...updatedEstimate,
          status: conversion?.workOrder?.id ? 'converted' : updatedEstimate.status,
          sales_stage: conversion?.workOrder?.id ? 'converted' : updatedEstimate.sales_stage,
          converted_work_order_id: conversion?.workOrder?.id || updatedEstimate.converted_work_order_id,
        },
        workOrder: conversion?.workOrder || null,
      };
    } catch (err) {
      console.warn('[finalizeSignedEstimateFromPackage] work order conversion failed:', err?.message);
    }
  }

  return { estimate: updatedEstimate, workOrder: null };
}

export async function finalizeDeclinedEstimateFromPackage({ packageId, estimateId }) {
  const [estimate, pkg] = await Promise.all([
    getFirstRow('Estimate', { id: estimateId }),
    getFirstRow('SigningPackage', { id: packageId }),
  ]);

  if (!estimate) throw new Error('Estimate not found for decline finalization');

  const declinedAt = pkg?.declined_at || new Date().toISOString();
  const finalFields = {
    status: 'declined',
    signature_status: 'declined',
    signing_package_id: packageId,
    declined_at: declinedAt,
    declined_reason: pkg?.declined_reason || estimate.declined_reason || '',
  };

  await base44.entities.Estimate.update(estimate.id, finalFields);

  const updatedEstimate = { ...estimate, ...finalFields };

  await notifyEstimateDeclined(updatedEstimate).catch(err => {
    console.warn('[finalizeDeclinedEstimateFromPackage] business notification failed:', err?.message);
  });

  return updatedEstimate;
}