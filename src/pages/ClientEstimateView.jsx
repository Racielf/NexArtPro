// PATCHED SECTION ONLY SHOWN

const captureServerAudit = async () => {
  try {
    const res = await base44.functions.invoke('captureEstimateSignatureAudit', {
      token,
      estimate_id: estimate.id,
    });

    return res.data?.audit || {};
  } catch (err) {
    console.warn('[captureServerAudit] failed:', err?.message);
    return {};
  }
};

const handleApprove = async () => {
  const cleanSignature = signatureName.trim();

  if (!cleanSignature) {
    toast.error('Please type your full name to approve');
    return;
  }

  if (!termsAccepted) {
    toast.error('Please accept the estimate terms before approving');
    return;
  }

  setActing(true);
  try {
    const clientAudit = collectLegalAudit();
    const serverAudit = await captureServerAudit();

    const legalAudit = {
      ...clientAudit,
      ...serverAudit,
      audit_version: 'phase6_with_ip',
    };

    const updates = await approveEstimate(estimate.id, {
      approvedBy: cleanSignature,
      signatureName: cleanSignature,
      termsAccepted,
      legalAudit,
      estimate,
    });

    let signedEstimate = { ...estimate, ...updates };
    setEstimate(signedEstimate);

    const finalPdfFields = await freezeSignedPdf(signedEstimate, legalAudit);
    if (finalPdfFields) {
      signedEstimate = { ...signedEstimate, ...finalPdfFields };
      setEstimate(signedEstimate);
      sendFinalSignedCopyEmail(signedEstimate).catch(err => console.warn('[sendFinalSignedCopyEmail] failed:', err?.message));
    }

    try {
      const conversion = await convertApprovedEstimateToWorkOrder(signedEstimate, {
        actor: 'client_approval',
      });
      signedEstimate = {
        ...signedEstimate,
        status: 'converted',
        sales_stage: 'converted',
        converted_work_order_id: conversion?.workOrder?.id,
      };
      setEstimate(signedEstimate);
    } catch (conversionErr) {
      console.warn('[convertApprovedEstimateToWorkOrder] failed:', conversionErr?.message);
      toast.warning('Estimate was signed, but the work order could not be created automatically');
    }

    notifyEstimateApproved(signedEstimate).catch(err => console.warn('[notify] approved failed:', err?.message));
    toast.success('Estimate approved, signed, locked, and converted to a work order.');
  } catch (err) {
    console.warn('[handleApprove] failed:', err?.message);
    toast.error('Could not approve. Please try again.');
  } finally {
    setActing(false);
  }
};
