import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle, FileSignature, ExternalLink, ShieldCheck, FileCheck, Clock3, LockKeyhole, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import SignatureBrandCredit from '@/components/signing/SignatureBrandCredit';

export default function SignDocumentView() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [certificateId, setCertificateId] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!token) return setLoading(false);
      try {
        const res = await base44.functions.invoke('resolveSigningPackageToken', { token });
        if (res.data?.package) {
          setPkg(res.data.package);
          setName(res.data.package.signer_name || '');
          setCertificateId(res.data.package.certificate_id || '');
        }
      } catch (err) {
        console.warn('[SignDocumentView] resolve failed:', err?.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const isComplete = pkg?.status === 'signed' || pkg?.status === 'declined' || pkg?.status === 'expired' || pkg?.status === 'voided';

  const handleApprove = async () => {
    if (!name.trim() || !accepted || !identityConfirmed) {
      toast.error('Complete all required signing confirmations');
      return;
    }

    setActing(true);
    try {
      const res = await base44.functions.invoke('completeSigningPackage', {
        token,
        action: 'approve',
        signer_name: name.trim(),
      });

      const result = res?.data || {};
      const nextStatus = result.status || 'signed';
      if (result.certificate_id) setCertificateId(result.certificate_id);
      if (result.certificate_number) setCertificateNumber(result.certificate_number);

      if (nextStatus === 'pending_next_signer') {
        toast.success('Your signature was saved. The next signer has been activated.');
      } else {
        toast.success('Document signed successfully');
      }

      setPkg(p => ({
        ...p,
        status: nextStatus === 'pending_next_signer' ? 'viewed' : 'signed',
        signer_name: name.trim(),
        final_pdf_url: result.final_pdf_url || p?.final_pdf_url || p?.source_pdf_url || '',
        final_pdf_name: result.final_pdf_name || p?.final_pdf_name || p?.source_pdf_name || '',
      }));
    } catch (err) {
      console.warn('[SignDocumentView] approve failed:', err?.message);
      toast.error('Error approving document');
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason before declining');
      return;
    }

    setActing(true);
    try {
      await base44.functions.invoke('completeSigningPackage', {
        token,
        action: 'decline',
        declined_reason: declineReason.trim(),
      });

      toast.success('Document declined');
      setPkg(p => ({ ...p, status: 'declined', declined_reason: declineReason.trim() }));
    } catch (err) {
      console.warn('[SignDocumentView] decline failed:', err?.message);
      toast.error('Error declining document');
    } finally {
      setActing(false);
    }
  };

  const openSignedPdf = () => {
    const url = pkg?.final_pdf_url || pkg?.source_pdf_url;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openCertificateVerification = () => {
    const ref = certificateId || certificateNumber;
    if (!ref) return;
    window.open(`/verify-document?certificate=${encodeURIComponent(ref)}`, '_blank', 'noopener,noreferrer');
  };

  const openReviewPdf = () => {
    const url = pkg?.source_pdf_url || pkg?.final_pdf_url;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-3">
        <Loader2 className="animate-spin mx-auto" />
        <p className="text-sm text-slate-300">Preparing secure signing session...</p>
      </div>
    </div>
  );

  if (!pkg) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center bg-white border border-slate-200 rounded-xl p-8 shadow-sm max-w-md">
        <AlertTriangle className="mx-auto mb-2 text-amber-500" />
        <p className="font-semibold text-slate-800">Invalid or expired link</p>
        <p className="text-sm text-slate-500 mt-2">Please contact the sender and request a new signing link.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <FileSignature className="w-5 h-5" />
                <h1 className="text-xl font-semibold">NexArtSign Secure Review</h1>
              </div>
              <p className="text-sm text-slate-500 mt-1">{pkg.document_title || 'Document ready for signature'}</p>
            </div>
            <div className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 capitalize">
              {pkg.status || 'sent'}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Signer</p>
                <p className="font-medium text-slate-800 mt-1">{pkg.signer_name || name || 'Required signer'}</p>
                <p className="text-slate-500 text-xs mt-1">{pkg.signer_email}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Document</p>
                <p className="font-medium text-slate-800 mt-1 capitalize">{pkg.document_type || 'document'}</p>
                <p className="text-slate-500 text-xs mt-1">ID: {pkg.document_id || 'Not available'}</p>
              </div>
            </div>

            {pkg.expires_at && (
              <div className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2">
                <Clock3 className="w-4 h-4" /> This signing link expires on {new Date(pkg.expires_at).toLocaleString()}.
              </div>
            )}

            <div className="bg-slate-950 text-white rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <LockKeyhole className="w-5 h-5" />
                <h2 className="font-semibold">Legal signing checkpoint</h2>
              </div>
              <p className="text-sm text-slate-300">
                Review the document first. When you sign, NexArtSign records the event, locks the approved version, and creates a verification certificate for the audit trail.
              </p>
              <Button variant="secondary" onClick={openReviewPdf} className="w-full sm:w-auto gap-2" disabled={!pkg?.source_pdf_url && !pkg?.final_pdf_url}>
                <ExternalLink className="w-4 h-4" /> Open Document Preview
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          {pkg.status === 'signed' ? (
            <div className="space-y-3">
              <div className="text-green-700 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Signed successfully
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
                The signed file and verification certificate are now part of the NexArtSign record for this document.
              </div>
              <Button variant="outline" onClick={openSignedPdf} className="w-full gap-2" disabled={!pkg?.final_pdf_url && !pkg?.source_pdf_url}>
                <ExternalLink className="w-4 h-4" /> Open Signed PDF
              </Button>
              <Button variant="outline" onClick={openCertificateVerification} className="w-full gap-2" disabled={!certificateId && !certificateNumber}>
                <ShieldCheck className="w-4 h-4" /> Verify Certificate
              </Button>
            </div>
          ) : pkg.status === 'declined' ? (
            <div className="space-y-3">
              <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2"><XCircle className="w-5 h-5" /> Declined</div>
              {(pkg.declined_reason || declineReason) && (
                <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  Reason provided: {pkg.declined_reason || declineReason}
                </div>
              )}
            </div>
          ) : pkg.status === 'expired' || pkg.status === 'voided' ? (
            <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> This signing package is {pkg.status}.
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Sign & approve</h2>
                <p className="text-sm text-slate-500 mt-1">Complete the required confirmations to legally approve this document.</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2">
                <FileCheck className="w-4 h-4 mt-0.5" />
                <span>Your signature will lock this document, generate a NexArtSign certificate, and preserve the signed record for verification.</span>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Legal full name</span>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  disabled={isComplete}
                />
              </label>

              <label className="flex gap-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <input type="checkbox" checked={identityConfirmed} onChange={e => setIdentityConfirmed(e.target.checked)} disabled={isComplete} />
                <span className="flex items-start gap-2"><UserCheck className="w-4 h-4 mt-0.5" /> I confirm I am the intended signer for this document.</span>
              </label>

              <label className="flex gap-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} disabled={isComplete} />
                <span>I have opened, reviewed, and approve this document electronically.</span>
              </label>

              <Button onClick={handleApprove} disabled={acting || !name.trim() || !accepted || !identityConfirmed} className="w-full h-11">
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign & Approve Document'}
              </Button>

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Decline reason</span>
                  <textarea
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    placeholder="Required if you are declining"
                    className="w-full border border-slate-300 p-3 rounded-xl text-sm min-h-[88px] focus:outline-none focus:ring-2 focus:ring-slate-900"
                    disabled={isComplete}
                  />
                </label>
                <Button variant="outline" onClick={handleDecline} disabled={acting || !declineReason.trim()} className="w-full">
                  Decline Document
                </Button>
              </div>
            </>
          )}

          <SignatureBrandCredit logoUrl={pkg.signature_brand_logo_url} variant="signing" />
        </section>
      </div>
    </div>
  );
}
