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

  const updateNested = (key, field, value) => {
    const next = {
      ...policy,
      [key]: {
        ...policy[key],
        [field]: value
      }
    };
    setPolicy(next);
    saveBrainPolicy(next);
  };

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-bold">Central Brain</h2>
        <div className="mt-3 flex gap-4 items-center">
          <input type="checkbox" checked={policy.enabled} onChange={() => update({ enabled: !policy.enabled })} />
          <select value={policy.operationMode} onChange={(e)=>update({operationMode:e.target.value})}>
            <option value="advisory">Advisory</option>
            <option value="guarded">Guarded</option>
            <option value="strict">Strict</option>
            <option value="experimental">Experimental</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold">Catalog & Pricing Intelligence</h3>
        <div className="space-y-2 mt-3 text-xs">
          <label><input type="checkbox" checked={policy.catalogIntelligence.analyze} onChange={()=>updateNested('catalogIntelligence','analyze',!policy.catalogIntelligence.analyze)} /> Analyze</label>
          <label><input type="checkbox" checked={policy.catalogIntelligence.suggest} onChange={()=>updateNested('catalogIntelligence','suggest',!policy.catalogIntelligence.suggest)} /> Suggest</label>
          <label><input type="checkbox" checked={policy.catalogIntelligence.allowWrite} onChange={()=>updateNested('catalogIntelligence','allowWrite',!policy.catalogIntelligence.allowWrite)} /> Allow Write</label>
          <label><input type="checkbox" checked={policy.catalogIntelligence.allowCreate} onChange={()=>updateNested('catalogIntelligence','allowCreate',!policy.catalogIntelligence.allowCreate)} /> Create Services</label>
          <label><input type="checkbox" checked={policy.catalogIntelligence.allowDeactivate} onChange={()=>updateNested('catalogIntelligence','allowDeactivate',!policy.catalogIntelligence.allowDeactivate)} /> Deactivate Services</label>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold">Owner Access</h3>
        <div className="mt-3 text-xs">
          <button onClick={()=>updateNested('ownerAccess','unlocked',true)} className="px-2 py-1 border">Unlock</button>
          <button onClick={()=>updateNested('ownerAccess','unlocked',false)} className="px-2 py-1 border ml-2">Lock</button>
          <p className="mt-2">Status: {policy.ownerAccess.unlocked ? 'Unlocked' : 'Locked'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold">Brain Chat (coming)</h3>
        <p className="text-xs text-gray-500">Next step: AI integration.</p>
      </div>

      <button onClick={()=>{const r=resetBrainPolicy();setPolicy(r)}} className="text-red-600 text-xs">Reset</button>

    </div>
  );
}
