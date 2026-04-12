/**
 * ClientAttachmentsSection — Displays client-safe attachments in the public estimate view.
 * ONLY shows attachments with intent === 'send_to_client'.
 * Internal attachments are NEVER exposed.
 */
import { Paperclip, Download, FileText } from 'lucide-react';

function getFileIcon(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return <div className="w-8 h-8 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-[9px] font-bold text-red-500">PDF</span></div>;
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return <div className="w-8 h-8 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-[9px] font-bold text-purple-500">IMG</span></div>;
  return <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-3.5 h-3.5 text-slate-400" /></div>;
}

export default function ClientAttachmentsSection({ attachments = [] }) {
  // Strict filter: only client-intended files
  const clientFiles = (attachments || []).filter(a => a.intent === 'send_to_client');

  if (clientFiles.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">Included Documents</h3>
        <span className="text-xs text-slate-400 ml-auto">{clientFiles.length} file{clientFiles.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {clientFiles.map(att => (
          <a
            key={att.id}
            href={att.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
          >
            {getFileIcon(att.file_name)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate group-hover:text-primary transition-colors">
                {att.file_name || 'Document'}
              </p>
              <p className="text-[11px] text-slate-400">Click to open</p>
            </div>
            <Download className="w-4 h-4 text-slate-300 group-hover:text-primary flex-shrink-0 transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
}