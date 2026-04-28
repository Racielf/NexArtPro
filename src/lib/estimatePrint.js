import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import FinalDocumentRenderer from '@/components/documents/FinalDocumentRenderer';

/**
 * Creates the React element for print/PDF rendering via FinalDocumentRenderer.
 * All document type routing happens inside FinalDocumentRenderer.
 *
 * @param {Object} estimate — The estimate record
 * @param {Object} [overrideOptions] — Visibility options (from Review & Send toggles)
 * @param {string} [overrideTemplate] — Template key (from Review & Send selector)
 */
function resolveRendererElement(estimate, overrideOptions, overrideTemplate) {
  return React.createElement(FinalDocumentRenderer, {
    estimate,
    options: overrideOptions || {},
    template: overrideTemplate,
    lang: estimate?.document_language || 'en',
  });
}

export function resolveDocLabel(estimate) {
    const type = estimate?.document_type;
    if (type === 'BID') return 'Bid';
    if (type === 'PROPOSAL') return 'Proposal';
    return 'Estimate';
  }

 export function resolveDocNumber(estimate) {
   return estimate?.estimate_number || estimate?.proposal_number || 'document';
 }

function createIframeDoc(estimate, rootId) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = rootId === 'print-root'
    ? 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
    : 'position:fixed;top:-9999px;left:-9999px;width:1200px;height:1600px;border:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  const docLabel = resolveDocLabel(estimate);

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docLabel} #${resolveDocNumber(estimate)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0; size: letter; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div id="${rootId}"></div>
</body>
</html>`);
  iframeDoc.close();

  return { iframe, container: iframeDoc.getElementById(rootId) };
}

function buildAuditEventRows(auditTrail = []) {
  return (Array.isArray(auditTrail) ? auditTrail : [])
    .slice()
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    .map((event) => ({
      action: String(event.event_type || event.action || 'event').replace(/_/g, ' '),
      actor: event.actor_name || event.actor_email || 'system',
      stamp: event.created_at || '',
      ip: event.ip_address || '',
    }));
}

function appendAuditPage(pdf, auditData = {}) {
  if (!auditData || Object.keys(auditData).length === 0) return;

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);
  let y = 18;

  const drawLabelValue = (label, value, options = {}) => {
    const safeValue = value || '—';
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(options.labelSize || 9);
    pdf.setTextColor(71, 85, 105);
    pdf.text(label, margin, y);
    y += 4.5;

    pdf.setFont(options.mono ? 'courier' : 'helvetica', 'normal');
    pdf.setFontSize(options.valueSize || 10);
    pdf.setTextColor(15, 23, 42);

    const lines = pdf.splitTextToSize(String(safeValue), contentWidth);
    pdf.text(lines, margin, y);
    y += (lines.length * (options.lineHeight || 4.8)) + (options.after || 3.5);
  };

  const ensureSpace = (needed = 16) => {
    if (y + needed <= pageHeight - margin) return;
    pdf.addPage();
    y = 18;
  };

  pdf.addPage();
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(margin, 12, contentWidth, pageHeight - 24, 3, 3, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  pdf.text('NexArtSign Audit Certificate', margin, y);
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  const subtitle = pdf.splitTextToSize(
    'This page records the integrity and signature timeline for the finalized document. Any modification to the signed PDF changes its hash and invalidates this record.',
    contentWidth
  );
  pdf.text(subtitle, margin, y);
  y += (subtitle.length * 4.6) + 6;

  drawLabelValue('Package ID', auditData.packageId, { mono: true });
  drawLabelValue('Document', `${auditData.documentTitle || auditData.documentType || 'Document'}${auditData.documentNumber ? ` • ${auditData.documentNumber}` : ''}`);
  drawLabelValue('Certificate Number', auditData.certificateNumber, { mono: true });
  drawLabelValue('Signed At', auditData.signedAt);
  drawLabelValue('Signer', `${auditData.signerName || '—'}${auditData.signerEmail ? ` <${auditData.signerEmail}>` : ''}`);
  drawLabelValue('IP Address', auditData.ipAddress, { mono: true });
  drawLabelValue('User Agent', auditData.userAgent);
  drawLabelValue('Hash Algorithm', auditData.hashAlgorithm, { mono: true });
  drawLabelValue('Original Document Hash', auditData.documentHash, { mono: true, valueSize: 9 });
  drawLabelValue('Final Signed PDF Hash', auditData.finalPdfHash, { mono: true, valueSize: 9 });

  ensureSpace(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Audit Timeline', margin, y);
  y += 6;

  const rows = buildAuditEventRows(auditData.auditTrail);
  if (!rows.length) {
    drawLabelValue('Events', 'No audit events were recorded for this package.');
  } else {
    rows.forEach((row, index) => {
      ensureSpace(18);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y - 3.5, contentWidth, 15, 2, 2, 'S');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${index + 1}. ${row.action}`, margin + 3, y + 1);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Actor: ${row.actor}`, margin + 3, y + 5.5);
      pdf.text(`Timestamp: ${row.stamp || '—'}`, margin + 3, y + 9.5);
      if (row.ip) {
        pdf.text(`IP: ${row.ip}`, margin + 82, y + 9.5);
      }
      y += 18;
    });
  }

  ensureSpace(12);
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  const verification = pdf.splitTextToSize(
    `Verification Reference: ${auditData.packageId || '—'} | Certificate: ${auditData.certificateNumber || '—'} | Final Hash: ${auditData.finalPdfHash || '—'}`,
    contentWidth
  );
  pdf.text(verification, margin, y);
}

/**
 * Renders document into a hidden iframe and triggers window.print().
 * @param {Object} estimate
 * @param {Object} [options] — Visibility overrides from Review & Send
 * @param {string} [template] — Template override from Review & Send
 */
export function printEstimate(estimate, options, template) {
  const { iframe, container } = createIframeDoc(estimate, 'print-root');
  const root = createRoot(container);

  root.render(resolveRendererElement(estimate, options, template));

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      root.unmount();
      document.body.removeChild(iframe);
    }, 2000);
  }, 600);
}

/**
 * Generates and downloads a PDF file of the document.
 * @param {Object} estimate
 * @param {Object} [options] — Visibility overrides from Review & Send
 * @param {string} [template] — Template override from Review & Send
 */
export async function downloadEstimate(estimate, options, template) {
  const { iframe, container } = createIframeDoc(estimate, 'pdf-root');
  const root = createRoot(container);

  root.render(resolveRendererElement(estimate, options, template));

  setTimeout(async () => {
    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `${resolveDocLabel(estimate)}-${resolveDocNumber(estimate)}.pdf`;
      pdf.save(filename);
    } finally {
      root.unmount();
      document.body.removeChild(iframe);
    }
  }, 600);
}

/**
 * Generates a PDF file as base64 for email attachment.
 * @param {Object} estimate
 * @param {Object} [options] — Visibility overrides
 * @param {string} [template] — Template override
 * @returns {Promise<{filename: string, base64: string}>}
 */
export async function generateEstimatePdfBase64(estimate, options, template, auditData = null) {
  return new Promise((resolve, reject) => {
    const { iframe, container } = createIframeDoc(estimate, 'pdf-email-root');
    const root = createRoot(container);

    root.render(resolveRendererElement(estimate, options, template));

    setTimeout(async () => {
      try {
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        appendAuditPage(pdf, auditData);

        const filename = `${resolveDocLabel(estimate)}-${resolveDocNumber(estimate)}.pdf`;
        const base64 = pdf.output('dataurlstring').split(',')[1];

        resolve({ filename, base64 });
      } catch (error) {
        reject(error);
      } finally {
        root.unmount();
        document.body.removeChild(iframe);
      }
    }, 600);
  });
}