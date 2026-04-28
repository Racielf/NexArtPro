import React, { useState, useEffect, useRef } from 'react';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import { Button } from '@/components/ui/button';
import { Upload, Save, RefreshCw, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { loadCompanySettings, saveCompanySettings } from '@/lib/companySettings';
import { validateImageFile, optimizeImage } from '@/lib/imageOptimizer';
import { uploadLogoToStorage } from '@/lib/logoStorage';

const inputCls = 'w-64 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition';
const EMPTY_LOGO_STATE = { logo_url: '', app_logo_url: '' };

export default function CompanyPanel() {
  const [state, setState] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    license: '',
    logo_url: '',
    app_logo_url: '',
    payment_methods: '',
  });
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [previewUrls, setPreviewUrls] = useState(EMPTY_LOGO_STATE);
  const [logoErrors, setLogoErrors] = useState(EMPTY_LOGO_STATE);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const documentLogoRef = useRef(null);
  const appLogoRef = useRef(null);

  useEffect(() => {
    loadCompanySettings().then(data => {
      const nextState = {
        ...data,
        app_logo_url: data.app_logo_url || '',
      };
      setState(nextState);
      setOriginal(nextState);
      setPreviewUrls({
        logo_url: nextState.logo_url || '',
        app_logo_url: nextState.app_logo_url || '',
      });
      setLoading(false);
    });
  }, []);

  const set = (field, value) => {
    setSaveSuccess(false);
    setSaveError('');
    setState(prev => ({ ...prev, [field]: value }));
  };

  const setLogoError = (field, value) => {
    setLogoErrors(prev => ({ ...prev, [field]: value }));
  };

  const setPreviewUrl = (field, value) => {
    setPreviewUrls(prev => ({ ...prev, [field]: value }));
  };

  const isDirty = JSON.stringify(state) !== JSON.stringify(original);

  const handleFileSelect = (field, inputRef) => async (e) => {
    const file = e.target.files?.[0];
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
      set(field, publicUrl);
      setPreviewUrl(field, publicUrl);
    } catch (err) {
      setLogoError(field, 'Failed to upload logo: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingField('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemoveLogo = (field) => {
    set(field, '');
    setPreviewUrl(field, '');
    setLogoError(field, '');
    setSaveSuccess(false);
    setSaveError('');
  };

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

  const renderLogoUploader = ({ field, label, description, fileRef, previewUrl, error, helper, last = false }) => {
    const isUploading = uploadingField === field;

    return (
      <SettingsRow label={label} description={description} last={last}>
        <div className="flex flex-col items-start gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileSelect(field, fileRef)}
          />

          {previewUrl && (
            <div className="flex flex-col items-start gap-3">
              <div className="relative w-44 h-32 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm">
                <img src={previewUrl} alt={label} className="max-w-full max-h-full object-contain p-2" />
                {isUploading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 rounded-xl">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span className="text-xs font-medium text-blue-600">Replacing…</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={Boolean(uploadingField)} className="gap-1.5 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" /> Replace Logo
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleRemoveLogo(field)} disabled={Boolean(uploadingField)} className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300">
                  <Trash2 className="w-3.5 h-3.5" /> Remove Logo
                </Button>
              </div>
            </div>
          )}

          {!previewUrl && !isUploading && (
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-sm text-blue-500 font-medium hover:text-blue-600 transition border border-blue-200 rounded-lg px-4 py-2 bg-blue-50" disabled={Boolean(uploadingField)}>
              <Upload className="w-4 h-4" /> Upload Logo
            </button>
          )}

          {isUploading && !previewUrl && (
            <div className="w-40 h-28 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-xs font-medium text-blue-600">Processing logo…</span>
            </div>
          )}

          {helper && <p className="text-xs text-slate-500 max-w-md leading-relaxed">{helper}</p>}
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </SettingsRow>
    );
  };

  if (loading) {
    return (
      <SettingsSection title="Company" description="Your business information shown across the app and documents.">
        <SettingsCard>
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        </SettingsCard>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Company" description="Your business information shown across the app and documents.">
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
        <SettingsRow label="Payment Methods" description="Accepted payment methods shown on documents. One per line.">
          <textarea className={inputCls + ' h-24 resize-none'} value={state.payment_methods} onChange={e => set('payment_methods', e.target.value)} placeholder={"Credit Card (3.5% processing fee)\nZelle\nCheck\nCash"} />
        </SettingsRow>

        {renderLogoUploader({
          field: 'logo_url',
          label: 'Document / Company Logo',
          description: 'Used at the top of estimates, proposals, invoices, PDFs, and public signing document headers.',
          fileRef: documentLogoRef,
          previewUrl: previewUrls.logo_url,
          error: logoErrors.logo_url,
        })}

        {renderLogoUploader({
          field: 'app_logo_url',
          label: 'App / Sidebar Logo',
          description: 'Used only for the NexArtPro app interface and sidebar identity. NexArtSign branding is configured inside NexArtSign.',
          helper: 'Use your company or software logo here. Do not upload the NexArtSign footer logo in this field.',
          fileRef: appLogoRef,
          previewUrl: previewUrls.app_logo_url,
          error: logoErrors.app_logo_url,
          last: true,
        })}
      </SettingsCard>

      <div className="flex items-center gap-3 mt-4">
        <Button onClick={handleSave} disabled={saving || !isDirty} className="gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Company Settings</>}
        </Button>
        {saveSuccess && !isDirty && <span className="flex items-center gap-1.5 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" /> All changes saved</span>}
        {saveError && <span className="flex items-center gap-1.5 text-xs text-red-600"><XCircle className="w-3.5 h-3.5" /> {saveError}</span>}
        {isDirty && !saveError && <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>}
      </div>
    </SettingsSection>
  );
}
