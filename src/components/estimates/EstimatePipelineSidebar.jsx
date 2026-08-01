import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronUp,
  Circle,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  NotebookPen,
  Paperclip,
  Phone,
  Plus,
  SlidersHorizontal,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { nexartClient } from '@/api/nexartClient';
import EstimateAttachments from '@/components/estimates/EstimateAttachments';
import CommTimeline from '@/components/shared/CommTimeline';
import { ORGANIC } from '@/components/estimates/estimatePipelineTheme';
import { useLanguage } from '@/lib/i18n';

const uid = () => Math.random().toString(36).slice(2, 10);
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';

function resolvePropertyAddress(estimate, client) {
  const estimateAddress = estimate?.client_address?.trim();
  if (estimateAddress) return estimateAddress;

  const street = client?.service_address || client?.address || '';
  return [street, client?.city, client?.state, client?.zip]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

function SidebarRow({ icon: Icon, label, onClick, expanded, children }) {
  return (
    <div className="overflow-hidden" style={{ background: ORGANIC.surface, borderRadius: ORGANIC.radiusLg, boxShadow: ORGANIC.shadowSm }}>
      <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <Icon className="w-[18px] h-[18px]" style={{ color: ORGANIC.accent700 }} />
        <span className="flex-1 text-[13.5px] font-semibold" style={{ color: ORGANIC.ink900 }}>{label}</span>
        <span className="w-7 h-7 rounded-full grid place-items-center" style={{ background: ORGANIC.accent100, color: ORGANIC.accent700 }}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </span>
      </button>
      {expanded && children && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function EstimatePipelineSidebar({
  estimate,
  client,
  onCustomerChange,
  onChangeCustomer,
  onAttachmentsUpdate,
  onOpenSettings,
  onEstimateUpdate,
  readOnly = false,
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [communicationsOpen, setCommunicationsOpen] = useState(false);
  const [privateNotesOpen, setPrivateNotesOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [tagText, setTagText] = useState('');
  const [fieldDraft, setFieldDraft] = useState({ key: '', value: '' });
  const [tasks, setTasks] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [tags, setTags] = useState([]);
  const [privateNotes, setPrivateNotes] = useState('');
  const [streetViewUnavailable, setStreetViewUnavailable] = useState(false);
  const [propertyPhoto, setPropertyPhoto] = useState(null);
  const [propertyPhotoLoading, setPropertyPhotoLoading] = useState(false);
  const [propertyPhotoUploading, setPropertyPhotoUploading] = useState(false);
  const [form, setForm] = useState({ client_name: '', client_email: '', client_phone: '', client_address: '' });
  const propertyPhotoInputRef = useRef(null);

  useEffect(() => {
    setForm({
      client_name: estimate?.client_name || client?.full_name || '',
      client_email: estimate?.client_email || client?.email || '',
      client_phone: estimate?.client_phone || client?.phone || '',
      client_address: estimate?.client_address || client?.address || '',
    });
  }, [estimate?.client_name, estimate?.client_email, estimate?.client_phone, estimate?.client_address, client]);

  useEffect(() => {
    const pipeline = estimate?.metadata?.pipeline_editor || {};
    setTasks(Array.isArray(pipeline.tasks) ? pipeline.tasks : []);
    setCustomFields(Array.isArray(pipeline.custom_fields) ? pipeline.custom_fields : []);
    setTags(Array.isArray(pipeline.tags) ? pipeline.tags : []);
    setPrivateNotes(estimate?.internal_notes || '');
  }, [estimate?.id, estimate?.metadata, estimate?.internal_notes]);

  const displayName = estimate?.client_name || client?.full_name || 'Cliente';
  const displayEmail = estimate?.client_email || client?.email || '';
  const displayPhone = estimate?.client_phone || client?.phone || '';
  const displayAddress = resolvePropertyAddress(estimate, client);
  const propertyOwnerId = estimate?.client_id || client?.id || '';
  const attachmentCount = Array.isArray(estimate?.attachments) ? estimate.attachments.length : 0;
  const mapsUrl = displayAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}` : '';
  const streetViewUrl = GOOGLE_MAPS_API_KEY && displayAddress
    ? `https://maps.googleapis.com/maps/api/streetview?size=640x320&location=${encodeURIComponent(displayAddress)}&fov=80&pitch=0&radius=100&return_error_code=true&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`
    : '';

  useEffect(() => {
    setStreetViewUnavailable(false);
  }, [displayAddress]);

  useEffect(() => {
    let active = true;
    if (!propertyOwnerId) {
      setPropertyPhoto(null);
      return () => { active = false; };
    }

    setPropertyPhotoLoading(true);
    nexartClient.entities.ProjectPhoto
      .filter({ customer_id: propertyOwnerId, category: 'property' }, '-created_date')
      .then((photos) => {
        if (active) setPropertyPhoto(photos?.[0] || null);
      })
      .catch((error) => {
        console.warn('[EstimatePipelineSidebar] property photo load failed:', error);
        if (active) setPropertyPhoto(null);
      })
      .finally(() => {
        if (active) setPropertyPhotoLoading(false);
      });

    return () => { active = false; };
  }, [propertyOwnerId]);

  const uploadPropertyPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !propertyOwnerId || readOnly) return;
    if (!file.type?.startsWith('image/')) {
      toast.error(t('estimate.sidebar.propertyImageOnly'));
      return;
    }

    setPropertyPhotoUploading(true);
    try {
      const { file_url } = await nexartClient.integrations.Core.UploadFile({ file });
      const user = await nexartClient.auth.me();
      const created = await nexartClient.entities.ProjectPhoto.create({
        photo_url: file_url,
        phase: 'before',
        category: 'property',
        caption: t('estimate.sidebar.propertyPhoto'),
        customer_id: propertyOwnerId,
        customer_name: displayName,
        taken_by: user?.full_name || user?.name || user?.email || 'Admin',
      });
      setPropertyPhoto(created);
      toast.success(t('estimate.sidebar.propertySaved'));
    } catch (error) {
      console.error('[EstimatePipelineSidebar] property photo upload failed:', error);
      toast.error(error?.message || t('estimate.sidebar.propertyUploadFailed'));
    } finally {
      setPropertyPhotoUploading(false);
    }
  };

  const persistPipeline = async (patch) => {
    const currentPipeline = estimate?.metadata?.pipeline_editor || {};
    await onEstimateUpdate?.({
      metadata: {
        ...(estimate?.metadata || {}),
        pipeline_editor: { ...currentPipeline, ...patch },
      },
    });
  };

  const addTask = async () => {
    const label = taskText.trim();
    if (!label) return;
    const next = [...tasks, { id: uid(), label, done: false }];
    setTasks(next);
    setTaskText('');
    await persistPipeline({ tasks: next });
  };

  const updateTasks = async (next) => {
    setTasks(next);
    await persistPipeline({ tasks: next });
  };

  const addField = async () => {
    if (!fieldDraft.key.trim()) return;
    const next = [...customFields, { id: uid(), key: fieldDraft.key.trim(), value: fieldDraft.value.trim() }];
    setCustomFields(next);
    setFieldDraft({ key: '', value: '' });
    await persistPipeline({ custom_fields: next });
  };

  const addTag = async () => {
    const value = tagText.trim();
    if (!value || tags.includes(value)) return;
    const next = [...tags, value];
    setTags(next);
    setTagText('');
    await persistPipeline({ tags: next });
  };

  const saveCustomer = async () => {
    if (!form.client_name.trim()) return;
    setSaving(true);
    try {
      await onCustomerChange({
        client_id: estimate?.client_id || '',
        client_name: form.client_name.trim(),
        client_email: form.client_email.trim(),
        client_phone: form.client_phone.trim(),
        client_address: form.client_address.trim(),
      }, client);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="flex flex-col gap-4">
      <section className="overflow-hidden" style={{ background: ORGANIC.surface, borderRadius: ORGANIC.radiusLg, boxShadow: ORGANIC.shadowSm }}>
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <User className="w-5 h-5" style={{ color: ORGANIC.accent700 }} />
          <span className="font-bold text-[14px] flex-1" style={{ color: ORGANIC.ink900 }}>{t('estimate.sidebar.client')}</span>
          <ChevronUp className="w-4 h-4" style={{ color: ORGANIC.ink400 }} />
        </div>

        <div className="mx-3 h-[145px] rounded-2xl overflow-hidden relative group" style={{ background: ORGANIC.olive200 }}>
          {propertyPhotoLoading ? (
            <div className="h-full animate-pulse" style={{ background: ORGANIC.neutral200 }} />
          ) : propertyPhoto?.photo_url ? (
            <a href={propertyPhoto.photo_url} target="_blank" rel="noreferrer" className="block h-full" title={t('estimate.sidebar.openPropertyPhoto')}>
              <img src={propertyPhoto.photo_url} alt={`${t('estimate.sidebar.propertyPhoto')}: ${displayAddress || displayName}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
            </a>
          ) : displayAddress ? (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="block h-full" title={t('estimate.sidebar.openMaps')}>
              {streetViewUrl && !streetViewUnavailable ? (
                <img
                  src={streetViewUrl}
                  alt={`${t('estimate.sidebar.propertyPhoto')}: ${displayAddress}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                  onError={() => setStreetViewUnavailable(true)}
                />
              ) : (
                <div className="h-full border-2 border-dashed grid place-items-center text-center px-5" style={{ borderColor: ORGANIC.neutral300, color: ORGANIC.ink400, background: ORGANIC.neutral100 }}>
                  <div>
                    <FileText className="w-5 h-5 mx-auto mb-1.5" />
                    <p className="text-[11px] font-semibold">{t('estimate.sidebar.propertyPhoto')}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: ORGANIC.ink300 }}>
                      {GOOGLE_MAPS_API_KEY ? t('estimate.sidebar.propertyUnavailable') : t('estimate.sidebar.propertySetupRequired')}
                    </p>
                  </div>
                </div>
              )}
            </a>
          ) : (
            <div className="h-full border-2 border-dashed grid place-items-center text-center px-4" style={{ borderColor: ORGANIC.neutral300, color: ORGANIC.ink400 }}>
              <div><FileText className="w-5 h-5 mx-auto mb-1.5" /><p className="text-[11px]">{t('estimate.sidebar.propertyPhoto')}<br /><span style={{ color: ORGANIC.ink300 }}>{t('estimate.sidebar.noImage')}</span></p></div>
            </div>
          )}
          {!propertyPhotoLoading && (
            <span className="absolute left-2.5 bottom-2.5 max-w-[calc(100%-20px)] inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-sm pointer-events-none" style={{ background: 'rgba(32,30,29,0.76)' }}>
              {propertyPhoto?.photo_url
                ? t('estimate.sidebar.propertyUploaded')
                : streetViewUrl && !streetViewUnavailable
                  ? t('estimate.sidebar.propertyStreetView')
                  : displayAddress ? t('estimate.sidebar.openMaps') : t('estimate.sidebar.noImage')}
              {(propertyPhoto?.photo_url || displayAddress) && <ExternalLink className="w-3 h-3" />}
            </span>
          )}
          {!readOnly && propertyOwnerId && (
            <button
              type="button"
              onClick={() => propertyPhotoInputRef.current?.click()}
              disabled={propertyPhotoUploading}
              className="absolute right-2.5 top-2.5 h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[10px] font-bold text-white shadow-sm disabled:opacity-60"
              style={{ background: 'rgba(32,30,29,0.78)' }}
              title={propertyPhoto?.photo_url ? t('estimate.sidebar.replacePropertyPhoto') : t('estimate.sidebar.uploadPropertyPhoto')}
            >
              <Camera className="w-3.5 h-3.5" />
              {propertyPhotoUploading
                ? t('estimate.sidebar.propertyUploading')
                : propertyPhoto?.photo_url ? t('estimate.sidebar.replacePhoto') : t('estimate.sidebar.uploadPhoto')}
            </button>
          )}
          <input ref={propertyPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={uploadPropertyPhoto} />
        </div>

        {editing ? (
          <div className="px-4 py-4 space-y-2">
            <Input value={form.client_name} onChange={(event) => setForm((current) => ({ ...current, client_name: event.target.value }))} placeholder="Nombre completo" className="h-9 text-xs rounded-full" />
            <Input value={form.client_phone} onChange={(event) => setForm((current) => ({ ...current, client_phone: event.target.value }))} placeholder="Teléfono" className="h-9 text-xs rounded-full" />
            <Input value={form.client_email} onChange={(event) => setForm((current) => ({ ...current, client_email: event.target.value }))} placeholder="Correo" className="h-9 text-xs rounded-full" />
            <Input value={form.client_address} onChange={(event) => setForm((current) => ({ ...current, client_address: event.target.value }))} placeholder="Dirección" className="h-9 text-xs rounded-full" />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={saveCustomer} disabled={saving} className="flex-1 h-9 rounded-full text-xs font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: ORGANIC.accent }}><Check className="w-3.5 h-3.5" />{saving ? t('common.saving') : t('common.save')}</button>
              <button type="button" onClick={() => setEditing(false)} className="h-9 px-4 rounded-full border text-xs font-semibold" style={{ borderColor: ORGANIC.divider }}>{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <strong className="text-[14px] flex-1 truncate" style={{ color: ORGANIC.ink900 }}>{displayName}</strong>
              <button type="button" onClick={() => setEditing(true)} className="h-8 px-3.5 rounded-full border-2 text-[11.5px] font-semibold" style={{ borderColor: ORGANIC.accent, color: ORGANIC.accent700 }}>{t('estimate.sidebar.details')}</button>
            </div>
            {displayAddress && <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2 mt-3 text-[12.5px]" style={{ color: ORGANIC.ink700 }}><MapPin className="w-3.5 h-3.5 mt-0.5 flex-none" />{displayAddress}</a>}
            {displayPhone && <a href={`tel:${displayPhone}`} className="flex items-center gap-2 mt-3 pt-3 border-t text-[12.5px]" style={{ borderColor: ORGANIC.divider, color: ORGANIC.ink700 }}><Phone className="w-3.5 h-3.5" />{displayPhone}</a>}
            {displayEmail && <a href={`mailto:${displayEmail}`} className="flex items-center gap-2 mt-3 pt-3 border-t text-[12.5px]" style={{ borderColor: ORGANIC.divider, color: ORGANIC.ink700 }}><Mail className="w-3.5 h-3.5" /><span className="truncate">{displayEmail}</span></a>}
            {displayEmail && <span className="inline-block mt-3 px-3 py-1 rounded-full text-[10.5px] font-semibold" style={{ background: ORGANIC.olive200, color: ORGANIC.olive800 }}>{t('estimate.sidebar.notifications')}</span>}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: ORGANIC.divider }}>
              <Link to="/clients" className="inline-flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: ORGANIC.accent700 }}>{t('estimate.sidebar.profile')} <ExternalLink className="w-2.5 h-2.5" /></Link>
              {onChangeCustomer && <button type="button" onClick={onChangeCustomer} className="text-[11.5px]" style={{ color: ORGANIC.ink400 }}>{t('estimate.sidebar.change')}</button>}
            </div>
          </div>
        )}
      </section>

      {displayAddress && (
        <section className="p-3" style={{ background: ORGANIC.surface, borderRadius: ORGANIC.radiusLg, boxShadow: ORGANIC.shadowSm }}>
          <div className="h-[205px] rounded-2xl overflow-hidden" style={{ background: ORGANIC.olive200 }}>
            <iframe title={t('estimate.sidebar.projectLocation')} width="100%" height="205" style={{ border: 0, display: 'block' }} src={`https://www.google.com/maps?q=${encodeURIComponent(displayAddress)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: ORGANIC.accent700 }}><MapPin className="w-3.5 h-3.5" />{t('estimate.sidebar.projectLocation')}</div>
        </section>
      )}

      <SidebarRow icon={NotebookPen} label={t('estimate.sidebar.tasks')} expanded={tasksOpen} onClick={() => setTasksOpen((value) => !value)}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 rounded-xl px-2 py-2" style={{ background: ORGANIC.olive100 }}>
              <button type="button" onClick={() => updateTasks(tasks.map(item => item.id === task.id ? { ...item, done: !item.done } : item))} className="flex-none" style={{ color: ORGANIC.olive700 }}>
                {task.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </button>
              <span className={`flex-1 text-xs ${task.done ? 'line-through opacity-60' : ''}`}>{task.label}</span>
              <button type="button" onClick={() => updateTasks(tasks.filter(item => item.id !== task.id))} title={t('common.delete')} style={{ color: ORGANIC.ink400 }}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {!tasks.length && <p className="text-xs" style={{ color: ORGANIC.ink400 }}>{t('estimate.sidebar.noTasks')}</p>}
          <div className="flex gap-2 pt-1">
            <Input value={taskText} onChange={event => setTaskText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addTask(); }} placeholder={t('estimate.sidebar.taskPlaceholder')} className="h-9 rounded-full text-xs" />
            <button type="button" onClick={addTask} className="w-9 h-9 rounded-full grid place-items-center text-white flex-none" style={{ background: ORGANIC.accent }}><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </SidebarRow>

      <SidebarRow icon={FileText} label={t('estimate.sidebar.fields')} expanded={fieldsOpen} onClick={() => setFieldsOpen((value) => !value)}>
        <div className="space-y-2">
          {customFields.map((field) => <div key={field.id} className="flex items-start gap-2 text-xs"><div className="flex-1"><strong>{field.key}</strong><p style={{ color: ORGANIC.ink400 }}>{field.value || '—'}</p></div><button type="button" onClick={async () => { const next = customFields.filter(item => item.id !== field.id); setCustomFields(next); await persistPipeline({ custom_fields: next }); }} title={t('common.delete')} style={{ color: ORGANIC.ink400 }}><Trash2 className="w-3.5 h-3.5" /></button></div>)}
          {!customFields.length && <p className="text-xs" style={{ color: ORGANIC.ink400 }}>{t('estimate.sidebar.noFields')}</p>}
          <Input value={fieldDraft.key} onChange={event => setFieldDraft(current => ({ ...current, key: event.target.value }))} placeholder={t('estimate.sidebar.fieldName')} className="h-9 rounded-full text-xs" />
          <div className="flex gap-2"><Input value={fieldDraft.value} onChange={event => setFieldDraft(current => ({ ...current, value: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') addField(); }} placeholder={t('estimate.sidebar.fieldValue')} className="h-9 rounded-full text-xs" /><button type="button" onClick={addField} className="w-9 h-9 rounded-full grid place-items-center text-white flex-none" style={{ background: ORGANIC.accent }}><Plus className="w-4 h-4" /></button></div>
        </div>
      </SidebarRow>
      <SidebarRow icon={Tag} label={t('estimate.sidebar.tags')} expanded={tagsOpen} onClick={() => setTagsOpen((value) => !value)}>
        <div className="flex flex-wrap gap-1.5 mb-3">{tags.map(tag => <button type="button" key={tag} onClick={async () => { const next = tags.filter(item => item !== tag); setTags(next); await persistPipeline({ tags: next }); }} className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: ORGANIC.accent100, color: ORGANIC.accent700 }} title={t('common.delete')}>{tag} ×</button>)}</div>
        {!tags.length && <p className="text-xs mb-2" style={{ color: ORGANIC.ink400 }}>{t('estimate.sidebar.noTags')}</p>}
        <div className="flex gap-2"><Input value={tagText} onChange={event => setTagText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addTag(); }} placeholder={t('estimate.sidebar.tagPlaceholder')} className="h-9 rounded-full text-xs" /><button type="button" onClick={addTag} className="w-9 h-9 rounded-full grid place-items-center text-white flex-none" style={{ background: ORGANIC.accent }}><Plus className="w-4 h-4" /></button></div>
      </SidebarRow>
      <SidebarRow icon={NotebookPen} label={t('estimate.sidebar.privateNotes')} expanded={privateNotesOpen} onClick={() => setPrivateNotesOpen((value) => !value)}>
        <textarea value={privateNotes} onChange={event => setPrivateNotes(event.target.value)} placeholder={t('estimate.sidebar.notesPlaceholder')} className="w-full min-h-24 rounded-2xl border bg-transparent px-3 py-2 text-xs focus:outline-none" style={{ borderColor: ORGANIC.divider }} />
        <button type="button" onClick={() => onEstimateUpdate?.({ internal_notes: privateNotes })} className="mt-2 h-8 px-4 rounded-full text-xs font-semibold text-white" style={{ background: ORGANIC.accent }}>{t('common.save')}</button>
      </SidebarRow>
      <SidebarRow icon={Paperclip} label={`${t('estimate.sidebar.attachments')}${attachmentCount ? ` (${attachmentCount})` : ''}`} expanded={attachmentsOpen} onClick={() => setAttachmentsOpen((value) => !value)}>
        <EstimateAttachments attachments={estimate?.attachments} onUpdate={onAttachmentsUpdate} />
      </SidebarRow>
      <SidebarRow icon={Mail} label={t('estimate.sidebar.communications')} expanded={communicationsOpen} onClick={() => setCommunicationsOpen((value) => !value)}>
        {estimate?.id && <CommTimeline estimateId={estimate.id} />}
      </SidebarRow>
      <SidebarRow icon={SlidersHorizontal} label={t('estimate.sidebar.settings')} onClick={onOpenSettings} />
    </aside>
  );
}
