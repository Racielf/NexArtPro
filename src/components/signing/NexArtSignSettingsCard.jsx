import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Save, RefreshCw, Trash2, Loader2, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { loadCompanySettings, saveCompanySettings } from '@/lib/companySettings';
import { validateImageFile, optimizeImage } from '@/lib/imageOptimizer';
import { uploadLogoToStorage } from '@/lib/logoStorage';

const EMPTY_LOGOS = { logo_url: '', nexartsign_logo_url: '' };

export default function NexArtSignSettingsCard() {
  const [state, setState] = useState({
    name: '',
    email: '',
    logo_url: '',
    nexartsign_logo_url: '',
  });
  const [original, setOriginal] = useState(null);
  const [previewUrls, setPreviewUrls] = useState(EMPTY_LOGOS);
  const [errors, setErrors] = useState(EMPTY_LOGOS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const documentLogoRef = useRef(null);
  const signingLogoRef = useRef(null);

  useEffect(() => {
    loadCompanySettings()
      .then(settings => {
        const next = {
          ...settings,
          name: settings?.name || '',
          email: settings?.email || '',
          logo_url: settings?.logo_url || '',
          nexartsign_logo_url: settings?.nexartsign_logo_url || '',
        };
        setState(next);
        setOriginal(next);
        setPreviewUrls({
          logo_url: next.logo_url || '',
          nexartsign_logo_url: next.nexartsign_logo_url || '',
        });
      })
      .catch(() => toast.error('Could not load NexArtSign settings'))
      .finally(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(state) !== JSON.stringify(original);

  const setField = (field, value) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const setLogoError = (field, value) => {
    setErrors(prev => ({ ...prev, [field]: value }));
  };

  const setPreviewUrl = (field, value) => {
    setPreviewUrls(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (field, inputRef) => async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoError(field, '');
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setLogoError(field, validation.error);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploadingField(field);
    try {
      const optimized = await optimizeImage(file);
      const publicUrl = await uploadLogoToStorage(optimized);
      setField(field, publicUrl);
      setPreviewUrl(field, publicUrl);
    } catch (err) {
      setLogoError(field, `Failed to upload logo: ${err?.message || 'Unknown error'}`);
    } finally {
      setUploadingField('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeLogo = (field) => {
    setField(field, '');
    setPreviewUrl(field, '');
    setLogoError(field, '');
  };

  const handleSave = async () => {
    if (!state.name?.trim()) {
      toast.error('Company name is required');
      return;
    }

    setSaving(true);
    try {
      await saveCompanySettings(state);
      setOriginal(state);
      toast.success('NexArtSign branding settings saved');
    } catch (err) {
      toast.error(err?.message || 'Could not save NexArtSign settings');
    } finally {
      setSaving(false);
    }
  };

  const LogoUploader = ({ field, label, description, inputRef }) => {
    const previewUrl = previewUrls[field];
    const error = errors[field];
    const isUploading = uploadingField === field;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-900">{label}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileSelect(field, inputRef)}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {previewUrl ? (
            <div className="flex items-center gap-3">
              <div className="h-20 w-36 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <img src={previewUrl} alt={label} className="max-h-full max-w-full object-contain p-2" />}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={Boolean(uploadingField)} onClick={() => inputRef.current?.click()} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Replace
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={Boolean(uploadingField)} onClick={() => removeLogo(field)} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={Boolean(uploadingField)}
              onClick={() => inputRef.current?.click()}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload Logo
            </button>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <XCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-center min-h-[180px]">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-600" />
            <h3 className="font-bold text-slate-900">NexArtSign settings</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Branding used by the signing page, signing credits, and new signing packages. The NexArtSign footer logo is separate from the main app sidebar logo.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !isDirty} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save NexArtSign Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Company name shown to customers</label>
            <input
              value={state.name || ''}
              onChange={event => setField('name', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="R.C Art Construction LLC"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Company email</label>
            <input
              value={state.email || ''}
              onChange={event => setField('email', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="info@company.com"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Authorized representative name</label>
            <input
              value={state.authorized_rep_name || ''}
              onChange={e => setField('authorized_rep_name', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="e.g. John Smith"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Representative title</label>
            <input
              value={state.authorized_rep_title || ''}
              onChange={e => setField('authorized_rep_title', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="e.g. Project Manager"
            />
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 flex gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>New estimates sent after saving will embed this branding in their NexArtSign package.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <LogoUploader
            field="logo_url"
            label="Header company logo"
            description="Shown at the top of the public signing page. Configure the main app/sidebar logo separately in Settings > Company if needed."
            inputRef={documentLogoRef}
          />
          <LogoUploader
            field="nexartsign_logo_url"
            label="NexArtSign footer logo"
            description="Shown in Signature Credits at the bottom of the signing experience and signed document footer. This will not change the sidebar logo."
            inputRef={signingLogoRef}
          />
        </div>
      </div>
    </div>
  );
}