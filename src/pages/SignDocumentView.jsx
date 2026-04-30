import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSignature,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  Clock3,
  LockKeyhole,
  UserCheck,
  MailCheck,
  ShieldAlert,
  CheckSquare,
  PenLine,
  Type,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import SignatureBrandCredit from '@/components/signing/SignatureBrandCredit';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';

function extractFunctionError(error) {
  const payload = error?.data || error?.response?.data || error?.body || error?.cause?.data || null;
  return {
    code: payload?.code || error?.code || '',
    message: payload?.error || payload?.message || error?.message || 'Unexpected signing error',
  };
}

function normalizeFields(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.fields)) return raw.fields;
  return [];
}

function getFieldConfig(pkg) {
  return pkg?.field_config || pkg?.audit_summary?.field_config || { fields: pkg?.document_fields || [] };
}

function fieldIcon(type) {
  switch (type) {
    case 'signature': return PenLine;
    case 'initials': return FileSignature;
    case 'date': return CalendarDays;
    case 'checkbox': return CheckSquare;
    default: return Type;
  }
}

function getInitials(value = '') {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase())
    .join('')
    .slice(0, 4);
}

function makeFieldValue(field, rawValue, signerName) {
  const now = new Date().toISOString();
  let value = rawValue;

  if (field.type === 'date') value = new Date().toLocaleDateString();
  if (field.type === 'name' && !value) value = signerName;
  if (field.type === 'initials' && !value) value = getInitials(signerName);
  if (field.type === 'signature' && !value) value = signerName;

  return {
    field_id: field.id,
    type: field.type,
    label: field.label || field.placeholder || field.type,
    value,
    completed_at: now,
    page: Number(field.page || 1),
    x: Number(field.x || 0),
    y: Number(field.y || 0),
    width: Number(field.width || 0),
    height: Number(field.height || 0),
    participant_id: field.participant_id || '',
    required: Boolean(field.required),
  };
}

function isFieldComplete(field, values, signerName) {
  const value = values[field.id];
  if (field.type === 'date') return true;
  if (field.type === 'name') return Boolean(value || signerName?.trim());
  if (field.type === 'initials') return Boolean(value || getInitials(signerName));
  if (field.type === 'signature') return Boolean(value || signerName?.trim());
  if (field.type === 'checkbox') return value === true;
  return Boolean(String(value || '').trim());
}

function getAccessState(code, fallbackMessage = '') {
  switch (code) {
    case 'origin_blocked':
      return {
        title: 'Access blocked for security review',
        message: 'This signing session is temporarily blocked because the origin or device was flagged by the security engine. Please contact the sender to continue.',
        tone: 'critical',
      };
    case 'rate_limited':
      return {
        title: 'Too many invalid attempts',
        message: 'This signing session was temporarily locked after repeated invalid requests. Please wait and try again later, or ask the sender for a fresh link.',
        tone: 'warning',
      };
    case 'participant_not_active':
      return {
        title: 'This link is not active yet',
        message: 'Another signer must complete their step before this signing link becomes active.',
        tone: 'warning',
      };
    case 'participant_token_required':
      return {
        title: 'Participant-specific link required',
        message: 'This document now uses signer-specific links. Please open the exact link sent to the active signer.',
        tone: 'warning',
      };
    case 'package_expired':
      return {
        title: 'Signing link expired',
        message: 'The secure signing window already expired. Please request a new signing link from the sender.',
        tone: 'warning',
      };
    case 'package_closed':
      return {
        title: 'Signing session already closed',
        message: 'This document was already signed, declined, or closed. The current link can no longer be used to sign again.',
        tone: 'warning',
      };
    case 'otp_required':
      return {
        title: 'Verification required before signing',
        message: 'Request and verify the one-time code for this signing session before approving the document.',
        tone: 'warning',
      };
    case 'otp_locked':
      return {
        title: 'Verification temporarily locked',
        message: 'Too many invalid verification attempts were detected. Please wait before trying again.',
        tone: 'warning',
      };
    case 'otp_invalid':
      return {
        title: 'Invalid verification code',
        message: 'The code does not match the active signing session. Check the latest code and try again.',
        tone: 'warning',
      };
    case 'otp_not_requested':
      return {
        title: 'Verification code not requested',
        message: 'Request a verification code before trying to validate the signing session.',
        tone: 'warning',
      };
    case 'otp_expired':
      return {
        title: 'Verification code expired',
        message: 'The last verification code expired. Request a new one to continue.',
        tone: 'warning',
      };
    case 'invalid_token':
      return {
        title: 'Invalid or expired link',
        message: 'Please contact the sender and request a new signing link.',
        tone: 'warning',
      };
    default:
      return {
        title: 'Signing session unavailable',
        message: fallbackMessage || 'The secure signing session could not be opened right now.',
        tone: 'warning',
      };
  }
}

