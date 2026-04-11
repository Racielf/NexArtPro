import React, { useState, useEffect, useRef } from 'react';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import { Button } from '@/components/ui/button';
import { Upload, Save, Trash2, Loader2, CheckCircle, XCircle, ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { loadCompanySettings, saveCompanySettings } from '@/lib/companySettings';
import { validateImageFile, optimizeImage } from '@/lib/imageOptimizer';

const inputCls = 'w-64 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition';

export default function CompanyPanel() {
  const [state, setState] = useState({ name: '', email: '', phone: '', address: '', license: '', logo_url: '' });
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    loadCompanySettings().then(data => {
      setState(data);
      setOriginal(data);
      setPreviewUrl(data.logo_url || '');
      setLoading(false);
    });
  }, []);

  const set = (field, value) => {
    setSaveSuccess(false);
    setSaveError('');
    setState(prev => ({ ...prev, [field]: value }));
  };

  const isDirty = JSON.stringify(state) !== JSON.stringify(original);

  // ── Logo upload ────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const optimized = await optimizeImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: optimized });
      set('logo_url', file_url);
      setPreviewUrl(file_url);
      toast.success('Logo uploaded — click Save to persist');
    } catch (err) {
      toast.error('Failed to upload logo: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    set('logo_url', '');
    setPreviewUrl('');
    setSaveSuccess(false);
    setSaveError('');
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!state.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      await saveCompanySettings(state);
      setOriginal(state);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SettingsSection title="Company" description="Your business information shown on documents and emails.">
        <SettingsCard>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        </SettingsCard>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Company" description="Your business information shown on documents and emails.">
      <SettingsCard>
        <SettingsRow label="Company Name" description="Appears on all documents">
          <input className={inputCls} value={state.name} onChange={e => set('name', e.target.value)} placeholder="FSM Pro LLC" />
        </SettingsRow>
        <SettingsRow label="Email">
          <input className={inputCls} type="email" value={state.email} onChange={e => set('email', e.target.value)} placeholder="info@company.com" />
        </SettingsRow>
        <SettingsRow label="Phone">
          <input className={inputCls} value={state.phone} onChange={e => set('phone', e.target.value)} placeholder="(503) 555-0100" />
        </SettingsRow>
        <SettingsRow label="Address">
          <input className={inputCls} value={state.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, Portland OR" />
        </SettingsRow>
        <SettingsRow label="License Number">
          <input className={inputCls} value={state.license} onChange={e => set('license', e.target.value)} placeholder="#CCB-000000" />
        </SettingsRow>

        {/* Logo */}
        <SettingsRow label="Logo" description="Upload your company logo (PNG, JPG, WEBP — max 5 MB)" last>
          <div className="flex flex-col items-start gap-3">
            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Preview */}
            {previewUrl ? (
              <div className="relative group">
                <div className="w-40 h-28 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Company logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="text-[11px] font-medium text-blue-500 hover:text-blue-600 transition"
                  >
                    Replace
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={handleRemoveLogo}
                    className="text-[11px] font-medium text-red-500 hover:text-red-600 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 text-sm text-blue-500 font-medium hover:text-blue-600 transition border border-blue-200 rounded-lg px-4 py-2 bg-blue-50 disabled:opacity-50"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Logo</>
                )}
              </button>
            )}
          </div>
        </SettingsRow>
      </SettingsCard>

      {/* Save button */}
      <div className="flex items-center gap-3 mt-4">
        <Button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="gap-2"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Company Settings</>
          )}
        </Button>
        {saveSuccess && !isDirty && (
          <span className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle className="w-3.5 h-3.5" /> All changes saved
          </span>
        )}
        {saveError && (
          <span className="flex items-center gap-1.5 text-xs text-red-600">
            <XCircle className="w-3.5 h-3.5" /> {saveError}
          </span>
        )}
        {isDirty && !saveError && (
          <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
        )}
      </div>
    </SettingsSection>
  );
}