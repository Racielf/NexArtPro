import React, { useEffect, useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const INVESTOR_HUB_ENABLED = import.meta.env.VITE_INVESTOR_HUB_ENABLED === 'true';
const NONE_VALUE = '__none__';

// Lets a Work Order be linked to an Investor Hub Project, so ProjectWOCosts can
// pull its actual materials/services back into that project's flip analysis.
export default function JobDetailsCard({ workOrderId, projectId, onLinked }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!INVESTOR_HUB_ENABLED) {
      setLoading(false);
      return;
    }
    nexartClient.entities.Project.list('-created_at', 200)
      .then(setProjects)
      .catch(() => toast.error('Could not load projects'))
      .finally(() => setLoading(false));
  }, []);

  if (!INVESTOR_HUB_ENABLED) return null;

  const handleChange = async (value) => {
    const nextId = value === NONE_VALUE ? null : value;
    setSaving(true);
    try {
      await nexartClient.entities.WorkOrder.update(workOrderId, { project_id: nextId });
      onLinked?.(nextId);
      toast.success(nextId ? 'Linked to project' : 'Project link removed');
    } catch (err) {
      toast.error(`Could not update project link: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">Job Details</h3>
      </div>
      <div className="space-y-1.5 max-w-sm">
        <label className="text-xs text-slate-500">Project</label>
        <Select
          value={projectId || NONE_VALUE}
          onValueChange={handleChange}
          disabled={loading || saving}
        >
          <SelectTrigger>
            <SelectValue placeholder={loading ? 'Loading projects…' : 'No project linked'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>— No project —</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.project_number ? `${p.project_number} — ${p.name}` : p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
