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

function createIframeDoc(estimate, rootId) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = rootId === 'print-root'
    ? 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
    : 'position:fixed;top:-9999px;left:-9999px;width:1200px;height:1600px;border:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  const docLabel = estimate?.document_type === 'BID' ? 'Bid' : 'Estimate';

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docLabel} #${estimate?.estimate_number || ''}</title>
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

      const docLabel = estimate?.document_type === 'BID' ? 'Bid' : 'Estimate';
      const filename = `${docLabel}-${estimate?.estimate_number || 'document'}.pdf`;
      pdf.save(filename);
    } finally {
      root.unmount();
      document.body.removeChild(iframe);
    }
  }, 600);
}