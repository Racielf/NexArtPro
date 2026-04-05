import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import EstimateTemplateRenderer from '@/components/estimates/EstimateTemplateRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';

/**
 * Renders EstimateTemplateRenderer into a hidden iframe and triggers window.print().
 * Uses document_config from estimate for template + options.
 */
export function printEstimate(estimate, visibility) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Estimate #${estimate?.estimate_number || ''}</title>
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
  <div id="print-root"></div>
</body>
</html>`);
  iframeDoc.close();

  const container = iframeDoc.getElementById('print-root');
  const root = createRoot(container);

  root.render(
    React.createElement(EstimateTemplateRenderer, {
      estimate,
      template: estimate?.document_config?.template || 'professional',
      options: { ...DEFAULT_OPTIONS, ...estimate?.document_config?.options },
    })
  );

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
 * Generates and downloads a PDF file of the estimate.
 * Uses document_config from estimate for template + options.
 */
export async function downloadEstimate(estimate, visibility) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1200px;height:1600px;border:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Estimate #${estimate?.estimate_number || ''}</title>
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
  <div id="pdf-root"></div>
</body>
</html>`);
  iframeDoc.close();

  const container = iframeDoc.getElementById('pdf-root');
  const root = createRoot(container);

  root.render(
    React.createElement(EstimateTemplateRenderer, {
      estimate,
      template: estimate?.document_config?.template || 'professional',
      options: { ...DEFAULT_OPTIONS, ...estimate?.document_config?.options },
    })
  );

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

      const filename = `Estimate-${estimate?.estimate_number || 'document'}.pdf`;
      pdf.save(filename);
    } finally {
      root.unmount();
      document.body.removeChild(iframe);
    }
  }, 600);
}