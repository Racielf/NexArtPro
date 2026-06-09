import React, { useState, useEffect } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { StickyNote, Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';

export default function WorkerNotes({ worker }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadNotes(); }, [worker.id]);

  const loadNotes = async () => {
    setLoading(true);
    const data = await nexartClient.entities.WorkerNote.filter({ worker_id: worker.id }, '-created_date');
    setNotes(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    const user = await nexartClient.auth.me();
    await nexartClient.entities.WorkerNote.create({
      worker_id: worker.id,
      worker_name: worker.full_name,
      content: newNote.trim(),
      created_by: user?.full_name || user?.email || 'Admin',
    });
    toast.success('Note added');
    setNewNote('');
    setSaving(false);
    loadNotes();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;
    await nexartClient.entities.WorkerNote.delete(id);
    loadNotes();
  };

  return (
    <div>
      <h3 className="text-base font-bold text-slate-900 mb-4">Notes</h3>

      {/* Add note */}
      <div className="flex gap-2 mb-4">
        <Textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note about this worker..."
          rows={2}
          className="flex-1 resize-none text-sm"
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleAdd(); }}
        />
        <Button onClick={handleAdd} disabled={saving || !newNote.trim()} className="self-end">
          <Send className="w-3.5 h-3.5 mr-1" />{saving ? '...' : 'Add'}
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-sm text-slate-400 py-2">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
          <StickyNote className="w-7 h-7 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 flex items-start gap-3">
              <StickyNote className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.content}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {note.created_by} · {note.created_date ? format(new Date(note.created_date), 'MMM d, yyyy · h:mm a') : ''}
                </p>
              </div>
              <button onClick={() => handleDelete(note.id)}
                className="p-1 rounded hover:bg-red-100 transition-colors text-red-400 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}