function SigningFieldInput({ field, value, signerName, onChange, disabled }) {
  const Icon = fieldIcon(field.type);
  const label = field.label || field.placeholder || field.type;

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <input type="checkbox" checked={value === true} onChange={(event) => onChange(field.id, event.target.checked)} disabled={disabled} />
        <span>
          <span className="font-semibold text-slate-900">{label}</span>
          {field.required && <span className="text-red-500"> *</span>}
        </span>
      </label>
    );
  }

  const autoValue = field.type === 'date'
    ? new Date().toLocaleDateString()
    : field.type === 'name'
      ? (value || signerName)
      : field.type === 'initials'
        ? (value || getInitials(signerName))
        : field.type === 'signature'
          ? (value || signerName)
          : value || '';

  const isAuto = ['date', 'name', 'initials', 'signature'].includes(field.type);

  return (
    <label className="block rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="w-4 h-4" />
        {label}{field.required && <span className="text-red-500">*</span>}
      </span>
      <input
        value={autoValue}
        onChange={(event) => onChange(field.id, event.target.value)}
        placeholder={field.placeholder || label}
        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        disabled={disabled || field.type === 'date'}
      />
      {field.type === 'signature' && (
        <p className="text-xs text-slate-500">Typed electronic signature. Drawing capture and final PDF stamping are handled in the next PDF generation layer.</p>
      )}
      {isAuto && field.type !== 'date' && (
        <p className="text-xs text-slate-500">You may edit this value before approving.</p>
      )}
    </label>
  );
}

