import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { FileSignature, RefreshCw, Settings } from 'lucide-react';

export default function NexArtSign() {
  const [packages, setPackages] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [pkgRows, eventRows] = await Promise.all([
      base44.entities.SigningPackage.list('-created_date').catch(() => []),
      base44.entities.SigningEvent.list('-created_at').catch(() => []),
    ]);
    setPackages(pkgRows || []);
    setEvents(eventRows || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        eyebrow="NEXARTSIGN"
        title="NexArtSign"
        subtitle="Document signing packages, activity, and provider settings"
        actionLabel="Refresh"
        onAction={load}
      />
      <PageShell>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Packages</p>
            <p className="text-2xl font-bold mt-2">{packages.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Events</p>
            <p className="text-2xl font-bold mt-2">{events.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Mode</p>
            <p className="text-sm font-bold mt-2">Internal active / external prepared</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-slate-900">Configuration</h3>
            </div>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="border border-slate-100 rounded-lg p-3"><p className="font-semibold">NexArtSign</p><p className="text-xs text-emerald-600 mt-1">Active</p></div>
            <div className="border border-slate-100 rounded-lg p-3"><p className="font-semibold">External providers</p><p className="text-xs text-slate-500 mt-1">Prepared, not connected</p></div>
            <div className="border border-slate-100 rounded-lg p-3"><p className="font-semibold">Audit</p><p className="text-xs text-slate-500 mt-1">Packages and events</p></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-900">Signing Packages</h3>
          </div>
          {packages.length === 0 ? <div className="py-12 text-center text-slate-500 text-sm">No signing packages yet.</div> : (
            <div className="divide-y divide-slate-100">
              {packages.map(pkg => (
                <div key={pkg.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{pkg.document_title || pkg.document_number || pkg.document_id}</p>
                    <p className="text-xs text-slate-500 mt-1">{pkg.signer_name || pkg.client_name || 'Signer'} • {pkg.signer_email}</p>
                  </div>
                  <span className="text-[10px] font-bold border rounded-full px-2 py-0.5 bg-slate-50 text-slate-600 border-slate-200">{pkg.status || 'draft'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageShell>
    </div>
  );
}
