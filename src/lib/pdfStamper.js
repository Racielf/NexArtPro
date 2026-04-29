import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function stampPdfWithFields({ pdfUrl, fields }) {
  const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  fields.forEach(field => {
    const pageIndex = (field.page || 1) - 1;
    const page = pages[pageIndex];
    if (!page) return;

    const { width, height } = page.getSize();

    const x = field.x;
    const y = height - field.y - field.height;

    if (field.type === 'checkbox') {
      if (field.value === true) {
        page.drawText('✔', {
          x,
          y,
          size: 14,
          font,
          color: rgb(0, 0.5, 0),
        });
      }
    } else {
      page.drawText(String(field.value || ''), {
        x,
        y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
    }
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function sha256(blob) {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
