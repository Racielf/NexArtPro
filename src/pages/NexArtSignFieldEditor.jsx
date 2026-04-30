import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  Copy,
  FileSignature,
  GripVertical,
  Hash,
  Loader2,
  MousePointer2,
  PenLine,
  Plus,
  Save,
  Trash2,
  Type,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { listSigningTemplates, applySigningTemplateToPackage } from '@/lib/signingTemplates';

const FIELD_TYPES = [
  { type: 'signature', label: 'Signature', icon: PenLine, width: 180, height: 54 },
  { type: 'initials', label: 'Initials', icon: FileSignature, width: 96, height: 42 },
  { type: 'date', label: 'Date signed', icon: CalendarDays, width: 132, height: 38 },
  { type: 'name', label: 'Full name', icon: UserRound, width: 164, height: 38 },
  { type: 'text', label: 'Text', icon: Type, width: 180, height: 40 },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, width: 42, height: 42 },
];

const PAGE_WIDTH = 820;
const PAGE_HEIGHT = 1060;

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    packageId: params.get('packageId') || params.get('id') || '',
  };
}

function makeField({ type, page, participantId, count }) {
  const config = FIELD_TYPES.find(item => item.type === type) || FIELD_TYPES[0];
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    label: config.label,
    required: true,
    page,
    x: 80 + ((count * 24) % 240),
    y: 110 + ((count * 36) % 420),
    width: config.width,
    height: config.height,
    participant_id: participantId || '',
    participant_role: '',
    placeholder: config.label,
    value: '',
  };
}

function normalizeFields(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.fields)) return raw.fields;
  return [];
}

function FieldBadge({ field, participant }) {
  const config = FIELD_TYPES.find(item => item.type === field.type) || FIELD_TYPES[0];
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
      <Icon className="w-3.5 h-3.5" />
      <span>{field.label || config.label}</span>
      {participant && <span className="text-slate-400 font-normal">• {participant.name || participant.email}</span>}
    </div>
  );
}

