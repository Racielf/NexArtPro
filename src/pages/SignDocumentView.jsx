import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle, FileSignature, ExternalLink, ShieldCheck, FileCheck, Clock3 } from 'lucide-react';
import { toast } from 'sonner';

export default function SignDocumentView() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
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

  const handleApprove = async () => {
    if (!name.trim() || !accepted) {
      toast.error('Complete required fields');
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
    setActing(true);
    try {
      await base44.functions.invoke('completeSigningPackage', {
        token,
        action: 'decline',
        declined_reason: declineReason.trim(),
      });

      toast.success('Document declined');
      setPkg(p => ({ ...p, status: 'declined' }));
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

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!pkg) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <AlertTriangle className="mx-auto mb-2 text-amber-500" />
        <p className="font-semibold text-slate-800">Invalid or expired link</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4 border border-slate-200">
        <div className="flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold">NexArtSign</h2>
        </div>
        <p className="text-sm text-slate-500">{pkg.document_title || 'Document'}</p>
        <p className="text-xs text-slate-400">Signer: {pkg.signer_email}</p>
        {pkg.expires_at && (
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2">
            <Clock3 className="w-4 h-4" /> This signing link expires on {new Date(pkg.expires_at).toLocaleString()}.
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Button variant="outline" onClick={openReviewPdf} className="w-full gap-2" disabled={!pkg?.source_pdf_url && !pkg?.final_pdf_url}>
            <ExternalLink className="w-4 h-4" /> Open Document Preview
          </Button>
        </div>

        {pkg.status === 'signed' ? (
          <div className="space-y-3">
            <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Signed successfully
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
              The signed file and verification certificate are now part of the NexArtSign record for this document.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={openSignedPdf} className="flex-1 gap-2" disabled={!pkg?.final_pdf_url && !pkg?.source_pdf_url}>
                <ExternalLink className="w-4 h-4" /> Open PDF
              </Button>
            </div>
            <Button variant="outline" onClick={openCertificateVerification} className="w-full gap-2" disabled={!certificateId && !certificateNumber}>
              <ShieldCheck className="w-4 h-4" /> Verify Certificate
            </Button>
          </div>
        ) : pkg.status === 'declined' ? (
          <div className="space-y-3">
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"><XCircle className="w-4 h-4" /> Declined</div>
            {declineReason && (
              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                Reason provided: {declineReason}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
              Review completed. Signing here is the official approval step for this document.
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
              <FileCheck className="w-4 h-4 mt-0.5" />
              <span>Your signature will lock the document, generate the NexArtSign certificate, and preserve the signed record for verification.</span>
            </div>

            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full border border-slate-300 p-2 rounded-lg text-sm"
            />

            <label className="flex gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
              <span>I have reviewed and approve this document electronically.</span>
            </label>

            <div className="flex gap-2">
              <Button onClick={handleApprove} disabled={acting || !name.trim() || !accepted} className="flex-1">Sign & Approve</Button>
              <Button variant="outline" onClick={handleDecline} disabled={acting} className="flex-1">Decline</Button>
            </div>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Optional reason if you are declining"
              className="w-full border border-slate-300 p-2 rounded-lg text-sm min-h-[88px]"
            />
          </>
        )}
      </div>
    </div>
  );
}
