import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MessageSquare, CheckSquare2, Square, Plus, Trash2, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CHECKLIST_ITEMS = [
  'Materials delivered',
  'Work started on-site',
  'Work completed',
  'Cleanup completed',
  'Client walkthrough done',
];

export default function WOFieldExecution({ workOrder, workOrderId, onUpdate }) {
  const [fieldNotes, setFieldNotes] = useState(workOrder?.field_notes || []);
  const [checklist, setChecklist] = useState(workOrder?.execution_checklist || []);
  const [newNote, setNewNote] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newChecklistIsExtra, setNewChecklistIsExtra] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkedInAt, setCheckedInAt] = useState(workOrder?.checked_in_at || null);
  const [checkingIn, setCheckingIn] = useState(false);
  const fileRef = useRef();
  const beforeFileRef = useRef();
  const afterFileRef = useRef();

  React.useEffect(() => {
    loadPhotos();
  }, [workOrderId]);

  const handleCheckIn = async () => {
    if (checkedInAt || checkingIn) return;
    setCheckingIn(true);
    const now = new Date().toISOString();
    await base44.entities.WorkOrder.update(workOrderId, {
      checked_in_at: now,
      checked_in_by: 'Field Staff',
      field_status: 'checked_in',
    });
    setCheckedInAt(now);
    setCheckingIn(false);
    toast.success('Checked in on site');
  };

  const loadPhotos = async () => {
    const data = await base44.entities.ProjectPhoto.filter({ work_order_id: workOrderId });
    const allPhotos = data || [];
    setBeforePhotos(allPhotos.filter(p => p.phase === 'before'));
    setAfterPhotos(allPhotos.filter(p => p.phase === 'after'));
    setPhotos(allPhotos.filter(p => p.phase !== 'before' && p.phase !== 'after'));
  };

  // Initialize checklist on first render if empty
  React.useEffect(() => {
    if (checklist.length === 0 && workOrder) {
      const defaultChecklist = DEFAULT_CHECKLIST_ITEMS.map(item => ({
        id: `checklist-${Date.now()}-${Math.random()}`,
        item,
        completed: false,
      }));
      setChecklist(defaultChecklist);
      persistChecklist(defaultChecklist);
    }
  }, []);

  const addFieldNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);

    const note = {
      id: `note-${Date.now()}`,
      text: newNote,
      created_by: 'Field Staff',
      created_at: new Date().toISOString(),
    };

    const updated = [...fieldNotes, note];
    setFieldNotes(updated);
    setNewNote('');
    await base44.entities.WorkOrder.update(workOrderId, { field_notes: updated });
    setSavingNote(false);
    toast.success('Field note added');
  };

  const deleteFieldNote = async (noteId) => {
    if (!confirm('Delete this note?')) return;
    const updated = fieldNotes.filter(n => n.id !== noteId);
    setFieldNotes(updated);
    await base44.entities.WorkOrder.update(workOrderId, { field_notes: updated });
    toast.success('Note deleted');
  };

  const persistChecklist = async (items) => {
    await base44.entities.WorkOrder.update(workOrderId, { execution_checklist: items });
  };

  const toggleChecklistItem = async (itemId) => {
    const targetItem = checklist.find(i => i.id === itemId);

    const isTryingToCompleteLast =
      targetItem &&
      !targetItem.completed &&
      checklist.filter(i => !i.completed).length === 1 &&
      afterPhotos.length === 0;

    if (isTryingToCompleteLast) {
      toast.error('Upload at least one After Photo before completing work');
      return;
    }

    const updated = checklist.map(item => {
      if (item.id === itemId) {
        const newCompleted = !item.completed;
        return {
          ...item,
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
          completed_by: newCompleted ? 'Field Staff' : null,
        };
      }
      return item;
    });

    setChecklist(updated);
    await persistChecklist(updated);
  };

  const addChecklistItem = async () => {
    const label = newChecklistItem.trim();
    if (!label) return;
    const item = {
      id: `checklist-${Date.now()}`,
      item: label,
      completed: false,
      created_by: 'Field Staff',
      created_at: new Date().toISOString(),
      source: 'field',
      type: newChecklistIsExtra ? 'extra' : 'normal',
      approval_status: newChecklistIsExtra ? 'pending_office_approval' : 'not_required',
    };
    const updated = [...checklist, item];
    setChecklist(updated);
    setNewChecklistItem('');
    setNewChecklistIsExtra(false);
    await persistChecklist(updated);
    toast.success('Checklist item added');
  };

  const handleBeforePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBefore(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.ProjectPhoto.create({
      photo_url: file_url,
      phase: 'before',
      work_order_id: workOrderId,
      work_order_number: workOrder?.work_order_number,
      customer_name: workOrder?.client_name,
      taken_by: 'Field Staff',
      caption: 'Before photo',
    });
    toast.success('Before photo uploaded');
    setUploadingBefore(false);
    e.target.value = '';
    loadPhotos();
  };

  const handleAfterPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.ProjectPhoto.create({
      photo_url: file_url,
      phase: 'after',
      work_order_id: workOrderId,
      work_order_number: workOrder?.work_order_number,
      customer_name: workOrder?.client_name,
      taken_by: 'Field Staff',
      caption: 'After photo',
    });
    toast.success('After photo uploaded');
    setUploading(false);
    e.target.value = '';
    loadPhotos();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.ProjectPhoto.create({
      photo_url: file_url,
      phase: 'during',
      work_order_id: workOrderId,
      work_order_number: workOrder?.work_order_number,
      customer_name: workOrder?.client_name,
      taken_by: 'Field Staff',
      caption: '',
    });
    toast.success('Photo uploaded');
    setUploading(false);
    e.target.value = '';
    loadPhotos();
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm('Delete this photo?')) return;
    await base44.entities.ProjectPhoto.delete(photoId);
    toast.success('Photo deleted');
    loadPhotos();
  };

  const completedCount = checklist.filter(c => c.completed).length;
  const isChecklistLocked = !checkedInAt || beforePhotos.length === 0;
  const isNearCompletionWithoutAfterPhoto = afterPhotos.length === 0 && completedCount === checklist.length - 1;
  const checklistProgress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* ── FIELD CHECK-IN ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Field Check-In</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {checkedInAt
                ? `Checked in ${new Date(checkedInAt).toLocaleString()}`
                : 'Register arrival before starting field execution'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleCheckIn}
            disabled={!!checkedInAt || checkingIn}
            className={checkedInAt ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-slate-900 hover:bg-black text-white'}
          >
            {checkedInAt ? 'Checked In' : checkingIn ? 'Checking In…' : 'Check In'}
          </Button>
        </div>
      </div>

      {/* ── BEFORE PHOTOS ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Before Photos</h3>
              <p className="text-xs text-slate-500 mt-0.5">Capture the job condition before work starts</p>
            </div>
            {beforePhotos.length > 0 && (
              <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">{beforePhotos.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => beforeFileRef.current?.click()} disabled={!checkedInAt || uploadingBefore}>
              {uploadingBefore ? 'Uploading…' : 'Upload Before'}
            </Button>
            <input ref={beforeFileRef} type="file" accept="image/*" className="hidden" onChange={handleBeforePhotoUpload} />
          </div>
        </div>
        <div className="px-6 py-5">
          {!checkedInAt ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              Check in first to unlock before photos.
            </div>
          ) : beforePhotos.length === 0 ? (
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center text-slate-400 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
              onClick={() => beforeFileRef.current?.click()}
            >
              <Camera className="w-7 h-7 mb-2" />
              <p className="text-sm font-medium">Upload before photos</p>
              <p className="text-xs mt-0.5">Recommended before starting work</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {beforePhotos.map(p => (
                <div key={p.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <img src={p.photo_url} alt="Before photo" className="w-full h-28 object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── EXECUTION CHECKLIST ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-slate-900">Field Completion Checklist</h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">
            {completedCount}/{checklist.length}
          </span>
        </div>
        <div className="px-6 py-5">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-medium">Completion Progress</span>
              <span className="text-xs font-semibold text-slate-700">{checklistProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
          </div>

          {isNearCompletionWithoutAfterPhoto && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
              Final task requires After Photos before completion.
            </div>
          )}

          {/* Checklist items */}
          {isChecklistLocked && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 font-medium">
              Upload at least one Before Photo to unlock task execution.
            </div>
          )}
          <div className={`space-y-2 ${isChecklistLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {checklist.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50">
                <button
                  onClick={() => {
                    if (isChecklistLocked) return;
                    toggleChecklistItem(item.id);
                  }}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    item.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-slate-300 hover:border-primary'
                  }`}
                >
                  {item.completed && <Square className="w-3 h-3 text-white fill-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {item.item}
                    </p>
                    {item.type === 'extra' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                        Extra · Pending approval
                      </span>
                    )}
                  </div>
                  {item.completed_at && (
                    <p className="text-xs text-green-600 mt-0.5">
                      ✓ {new Date(item.completed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={e => setNewChecklistItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addChecklistItem(); }}
                placeholder="Add task found on site..."
                className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button size="sm" onClick={addChecklistItem} disabled={!newChecklistItem.trim()} className="h-9 gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newChecklistIsExtra}
                onChange={e => setNewChecklistIsExtra(e.target.checked)}
                className="rounded accent-amber-500"
              />
              Mark as extra work — needs office approval
            </label>
          </div>
        </div>
      </div>

      {/* ── FIELD NOTES ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-slate-900">Field Notes</h3>
          {fieldNotes.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium ml-auto">
              {fieldNotes.length}
            </span>
          )}
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Add note form */}
          <div className="space-y-2">
            <textarea
              placeholder="Add field note…"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              className="w-full h-16 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <Button
              size="sm"
              onClick={addFieldNote}
              disabled={!newNote.trim() || savingNote}
              className="w-full gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {savingNote ? 'Saving…' : 'Add Note'}
            </Button>
          </div>

          {/* Notes list */}
          {fieldNotes.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              {[...fieldNotes].reverse().map(note => (
                <div key={note.id} className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-slate-700 flex-1">{note.text}</p>
                    <button
                      onClick={() => deleteFieldNote(note.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{note.created_by}</span>
                    <span>•</span>
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── AFTER PHOTOS ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">After Photos</h3>
              <p className="text-xs text-slate-500 mt-0.5">Capture final result before closing work</p>
            </div>
            {afterPhotos.length > 0 && (
              <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">{afterPhotos.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => afterFileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload After'}
            </Button>
            <input ref={afterFileRef} type="file" accept="image/*" className="hidden" onChange={handleAfterPhotoUpload} />
          </div>
        </div>
        <div className="px-6 py-5">
          {afterPhotos.length === 0 ? (
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center text-slate-400 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
              onClick={() => afterFileRef.current?.click()}
            >
              <Camera className="w-7 h-7 mb-2" />
              <p className="text-sm font-medium">Upload after photos</p>
              <p className="text-xs mt-0.5">Required before completion</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {afterPhotos.map(p => (
                <div key={p.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <img src={p.photo_url} alt="After photo" className="w-full h-28 object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PROOF OF WORK PHOTOS ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-slate-900">Proof of Work Photos</h3>
            {photos.length > 0 && (
              <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">{photos.length}</span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Upload
              </>
            )}
          </Button>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handlePhotoUpload} />
        </div>
        <div className="px-6 py-5">
          {photos.length === 0 ? (
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center text-slate-400 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="w-7 h-7 mb-2" />
              <p className="text-sm font-medium">Upload photo evidence</p>
              <p className="text-xs mt-0.5">Click to select</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map(p => {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(p.file_name || '');
                return (
                  <div key={p.id} className="group relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    {isImage ? (
                      <img src={p.photo_url} alt="Work photo" className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 flex flex-col items-center justify-center bg-slate-100">
                        <Camera className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-400 uppercase font-medium">File</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleDeletePhoto(p.id)}
                        className="bg-white rounded-full p-1.5 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
