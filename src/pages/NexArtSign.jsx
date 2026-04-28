import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import NexArtSignSettingsCard from '@/components/signing/NexArtSignSettingsCard';

export default function NexArtSign() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const estimates = await base44.entities.Estimate.list();
      setPackages(estimates);
    } catch (err) {
      console.error('[NexArtSign] load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = packages.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  const coverage = {
    missingPackages: packages.filter(e =>
      ['approved', 'signed'].includes(e.status) && !e.final_signed_pdf_url
    ).length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex-shrink-0 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">NEXARTSIGN</p>
          <h1 className="text-xl font-bold text-slate-900">NexArtSign</h1>
          <p className="text-sm text-slate-400 mt-0.5">Signing packages, participants, timeline, certificates, and future provider settings</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

        {/* Settings Block */}
        <div>
          <NexArtSignSettingsCard />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Estimate Packages</p>
            <p className="text-2xl font-bold mt-2">{packages.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Waiting</p>
            <p className="text-2xl font-bold mt-2">{(counts.sent || 0) + (counts.viewed || 0) + (counts.draft || 0)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Signed</p>
            <p className="text-2xl font-bold mt-2">{counts.signed || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Missing Package</p>
            <p className="text-2xl font-bold mt-2">{coverage.missingPackages}</p>
          </div>
        </div>

        {/* Packages list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No signing packages found.</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estimate #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Signed At</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packages.map(pkg => (
                  <tr key={pkg.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{pkg.client_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">#{pkg.estimate_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        pkg.status === 'signed'   ? 'bg-green-100 text-green-700' :
                        pkg.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        pkg.status === 'sent'     ? 'bg-blue-100 text-blue-700' :
                        pkg.status === 'declined' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{pkg.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {pkg.signed_at ? new Date(pkg.signed_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {pkg.final_signed_pdf_url ? (
                        <a href={pkg.final_signed_pdf_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">View PDF</a>
                      ) : pkg.signature_certificate ? (
                        <span className="text-emerald-600 font-semibold">✓ Certified</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}