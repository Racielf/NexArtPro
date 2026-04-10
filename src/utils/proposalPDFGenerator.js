import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateProposalPDF(proposal, elementRef) {
  if (!elementRef) return;

  try {
    const canvas = await html2canvas(elementRef, {
      scale: 2,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      windowHeight: 1600,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Proposal_${proposal.proposal_number || 'Draft'}.pdf`);
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}