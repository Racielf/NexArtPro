import React, { useEffect, useRef, useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { X, Printer, Download, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import EstimateTemplateRenderer from '@/components/estimates/EstimateTemplateRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import WOExtrasSection from './WOExtrasSection';

function calcHours(arrival, departure) {
  if (!arrival || !departure) return null;
  const [ah, am] = arrival.split(':').map(Number);
  const [dh, dm] = departure.split(':').map(Number);
  const total = (dh * 60 + dm) - (ah * 60 + am);
  if (total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

// ─── Legacy fallback document (kept for backward compat) ─────────────────────
// NOTA: Reemplazado por EstimateTemplateRenderer + WOExtrasSection.
// Mantener si algo falla en la composición.
function WODocument({ wo, expenses, photos, taskStatuses }) {
  const allItems = (wo.groups || []).flatMap(g => g.items || []);
  const totalHours = calcHours(wo.arrival_time, wo.departure_time);
  const expTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const beforePhotos = photos.filter(p => p.phase === 'before');
  const duringPhotos = photos.filter(p => p.phase === 'during');
  const afterPhotos  = photos.filter(p => p.phase === 'after');

  const isImg = (url) => /\.(jpg|jpeg|png|gif|webp)/i.test(url || '');

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: 4, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</span>
      </div>
      {children}
    </div>
  );

  const PhotoRow = ({ label, items }) => {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>{label}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {items.map(p => (
            isImg(p.photo_url) ? (
              <img key={p.id} src={p.photo_url} alt="" style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0' }} />
            ) : null
          ))}
        </div>
      </div>
    );
  };

  return (
    <div id="wo-print-doc" style={{
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      fontSize: 12,
      color: '#1e293b',
      padding: '32px 40px',
      background: '#fff',
      maxWidth: 760,
      margin: '0 auto',
      lineHeight: 1.5,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Work Order #{wo.work_order_number}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>{wo.title}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'inline-block',
            background: wo.status === 'completed' ? '#dcfce7' : '#dbeafe',
            color: wo.status === 'completed' ? '#166534' : '#1d4ed8',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {wo.status?.replace('_', ' ')}
          </span>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>
            {wo.scheduled_date || new Date().toLocaleDateString()}
          </p>
          {wo.completed_at && (
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#16a34a' }}>
              Completed: {new Date(wo.completed_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Client + Worker row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>Client</p>
          <p style={{ fontWeight: 600, margin: '0 0 2px' }}>{wo.client_name}</p>
          {wo.client_address && <p style={{ color: '#64748b', margin: '0 0 2px' }}>{wo.client_address}</p>}
          {wo.client_phone && <p style={{ color: '#64748b', margin: 0 }}>{wo.client_phone}</p>}
          {wo.client_email && <p style={{ color: '#64748b', margin: 0 }}>{wo.client_email}</p>}
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>Job Info</p>
          <p style={{ margin: '0 0 2px' }}><span style={{ color: '#94a3b8' }}>Worker: </span>{wo.assigned_worker_name || '—'}</p>
          <p style={{ margin: '0 0 2px' }}><span style={{ color: '#94a3b8' }}>Date: </span>{wo.scheduled_date || '—'}</p>
          {wo.scheduled_time && <p style={{ margin: 0 }}><span style={{ color: '#94a3b8' }}>Time: </span>{wo.scheduled_time}</p>}
        </div>
      </div>

      {/* Tasks / Checklist */}
      {allItems.length > 0 && (
        <Section title="Scope of Work">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Task</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item, i) => {
                const key = item.id || item.service_name || String(i);
                const isDone = taskStatuses?.[key]?.status === 'done';
                return (
                  <tr key={key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 10px', fontSize: 11 }}>
                      <span style={{ marginRight: 6 }}>{isDone ? '✅' : '☐'}</span>
                      {item.service_name}
                      {item.description && (
                        <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                      <span style={{
                        background: isDone ? '#dcfce7' : '#f1f5f9',
                        color: isDone ? '#166534' : '#64748b',
                        padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                      }}>
                        {isDone ? 'Done' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* Time */}
      {(wo.arrival_time || wo.departure_time) && (
        <Section title="Time on Site">
          <div style={{ display: 'flex', gap: 24 }}>
            {wo.arrival_time && <div><span style={{ color: '#94a3b8' }}>Arrival: </span><strong>{wo.arrival_time}</strong></div>}
            {wo.departure_time && <div><span style={{ color: '#94a3b8' }}>Departure: </span><strong>{wo.departure_time}</strong></div>}
            {totalHours && <div><span style={{ color: '#94a3b8' }}>Total: </span><strong style={{ color: '#2563eb' }}>{totalHours}</strong></div>}
          </div>
        </Section>
      )}

      {/* Work Summary */}
      {wo.work_summary && (
        <Section title="Work Summary">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#374151' }}>{wo.work_summary}</p>
        </Section>
      )}

      {/* Notes */}
      {wo.notes && (
        <Section title="Notes & Observations">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#374151' }}>{wo.notes}</p>
        </Section>
      )}

      {/* Issues */}
      {wo.issues_found && (
        <Section title="Issues Found">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#b45309' }}>{wo.issues_found}</p>
        </Section>
      )}

      {/* Materials */}
      {expenses.length > 0 && (
        <Section title="Materials & Expenses">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Description</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Vendor</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Method</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '7px 10px', fontSize: 11 }}>{e.description}</td>
                  <td style={{ padding: '7px 10px', fontSize: 11, color: '#64748b' }}>{e.vendor || '—'}</td>
                  <td style={{ padding: '7px 10px', fontSize: 11, color: '#64748b' }}>{e.payment_method}</td>
                  <td style={{ padding: '7px 10px', fontSize: 11, textAlign: 'right', fontWeight: 600 }}>${(e.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f8fafc' }}>
                <td colSpan={3} style={{ padding: '7px 10px', fontSize: 11, fontWeight: 700, textAlign: 'right' }}>Total</td>
                <td style={{ padding: '7px 10px', fontSize: 12, fontWeight: 800, textAlign: 'right', color: '#2563eb' }}>${expTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </Section>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <Section title="Project Photos">
          <PhotoRow label="Before" items={beforePhotos} />
          <PhotoRow label="During" items={duringPhotos} />
          <PhotoRow label="After"  items={afterPhotos} />
        </Section>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 10 }}>
        <span>Work Order #{wo.work_order_number} · {wo.client_name}</span>
        <span>Generated {new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// ─── Modal shell ─────────────────────────────────────────────────────────────
export default function WorkOrderPreviewModal({ workOrder, taskStatuses, onClose, mode = 'preview' }) {
  const [expenses, setExpenses] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [linkedEstimate, setLinkedEstimate] = useState(null);
  const [linkedInvoice, setLinkedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    const load = async () => {
      const [exp, ph, est, inv] = await Promise.all([
        nexartClient.entities.WorkOrderExpense.filter({ work_order_id: workOrder.id }),
        nexartClient.entities.ProjectPhoto.filter({ work_order_id: workOrder.id }),
        workOrder.estimate_id ? nexartClient.entities.Estimate.filter({ id: workOrder.estimate_id }) : Promise.resolve([]),
        workOrder.invoice_id ? nexartClient.entities.Invoice.filter({ id: workOrder.invoice_id }) : Promise.resolve([]),
      ]);
      setExpenses(exp);
      setPhotos(ph);
      setLinkedEstimate(est?.[0] || null);
      setLinkedInvoice(inv?.[0] || null);
      setLoading(false);
    };
    load();
  }, [workOrder.id]);

  const handlePrint = () => {
    const content = document.getElementById('wo-print-doc');
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head>
        <title>Work Order #${workOrder.work_order_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          @media print { body { margin: 0; } }
          body { margin: 0; background: #fff; }
        </style>
      </head><body>${content.outerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleDownloadPDF = () => {
    // Use browser's built-in PDF via print dialog (Save as PDF)
    handlePrint();
  };

  const handleSend = async () => {
    if (!workOrder.client_email) {
      toast.error('No client email on this work order');
      return;
    }
    setSending(true);
    const totalHours = calcHours(workOrder.arrival_time, workOrder.departure_time);
    const expTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const allItems = (workOrder.groups || []).flatMap(g => g.items || []);
    const checklist = allItems.map(item => {
      const key = item.id || item.service_name;
      const isDone = taskStatuses?.[key]?.status === 'done';
      return `${isDone ? '✅' : '☐'} ${item.service_name}`;
    }).join('\n');

    const body = `
Dear ${workOrder.client_name},

Please find below the summary for Work Order #${workOrder.work_order_number}.

─────────────────────────────────
WORK ORDER #${workOrder.work_order_number}
${workOrder.title || ''}
─────────────────────────────────

📅 Date: ${workOrder.scheduled_date || '—'}
👷 Worker: ${workOrder.assigned_worker_name || '—'}
📍 Address: ${workOrder.client_address || '—'}
📊 Status: ${workOrder.status?.replace('_', ' ').toUpperCase()}

${allItems.length > 0 ? `TASKS:\n${checklist}\n` : ''}
${workOrder.work_summary ? `WORK SUMMARY:\n${workOrder.work_summary}\n` : ''}
${workOrder.notes ? `NOTES:\n${workOrder.notes}\n` : ''}
${workOrder.issues_found ? `ISSUES FOUND:\n${workOrder.issues_found}\n` : ''}
${totalHours ? `⏱ Time on Site: ${totalHours}` : ''}
${expenses.length > 0 ? `\n💰 Materials & Expenses Total: $${expTotal.toFixed(2)}` : ''}
${workOrder.completed_at ? `\n✅ Completed: ${new Date(workOrder.completed_at).toLocaleString()}` : ''}

Thank you for your business.
    `.trim();

    await nexartClient.integrations.Core.SendEmail({
      to: workOrder.client_email,
      subject: `Work Order #${workOrder.work_order_number} – ${workOrder.client_name}`,
      body,
    });
    setSending(false);
    setShowSendConfirm(false);
    toast.success(`Work order sent to ${workOrder.client_email}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800 text-sm">
            Work Order #{workOrder.work_order_number} — Preview
          </span>
          <span className="text-xs text-slate-400">{workOrder.client_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownloadPDF}>
            <Download className="w-3.5 h-3.5" /> Download PDF
          </Button>
          {!showSendConfirm ? (
            <Button
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90"
              onClick={() => setShowSendConfirm(true)}
              disabled={!workOrder.client_email}
            >
              <Send className="w-3.5 h-3.5" /> Send to Client
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              {workOrder.client_email ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="text-xs text-amber-700">Send to <strong>{workOrder.client_email}</strong>?</span>
                  <Button size="sm" className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={handleSend} disabled={sending}>
                    {sending ? '…' : 'Confirm'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowSendConfirm(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <span className="text-xs text-red-600">No email on file</span>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="ml-1 p-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable document */}
      <div className="flex-1 overflow-y-auto bg-slate-100 px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Base document via EstimateTemplateRenderer */}
            <div className="shadow-2xl rounded-lg overflow-hidden bg-white mb-6" ref={printRef}>
              <EstimateTemplateRenderer
                estimate={workOrder}
                template={workOrder?.document_config?.template || 'pro'}
                options={{
                  ...DEFAULT_OPTIONS,
                  showPrices: false,
                  showBreakdown: true,
                  showTerms: false,
                  showSignatures: false,
                  hideInternalNotes: true,
                }}
                documentType="workorder"
              />
            </div>

            {/* Work Order Extras */}
            <div className="mb-8">
              <WOExtrasSection
                workOrder={workOrder}
                expenses={expenses}
                photos={photos}
                taskStatuses={taskStatuses}
                linkedEstimate={linkedEstimate}
                linkedInvoice={linkedInvoice}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}