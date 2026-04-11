import React from 'react';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';

export default function ManualDelSistemaPanel() {
  return (
    <SettingsSection
      title="Manual del Sistema"
      description="Documentación interna de reglas y comportamiento del sistema."
    >
      {/* ── Estimados ─────────────────────────────────────────────── */}
      <SettingsCard>
        <div className="px-5 py-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Estimados</h3>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700">Approve / Decline</h4>

            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 pl-1">
              <li>
                <span className="font-semibold text-slate-800">Approve</span> does not require a note.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Decline</span> requires a note.
              </li>
              <li>
                If the note field is empty, the decline action <span className="font-semibold text-red-600">will not execute</span>.
              </li>
              <li>
                The user must write a note before clicking <span className="font-semibold text-slate-800">Decline</span>.
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 italic">
              Este documento se irá ampliando con más reglas y comportamiento del sistema.
            </p>
          </div>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}