export default function NexArtSignFieldEditor() {
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const { packageId } = getParams();
  const [pkg, setPkg] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  const participantsById = useMemo(() => new Map(participants.map(item => [item.id, item])), [participants]);
  const visibleFields = useMemo(() => fields.filter(field => Number(field.page || 1) === page), [fields, page]);
  const selectedField = useMemo(() => fields.find(field => field.id === selectedFieldId) || null, [fields, selectedFieldId]);
  const sourcePdfUrl = pkg?.source_pdf_url || pkg?.final_pdf_url || '';

  const load = async () => {
    if (!packageId) {
      toast.error('Missing signing package id');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [packageRows, participantRows] = await Promise.all([
        base44.entities.SigningPackage.filter({ id: packageId }).catch(() => []),
        base44.entities.SigningParticipant.filter({ signing_package_id: packageId }).catch(() => []),
      ]);

      const currentPackage = packageRows?.[0] || null;
      if (!currentPackage) throw new Error('Signing package not found');

      const savedConfig = currentPackage.field_config || currentPackage.document_fields || currentPackage.audit_summary?.field_config || {};
      const savedFields = normalizeFields(savedConfig);

      setPkg(currentPackage);
      setParticipants((participantRows || []).sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1)));
      setFields(savedFields);
      setPageCount(Number(savedConfig.page_count || currentPackage.page_count || currentPackage.audit_summary?.page_count || 1));
      setSelectedFieldId(savedFields?.[0]?.id || '');

      const availableTemplates = await listSigningTemplates({
        documentType: currentPackage.document_type || 'estimate',
      });
      setTemplates(availableTemplates);
      if (availableTemplates.length > 0) {
        setSelectedTemplateId(availableTemplates[0].id);
      }
    } catch (err) {
      toast.error(err?.message || 'Could not load signing package');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [packageId]);

  const updateField = (fieldId, patch) => {
    setFields(current => current.map(field => field.id === fieldId ? { ...field, ...patch } : field));
  };

  const handleApplyTemplate = async () => {
    if (!pkg?.id || !selectedTemplateId) return;
    if (isApplyingTemplate) return;
    setIsApplyingTemplate(true);
    try {
      const result = await applySigningTemplateToPackage({ packageId: pkg.id, templateId: selectedTemplateId });
      if (!result?.package) throw new Error('Invalid response applying template');
      setPkg(result.package);
      setFields(result.package.document_fields ?? []);
      toast.success('Template applied');
    } catch (error) {
      console.error('[handleApplyTemplate] Failed to apply template', error);
      toast.error(error?.message || 'Could not apply template');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const addField = (type) => {
    const participantId = participants.find(item => item.status === 'active')?.id || participants[0]?.id || '';
    const field = makeField({ type, page, participantId, count: fields.length });
    setFields(current => [...current, field]);
    setSelectedFieldId(field.id);
  };

  const duplicateField = () => {
    if (!selectedField) return;
    const clone = {
      ...selectedField,
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      x: Math.min(PAGE_WIDTH - selectedField.width - 20, selectedField.x + 24),
      y: Math.min(PAGE_HEIGHT - selectedField.height - 20, selectedField.y + 24),
    };
    setFields(current => [...current, clone]);
    setSelectedFieldId(clone.id);
  };

  const removeField = (fieldId) => {
    setFields(current => current.filter(field => field.id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId('');
  };

  const handlePointerDown = (event, field) => {
    event.preventDefault();
    setSelectedFieldId(field.id);
    setDraggingId(field.id);

    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = field.x;
    const initialY = field.y;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const nextX = Math.max(0, Math.min(PAGE_WIDTH - field.width, initialX + dx));
      const nextY = Math.max(0, Math.min(PAGE_HEIGHT - field.height, initialY + dy));
      updateField(field.id, { x: Math.round(nextX), y: Math.round(nextY) });
    };

    const onUp = () => {
      setDraggingId('');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const save = async () => {
    if (!pkg?.id) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const fieldConfig = {
        version: 1,
        page_count: pageCount,
        coordinate_system: {
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          unit: 'editor_px',
        },
        fields: fields.map((field, index) => ({
          ...field,
          order: index + 1,
          page: Number(field.page || 1),
          x: Number(field.x || 0),
          y: Number(field.y || 0),
          width: Number(field.width || 0),
          height: Number(field.height || 0),
        })),
        updated_at: now,
      };

      await base44.entities.SigningPackage.update(pkg.id, {
        field_config: fieldConfig,
        document_fields: fieldConfig.fields,
        page_count: pageCount,
        audit_summary: {
          ...(pkg.audit_summary || {}),
          field_config_version: fieldConfig.version,
          field_count: fieldConfig.fields.length,
          page_count: pageCount,
          fields_updated_at: now,
        },
      });

      const currentUser = await base44.auth.me().catch(() => null);
      await base44.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        event_type: 'fields_configured',
        actor_name: currentUser?.full_name || currentUser?.email || 'system',
        actor_email: currentUser?.email || '',
        created_at: now,
        metadata: {
          field_count: fieldConfig.fields.length,
          page_count: pageCount,
          field_types: fieldConfig.fields.reduce((acc, field) => {
            acc[field.type] = (acc[field.type] || 0) + 1;
            return acc;
          }, {}),
        },
        company_id: pkg.company_id || pkg.audit_summary?.company_id || currentUser?.company_id || '',
      }).catch(() => {});

      setPkg(current => ({ ...current, field_config: fieldConfig, document_fields: fieldConfig.fields }));
      toast.success('Signing fields saved');
    } catch (err) {
      toast.error(err?.message || 'Could not save signing fields');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /> Loading field editor...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/nexartsign')} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NEXARTSIGN FIELD EDITOR</p>
            <h1 className="font-bold text-slate-900 truncate">{pkg?.document_title || 'Signing Package'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
            <Hash className="w-3.5 h-3.5" /> {fields.length} fields
          </div>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Fields
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[280px_1fr_320px]">
        <aside className="bg-white border-r border-slate-200 p-4 overflow-y-auto space-y-5">
          <div>
            <h2 className="font-bold text-slate-900 mb-3">Add fields</h2>
            <div className="grid grid-cols-1 gap-2">
              {FIELD_TYPES.map(item => {
                const Icon = item.icon;
                return (
                  <Button key={item.type} variant="outline" className="justify-start gap-2" onClick={() => addField(item.type)}>
                    <Icon className="w-4 h-4" /> {item.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="font-bold text-slate-900 mb-3">Pages</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Prev</Button>
              <input
                type="number"
                value={page}
                min={1}
                max={pageCount}
                onChange={event => setPage(Math.max(1, Math.min(pageCount, Number(event.target.value) || 1)))}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-center"
              />
              <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next</Button>
            </div>
            <label className="block mt-3 text-xs font-semibold text-slate-500 uppercase">Page count</label>
            <input
              type="number"
              value={pageCount}
              min={1}
              onChange={event => setPageCount(Math.max(1, Number(event.target.value) || 1))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <h2 className="font-bold text-slate-900 mb-3">Field list</h2>
            {fields.length === 0 ? (
              <p className="text-sm text-slate-500">No fields yet. Add a signature or date field to start.</p>
            ) : (
              <div className="space-y-2">
                {fields.map(field => {
                  const participant = participantsById.get(field.participant_id);
                  return (
                    <button
                      key={field.id}
                      onClick={() => { setSelectedFieldId(field.id); setPage(Number(field.page || 1)); }}
                      className={`w-full text-left rounded-xl border px-3 py-2 text-sm ${selectedFieldId === field.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <FieldBadge field={field} participant={participant} />
                      <p className="text-[11px] text-slate-400 mt-1">Page {field.page} • x {field.x}, y {field.y}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="overflow-auto p-6">
          <div className="mx-auto w-fit">
            <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
              <span>Page {page} of {pageCount}</span>
              <span className="flex items-center gap-1"><MousePointer2 className="w-4 h-4" /> Drag fields to position them</span>
            </div>

            <div ref={pageRef} className="relative bg-white shadow-xl border border-slate-300" style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}>
              {sourcePdfUrl ? (
                <iframe
                  title="PDF preview"
                  src={`${sourcePdfUrl}#page=${page}&toolbar=0&navpanes=0`}
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-70"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">No PDF preview available</div>
              )}

              <div className="absolute inset-0 bg-white/10" />

              {visibleFields.map(field => {
                const participant = participantsById.get(field.participant_id);
                const isSelected = field.id === selectedFieldId;
                return (
                  <div
                    key={field.id}
                    onPointerDown={event => handlePointerDown(event, field)}
                    className={`absolute rounded-lg border-2 bg-blue-50/90 text-blue-900 shadow-sm cursor-move select-none ${isSelected ? 'border-blue-700 ring-2 ring-blue-200' : 'border-blue-300'} ${draggingId === field.id ? 'opacity-80' : ''}`}
                    style={{ left: field.x, top: field.y, width: field.width, height: field.height }}
                  >
                    <div className="h-full w-full flex items-center justify-center px-2 text-center">
                      <div>
                        <FieldBadge field={field} participant={participant} />
                        {field.required && <p className="text-[10px] text-blue-700 mt-0.5">Required</p>}
                      </div>
                    </div>
                    <GripVertical className="absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        <aside className="bg-white border-l border-slate-200 p-4 overflow-y-auto">
          <h2 className="font-bold text-slate-900 mb-3">Field properties</h2>
          {!selectedField ? (
            <p className="text-sm text-slate-500">Select a field to edit its properties.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Label</label>
                <input
                  value={selectedField.label || ''}
                  onChange={event => updateField(selectedField.id, { label: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Assigned signer</label>
                <select
                  value={selectedField.participant_id || ''}
                  onChange={event => updateField(selectedField.id, { participant_id: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Package signer</option>
                  {participants.map(participant => (
                    <option key={participant.id} value={participant.id}>{participant.name || participant.email} — {participant.role || 'signer'}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Page</label>
                  <input type="number" value={selectedField.page || 1} min={1} max={pageCount} onChange={event => updateField(selectedField.id, { page: Number(event.target.value) || 1 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Required</label>
                  <select value={selectedField.required ? 'yes' : 'no'} onChange={event => updateField(selectedField.id, { required: event.target.value === 'yes' })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold uppercase tracking-wide text-slate-500">X</label><input type="number" value={selectedField.x} onChange={event => updateField(selectedField.id, { x: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
                <div><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Y</label><input type="number" value={selectedField.y} onChange={event => updateField(selectedField.id, { y: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
                <div><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Width</label><input type="number" value={selectedField.width} onChange={event => updateField(selectedField.id, { width: Number(event.target.value) || 1 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
                <div><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Height</label><input type="number" value={selectedField.height} onChange={event => updateField(selectedField.id, { height: Number(event.target.value) || 1 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Placeholder / instructions</label>
                <textarea
                  value={selectedField.placeholder || ''}
                  onChange={event => updateField(selectedField.id, { placeholder: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[82px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="gap-2" onClick={duplicateField}><Copy className="w-4 h-4" />Duplicate</Button>
                <Button variant="outline" className="gap-2 text-red-700 border-red-200 hover:bg-red-50" onClick={() => removeField(selectedField.id)}><Trash2 className="w-4 h-4" />Delete</Button>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-center gap-2 font-semibold mb-1"><Plus className="w-4 h-4" /> Sprint 3 base</div>
            <p>These fields are saved to the signing package as structured coordinates. The next sprint can render required fields inside the public signing flow and apply them to the final PDF.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}