/* shortened for patching context */
import NexArtSignSettingsCard from '@/components/signing/NexArtSignSettingsCard';

// ... existing imports remain unchanged

export default function NexArtSign() {
  // ... existing logic remains unchanged

  return (
    <div className="flex flex-col h-full">
      <PageHeader eyebrow="NEXARTSIGN" title="NexArtSign" subtitle="Signing packages, participants, timeline, certificates, and future provider settings" actionLabel="Refresh" onAction={load} />
      <PageShell>

        {/* 🔥 NEW SETTINGS BLOCK */}
        <div className="mb-4">
          <NexArtSignSettingsCard />
        </div>

        {/* existing dashboard continues */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500 font-semibold uppercase">Estimate Packages</p><p className="text-2xl font-bold mt-2">{packages.length}</p></div>
          <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500 font-semibold uppercase">Waiting</p><p className="text-2xl font-bold mt-2">{(counts.sent || 0) + (counts.viewed || 0) + (counts.draft || 0)}</p></div>
          <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500 font-semibold uppercase">Signed</p><p className="text-2xl font-bold mt-2">{counts.signed || 0}</p></div>
          <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500 font-semibold uppercase">Missing Package</p><p className="text-2xl font-bold mt-2">{coverage.missingPackages}</p></div>
        </div>

        {/* rest of file unchanged */}
      </PageShell>
    </div>
  );
}
