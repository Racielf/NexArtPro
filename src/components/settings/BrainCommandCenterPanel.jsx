import React, { useState, useEffect } from 'react';
import { getBrainPolicy, saveBrainPolicy, resetBrainPolicy } from '@/lib/brainPolicyStore';

export default function BrainCommandCenterPanel() {
  const [policy, setPolicy] = useState(getBrainPolicy());

  useEffect(() => {
    setPolicy(getBrainPolicy());
  }, []);

  const update = (patch) => {
    const next = { ...policy, ...patch };
    setPolicy(next);
    saveBrainPolicy(next);
  };

  const toggleModule = (key) => {
    const nextModules = { ...policy.modules, [key]: !policy.modules[key] };
    update({ modules: nextModules });
  };

  const toggleGuard = (key) => {
    const next = { ...policy.actionGuards, [key]: !policy.actionGuards[key] };
    update({ actionGuards: next });
  };

  return (
    <div className="space-y-6">

      {/* Overview */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-bold text-slate-900">Central Brain</h2>
        <p className="text-xs text-slate-500 mt-1">Control system intelligence, behavior, and safety rules.</p>

        <div className="mt-4 flex items-center gap-4">
          <label className="text-sm">Enabled</label>
          <input
            type="checkbox"
            checked={policy.enabled}
            onChange={() => update({ enabled: !policy.enabled })}
          />

          <select
            value={policy.operationMode}
            onChange={(e) => update({ operationMode: e.target.value })}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="advisory">Advisory</option>
            <option value="guarded">Guarded</option>
            <option value="strict">Strict</option>
            <option value="experimental">Experimental</option>
          </select>
        </div>
      </div>

      {/* Modules */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold">Modules</h3>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {Object.keys(policy.modules).map(key => (
            <label key={key} className="text-xs flex items-center gap-2">
              <input type="checkbox" checked={policy.modules[key]} onChange={() => toggleModule(key)} />
              {key}
            </label>
          ))}
        </div>
      </div>

      {/* Action Guards */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold">Action Guards</h3>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {Object.keys(policy.actionGuards).map(key => (
            <label key={key} className="text-xs flex items-center gap-2">
              <input type="checkbox" checked={policy.actionGuards[key]} onChange={() => toggleGuard(key)} />
              {key}
            </label>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold">Owner Instructions</h3>
        <textarea
          className="w-full mt-2 border rounded p-2 text-sm"
          rows={4}
          value={policy.ownerInstructions}
          onChange={(e) => update({ ownerInstructions: e.target.value })}
          placeholder="Tell the system how to behave..."
        />
      </div>

      {/* Reset */}
      <div>
        <button
          onClick={() => {
            const reset = resetBrainPolicy();
            setPolicy(reset);
          }}
          className="text-xs text-red-600"
        >
          Reset Brain Configuration
        </button>
      </div>
    </div>
  );
}
