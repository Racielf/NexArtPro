import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle, FileSignature } from 'lucide-react';
import { toast } from 'sonner';

export default function SignDocumentView() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return setLoading(false);
      try {
        const res = await base44.functions.invoke('resolveSigningPackageToken', { token });
        if (res.data?.package) {
          setPkg(res.data.package);
          setName(res.data.package.signer_name || '');
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
      await base44.functions.invoke('completeSigningPackage', {
        token,
        action: 'approve',
        signer_name: name.trim(),
      });
      toast.success('Document approved');
      setPkg(p => ({ ...p, status: 'signed', signer_name: name.trim() }));
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

        {pkg.status === 'signed' ? (
          <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Approved</div>
        ) : pkg.status === 'declined' ? (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"><XCircle className="w-4 h-4" /> Declined</div>
        ) : (
          <>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full border border-slate-300 p-2 rounded-lg text-sm"
            />

            <label className="flex gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
              <span>I have reviewed and approve this document.</span>
            </label>

            <div className="flex gap-2">
              <Button onClick={handleApprove} disabled={acting || !name.trim() || !accepted} className="flex-1">Approve</Button>
              <Button variant="outline" onClick={handleDecline} disabled={acting} className="flex-1">Decline</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
