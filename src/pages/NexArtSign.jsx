import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import NexArtSignSettingsCard from '@/components/signing/NexArtSignSettingsCard';
import { Button } from '@/components/ui/button';
import { loadCompanySettings } from '@/lib/companySettings';
import {
  Ban,
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  FileSignature,
  FileText,
  Link2,
  Mail,
  PenSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TimerOff,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { createSigningPackageForEstimate } from '@/lib/nexArtSign';
import { generatePublicShareToken } from '@/lib/estimateSalesLifecycle';

const CLOSED_STATUSES = new Set(['signed', 'declined', 'expired', 'voided']);
const PACKAGE_PAGE_SIZE = 20;

function statusClass(status) {
  switch (status) {
    case 'signed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'declined': return 'bg-red-50 text-red-700 border-red-200';
    case 'viewed': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'sent': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'expired': return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'voided': return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    case 'active': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 font-semibold uppercase">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function DetailField({ label, value, mono = false }) {
  return (
    <div className="border border-slate-100 rounded-lg p-3 min-w-0">
      <p className="text-xs text-slate-400 uppercase font-semibold">{label}</p>
      <p className={`font-medium mt-1 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
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
  const [nexartLogoUrl, setNexartLogoUrl] = useState('');
  const [creatingEstimateId, setCreatingEstimateId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [visiblePackages, setVisiblePackages] = useState(PACKAGE_PAGE_SIZE);
  const [actioning, setActioning] = useState('');
  const [connectResult, setConnectResult] = useState(null);
  const [showEstimateSearch, setShowEstimateSearch] = useState(false);
  const [allEstimatesSearch, setAllEstimatesSearch] = useState('');
  const [estimateSearch, setEstimateSearch] = useState('');

  const load = async () => {
    setLoading(true);
    loadCompanySettings().then(s => {
      setNexartLogoUrl(s?.nexartsign_logo_url || '');
    }).catch(() => {});
    try {
      const [pkgRows, eventRows, certRows, participantRows, estimateRows] = await Promise.all([
        base44.entities.SigningPackage.list('-created_date').catch(() => []),
        base44.entities.SigningEvent.list('-created_at').catch(() => []),
        base44.entities.SigningCertificate.list('-generated_at').catch(() => []),
        base44.entities.SigningParticipant.list('-created_date').catch(() => []),
        base44.entities.Estimate.list('-created_date').catch(() => []),
      ]);

      const estimatePackages = (pkgRows || []).filter(pkg => pkg.document_type === 'estimate');
      const liveEstimates = (estimateRows || []).filter(est => est?.deleted_at == null);

      setPackages(estimatePackages);
      setEvents(eventRows || []);
      setCertificates(certRows || []);
      setParticipants(participantRows || []);
      setEstimates(liveEstimates);
      setSelectedId(current => {
        if (current && estimatePackages.some(pkg => pkg.id === current)) return current;
        return estimatePackages?.[0]?.id || null;
      });
    } catch (err) {
      console.error('[NexArtSign] load failed:', err);
      toast.error('Could not load NexArtSign data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selected = useMemo(() => packages.find(pkg => pkg.id === selectedId) || packages[0] || null, [packages, selectedId]);
  const selectedEvents = useMemo(() => events
    .filter(event => event.signing_package_id === selected?.id)
    .sort((a, b) => new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0)), [events, selected]);
  const selectedCert = useMemo(() => certificates.find(cert => cert.signing_package_id === selected?.id), [certificates, selected]);
  const selectedParticipants = useMemo(() => participants
    .filter(participant => participant.signing_package_id === selected?.id)
    .sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1)), [participants, selected]);

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

  const selectedEstimate = useMemo(() => {
    if (!selected?.document_id) return null;
    return estimates.find(est => est.id === selected.document_id) || null;
  }, [estimates, selected]);

  const filteredPackages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return packages.filter(pkg => {
      const status = pkg.status || 'draft';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const haystack = [
        pkg.document_title,
        pkg.document_number,
        pkg.document_id,
        pkg.signer_name,
        pkg.signer_email,
        pkg.client_name,
        pkg.package_number,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesQuery = !normalized || haystack.includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [packages, query, statusFilter]);

  const visiblePackageRows = filteredPackages.slice(0, visiblePackages);

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

  const filteredEstimatesForSigning = useMemo(() => {
    const q = estimateSearch.trim().toLowerCase();
    return estimatesReadyForSigning
      .filter(row => row.signingPackage !== null)
      .filter(({ estimate }) => {
      if (!q) return true;
      return [
        estimate.title,
        estimate.client_name,
        String(estimate.estimate_number),
        estimate.client_email,
      ].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [estimatesReadyForSigning, estimateSearch]);

  const issueSigningUrl = async (pkg) => {
    if (!pkg?.id) throw new Error('No signing package selected');

    if (pkg.status && CLOSED_STATUSES.has(pkg.status)) {
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

  const writeEvent = async ({ pkg, event_type, metadata = {} }) => {
    if (!pkg?.id) return;
    const currentUser = await base44.auth.me().catch(() => null);
    await base44.entities.SigningEvent.create({
      signing_package_id: pkg.id,
      document_type: pkg.document_type,
      document_id: pkg.document_id,
      event_type,
      actor_name: currentUser?.full_name || currentUser?.email || 'system',
      actor_email: currentUser?.email || '',
      created_at: new Date().toISOString(),
      metadata,
      company_id: pkg.company_id || pkg.audit_summary?.company_id || currentUser?.company_id || '',
    }).catch(() => {});
  };

  const copyLink = async (pkg) => {
    try {
      const url = await issueSigningUrl(pkg);
      await navigator.clipboard.writeText(url);
      await writeEvent({ pkg, event_type: 'signing_link_copied', metadata: { scope: 'admin_console' } });
      toast.success('Signing link copied');
      await load();
    } catch (err) {
      toast.error(err?.message || 'No signing link available');
    }
  };

  const openSigningPage = async (pkg) => {
    try {
      const url = await issueSigningUrl(pkg);
      await writeEvent({ pkg, event_type: 'signing_link_opened_by_admin', metadata: { scope: 'admin_console' } });
      window.open(url, '_blank', 'noopener,noreferrer');
      await load();
    } catch (err) {
      toast.error(err?.message || 'Could not open signing link');
    }
  };

  const copyCertificateLink = async () => {
    if (!selectedCert?.id && !selectedCert?.certificate_number) return toast.error('No certificate available yet');
    const ref = selectedCert.certificate_number || selectedCert.id;
    const url = `${window.location.origin}/verify-document?certificate=${encodeURIComponent(ref)}`;
    await navigator.clipboard.writeText(url);
    toast.success('Verification link copied');
  };

  const closePackage = async (pkg, status) => {
    if (!pkg?.id) return;
    const label = status === 'voided' ? 'void' : 'expire';
    const confirmed = window.confirm(`Are you sure you want to ${label} this signing package? This will close the active signing link.`);
    if (!confirmed) return;

    setActioning(`${status}:${pkg.id}`);
    try {
      const now = new Date().toISOString();
      await base44.entities.SigningPackage.update(pkg.id, {
        status,
        token: '',
        token_hash: '',
        token_last_four: '',
        [`${status}_at`]: now,
        audit_summary: {
          ...(pkg.audit_summary || {}),
          closed_from: 'nexartsign_admin_console',
          closed_reason: status,
          closed_at: now,
        },
      });

      await Promise.all(selectedParticipants
        .filter(participant => !['signed', 'declined', 'voided'].includes(participant.status))
        .map(participant => base44.entities.SigningParticipant.update(participant.id, {
          status,
          token: '',
          token_hash: '',
          token_last_four: '',
          metadata: {
            ...(participant.metadata || {}),
            closed_from_package_status: status,
          },
        }).catch(() => {})));

      await writeEvent({ pkg, event_type: status, metadata: { source: 'admin_console' } });
      toast.success(status === 'voided' ? 'Signing package voided' : 'Signing package expired');
      await load();
    } catch (err) {
      toast.error(err?.message || 'Could not update signing package');
    } finally {
      setActioning('');
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
        signature_status: CLOSED_STATUSES.has(pkg.status) ? pkg.status : 'sent',
        signature_provider: 'internal',
      }).catch(() => {});

      if (!pkg.token && !pkg.audit_summary?.token_hash) {
        toast.warning('Package created but no signing link was generated');
      } else if (estimate.client_email) {
        toast.success('Estimate connected — signing email sent to ' + estimate.client_email);
      } else {
        toast.success('Estimate connected to NexArtSign ✓');
      }
      setConnectResult({ success: true, pkgId: pkg.id, signerEmail: estimate.client_email || '' });
      await load();
      setSelectedId(pkg.id);
    } catch (err) {
      console.warn('[NexArtSign] connect estimate failed:', err?.message);
      toast.error(err?.message || 'Could not connect this estimate to NexArtSign');
      setConnectResult({ success: false, message: err?.message || 'Could not connect estimate' });
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
        <div className="flex items-center gap-3">
          {nexartLogoUrl ? (
            <img src={nexartLogoUrl} alt="NexArtSign Pro" className="w-32 h-32 object-contain shrink-0" />
          ) : (
            <ShieldCheck className="w-8 h-8 text-slate-500 shrink-0" />
          )}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">NEXARTSIGN</p>
            <h1 className="text-xl font-bold text-slate-900">NexArtSign</h1>
            <p className="text-sm text-slate-400 mt-0.5">Signing packages, participants, audit trail, certificates, and secure signing links</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSettings(value => !value)} variant="outline" className="gap-2">
            <ShieldCheck className="w-4 h-4" /> {showSettings ? 'Hide Settings' : 'Settings'}
          </Button>
          <Button onClick={load} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {showSettings && <NexArtSignSettingsCard />}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <StatCard label="Estimate Packages" value={packages.length} />
          <StatCard label="Waiting" value={(counts.sent || 0) + (counts.viewed || 0) + (counts.draft || 0)} />
          <StatCard label="Signed" value={counts.signed || 0} />
          <StatCard label="Closed" value={(counts.declined || 0) + (counts.expired || 0) + (counts.voided || 0)} />
          <StatCard label="Missing Package" value={coverage.missing} />
        </div>

        {connectResult && (
          <div className={`rounded-xl border px-5 py-4 flex items-start justify-between gap-4 ${
            connectResult.success
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {connectResult.success
                ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                : <Ban className="w-5 h-5 text-red-600 shrink-0" />
              }
              <div>
                <p className={`font-semibold text-sm ${connectResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                  {connectResult.success ? 'Estimate connected to NexArtSign' : 'Connection failed'}
                </p>
                <p className={`text-xs mt-0.5 ${connectResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {connectResult.success
                    ? `Signing link sent to ${connectResult.signerEmail}`
                    : connectResult.message
                  }
                </p>
              </div>
            </div>
            <button onClick={() => setConnectResult(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-bold text-slate-900">Estimate signature coverage</h3>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEstimateSearch(true)}>
                  <Search className="w-3.5 h-3.5" /> Find & Connect Estimate
                </Button>
              </div>
              <p className="text-sm text-slate-500 mt-1">Sent estimates connected to NexArtSign signing packages.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{coverage.linked}/{coverage.total || 0}</p>
              <p className="text-xs text-slate-400 uppercase font-semibold">Connected</p>
            </div>
          </div>

          {filteredEstimatesForSigning.length === 0 ? (
            <p className="text-sm text-slate-500">
              No estimates connected yet. Use "Find & Connect Estimate" to link one.
            </p>
          ) : (
            <div className="space-y-3">
              {estimatesReadyForSigning.slice(0, 8).map(({ estimate, signingPackage }) => {
                const hasEmail = Boolean(estimate.client_email);
                const hasPdf = Boolean(estimate.pdf_file_url || estimate.document_hash);
                const readiness = !hasEmail ? 'no-email' : !hasPdf ? 'no-pdf' : 'ready';
                return (
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
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEstimateEditor(estimate.id)}><PenSquare className="w-3.5 h-3.5" />Open Estimate</Button>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEstimateClientView(estimate)}><FileText className="w-3.5 h-3.5" />Client View</Button>
                        {signingPackage ? (
                          <Button size="sm" className="gap-1.5" onClick={() => setSelectedId(signingPackage.id)}><FileSignature className="w-3.5 h-3.5" />Open Package</Button>
                        ) : (
                          <>
                            {readiness === 'no-email' && <span className="text-xs text-red-500 font-medium">Missing client email</span>}
                            {readiness === 'no-pdf' && <span className="text-xs text-amber-500 font-medium">No PDF yet</span>}
                            <Button size="sm" className="gap-1.5" disabled={creatingEstimateId === estimate.id || !hasEmail} onClick={() => connectEstimateToNexArtSign(estimate)}><Plus className="w-3.5 h-3.5" />{creatingEstimateId === estimate.id ? 'Connecting...' : 'Connect to NexArtSign'}</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4">
          <div className="2xl:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><FileSignature className="w-4 h-4 text-slate-500" /><h3 className="font-bold text-slate-900">Packages</h3></div>
                {loading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setVisiblePackages(PACKAGE_PAGE_SIZE); }}
                    placeholder="Search signer, email, estimate..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => { setStatusFilter(event.target.value); setVisiblePackages(PACKAGE_PAGE_SIZE); }}
                  className="rounded-lg border border-slate-200 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="all">All</option>
                  <option value="sent">Sent</option>
                  <option value="viewed">Viewed</option>
                  <option value="signed">Signed</option>
                  <option value="declined">Declined</option>
                  <option value="expired">Expired</option>
                  <option value="voided">Voided</option>
                </select>
              </div>
              <p className="text-xs text-slate-400">Showing {visiblePackageRows.length} of {filteredPackages.length} matching packages</p>
            </div>
            {filteredPackages.length === 0 ? <div className="py-12 text-center text-slate-500 text-sm">No signing packages match this filter.</div> : (
              <div className="divide-y divide-slate-100 max-h-[720px] overflow-auto">
                {visiblePackageRows.map(pkg => (
                  <button key={pkg.id} onClick={() => setSelectedId(pkg.id)} className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition ${selected?.id === pkg.id ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">{pkg.document_title || pkg.document_number || pkg.document_id}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">{pkg.signer_name || pkg.client_name || 'Signer'} • {pkg.signer_email}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Sent {formatDate(pkg.sent_at || pkg.created_date)}</p>
                      </div>
                      <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(pkg.status)}`}>{pkg.status || 'draft'}</span>
                    </div>
                  </button>
                ))}
                {visiblePackages < filteredPackages.length && (
                  <div className="p-3">
                    <Button variant="outline" className="w-full" onClick={() => setVisiblePackages(count => count + PACKAGE_PAGE_SIZE)}>Load more</Button>
                  </div>
                )}
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
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                    <DetailField label="Active Signer" value={selected.signer_name || selected.client_name || 'Signer'} />
                    <DetailField label="Document" value={`#${selected.document_number || selected.document_id || ''}`} />
                    <DetailField label="Certificate" value={selectedCert ? selectedCert.certificate_number || 'Ready' : 'Pending'} />
                    <DetailField label="Events" value={selectedEvents.length} />
                    <DetailField label="Source Hash" value={selected.source_pdf_hash || selected.audit_summary?.source_pdf_hash} mono />
                    <DetailField label="Final Hash" value={selected.final_pdf_hash || selectedCert?.document_hash || selectedCert?.final_pdf_hash} mono />
                  </div>

                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2 mb-2 text-slate-900 font-semibold"><Eye className="w-4 h-4" /> Package preview</div>
                    <p><span className="font-medium">Client:</span> {selected.client_name || selectedEstimate?.client_name || '—'}</p>
                    <p><span className="font-medium">Signer email:</span> {selected.signer_email || '—'}</p>
                    <p><span className="font-medium">Expires:</span> {formatDate(selected.expires_at)}</p>
                    <p><span className="font-medium">Participants:</span> {selectedParticipants.length || selected.audit_summary?.participants_count || 0}</p>
                    <p><span className="font-medium">Sequential signing:</span> {selected.audit_summary?.signing_sequence_enabled ? 'Enabled' : 'Single signer or not configured'}</p>
                  </div>
                </>
              ) : <p className="text-sm text-slate-500 mt-3">Select a package to view details.</p>}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-4">Participants</h3>
              {!selected ? <p className="text-sm text-slate-500">Select a package to view participants.</p> : selectedParticipants.length === 0 ? <p className="text-sm text-slate-500">No participant records yet. Existing legacy packages may only show the package signer.</p> : (
                <div className="space-y-3">
                  {selectedParticipants.map(participant => (
                    <div key={participant.id} className="border border-slate-100 rounded-xl p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <UserRound className="w-4 h-4 text-slate-400" />
                          <p className="font-semibold text-sm text-slate-900 truncate">{participant.name || participant.email}</p>
                          <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(participant.status)}`}>{participant.status || 'pending'}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">{participant.email} • {participant.role || 'signer'} • order {participant.signing_order || 1}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Sent {formatDate(participant.sent_at)}{participant.signed_at ? ` • Signed ${formatDate(participant.signed_at)}` : ''}</p>
                      </div>
                      {participant.status === 'active' && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-4">Timeline</h3>
              {!selected ? <p className="text-sm text-slate-500">Select a package to view timeline.</p> : selectedEvents.length === 0 ? <p className="text-sm text-slate-500">No events recorded yet.</p> : (
                <div className="space-y-3">{selectedEvents.map((event, index) => (
                  <div key={event.id || index} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="font-semibold text-sm text-slate-800 capitalize">{String(event.event_type || '').replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatDate(event.created_at || event.created_date)} {event.actor_email ? `• ${event.actor_email}` : ''}</p>
                    {event.metadata && Object.keys(event.metadata || {}).length > 0 && (
                      <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">{JSON.stringify(event.metadata)}</p>
                    )}
                  </div>
                ))}</div>
              )}
            </div>
          </div>

          <div className="2xl:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3">Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => copyLink(selected)} disabled={!selected || CLOSED_STATUSES.has(selected?.status)}><Copy className="w-4 h-4" />Copy signing link</Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => openSigningPage(selected)} disabled={!selected || CLOSED_STATUSES.has(selected?.status)}><ExternalLink className="w-4 h-4" />Open signing page</Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => selected && openDocument(selected)} disabled={!selected}><ExternalLink className="w-4 h-4" />Open document</Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => selected && navigate(`/nexartsign-field-editor?packageId=${selected.id}`)} disabled={!selected}><PenSquare className="w-4 h-4" />Open field editor</Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={copyCertificateLink} disabled={!selectedCert}><Link2 className="w-4 h-4" />Copy verify link</Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => selectedEstimate && openEstimateClientView(selectedEstimate)} disabled={!selectedEstimate}><FileText className="w-4 h-4" />Open client estimate</Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-amber-700 border-amber-200 hover:bg-amber-50" onClick={() => closePackage(selected, 'expired')} disabled={!selected || CLOSED_STATUSES.has(selected?.status) || actioning === `expired:${selected?.id}`}><TimerOff className="w-4 h-4" />Expire package</Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-red-700 border-red-200 hover:bg-red-50" onClick={() => closePackage(selected, 'voided')} disabled={!selected || CLOSED_STATUSES.has(selected?.status) || actioning === `voided:${selected?.id}`}><Ban className="w-4 h-4" />Void package</Button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3">Delivery status</h3>
              {!selected ? <p className="text-sm text-slate-500">Select a package.</p> : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Status</span><span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(selected.status)}`}>{selected.status || 'draft'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Sent</span><span>{formatDate(selected.sent_at)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Viewed</span><span>{formatDate(selected.viewed_at)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Signed</span><span>{formatDate(selected.signed_at)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Certificate</span><span>{selectedCert ? 'Ready' : 'Pending'}</span></div>
                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-start gap-2"><Mail className="w-3.5 h-3.5 mt-0.5" />Use Copy/Open signing link to issue a fresh active link for the current signer.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEstimateSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Find estimate to connect</h2>
              <button onClick={() => { setShowEstimateSearch(false); setAllEstimatesSearch(''); }}
                className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  autoFocus
                  value={allEstimatesSearch}
                  onChange={e => setAllEstimatesSearch(e.target.value)}
                  placeholder="Search by client name, estimate #, or email..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
              {estimates
                .filter(est => {
                  const q = allEstimatesSearch.trim().toLowerCase();
                  if (!q) return true;
                  return [est.client_name, est.title, String(est.estimate_number), est.client_email]
                    .filter(Boolean).join(' ').toLowerCase().includes(q);
                })
                .filter(est => !packageByEstimateId.has(est.id))
                .slice(0, 20)
                .map(est => {
                  const hasEmail = Boolean(est.client_email);
                  return (
                    <div key={est.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">
                            {est.client_name || 'No client'} — #{est.estimate_number}
                          </span>
                          <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusClass(est.status)}`}>
                            {est.status || 'draft'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          ${Number(est.total || 0).toLocaleString()}
                          {est.client_email ? ` • ${est.client_email}` : ' • No email'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="gap-1.5 shrink-0"
                        disabled={!hasEmail || creatingEstimateId === est.id}
                        onClick={async () => {
                          await connectEstimateToNexArtSign(est);
                          setShowEstimateSearch(false);
                          setAllEstimatesSearch('');
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {!hasEmail ? 'No email' : creatingEstimateId === est.id ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  );
                })}
              {estimates.filter(est => !packageByEstimateId.has(est.id)).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">All estimates are already connected to NexArtSign.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}