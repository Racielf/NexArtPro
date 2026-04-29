import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import NexArtSignSettingsCard from '@/components/signing/NexArtSignSettingsCard';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Eye, FileSignature, FileText, PenSquare, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createSigningPackageForEstimate } from '@/lib/nexArtSign';
import { generatePublicShareToken } from '@/lib/estimateSalesLifecycle';

function statusClass(status) {
  switch (status) {
    case 'signed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'declined': return 'bg-red-50 text-red-700 border-red-200';
    case 'viewed': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'sent': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'expired': return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'voided': return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 font-semibold uppercase">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

export default function NexArtSign() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [events, setEvents] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingEstimateId, setCreatingEstimateId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [pkgRows, eventRows, certRows, estimateRows] = await Promise.all([
        base44.entities.SigningPackage.list('-created_date').catch(() => []),
        base44.entities.SigningEvent.list('-created_at').catch(() => []),
        base44.entities.SigningCertificate.list('-generated_at').catch(() => []),
        base44.entities.Estimate.list('-created_date').catch(() => []),
      ]);

      const estimatePackages = (pkgRows || []).filter(pkg => pkg.document_type === 'estimate');
      const liveEstimates = (estimateRows || []).filter(est => est?.deleted_at == null);

      setPackages(estimatePackages);
      setEvents(eventRows || []);
      setCertificates(certRows || []);
      setEstimates(liveEstimates);
      setSelectedId(current => current || estimatePackages?.[0]?.id || null);
    } catch (err) {
      console.error('[NexArtSign] load failed:', err);
      toast.error('Could not load NexArtSign data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selected = useMemo(() => packages.find(pkg => pkg.id === selectedId) || packages[0] || null, [packages, selectedId]);
  const selectedEvents = useMemo(() => events.filter(event => event.signing_package_id === selected?.id), [events, selected]);
  const selectedCert = useMemo(() => certificates.find(cert => cert.signing_package_id === selected?.id), [certificates, selected]);

  const counts = useMemo(() => packages.reduce((acc, pkg) => {
    const key = pkg.status || 'draft';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [packages]);

  const packageByEstimateId = useMemo(() => {
    const map = new Map();
    packages.forEach(pkg => {
      if (pkg.document_id && !map.has(pkg.document_id)) map.set(pkg.document_id, pkg);
    });
    return map;
  }, [packages]);

  const estimatesReadyForSigning = useMemo(() => {
    return estimates
      .filter(est => ['sent', 'viewed', 'approved', 'signed', 'converted', 'declined'].includes(est.status))
      .map(est => ({ estimate: est, signingPackage: packageByEstimateId.get(est.id) || null }))
      .sort((a, b) => new Date(b.estimate?.sent_at || b.estimate?.updated_date || b.estimate?.created_date || 0) - new Date(a.estimate?.sent_at || a.estimate?.updated_date || a.estimate?.created_date || 0));
  }, [estimates, packageByEstimateId]);

  const coverage = useMemo(() => {
    const total = estimatesReadyForSigning.length;
    const linked = estimatesReadyForSigning.filter(row => row.signingPackage).length;
    return { total, linked, missing: total - linked };
  }, [estimatesReadyForSigning]);

  const issueSigningUrl = async (pkg) => {
    if (!pkg?.id) throw new Error('No signing package selected');

    if (pkg.status && ['signed', 'declined', 'expired', 'voided'].includes(pkg.status)) {
      throw new Error('This signing package is already closed');
    }

    const response = await base44.functions.invoke('issueSigningAccessLink', {
      signing_package_id: pkg.id,
    });

    const url = response?.data?.signing_url || '';
    if (!url) {
      throw new Error(response?.data?.error || 'Could not issue a signing link');
    }

    return url;
  };

  const copyLink = async (pkg) => {
    try {
      const url = await issueSigningUrl(pkg);
      await navigator.clipboard.writeText(url);
      toast.success('Signing link copied');
    } catch (err) {
      toast.error(err?.message || 'No signing link available');
    }
  };

  const openSigningPage = async (pkg) => {
    try {
      const url = await issueSigningUrl(pkg);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err?.message || 'Could not open signing link');
    }
  };

  const openEstimateEditor = (estimateId) => {
    if (estimateId) navigate(`/estimate-editor?id=${estimateId}`);
  };

  const openEstimateClientView = async (estimate) => {
    if (!estimate?.id) return;
    try {
      const token = estimate.public_share_token || await generatePublicShareToken(estimate);
      window.open(`/client-estimate?token=${token}`, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Client view is not ready yet');
    }
  };

  const connectEstimateToNexArtSign = async (estimate) => {
    if (!estimate?.id) return;
    setCreatingEstimateId(estimate.id);
    try {
      const currentUser = await base44.auth.me().catch(() => null);
      const pkg = await createSigningPackageForEstimate({
        estimate,
        pdfUrl: estimate.pdf_file_url || '',
        pdfName: estimate.pdf_file_name || '',
        pdfHash: estimate.document_hash || '',
        currentUser,
      });

      await base44.entities.Estimate.update(estimate.id, {
        signing_package_id: pkg.id,
        signature_status: ['signed', 'declined', 'expired', 'voided'].includes(pkg.status) ? pkg.status : 'sent',
        signature_provider: 'internal',
      }).catch(() => {});

      toast.success('Estimate connected to NexArtSign');
      await load();
      setSelectedId(pkg.id);
    } catch (err) {
      console.warn('[NexArtSign] connect estimate failed:', err?.message);
      toast.error(err?.message || 'Could not connect this estimate to NexArtSign');
    } finally {
      setCreatingEstimateId('');
    }
  };

  const openDocument = (pkg) => {
    const url = pkg?.final_pdf_url || pkg?.source_pdf_url;
    if (!url) return toast.error('No PDF available');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex-shrink-0 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">NEXARTSIGN</p>
          <h1 className="text-xl font-bold text-slate-900">NexArtSign</h1>
          <p className="text-sm text-slate-400 mt-0.5">Signing packages, branding, certificates, and secure signing links</p>
        </div>
        <Button onClick={load} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        <NexArtSignSettingsCard />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StatCard label="Estimate Packages" value={packages.length} />
          <StatCard label="Waiting" value={(counts.sent || 0) + (counts.viewed || 0) + (counts.draft || 0)} />
          <StatCard label="Signed" value={counts.signed || 0} />
          <StatCard label="Missing Package" value={coverage.missing} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Estimate signature coverage</h3>
              <p className="text-sm text-slate-500 mt-1">This panel shows which sent estimates are connected to a NexArtSign signing package.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{coverage.linked}/{coverage.total || 0}</p>
              <p className="text-xs text-slate-400 uppercase font-semibold">Connected</p>
            </div>
          </div>

          {estimatesReadyForSigning.length === 0 ? (
            <p className="text-sm text-slate-500">No estimates are in a signable stage yet.</p>
          ) : (
            <div className="space-y-3">
              {estimatesReadyForSigning.slice(0, 10).map(({ estimate, signingPackage }) => (
                <div key={estimate.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900">{estimate.title || `Estimate #${estimate.estimate_number}`}</p>
                        <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(signingPackage?.status || estimate.signature_status || 'draft')}`}>
                          {signingPackage ? signingPackage.status : 'not linked'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{estimate.client_name || 'No client'} • #{estimate.estimate_number} • ${Number(estimate.total || 0).toLocaleString()}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Estimate status: {estimate.status || 'draft'}{signingPackage ? ' • NexArtSign package ready' : ' • Pending NexArtSign package'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEstimateEditor(estimate.id)}><PenSquare className="w-3.5 h-3.5" />Open Estimate</Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEstimateClientView(estimate)}><FileText className="w-3.5 h-3.5" />Client View</Button>
                      {signingPackage ? (
                        <Button size="sm" className="gap-1.5" onClick={() => setSelectedId(signingPackage.id)}><FileSignature className="w-3.5 h-3.5" />Open Package</Button>
                      ) : (
                        <Button size="sm" className="gap-1.5" disabled={creatingEstimateId === estimate.id} onClick={() => connectEstimateToNexArtSign(estimate)}><Plus className="w-3.5 h-3.5" />{creatingEstimateId === estimate.id ? 'Connecting...' : 'Connect to NexArtSign'}</Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4">
          <div className="2xl:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2"><FileSignature className="w-4 h-4 text-slate-500" /><h3 className="font-bold text-slate-900">Estimate Packages</h3></div>
              {loading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
            {packages.length === 0 ? <div className="py-12 text-center text-slate-500 text-sm">No signing packages yet.</div> : (
              <div className="divide-y divide-slate-100 max-h-[620px] overflow-auto">
                {packages.map(pkg => (
                  <button key={pkg.id} onClick={() => setSelectedId(pkg.id)} className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition ${selected?.id === pkg.id ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">{pkg.document_title || pkg.document_number || pkg.document_id}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">{pkg.signer_name || pkg.client_name || 'Signer'} • {pkg.signer_email}</p>
                      </div>
                      <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(pkg.status)}`}>{pkg.status || 'draft'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="2xl:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900">{selected?.document_title || 'Select a package'}</h3>
                {selected && <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(selected.status)}`}>{selected.status || 'draft'}</span>}
              </div>
              {selected ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                  <div className="border border-slate-100 rounded-lg p-3"><p className="text-xs text-slate-400 uppercase font-semibold">Signer</p><p className="font-medium mt-1 truncate">{selected.signer_name || selected.client_name || 'Signer'}</p></div>
                  <div className="border border-slate-100 rounded-lg p-3"><p className="text-xs text-slate-400 uppercase font-semibold">Document</p><p className="font-medium mt-1">#{selected.document_number || selected.document_id}</p></div>
                  <div className="border border-slate-100 rounded-lg p-3"><p className="text-xs text-slate-400 uppercase font-semibold">Certificate</p><p className="font-medium mt-1">{selectedCert ? 'Ready' : 'Pending'}</p></div>
                  <div className="border border-slate-100 rounded-lg p-3"><p className="text-xs text-slate-400 uppercase font-semibold">Events</p><p className="font-medium mt-1">{selectedEvents.length}</p></div>
                </div>
              ) : <p className="text-sm text-slate-500 mt-3">Select a package to view details.</p>}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-4">Timeline</h3>
              {!selected ? <p className="text-sm text-slate-500">Select a package to view timeline.</p> : selectedEvents.length === 0 ? <p className="text-sm text-slate-500">No events recorded yet.</p> : (
                <div className="space-y-3">{selectedEvents.map((event, index) => <div key={event.id || index} className="border-b border-slate-100 pb-3"><p className="font-semibold text-sm text-slate-800 capitalize">{event.event_type}</p><p className="text-xs text-slate-500 mt-1">{event.created_at ? new Date(event.created_at).toLocaleString() : '—'} {event.actor_email ? `• ${event.actor_email}` : ''}</p></div>)}</div>
              )}
            </div>
          </div>

          <div className="2xl:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3">Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => copyLink(selected)} disabled={!selected}><Copy className="w-4 h-4" />Copy signing link</Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => openSigningPage(selected)} disabled={!selected}><ExternalLink className="w-4 h-4" />Open signing page</Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => selected && openDocument(selected)} disabled={!selected}><ExternalLink className="w-4 h-4" />Open document</Button>
                <Button variant="outline" className="w-full justify-start gap-2" disabled={!selected}><Eye className="w-4 h-4" />Preview package</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
