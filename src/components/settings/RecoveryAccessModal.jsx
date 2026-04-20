import React, { useState } from 'react';
import { ShieldAlert, Eye, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  logSecurityEvent,
  checkSuspiciousAttempts,
  grantRecoveryAccessSession,
} from '@/lib/securityMonitor';

/**
 * RecoveryAccessModal
 *
 * Requires admin to confirm access to Recovery Center.
 * Implements a privileged session gate with security logging.
 */
export default function RecoveryAccessModal({ open, onSuccess, onCancel, user }) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleConfirm = async () => {
    setError(null);
    setLoading(true);

    const userEmail = user?.email || 'unknown';
    const expectedText = 'I understand the risks';

    // Validation
    if (confirmText.trim() !== expectedText) {
      setLoading(false);
      setError('Confirmation text does not match. Try again.');

      // Log failed attempt
      await logSecurityEvent({
        event_type: 'recovery_access_attempt',
        success: false,
        user_identifier: userEmail,
        reason: 'Incorrect confirmation text',
      });

      // Check for suspicious activity
      const isSuspicious = await checkSuspiciousAttempts({
        event_type: 'recovery_access_attempt',
        user_identifier: userEmail,
      });

      if (isSuspicious) {
        setError('Too many failed attempts. Access denied temporarily.');
      }

      return;
    }

    // Success
    await logSecurityEvent({
      event_type: 'recovery_access_granted',
      success: true,
      user_identifier: userEmail,
      reason: 'Admin confirmed privileged recovery access',
    });

    grantRecoveryAccessSession();
    setConfirmText('');
    setLoading(false);
    onSuccess();
  };

  const handleCancel = () => {
    setConfirmText('');
    setError(null);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Admin Verification Required</h2>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-6">
          Recovery Center allows you to restore or permanently delete records. This is a sensitive operation.
        </p>

        {/* Warning box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <div className="flex gap-2 text-xs text-amber-800">
            <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">What you're about to do:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Preview deleted record snapshots</li>
                <li>Restore archived records to active use</li>
                <li>Permanently delete records</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Confirmation input */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-2">
            Type this to continue:
          </label>
          <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-700 block mb-2">
            I understand the risks
          </code>
          <Input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="Enter confirmation text"
            className="h-9 text-sm"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && !loading) handleConfirm();
              if (e.key === 'Escape') handleCancel();
            }}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            <p className="text-xs text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* Session info */}
        <p className="text-[11px] text-slate-500 mb-4 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          This grants a 10-minute privileged session
        </p>

        {/* Buttons */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
            className="px-4"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white px-4 gap-1.5"
            onClick={handleConfirm}
            disabled={loading || confirmText.trim() !== 'I understand the risks'}
          >
            <Lock className="w-3.5 h-3.5" />
            {loading ? 'Verifying...' : 'Grant Access'}
          </Button>
        </div>
      </div>
    </div>
  );
}