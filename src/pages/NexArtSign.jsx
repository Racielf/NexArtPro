import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import {
  FileSignature,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Copy,
  ExternalLink,
  ShieldCheck,
  Ban,
  Download,
  Users,
  Plus,
  ArrowRight,
  FileText,
  PenSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { createSigningPackageForEstimate } from '@/lib/nexArtSign';
import { generatePublicShareToken } from '@/lib/estimateSalesLifecycle';

function statusClass(status) {
  switch (status) {
    case 'signed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'declined': return 'bg-red-50 text-red-700 border-red-200';
    case 'active': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'viewed': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'sent': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'expired': return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'voided': return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function eventIcon(type) {
  if (type === 'signed' || type === 'approved') return <CheckCircle className="w-4 h-4 text-emerald-600" />;
  if (type === 'declined') return <XCircle className="w-4 h-4 text-red-500" />;
  if (type === 'viewed') return <Eye className="w-4 h-4 text-blue-500" />;
  return <Clock className="w-4 h-4 text-slate-400" />;
}

function fmt(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function signingUrl(pkg) {
  if (!pkg?.token) return '';
  return `${window.location.origin}/sign-document?token=${pkg.token}`;
}

function sortParticipants(rows = []) {
  return [...rows].sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1));
}

function getNextSigner(participants = []) {
  return sortParticipants(participants).find(p => ['active', 'pending'].includes(p.status));
}

function ProgressStepper({ participants }) {
  if (!participants.length) {
    return <p className="text-sm text-slate-500">No multi-signer workflow has been created yet.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {participants.map((p, index) => (
        <React.Fragment key={p.id}>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${statusClass(p.status)}`}>
            {p.status === 'signed' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            <span className="text-xs font-bold capitalize">{p.role}</span>
          </div>
          {index < participants.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300" />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function NexArtSign() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [events, setEvents] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingEstimateId, setCreatingEstimateId] = useState('');

  const load = async () => {
    setLoading(true);
    const [pkgRows, eventRows, certRows, participantRows, estimateRows] = await Promise.all([
      base44.entities.SigningPackage.list('-created_date').catch(() => []),
      base44.entities.SigningEvent.list('-created_at').catch(() => []),
      base44.entities.SigningCertificate.list('-generated_at').catch(() => []),
      base44.entities.SigningParticipant.list('signing_order').catch(() => []),
      base44.entities.Estimate.list('-created_date').catch(() => []),
    ]);
    const estimatePackages = (pkgRows || []).filter(p => p.document_type === 'estimate');
    const liveEstimates = (estimateRows || []).filter(e => e?.deleted_at == null);

    setPackages(estimatePackages);
    setEvents(eventRows || []);
    setCertificates(certRows || []);
    setParticipants(participantRows || []);
    setEstimates(liveEstimates);
    if (!selectedId && estimatePackages?.[0]?.id) setSelectedId(estimatePackages[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selected = useMemo(() => packages.find(p => p.id === selectedId) || packages[0] || null, [packages, selectedId]);
  const selectedEvents = useMemo(() => events.filter(e => e.signing_package_id === selected?.id).sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)), [events, selected]);
  const selectedCert = useMemo(() => certificates.find(c => c.signing_package_id === selected?.id), [certificates, selected]);
  const selectedParticipants = useMemo(() => sortParticipants(participants.filter(p => p.signing_package_id === selected?.id)), [participants, selected]);
  const nextSigner = useMemo(() => getNextSigner(selectedParticipants), [selectedParticipants]);

  const counts = useMemo(() => packages.reduce((acc, p) => {
    const key = p.status || 'draft';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [packages]);

  const packageByEstimateId = useMemo(() => {
    const map = new Map();
    packages.forEach(pkg => {
      if (pkg.document_id && !map.has(pkg.document_id)) {
        map.set(pkg.document_id, pkg);
      }
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
    const sentOrBeyond = estimates.filter(est => ['sent', 'viewed', 'approved', 'signed', 'converted', 'declined'].includes(est.status));
    const linked = sentOrBeyond.filter(est => packageByEstimateId.has(est.id));
    return {
      totalEstimates: sentOrBeyond.length,
      linkedEstimates: linked.length,
      missingPackages: sentOrBeyond.length - linked.length,
    };
  }, [estimates, packageByEstimateId]);

  const copyLink = async (pkg) => {
    const url = signingUrl(pkg);
    if (!url) return toast.error('No signing link available');
    await navigator.clipboard.writeText(url);
    toast.success('Signing link copied');
  };

  const openDocument = (pkg) => {
    const url = pkg.final_pdf_url || pkg.source_pdf_url;
    if (!url) return toast.error('No PDF available');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openEstimateEditor = (estimateId) => {
    if (!estimateId) return;
    navigate(`/estimate-editor?id=${estimateId}`);
  };

  const openEstimateClientView = async (estimate) => {
    if (!estimate?.id) return;
    try {
      const token = estimate.public_share_token || await generatePublicShareToken(estimate);
      window.open(`/client-estimate?token=${token}`, '_blank', 'noopener,noreferrer');
    } catch (err) {
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
      toast.error('Could not connect this estimate to NexArtSign');
    } finally {
      setCreatingEstimateId('');
    }
  };

  const downloadCertificate = () => {
    if (!selectedCert) return toast.error('No certificate available yet');
    const blob = new Blob([JSON.stringify(selectedCert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCert.certificate_number || 'nexartsign-certificate'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const voidPackage = async (pkg) => {
    if (!pkg || ['signed', 'declined', 'expired', 'voided'].includes(pkg.status)) {
      toast.error('Closed packages cannot be voided here');
      return;
    }
    await base44.entities.SigningPackage.update(pkg.id, { status: 'voided' });
    await base44.entities.SigningEvent.create({
      signing_package_id: pkg.id,
      document_type: pkg.document_type,
      document_id: pkg.document_id,
      event_type: 'voided',
      created_at: new Date().toISOString(),
      metadata: { action_source: 'nexartsign_admin_console' },
    }).catch(() => {});
    toast.success('Package voided');
    await load();
  };

  const createBasicWorkflow = async () => {
    if (!selected) return;
    if (selectedParticipants.length > 0) return toast.error('This package already has participants');
    if (['signed', 'declined', 'expired', 'voided'].includes(selected.status)) return toast.error('Closed packages cannot be changed');

    let user = null;
    try { user = await base44.auth.me().catch(() => null); } catch {}
    const now = new Date().toISOString();

    await base44.entities.SigningParticipant.create({
      signing_package_id: selected.id,
      document_type: selected.document_type,
      document_id: selected.document_id,
      role: 'client',
      name: selected.signer_name || selected.client_name || 'Client',
      email: selected.signer_email || '',
      signing_order: 1,
      status: 'active',
      token: selected.token || '',
      sent_at: selected.sent_at || now,
      company_id: selected.company_id || 'rc-art',
    });

    if (user?.email) {
      await base44.entities.SigningParticipant.create({
        signing_package_id: selected.id,
        document_type: selected.document_type,
        document_id: selected.document_id,
        role: 'owner',
        name: user.full_name || user.email,
        email: user.email,
        signing_order: 2,
        status: 'pending',
        sent_at: selected.sent_at || now,
        company_id: selected.company_id || 'rc-art',
      });
    }

    await base44.entities.SigningPackage.update(selected.id, {
      signing_workflow: 'sequential',
      participant_count: user?.email ? 2 : 1,
    }).catch(() => {});

    await base44.entities.SigningEvent.create({
      signing_package_id: selected.id,
      document_type: selected.document_type,
      document_id: selected.document_id,
      event_type: 'participants_created',
      actor_name: user?.full_name || user?.email || 'admin',
      actor_email: user?.email || '',
      created_at: now,
      metadata: { workflow: 'sequential', participants: user?.email ? 2 : 1 },
    }).catch(() => {});

    toast.success('Multi-signer workflow created');
    await load();
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader eyebrow="NEXARTSIGN" title="NexArtSign" subtitle="Signing packages, participants, timeline, certificates, and future provider settings" actionLabel="Refresh" onAction={load} />
      <PageShell>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500 font-semibold uppercase">Estimate Packages</p><p className="text-2xl font-bold mt-2">{packages.length}</p></div>
          <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500 font-semibold uppercase">Waiting</p><p className="text-2xl font-bold mt-2">{(counts.sent || 0) + (counts.viewed || 0) + (counts.draft || 0)}</p></div>
          <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500 font-semibold uppercase">Signed</p><p className="text-2xl font-bold mt-2">{counts.signed || 0}</p></div>
          <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500 font-semibold uppercase">Missing Package</p><p className="text-2xl font-bold mt-2">{coverage.missingPackages}</p></div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Estimate signature coverage</h3>
              <p className="text-sm text-slate-500 mt-1">NexArtSign is currently managing Estimates inside the system. This panel shows which sent estimates are already connected to a signing package.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{coverage.linkedEstimates}/{coverage.totalEstimates || 0}</p>
              <p className="text-xs text-slate-400 uppercase font-semibold">Connected</p>
            </div>
          </div>

          {estimatesReadyForSigning.length === 0 ? (
            <p className="text-sm text-slate-500">No estimates are in a signable stage yet.</p>
          ) : (
            <div className="space-y-3">
              {estimatesReadyForSigning.slice(0, 8).map(({ estimate, signingPackage }) => (
                <div key={estimate.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900">{estimate.title || `Estimate #${estimate.estimate_number}`}</p>
                        <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(signingPackage?.status || (estimate.signature_status || 'draft'))}`}>
                          {signingPackage ? signingPackage.status : 'not linked'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{estimate.client_name || 'No client'} • #{estimate.estimate_number} • ${Number(estimate.total || 0).toLocaleString()}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Estimate status: {estimate.status || 'draft'}
                        {signingPackage ? ` • NexArtSign token ready` : ' • Pending NexArtSign package'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEstimateEditor(estimate.id)}>
                        <PenSquare className="w-3.5 h-3.5" />Open Estimate
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEstimateClientView(estimate)}>
                        <FileText className="w-3.5 h-3.5" />Client View
                      </Button>
                      {signingPackage ? (
                        <Button size="sm" className="gap-1.5" onClick={() => setSelectedId(signingPackage.id)}>
                          <FileSignature className="w-3.5 h-3.5" />Open in NexArtSign
                        </Button>
                      ) : (
                        <Button size="sm" className="gap-1.5" disabled={creatingEstimateId === estimate.id} onClick={() => connectEstimateToNexArtSign(estimate)}>
                          <Plus className="w-3.5 h-3.5" />{creatingEstimateId === estimate.id ? 'Connecting...' : 'Connect to NexArtSign'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4">
          <div className="2xl:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2"><FileSignature className="w-4 h-4 text-slate-500" /><h3 className="font-bold text-slate-900">Estimate Packages</h3></div>
              {loading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
            {packages.length === 0 ? <div className="py-12 text-center text-slate-500 text-sm">No signing packages yet.</div> : (
              <div className="divide-y divide-slate-100 max-h-[680px] overflow-auto">
                {packages.map(pkg => {
                  const pkgParticipants = sortParticipants(participants.filter(p => p.signing_package_id === pkg.id));
                  const pkgNext = getNextSigner(pkgParticipants);
                  return (
                    <button key={pkg.id} onClick={() => setSelectedId(pkg.id)} className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition ${selected?.id === pkg.id ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900 truncate">{pkg.document_title || pkg.document_number || pkg.document_id}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate">{pkg.signer_name || pkg.client_name || 'Signer'} • {pkg.signer_email}</p>
                          <p className="text-[11px] text-slate-400 mt-1 truncate">Next: {pkgNext ? `${pkgNext.role} (${pkgNext.status})` : '—'}</p>
                        </div>
                        <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(pkg.status)}`}>{pkg.status || 'draft'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="2xl:col-span-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900">{selected?.document_title || 'Select a package'}</h3>
                    {selected && <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(selected.status)}`}>{selected.status || 'draft'}</span>}
                  </div>
                  {selected && <p className="text-sm text-slate-500 mt-1">{selected.document_type} #{selected.document_number || selected.document_id}</p>}
                </div>
              </div>
              {selected && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
                  <div className="border border-slate-100 rounded-lg p-3"><p className="text-xs text-slate-400 uppercase font-semibold">Primary signer</p><p className="font-medium mt-1 truncate">{selected.signer_name || selected.client_name || 'Signer'}</p></div>
                  <div className="border border-slate-100 rounded-lg p-3"><p className="text-xs text-slate-400 uppercase font-semibold">Next signer</p><p className="font-medium mt-1 truncate">{nextSigner ? `${nextSigner.name || nextSigner.email} (${nextSigner.role})` : '—'}</p></div>
                  <div className="border border-slate-100 rounded-lg p-3"><p className="text-xs text-slate-400 uppercase font-semibold">Expires</p><p className="font-medium mt-1">{fmt(selected.expires_at)}</p></div>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-500" /><h3 className="font-bold text-slate-900">Signing progress</h3></div>
                {selected && selectedParticipants.length === 0 && <Button size="sm" variant="outline" onClick={createBasicWorkflow} className="gap-1.5"><Plus className="w-3.5 h-3.5" />Create Client → Owner Flow</Button>}
              </div>
              <ProgressStepper participants={selectedParticipants} />
              {selectedParticipants.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedParticipants.map((p, idx) => (
                    <div key={p.id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-3 ${p.status === 'active' ? 'border-blue-200 bg-blue-50/60' : 'border-slate-100 bg-white'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{idx + 1}</div>
                        <div className="min-w-0"><p className="font-semibold text-sm text-slate-800 truncate">{p.name || p.email}</p><p className="text-xs text-slate-500 truncate capitalize">{p.role} • {p.email}</p>{p.signed_at && <p className="text-[11px] text-slate-400 mt-0.5">Signed {fmt(p.signed_at)}</p>}</div>
                      </div>
                      <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(p.status)}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4"><ShieldCheck className="w-4 h-4 text-slate-500" /><h3 className="font-bold text-slate-900">Timeline</h3></div>
              {!selected ? <p className="text-sm text-slate-500">Select a package to view timeline.</p> : selectedEvents.length === 0 ? <p className="text-sm text-slate-500">No events recorded yet.</p> : (
                <div className="space-y-3">{selectedEvents.map((ev, idx) => <div key={ev.id || idx} className="flex gap-3"><div className="pt-0.5">{eventIcon(ev.event_type)}</div><div className="flex-1 border-b border-slate-100 pb-3"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-sm text-slate-800 capitalize">{ev.event_type}</p><span className="text-xs text-slate-400">{fmt(ev.created_at)}</span></div><p className="text-xs text-slate-500 mt-1">{ev.actor_email || ev.actor_name || 'Public signer'} {ev.ip_address ? `• IP ${ev.ip_address}` : ''}</p></div></div>)}</div>
              )}
            </div>
          </div>

          <div className="2xl:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3">Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => selected && copyLink(selected)} disabled={!selected}><Copy className="w-4 h-4" />Copy signing link</Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => selected && window.open(signingUrl(selected), '_blank')} disabled={!selected}><ExternalLink className="w-4 h-4" />Open signing page</Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => selected && openDocument(selected)} disabled={!selected}><Eye className="w-4 h-4" />Open document</Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={downloadCertificate} disabled={!selectedCert}><Download className="w-4 h-4" />Download certificate</Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => selected && voidPackage(selected)} disabled={!selected}><Ban className="w-4 h-4" />Void package</Button>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