export default function SignDocumentView() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [certificateId, setCertificateId] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [accessError, setAccessError] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpStatus, setOtpStatus] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [fieldValues, setFieldValues] = useState({});

  const signingFields = useMemo(() => {
    const fields = normalizeFields(getFieldConfig(pkg));
    const activeParticipantId = pkg?.active_participant_id || pkg?.audit_summary?.active_participant_id || pkg?.participant_id || '';
    return fields
      .filter(field => !field.participant_id || !activeParticipantId || field.participant_id === activeParticipantId)
      .sort((a, b) => (Number(a.page || 1) - Number(b.page || 1)) || (Number(a.y || 0) - Number(b.y || 0)) || (Number(a.x || 0) - Number(b.x || 0)));
  }, [pkg]);

  const missingRequiredFields = useMemo(() => signingFields
    .filter(field => field.required !== false)
    .filter(field => !isFieldComplete(field, fieldValues, name)), [signingFields, fieldValues, name]);

  const completedFieldCount = useMemo(() => signingFields.filter(field => isFieldComplete(field, fieldValues, name)).length, [signingFields, fieldValues, name]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!token) {
        setAccessError(getAccessState('invalid_token'));
        setLoading(false);
        return;
      }

      try {
        const fingerprint = await getDeviceFingerprint();
        if (!cancelled) setDeviceFingerprint(fingerprint);

        const res = await base44.functions.invoke('resolveSigningPackageToken', { token, fingerprint });
        if (cancelled) return;

        if (res.data?.package) {
          setPkg(res.data.package);
          setName(res.data.package.signer_name || '');
          setCertificateId(res.data.package.certificate_id || '');
          setAccessError(null);
          return;
        }

        setAccessError(getAccessState('invalid_token'));
      } catch (err) {
        if (cancelled) return;
        const resolved = extractFunctionError(err);
        setAccessError(getAccessState(resolved.code, resolved.message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!pkg) return;
    const nextValues = {};
    signingFields.forEach(field => {
      if (field.type === 'date') nextValues[field.id] = new Date().toLocaleDateString();
      if (field.type === 'name') nextValues[field.id] = name || pkg.signer_name || '';
      if (field.type === 'initials') nextValues[field.id] = getInitials(name || pkg.signer_name || '');
      if (field.type === 'signature') nextValues[field.id] = name || pkg.signer_name || '';
    });
    setFieldValues(current => ({ ...nextValues, ...current }));
  }, [pkg, signingFields.length]);

  useEffect(() => {
    setFieldValues(current => {
      const next = { ...current };
      signingFields.forEach(field => {
        if (field.type === 'name' && !next[field.id]) next[field.id] = name;
        if (field.type === 'initials' && (!next[field.id] || next[field.id] === getInitials(pkg?.signer_name || ''))) next[field.id] = getInitials(name);
        if (field.type === 'signature' && (!next[field.id] || next[field.id] === pkg?.signer_name)) next[field.id] = name;
      });
      return next;
    });
  }, [name]);

  const isComplete = pkg?.status === 'signed' || pkg?.status === 'declined' || pkg?.status === 'expired' || pkg?.status === 'voided';
  const otpRequired = Boolean(pkg?.otp_required);
  const otpVerified = Boolean(pkg?.otp_verified);
  const otpLocked = Boolean(pkg?.otp_locked_until && new Date(pkg.otp_locked_until) > new Date());

  const updateFieldValue = (fieldId, value) => {
    setFieldValues(current => ({ ...current, [fieldId]: value }));
  };

  const buildFieldPayload = () => signingFields.map(field => makeFieldValue(field, fieldValues[field.id], name.trim()));

  const requestOtpCode = async () => {
    if (!token) return;
    setOtpBusy(true);
    try {
      const fingerprint = deviceFingerprint || await getDeviceFingerprint();
      const res = await base44.functions.invoke('requestSigningOtp', { token, fingerprint });
      const data = res?.data || {};
      setOtpStatus(data?.masked_destination ? `Verification code sent to ${data.masked_destination}` : 'Verification code sent');
      setPkg((currentPkg) => ({
        ...currentPkg,
        otp_required: true,
        otp_verified: false,
        otp_delivery_channel: data.delivery_channel || currentPkg?.otp_delivery_channel || 'email',
        otp_masked_destination: data.masked_destination || currentPkg?.otp_masked_destination || '',
        otp_expires_at: data.expires_at || currentPkg?.otp_expires_at || '',
        otp_locked_until: data.locked_until || '',
      }));
      toast.success('Verification code sent');
    } catch (err) {
      const resolved = extractFunctionError(err);
      const state = getAccessState(resolved.code, resolved.message);
      if (resolved.code === 'origin_blocked' || resolved.code === 'rate_limited') {
        setAccessError(state);
      }
      toast.error(state.message || resolved.message);
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtpCode = async () => {
    if (!token || !otpCode.trim()) {
      toast.error('Enter the verification code first');
      return;
    }

    setOtpBusy(true);
    try {
      const fingerprint = deviceFingerprint || await getDeviceFingerprint();
      const res = await base44.functions.invoke('verifySigningOtp', {
        token,
        otp_code: otpCode.trim(),
        fingerprint,
      });
      const data = res?.data || {};
      setPkg((currentPkg) => ({
        ...currentPkg,
        otp_required: true,
        otp_verified: true,
        otp_locked_until: '',
        otp_verified_at: data.verified_at || '',
      }));
      setOtpStatus('Verification complete');
      setOtpCode('');
      toast.success('Verification completed');
    } catch (err) {
      const resolved = extractFunctionError(err);
      if (resolved.code === 'otp_locked') {
        setPkg((currentPkg) => ({
          ...currentPkg,
          otp_locked_until: err?.data?.locked_until || currentPkg?.otp_locked_until || '',
        }));
      }
      toast.error(resolved.message || 'Verification failed');
    } finally {
      setOtpBusy(false);
    }
  };

  const deliverSignedCopy = async () => {
    if (!token) return;
    setDeliveryStatus('sending');
    try {
      const res = await base44.functions.invoke('sendSignedEstimateCopy', { token });
      if (res?.data?.error) throw new Error(res.data.error);
      setDeliveryStatus('sent');
    } catch (err) {
      console.warn('[SignDocumentView] signed copy delivery failed:', err?.message);
      setDeliveryStatus('failed');
      toast.error('Signed successfully, but email delivery needs review');
    }
  };

  const handleApprove = async () => {
    if (!name.trim() || !accepted || !identityConfirmed) {
      toast.error('Complete all required signing confirmations');
      return;
    }

    if (missingRequiredFields.length > 0) {
      toast.error(`Complete all required fields before signing (${missingRequiredFields.length} remaining)`);
      return;
    }

    const fieldPayload = buildFieldPayload();

    setActing(true);
    try {
      const res = await base44.functions.invoke('completeSigningPackage', {
        token,
        action: 'approve',
        signer_name: name.trim(),
        fingerprint: deviceFingerprint || await getDeviceFingerprint(),
        field_values: fieldPayload,
        field_config_version: getFieldConfig(pkg)?.version || 1,
      });

      await base44.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        event_type: 'fields_completed',
        actor_name: name.trim(),
        actor_email: pkg.signer_email || '',
        created_at: new Date().toISOString(),
        metadata: {
          field_count: fieldPayload.length,
          required_count: signingFields.filter(field => field.required !== false).length,
          completed_count: fieldPayload.length,
          field_types: fieldPayload.reduce((acc, field) => {
            acc[field.type] = (acc[field.type] || 0) + 1;
            return acc;
          }, {}),
        },
        company_id: pkg.company_id || pkg.audit_summary?.company_id || '',
      }).catch(() => {});

      const result = res?.data || {};
      const nextStatus = result.status || 'signed';
      if (result.certificate_id) setCertificateId(result.certificate_id);
      if (result.certificate_number) setCertificateNumber(result.certificate_number);

      if (nextStatus === 'pending_next_signer') {
        toast.success('Your signature was saved. The next signer has been activated.');
      } else {
        toast.success('Document completed successfully');
      }

      setPkg((currentPkg) => ({
        ...currentPkg,
        status: nextStatus === 'pending_next_signer' ? 'viewed' : 'signed',
        signer_name: name.trim(),
        completed_field_values: fieldPayload,
        final_pdf_url: result.final_pdf_url || currentPkg?.final_pdf_url || currentPkg?.source_pdf_url || '',
        final_pdf_name: result.final_pdf_name || currentPkg?.final_pdf_name || currentPkg?.source_pdf_name || '',
      }));

      if (nextStatus === 'signed') {
        await deliverSignedCopy();
      }
    } catch (err) {
      const resolved = extractFunctionError(err);
      const state = getAccessState(resolved.code, resolved.message);
      if (resolved.code === 'origin_blocked' || resolved.code === 'rate_limited') {
        setAccessError(state);
      }
      toast.error(state.message);
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason before declining');
      return;
    }

    setActing(true);
    try {
      await base44.functions.invoke('completeSigningPackage', {
        token,
        action: 'decline',
        declined_reason: declineReason.trim(),
        fingerprint: deviceFingerprint || await getDeviceFingerprint(),
      });

      toast.success('Document declined');
      setPkg((currentPkg) => ({ ...currentPkg, status: 'declined', declined_reason: declineReason.trim() }));
    } catch (err) {
      const resolved = extractFunctionError(err);
      const state = getAccessState(resolved.code, resolved.message);
      if (resolved.code === 'origin_blocked' || resolved.code === 'rate_limited') {
        setAccessError(state);
      }
      toast.error(state.message);
    } finally {
      setActing(false);
    }
  };

  const openSignedPdf = () => {
    const url = pkg?.final_pdf_url || pkg?.source_pdf_url;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openCertificateVerification = () => {
    const ref = certificateId || certificateNumber;
    if (!ref) return;
    window.open(`/verify-document?certificate=${encodeURIComponent(ref)}`, '_blank', 'noopener,noreferrer');
  };

  const openReviewPdf = () => {
    const url = pkg?.source_pdf_url || pkg?.final_pdf_url;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin mx-auto" />
          <p className="text-sm text-slate-300">Preparing secure signing session...</p>
        </div>
      </div>
    );
  }

  if (!pkg) {
    const state = accessError || getAccessState('invalid_token');
    const panelTone = state.tone === 'critical'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-amber-200 bg-amber-50 text-amber-800';

    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className={`text-center border rounded-xl p-8 shadow-sm max-w-md w-full ${panelTone}`}>
          <ShieldAlert className="mx-auto mb-3" />
          <p className="font-semibold">{state.title}</p>
          <p className="text-sm mt-2 opacity-90">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto mb-6 text-center">
        {pkg.company_logo_url && (
          <img
            src={pkg.company_logo_url}
            alt="Company Logo"
            className="mx-auto max-h-16 object-contain mb-2"
          />
        )}
      </div>

      <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <FileSignature className="w-5 h-5" />
                <h1 className="text-xl font-semibold">Secure Document Review</h1>
              </div>
              <p className="text-sm text-slate-500 mt-1">{pkg.document_title || 'Document ready for signature'}</p>
            </div>
            <div className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 capitalize">
              {pkg.status || 'sent'}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Signer</p>
                <p className="font-medium text-slate-800 mt-1">{pkg.signer_name || name || 'Required signer'}</p>
                <p className="text-slate-500 text-xs mt-1">{pkg.signer_email}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Document</p>
                <p className="font-medium text-slate-800 mt-1 capitalize">{pkg.document_type || 'document'}</p>
                <p className="text-slate-500 text-xs mt-1">ID: {pkg.document_id || 'Not available'}</p>
              </div>
            </div>

            {pkg.expires_at && (
              <div className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2">
                <Clock3 className="w-4 h-4" /> This signing link expires on {new Date(pkg.expires_at).toLocaleString()}.
              </div>
            )}

            <div className="bg-slate-950 text-white rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <LockKeyhole className="w-5 h-5" />
                <h2 className="font-semibold">Legal signing checkpoint</h2>
              </div>
              <p className="text-sm text-slate-300">
                Review the document first. When you sign, NexArtSign records the event, locks the approved version, and creates a verification certificate for the audit trail.
              </p>
              <div className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-xl p-3">
                This session now includes risk-based protection for device origin, repeated invalid attempts, field completion, and replay prevention.
              </div>
              <Button variant="secondary" onClick={openReviewPdf} className="w-full sm:w-auto gap-2" disabled={!pkg?.source_pdf_url && !pkg?.final_pdf_url}>
                <ExternalLink className="w-4 h-4" /> Open Document Preview
              </Button>
            </div>

            {signingFields.length > 0 && (
              <div className="bg-white border border-blue-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900 flex items-center gap-2"><FileCheck className="w-4 h-4 text-blue-600" /> Required signing fields</h2>
                    <p className="text-sm text-slate-500 mt-1">Complete every required field before approving this document.</p>
                  </div>
                  <span className="text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700 rounded-full px-2 py-1">{completedFieldCount}/{signingFields.length}</span>
                </div>
                <div className="space-y-3">
                  {signingFields.map(field => (
                    <SigningFieldInput
                      key={field.id}
                      field={field}
                      value={fieldValues[field.id]}
                      signerName={name}
                      onChange={updateFieldValue}
                      disabled={isComplete || acting}
                    />
                  ))}
                </div>
                {missingRequiredFields.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {missingRequiredFields.length} required field{missingRequiredFields.length === 1 ? '' : 's'} remaining.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          {pkg.status === 'signed' ? (
            <div className="space-y-3">
              <div className="text-green-700 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Document completed successfully
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-2">
                <p>The signed file, completed fields, and verification certificate are now part of the NexArtSign record for this document.</p>
                {deliveryStatus === 'sending' && <p className="text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending signed copies...</p>}
                {deliveryStatus === 'sent' && <p className="text-green-700 flex items-center gap-2"><MailCheck className="w-4 h-4" /> Signed copies were sent to the client and company archive.</p>}
                {deliveryStatus === 'failed' && <p className="text-amber-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Signed copy email delivery needs review.</p>}
              </div>
              <Button variant="outline" onClick={openSignedPdf} className="w-full gap-2" disabled={!pkg?.final_pdf_url && !pkg?.source_pdf_url}>
                <ExternalLink className="w-4 h-4" /> View Signed Document
              </Button>
              <Button variant="outline" onClick={openCertificateVerification} className="w-full gap-2" disabled={!certificateId && !certificateNumber}>
                <ShieldCheck className="w-4 h-4" /> Verify Certificate
              </Button>
            </div>
          ) : pkg.status === 'declined' ? (
            <div className="space-y-3">
              <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2"><XCircle className="w-5 h-5" /> Declined</div>
              {(pkg.declined_reason || declineReason) && (
                <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  Reason provided: {pkg.declined_reason || declineReason}
                </div>
              )}
            </div>
          ) : pkg.status === 'expired' || pkg.status === 'voided' ? (
            <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> This signing package is {pkg.status}.
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Sign & approve</h2>
                <p className="text-sm text-slate-500 mt-1">Complete the required confirmations to legally approve this document.</p>
              </div>

              {otpRequired && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-900">
                    <ShieldCheck className="w-4 h-4" />
                    <p className="font-semibold text-sm">Identity verification</p>
                  </div>
                  <p className="text-sm text-slate-600">
                    Before signing, NexArtSign sends a verification code to {pkg?.otp_masked_destination || 'the active signer email'}.
                  </p>
                  {pkg?.otp_expires_at && !otpVerified && (
                    <p className="text-xs text-slate-500">Current code expires on {new Date(pkg.otp_expires_at).toLocaleString()}.</p>
                  )}
                  {pkg?.otp_locked_until && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                      Verification is locked until {new Date(pkg.otp_locked_until).toLocaleString()}.
                    </div>
                  )}
                  {otpStatus && (
                    <div className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-3">
                      {otpStatus}
                    </div>
                  )}
                  {otpVerified ? (
                    <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Verification complete. You can now sign this document.
                    </div>
                  ) : (
                    <>
                      <Button variant="outline" onClick={requestOtpCode} disabled={otpBusy || otpLocked} className="w-full gap-2">
                        {otpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
                        Send Verification Code
                      </Button>
                      <label className="block space-y-1">
                        <span className="text-sm font-medium text-slate-700">Verification code</span>
                        <input
                          value={otpCode}
                          onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                          disabled={isComplete || otpBusy || otpLocked}
                        />
                      </label>
                      <Button onClick={verifyOtpCode} disabled={otpBusy || otpCode.trim().length !== 6 || otpLocked} className="w-full h-11">
                        {otpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
                      </Button>
                    </>
                  )}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2">
                <FileCheck className="w-4 h-4 mt-0.5" />
                <span>Your signature will lock this document, generate a NexArtSign certificate, preserve completed field values, and keep the record for verification.</span>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Legal full name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  className="w-full border border-slate-300 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  disabled={isComplete}
                />
              </label>

              <label className="flex gap-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <input type="checkbox" checked={identityConfirmed} onChange={(event) => setIdentityConfirmed(event.target.checked)} disabled={isComplete} />
                <span className="flex items-start gap-2"><UserCheck className="w-4 h-4 mt-0.5" /> I confirm I am the intended signer for this document.</span>
              </label>

              <label className="flex gap-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} disabled={isComplete} />
                <span>I have opened, reviewed, completed all required fields, and approve this document electronically.</span>
              </label>

              <Button onClick={handleApprove} disabled={acting || !name.trim() || !accepted || !identityConfirmed || missingRequiredFields.length > 0 || (otpRequired && !otpVerified)} className="w-full h-11">
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign & Approve Document'}
              </Button>

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Decline reason</span>
                  <textarea
                    value={declineReason}
                    onChange={(event) => setDeclineReason(event.target.value)}
                    placeholder="Required if you are declining"
                    className="w-full border border-slate-300 p-3 rounded-xl text-sm min-h-[88px] focus:outline-none focus:ring-2 focus:ring-slate-900"
                    disabled={isComplete}
                  />
                </label>
                <Button variant="outline" onClick={handleDecline} disabled={acting || !declineReason.trim()} className="w-full">
                  Decline Document
                </Button>
              </div>
            </>
          )}

          <SignatureBrandCredit logoUrl={pkg.signature_brand_logo_url} variant="signing" />
        </section>
      </div>
      {/* NexArtSign Pro badge — fixed bottom right */}
      <div className="fixed bottom-5 right-5 z-50">
        <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-3 py-2 shadow-lg border border-slate-700">
          <img
            src="https://media.base44.com/images/public/69cc888bb34befdf803a06b0/6ffc5cf7b_LoGo.png"
            alt="NexArtSign Pro"
            style={{ width: 80, height: 'auto' }}
          />
          <div>
            <p className="text-[10px] font-bold text-white leading-none">Secured by</p>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">NexArtSign Pro</p>
          </div>
        </div>
      </div>
    </div>
  );
}