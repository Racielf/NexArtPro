import { nexartClient } from '@/api/nexartClient';
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

function assertFinalPdfEvidence({ finalPdfUrl, finalPdfName, pdfHash }) {
  if (!finalPdfUrl) throw new Error('NexArtSign finalization blocked: final signed PDF URL is missing.');
  if (!finalPdfName) throw new Error('NexArtSign finalization blocked: final signed PDF name is missing.');
  if (!/^[a-f0-9]{64}$/i.test(pdfHash || '')) {
    throw new Error('NexArtSign finalization blocked: final signed PDF SHA-256 hash is missing or invalid.');
  }
}

function buildSignatureCertificate({ estimate, pkg, certificate, signerName, signedAt, pdfHash, finalPdfUrl, finalPdfName }) {
  assertFinalPdfEvidence({ finalPdfUrl, finalPdfName, pdfHash });

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
    final_signed_pdf_url: finalPdfUrl,
    final_signed_pdf_name: finalPdfName,
    document_hash_algorithm: 'SHA-256',
    document_hash: pdfHash,
    signed_pdf_hash_algorithm: 'SHA-256',
    signed_pdf_hash: pdfHash,
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

function buildPdfAuditPageData({ estimate, pkg, certificate, signerName, signedAt, finalPdfHash }) {
  return {
    packageId: pkg?.id || '',
    certificateNumber: certificate?.certificate_number || '',
    documentType: estimate?.document_type || pkg?.document_type || 'estimate',
    documentTitle: estimate?.title || pkg?.document_title || '',
    documentNumber: estimate?.estimate_number || pkg?.document_number || '',
    signerName: signerName || estimate?.signature_name || estimate?.accepted_by || '',
    signerEmail: pkg?.signer_email || estimate?.client_email || '',
    signedAt: signedAt || certificate?.signed_at || '',
    ipAddress: certificate?.ip_address || '',
    userAgent: certificate?.user_agent || '',
    hashAlgorithm: certificate?.hash_algorithm || pkg?.hash_algorithm || 'SHA-256',
    documentHash: certificate?.document_hash || pkg?.source_pdf_hash || '',
    finalPdfHash: finalPdfHash || certificate?.final_pdf_hash || pkg?.final_pdf_hash || '',
    auditTrail: certificate?.audit_trail || [],
  };
}

async function getFirstRow(entityName, query) {
  const rows = await nexartClient.entities[entityName].filter(query).catch(() => []);
  return rows?.[0] || null;
}

function resolveEntityName(documentType) {
  return {
    estimate: 'Estimate',
    proposal: 'Proposal',
    invoice: 'Invoice',
    work_order: 'WorkOrder',
  }[documentType] || null;
}

function buildGenericSignatureCertificate({ document, pkg, certificate, signerName, signedAt }) {
  const finalPdfUrl = pkg?.final_pdf_url || '';
  const finalPdfName = pkg?.final_pdf_name || '';
  const finalPdfHash = certificate?.final_pdf_hash || pkg?.final_pdf_hash || '';
  assertFinalPdfEvidence({ finalPdfUrl, finalPdfName, pdfHash: finalPdfHash });

  return {
    certificate_type: 'electronic_signature_certificate',
    generated_at: certificate?.generated_at || new Date().toISOString(),
    provider: 'nexartsign',
    signing_package_id: pkg?.id || '',
    signing_certificate_id: certificate?.id || '',
    document_id: pkg?.document_id || document?.id || '',
    document_type: pkg?.document_type || '',
    signer_name: signerName || pkg?.signer_name || '',
    signer_email: pkg?.signer_email || '',
    signed_at: signedAt || pkg?.signed_at || '',
    terms_accepted: true,
    final_signed_pdf_url: finalPdfUrl,
    final_signed_pdf_name: finalPdfName,
    document_hash_algorithm: pkg?.hash_algorithm || 'SHA-256',
    document_hash: certificate?.document_hash || pkg?.source_pdf_hash || '',
    signed_pdf_hash_algorithm: pkg?.hash_algorithm || 'SHA-256',
    signed_pdf_hash: finalPdfHash,
    audit: {
      certificate_id: certificate?.id || '',
      certificate_number: certificate?.certificate_number || '',
      ip_address: certificate?.ip_address || '',
      user_agent: certificate?.user_agent || '',
      audit_trail: certificate?.audit_trail || [],
    },
    audit_payload: certificate?.certificate_json || null,
  };
}

async function sendFinalSignedCopyEmail(estimate, pkg) {
  if (!estimate?.client_email || !estimate?.final_signed_pdf_url || !pkg?.id) return;
  await nexartClient.functions.invoke('sendSignedEstimateCopy', { packageId: pkg.id });
}

async function finalizeGenericSignedDocumentFromPackage({ packageId, documentType, documentId, signerName }) {
  const entityName = resolveEntityName(documentType);
  const [pkg, certificate, document] = await Promise.all([
    getFirstRow('SigningPackage', { id: packageId }),
    getFirstRow('SigningCertificate', { signing_package_id: packageId }),
    entityName && documentId ? getFirstRow(entityName, { id: documentId }) : Promise.resolve(null),
  ]);

  if (!pkg) throw new Error('Signing package not found for finalization');

  const signedAt = pkg.signed_at || new Date().toISOString();
  const signer = (signerName || pkg.signer_name || '').trim();
  const signatureCertificate = buildGenericSignatureCertificate({
    document,
    pkg,
    certificate,
    signerName: signer,
    signedAt,
  });

  const finalPdfHash = certificate?.final_pdf_hash || pkg.final_pdf_hash || '';

  if (entityName && documentId && nexartClient.entities[entityName]) {
    await nexartClient.entities[entityName].update(documentId, {
      signing_package_id: packageId,
      signature_status: 'signed',
      signature_provider: 'internal',
      signed_at: signedAt,
      accepted_by: signer,
      signature_name: signer,
      terms_accepted: true,
      locked_after_signature: true,
      legal_package_locked: true,
      final_signed_at: signedAt,
      final_signed_pdf_url: pkg.final_pdf_url,
      final_signed_pdf_name: pkg.final_pdf_name,
      signed_pdf_hash: finalPdfHash,
      signed_pdf_hash_algorithm: pkg.hash_algorithm || 'SHA-256',
      signature_certificate: signatureCertificate,
      certificate_generated_at: signatureCertificate.generated_at,
    }).catch(() => {});
  }

  return {
    document: document ? { ...document, signature_status: 'signed', signed_at: signedAt } : null,
    certificate: signatureCertificate,
  };
}

async function finalizeGenericDeclinedDocumentFromPackage({ packageId, documentType, documentId }) {
  const entityName = resolveEntityName(documentType);
  const pkg = await getFirstRow('SigningPackage', { id: packageId });
  if (!pkg) throw new Error('Signing package not found for decline finalization');

  if (entityName && documentId && nexartClient.entities[entityName]) {
    await nexartClient.entities[entityName].update(documentId, {
      signing_package_id: packageId,
      signature_status: 'declined',
      declined_at: pkg.declined_at || new Date().toISOString(),
      declined_reason: pkg.declined_reason || '',
    }).catch(() => {});
  }

  return {
    document: entityName && documentId ? await getFirstRow(entityName, { id: documentId }) : null,
  };
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
    estimate?.document_config?.template,
    buildPdfAuditPageData({
      estimate,
      pkg,
      certificate,
      signerName: signer,
      signedAt,
    })
  );

  if (!pdf?.base64) throw new Error('NexArtSign finalization blocked: signed PDF generation returned no content.');

  const pdfHash = await sha256HexFromBase64(pdf.base64);
  const blob = base64ToPdfBlob(pdf.base64);
  const uploadRes = await nexartClient.integrations.Core.UploadFile({ file: blob });
  const finalSignedPdfUrl = uploadRes?.file_url || '';
  const finalSignedPdfName = pdf.filename || `Signed-Estimate-${estimate.estimate_number}.pdf`;

  assertFinalPdfEvidence({ finalPdfUrl: finalSignedPdfUrl, finalPdfName: finalSignedPdfName, pdfHash });

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

  await nexartClient.entities.SigningPackage.update(pkg.id, {
    final_pdf_url: finalSignedPdfUrl,
    final_pdf_name: finalSignedPdfName,
    final_pdf_hash: pdfHash,
    certificate_id: certificate?.id || pkg.certificate_id || '',
    audit_summary: {
      ...(signatureCertificate.audit || {}),
      final_pdf_hash: pdfHash,
      final_pdf_required: true,
      finalized_in_frontend_completion: true,
    },
  });

  if (certificate?.id) {
    await nexartClient.entities.SigningCertificate.update(certificate.id, {
      final_pdf_hash: pdfHash,
      certificate_pdf_url: finalSignedPdfUrl,
      certificate_json: {
        ...(certificate.certificate_json || {}),
        final_pdf_hash: pdfHash,
        final_pdf_url: finalSignedPdfUrl,
        final_pdf_required: true,
      },
    });
  } else {
    throw new Error('NexArtSign finalization blocked: signing certificate record is missing.');
  }

  await nexartClient.entities.Estimate.update(estimate.id, finalFields);

  const updatedEstimate = { ...estimate, ...finalFields };

  await sendFinalSignedCopyEmail(updatedEstimate, { ...pkg, final_pdf_url: finalSignedPdfUrl }).catch(err => {
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

export async function finalizeSignedDocumentFromPackage({ packageId, documentType, documentId, signerName }) {
  if (documentType === 'estimate') {
    return finalizeSignedEstimateFromPackage({
      packageId,
      estimateId: documentId,
      signerName,
    });
  }

  return finalizeGenericSignedDocumentFromPackage({
    packageId,
    documentType,
    documentId,
    signerName,
  });
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

  await nexartClient.entities.Estimate.update(estimate.id, finalFields);

  const updatedEstimate = { ...estimate, ...finalFields };

  await notifyEstimateDeclined(updatedEstimate).catch(err => {
    console.warn('[finalizeDeclinedEstimateFromPackage] business notification failed:', err?.message);
  });

  return updatedEstimate;
}

export async function finalizeDeclinedDocumentFromPackage({ packageId, documentType, documentId }) {
  if (documentType === 'estimate') {
    return finalizeDeclinedEstimateFromPackage({
      packageId,
      estimateId: documentId,
    });
  }

  return finalizeGenericDeclinedDocumentFromPackage({
    packageId,
    documentType,
    documentId,
  });
}
