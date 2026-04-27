import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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

          await base44.entities.SigningEvent.create({
            signing_package_id: res.data.package.id,
            event_type: 'viewed',
            user_agent: navigator.userAgent,
            page_url: window.location.href,
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn(err);
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
      await base44.entities.SigningPackage.update(pkg.id, {
        status: 'signed',
        signed_at: new Date().toISOString(),
        signer_name: name
      });

      await base44.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        event_type: 'signed',
        actor_name: name,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        created_at: new Date().toISOString()
      });

      toast.success('Document approved');
      setPkg(p => ({ ...p, status: 'signed' }));
    } catch (err) {
      toast.error('Error approving document');
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    setActing(true);
    try {
      await base44.entities.SigningPackage.update(pkg.id, {
        status: 'declined',
        declined_at: new Date().toISOString()
      });

      await base44.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        event_type: 'declined',
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        created_at: new Date().toISOString()
      });

      toast.success('Document declined');
      setPkg(p => ({ ...p, status: 'declined' }));
    } catch (err) {
      toast.error('Error declining document');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!pkg) return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-2" />
        <p>Invalid or expired link</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Review & Approve Document</h2>
        <p className="text-sm text-slate-500">{pkg.document_title || 'Document'}</p>

        {pkg.status === 'signed' ? (
          <div className="text-green-600 flex items-center gap-2"><CheckCircle /> Approved</div>
        ) : pkg.status === 'declined' ? (
          <div className="text-red-600 flex items-center gap-2"><XCircle /> Declined</div>
        ) : (
          <>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full border p-2 rounded"
            />

            <label className="flex gap-2 text-sm">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
              I approve this document
            </label>

            <Button onClick={handleApprove} disabled={acting}>Approve</Button>
            <Button variant="outline" onClick={handleDecline} disabled={acting}>Decline</Button>
          </>
        )}
      </div>
    </div>
  );
}
