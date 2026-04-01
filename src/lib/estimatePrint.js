import React from 'react';
import { createRoot } from 'react-dom/client';
import EstimateDocumentConfigured from '@/components/estimates/EstimateDocumentConfigured';

/**
 * Renders EstimateDocumentConfigured into a hidden iframe and triggers window.print().
 * Accepts optional visibility config to match the review screen settings.
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
    React.createElement(EstimateDocumentConfigured, { estimate, visibility: visibility || {} })
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