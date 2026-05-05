import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { X, Copy, ExternalLink } from 'lucide-react';
import { generatePublicShareToken } from '@/lib/estimateSalesLifecycle';
import { executeSend } from '@/lib/estimateSendOrchestrator';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

export default function SendEstimateModal({ estimate, open, onClose, onSent }) {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [to, setTo] = useState(estimate?.client_email || '');
  const [subject, setSubject] = useState(`Estimate #${estimate?.estimate_number} from ${appConfig.company.name}`);
  const [clientLink, setClientLink] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const buildClientLink = async () => {
      if (!estimate?.id) {
        if (!cancelled) setClientLink('');
        return;
      }

      try {
        const token = estimate.public_share_token || await generatePublicShareToken(estimate);
        if (!cancelled) {
          setClientLink(`${window.location.origin}/client-estimate?token=${token}`);
        }
      } catch (err) {
        console.warn('[SendEstimateModal] failed to resolve public token:', err?.message);
        if (!cancelled) setClientLink('');
      }
    };

    buildClientLink();
    return () => {
      cancelled = true;
    };
  }, [estimate]);

  useEffect(() => {
    setTo(estimate?.client_email || '');
    setSubject(`Estimate #${estimate?.estimate_number} from ${appConfig.company.name}`);
  }, [estimate]);

  useEffect(() => {
    setMessage(
      `Hi ${estimate?.client_name?.split(' ')[0] || 'there'},\n\nThank you for choosing ${appConfig.company.name}. Please review your estimate below:\n\n${clientLink}\n\nTotal: $${(estimate?.total || 0).toFixed(2)}\n\nPlease click the link to approve or decline.\n\nThank you!`
    );
  }, [estimate, clientLink]);

  const copyLink = () => {
    if (!clientLink) return;
    navigator.clipboard.writeText(clientLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!to) { toast.error('Recipient email is required'); return; }
    setSending(true);
    try {
      await executeSend({
        estimate,
        recipientEmail: to,
        subject,
        message,
        currentTemplate: estimate?.document_config?.template || 'clean',
        currentOptions: estimate?.document_config?.options || {},
        includedAttachmentIds: estimate?.document_config?.included_attachment_ids || [],
        appConfig,
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to send estimate');
      setSending(false);
      return;
    }
    setSending(false);
    toast.success('Estimate sent!');
    onSent?.();
    onClose();
  };

  const subjectLen = subject.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-xl font-semibold text-slate-900">Send and present estimate</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Email</span>
            <button
              onClick={() => setEmailEnabled(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${emailEnabled ? 'bg-blue-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailEnabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {emailEnabled && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-lg px-3 py-2">
                <div className="text-xs text-slate-400 mb-1">To</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {to && (
                    <span className="flex items-center gap-1 bg-slate-100 text-slate-700 text-sm rounded px-2 py-0.5">
                      {to}
                      <button onClick={() => setTo('')}><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {!to && (
                    <input
                      className="flex-1 text-sm outline-none bg-transparent"
                      placeholder="Add email..."
                      onBlur={e => { if (e.target.value) setTo(e.target.value); }}
                      onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { setTo(e.target.value); e.target.value = ''; } }}
                    />
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Subject</span>
                  <span className="text-xs text-slate-400">{subjectLen}/132</span>
                </div>
                <input
                  className="w-full text-sm outline-none bg-transparent text-slate-800"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={132}
                />
              </div>

              <div className="border border-slate-200 rounded-lg px-3 py-2">
                <div className="text-xs text-slate-400 mb-1">Message</div>
                <textarea
                  className="w-full text-sm outline-none bg-transparent text-slate-800 resize-none"
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              <div className="border border-slate-200 rounded-lg px-3 py-2">
                <div className="text-xs text-slate-400 mb-1">Attachments</div>
                <div className="text-sm text-slate-600">estimate-{estimate?.estimate_number}.pdf</div>
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-lg px-3 py-3 bg-blue-50/50">
            <div className="text-xs text-slate-400 mb-2 font-medium">Client View Link</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 truncate flex-1 font-mono">{clientLink}</span>
              <button onClick={copyLink} className="flex-shrink-0 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 bg-white flex items-center gap-1">
                <Copy className="w-3 h-3" />{copied ? 'Copied!' : 'Copy'}
              </button>
              <a href={clientLink || '#'} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-slate-400 hover:text-slate-700">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg px-4 py-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-400">Text</span>
              <button className="relative w-12 h-6 rounded-full bg-slate-200 opacity-50 cursor-not-allowed">
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="rounded-full px-5">Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="rounded-full px-6 bg-blue-600 hover:bg-blue-700 text-white">
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}