import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  UserCheck,
  MailCheck,
  ShieldAlert,
  CheckSquare,
  PenLine,
  Type,
  CalendarDays,
  Download,
  ArrowRight,
  ArrowLeft,
  Eye,
  Mail,
  Pencil,
  Eraser,
} from 'lucide-react';
import { toast } from 'sonner';
import NexArtSignBrandHeader from '@/components/signing/NexArtSignBrandHeader';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';

function extractFunctionError(error) {
  // Supabase SDK FunctionsHttpError puts the Response in error.context
  // Try to parse the JSON body from it
  const payload = error?.context || error?.data || error?.response?.data || error?.body || error?.cause?.data || null;
  // If context is a Response object (Supabase SDK), try to read its parsed JSON
  if (payload && typeof payload === 'object' && typeof payload.json === 'function') {
    // Already consumed Ã¢â‚¬â€ fallback to message
    return {
      code: error?.code || 'server_error',
      message: error?.message || 'Unexpected signing error',
    };
  }
  return {
    code: payload?.code || error?.code || '',
    message: payload?.error || payload?.message || error?.message || 'Unexpected signing error',
  };
}

// Edge Functions return data directly Ã¢â‚¬â€ unwrap consistently
function unwrapFnResult(res) {
  if (!res) return {};
  // supabase.functions.invoke wraps in { data, error }
  // base44Client functionsProxy also wraps Ã¢â‚¬â€ handle both shapes
  return res?.data ?? res;
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
  const [step, setStep] = useState(0);
  const [sigMethod, setSigMethod] = useState('typed');
  const [sigImageDataUrl, setSigImageDataUrl] = useState('');
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

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

        const result = unwrapFnResult(res);
        if (result?.package) {
          setPkg(result.package);
          setName(result.package.signer_name || '');
          setCertificateId(result.package.certificate_id || '');
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

  // Auto-skip welcome screen: go directly to review (step 2)
  useEffect(() => {
    if (!pkg) return;
    const showWelcome = pkg?.audit_summary?.show_welcome_screen === true;
    if (step === 0 && !showWelcome) {
      setStep(2); // index 2 = 'review'
    }
  }, [pkg?.id]);

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
      const data = unwrapFnResult(res);
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
      const data = unwrapFnResult(res);
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
      const res = await base44.functions.invoke('sendSignedCopy', { token });
      if (res?.data?.error) throw new Error(res.data.error);
      setDeliveryStatus('sent');
    } catch (err) {
      console.warn('[SignDocumentView] signed copy delivery failed:', err?.message);
      setDeliveryStatus('failed');
      toast.error('Signed successfully, but email delivery needs review');
    }
  };

  const handleApprove = async () => {
    if (!name.trim() || !accepted) {
      toast.error('Complete all required signing confirmations');
      return;
    }

    if (sigMethod === 'drawn' && !sigImageDataUrl) {
      toast.error('Please draw your signature before signing');
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
        signature_method: sigMethod,
        signature_value: sigMethod === 'typed' ? name.trim() : '',
        signature_image_data_url: sigMethod === 'drawn' ? sigImageDataUrl : '',
      });
      const result = unwrapFnResult(res);

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

  // ---- Canvas drawing helpers ---
  const getCanvasPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - rect.left) * (canvas.width / rect.width), y: (t.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const startDraw = useCallback((e) => {
    const canvas = canvasRef.current; if (!canvas) return;
    e.preventDefault(); isDrawingRef.current = true;
    const ctx = canvas.getContext('2d'); const p = getCanvasPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  }, []);

  const moveDraw = useCallback((e) => {
    if (!isDrawingRef.current) return; const canvas = canvasRef.current; if (!canvas) return;
    e.preventDefault(); const ctx = canvas.getContext('2d'); const p = getCanvasPos(e, canvas);
    ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }, []);

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    const canvas = canvasRef.current; if (!canvas) return;
    setSigImageDataUrl(canvas.toDataURL('image/png'));
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigImageDataUrl('');
  }, []);

  useEffect(() => {
    if (sigMethod !== 'drawn') return;
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mousemove', moveDraw); canvas.addEventListener('mouseup', endDraw); canvas.addEventListener('mouseleave', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false }); canvas.addEventListener('touchmove', moveDraw, { passive: false }); canvas.addEventListener('touchend', endDraw);
    return () => { canvas.removeEventListener('mousedown', startDraw); canvas.removeEventListener('mousemove', moveDraw); canvas.removeEventListener('mouseup', endDraw); canvas.removeEventListener('mouseleave', endDraw); canvas.removeEventListener('touchstart', startDraw); canvas.removeEventListener('touchmove', moveDraw); canvas.removeEventListener('touchend', endDraw); };
  }, [sigMethod, startDraw, moveDraw, endDraw]);

  const openReviewPdf = () => {
    const url = pkg?.source_pdf_url || pkg?.final_pdf_url;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const STEPS = ['welcome','identity','review','fields','consent','sign','success'];
  // Default: skip welcome, go straight to review (index 2)
  // If pkg has show_welcome_screen=true, stay at welcome (index 0)
  const showWelcome = pkg?.audit_summary?.show_welcome_screen === true;
  const initialStep = showWelcome ? 0 : 2; // 0=welcome, 2=review
  const currentStep = STEPS[step] || 'review';
  const canGoBack = step > 0 && currentStep !== 'success' && currentStep !== 'welcome';
  const goNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep(s => Math.max(s - 1, 0));
  const skipToStep = (name) => setStep(STEPS.indexOf(name));

  const headerStatus = isComplete ? pkg?.status : (otpVerified ? 'verified' : (pkg?.status === 'sent' ? 'viewed' : pkg?.status));
  const pdfUrl = pkg?.source_pdf_url || pkg?.final_pdf_url || '';
  const signerFirstName = (pkg?.signer_name || name || '').split(' ')[0] || 'there';

  // Navigate from welcome
  const nextFromWelcome = () => {
    if (!otpRequired || otpVerified) skipToStep('review');
    else goNext();
  };

  const S = { page: { minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Inter','system-ui',sans-serif" }, card: { background:'#fff', borderRadius:'16px', border:'1px solid #e2e8f0', padding:'32px', maxWidth:'640px', margin:'0 auto', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }, btn: { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'12px 24px', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', border:'none', transition:'all 0.2s' }, primary: { background:'#1e40af', color:'#fff' }, success: { background:'#059669', color:'#fff' }, outline: { background:'#fff', color:'#475569', border:'1px solid #cbd5e1' }, disabled: { opacity:0.5, cursor:'not-allowed' }, input: { width:'100%', padding:'12px 16px', borderRadius:'12px', border:'1px solid #cbd5e1', fontSize:'14px', outline:'none', background:'#fff' }, label: { fontSize:'13px', fontWeight:600, color:'#334155', marginBottom:'6px', display:'block' }, check: { display:'flex', gap:'12px', padding:'16px', borderRadius:'12px', border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontSize:'14px', color:'#334155' }, trust: { fontSize:'13px', color:'#64748b', lineHeight:1.6 }, stepBadge: (active) => ({ display:'inline-flex', alignItems:'center', gap:'6px', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:600, background: active ? '#dbeafe' : '#f1f5f9', color: active ? '#1e40af' : '#94a3b8' }) };

  if (loading) {
    return (
      <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <ShieldCheck style={{ width:26, height:26, color:'#fff' }} />
          </div>
          <Loader2 className="animate-spin" style={{ width:24, height:24, color:'#94a3b8', margin:'0 auto 12px' }} />
          <p style={{ fontSize:14, color:'#64748b' }}>Preparing your secure signing session...</p>
        </div>
      </div>
    );
  }

  if (!pkg) {
    const state = accessError || getAccessState('invalid_token');
    return (
      <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
        <div style={S.card}>
          <div style={{ textAlign:'center' }}>
            <ShieldAlert style={{ width:48, height:48, color: state.tone === 'critical' ? '#dc2626' : '#d97706', margin:'0 auto 16px' }} />
            <h2 style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:8 }}>{state.title}</h2>
            <p style={{ ...S.trust, marginBottom:24 }}>{state.message}</p>
            <p style={{ fontSize:11, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }}>NexArtSign Secure Signing</p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Step renderers ----------------------------------

  const renderWelcome = () => (
    <div style={S.card}>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ width:64, height:64, borderRadius:16, background:'linear-gradient(135deg,#dbeafe,#eff6ff)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <FileSignature style={{ width:32, height:32, color:'#1e40af' }} />
        </div>
        <h1 style={{ fontSize:22, fontWeight:700, color:'#0f172a', marginBottom:8 }}>
          Hello {signerFirstName}, you have a document to sign
        </h1>
        <p style={{ fontSize:15, color:'#475569', lineHeight:1.6 }}>
          You have been invited to review and sign:<br/>
          <strong style={{ color:'#0f172a' }}>{pkg.document_title || `Estimate #${pkg.document_id || ''}`}</strong>
        </p>
      </div>
      {pkg.expires_at && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderRadius:12, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:13, marginBottom:16 }}>
          <Clock3 style={{ width:16, height:16, flexShrink:0 }} /> This link expires on {new Date(pkg.expires_at).toLocaleDateString()}.
        </div>
      )}
      <div style={{ padding:16, borderRadius:12, background:'#f0f9ff', border:'1px solid #bae6fd', marginBottom:24 }}>
        <p style={{ fontSize:13, color:'#0c4a6e', lineHeight:1.6 }}>
          <ShieldCheck style={{ width:14, height:14, display:'inline', verticalAlign:'-2px', marginRight:4 }} />
          Your document is protected by NexArtSign secure signing. A signed copy will be emailed to you after completion.
        </p>
      </div>
      <button onClick={nextFromWelcome} style={{ ...S.btn, ...S.primary, width:'100%' }}>
        Start Secure Review <ArrowRight style={{ width:16, height:16 }} />
      </button>
    </div>
  );

  const renderIdentity = () => (
    <div style={S.card}>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <Mail style={{ width:20, height:20, color:'#1e40af' }} />
          <h2 style={{ fontSize:18, fontWeight:700, color:'#0f172a' }}>Verify your identity</h2>
        </div>
        <p style={S.trust}>For your protection, we'll send a verification code to {pkg?.otp_masked_destination || 'your email'}.</p>
      </div>
      {otpVerified ? (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:16, borderRadius:12, background:'#ecfdf5', border:'1px solid #a7f3d0', color:'#065f46', fontSize:14, marginBottom:16 }}>
            <CheckCircle style={{ width:18, height:18 }} /> Identity verified successfully
          </div>
          <button onClick={() => skipToStep('review')} style={{ ...S.btn, ...S.primary, width:'100%' }}>
            Continue <ArrowRight style={{ width:16, height:16 }} />
          </button>
        </>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {otpStatus && <div style={{ padding:12, borderRadius:10, background:'#f0f9ff', border:'1px solid #bae6fd', color:'#0369a1', fontSize:13 }}>{otpStatus}</div>}
          {pkg?.otp_locked_until && <div style={{ padding:12, borderRadius:10, background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', fontSize:13 }}>Locked until {new Date(pkg.otp_locked_until).toLocaleString()}</div>}
          <button onClick={requestOtpCode} disabled={otpBusy || otpLocked} style={{ ...S.btn, ...S.outline, width:'100%', ...(otpBusy || otpLocked ? S.disabled : {}) }}>
            {otpBusy ? <Loader2 className="animate-spin" style={{ width:16, height:16 }} /> : <Mail style={{ width:16, height:16 }} />} Send Verification Code
          </button>
          <div>
            <label style={S.label}>Verification code</label>
            <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Enter 6-digit code" style={S.input} disabled={otpBusy || otpLocked} />
          </div>
          <button onClick={verifyOtpCode} disabled={otpBusy || otpCode.trim().length !== 6 || otpLocked} style={{ ...S.btn, ...S.primary, width:'100%', ...(otpBusy || otpCode.trim().length !== 6 ? S.disabled : {}) }}>
            {otpBusy ? <Loader2 className="animate-spin" style={{ width:16, height:16 }} /> : 'Verify Code'}
          </button>
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
        <button onClick={goBack} style={{ ...S.btn, ...S.outline, padding:'8px 16px' }}><ArrowLeft style={{ width:14, height:14 }} /> Back</button>
      </div>
    </div>
  );

  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const renderReview = () => {
    const googleViewerUrl = pdfUrl ? `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true` : '';
    const viewerSrc = isMobile ? googleViewerUrl : `${pdfUrl}#toolbar=1&navpanes=0&zoom=page-width`;

    return (
      <div style={{ ...S.card, maxWidth:1100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <Eye style={{ width:20, height:20, color:'#1e40af' }} />
          <h2 style={{ fontSize:18, fontWeight:700, color:'#0f172a' }}>Review your document</h2>
        </div>
        <p style={{ ...S.trust, marginBottom:16 }}>Please review the full document carefully before signing.</p>
        {pdfUrl ? (
          <>
            <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid #e2e8f0', marginBottom:12, background:'#fff' }}>
              <iframe src={viewerSrc} title="Document preview" style={{ width:'100%', minHeight: isMobile ? '70vh' : '80vh', border:'none', background:'#fff' }} />
            </div>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ ...S.btn, ...S.outline, display:'inline-flex', textDecoration:'none', fontSize:13 }}>
                <ExternalLink style={{ width:14, height:14 }} /> Open PDF in new tab
              </a>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'60px 20px', background:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0', marginBottom:20 }}>
            <FileCheck style={{ width:48, height:48, color:'#94a3b8', margin:'0 auto 16px' }} />
            <p style={{ fontSize:15, color:'#475569', marginBottom:4, fontWeight:600 }}>We could not load the document preview.</p>
            <p style={{ fontSize:13, color:'#94a3b8' }}>Please contact the sender.</p>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <button onClick={goBack} style={{ ...S.btn, ...S.outline, padding:'8px 16px' }}><ArrowLeft style={{ width:14, height:14 }} /> Back</button>
          <button onClick={() => signingFields.length > 0 ? goNext() : skipToStep('consent')} style={{ ...S.btn, ...S.primary }}>
            I reviewed this document &mdash; Continue <ArrowRight style={{ width:16, height:16 }} />
          </button>
        </div>
      </div>
    );
  };

  const renderFields = () => (
    <div style={S.card}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <FileCheck style={{ width:20, height:20, color:'#1e40af' }} />
          <h2 style={{ fontSize:18, fontWeight:700, color:'#0f172a' }}>Complete required fields</h2>
        </div>
        <span style={S.stepBadge(true)}>{completedFieldCount}/{signingFields.length}</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
        {signingFields.map(field => (
          <SigningFieldInput key={field.id} field={field} value={fieldValues[field.id]} signerName={name} onChange={updateFieldValue} disabled={isComplete || acting} />
        ))}
      </div>
      {missingRequiredFields.length > 0 && (
        <div style={{ padding:12, borderRadius:10, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:13, marginBottom:16 }}>
          {missingRequiredFields.length} required field{missingRequiredFields.length === 1 ? '' : 's'} remaining
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <button onClick={goBack} style={{ ...S.btn, ...S.outline, padding:'8px 16px' }}><ArrowLeft style={{ width:14, height:14 }} /> Back</button>
        <button onClick={goNext} disabled={missingRequiredFields.length > 0} style={{ ...S.btn, ...S.primary, ...(missingRequiredFields.length > 0 ? S.disabled : {}) }}>
          Continue <ArrowRight style={{ width:16, height:16 }} />
        </button>
      </div>
    </div>
  );

  const handleConsentCheck = (checked) => { setAccepted(checked); setIdentityConfirmed(checked); };
  const sigReady = sigMethod === 'typed' ? name.trim().length > 0 : sigImageDataUrl.length > 0;

  const renderConsent = () => (
    <div style={S.card}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <UserCheck style={{ width:20, height:20, color:'#1e40af' }} />
        <h2 style={{ fontSize:18, fontWeight:700, color:'#0f172a' }}>Legal consent</h2>
      </div>
      <p style={{ ...S.trust, marginBottom:20 }}>Please confirm before signing.</p>
      <label style={{ ...S.check, marginBottom:12 }}>
        <input type="checkbox" checked={accepted} onChange={e => handleConsentCheck(e.target.checked)} style={{ marginTop:2, accentColor:'#1e40af', width:18, height:18, flexShrink:0 }} />
        <span>I confirm that I am the intended signer, I have reviewed this document, and I agree to sign it electronically.</span>
      </label>
      <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6, marginBottom:20, paddingLeft:30 }}>
        By continuing, you agree that your electronic signature has the same intent as a handwritten signature and that NexArtSign will record a secure certificate and audit trail for this signing session.
      </p>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <button onClick={goBack} style={{ ...S.btn, ...S.outline, padding:'8px 16px' }}><ArrowLeft style={{ width:14, height:14 }} /> Back</button>
        <button onClick={goNext} disabled={!accepted} style={{ ...S.btn, ...S.primary, ...(!accepted ? S.disabled : {}) }}>
          Continue to Sign <ArrowRight style={{ width:16, height:16 }} />
        </button>
      </div>
    </div>
  );

  const renderSign = () => (
    <div style={S.card}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <PenLine style={{ width:20, height:20, color:'#1e40af' }} />
        <h2 style={{ fontSize:18, fontWeight:700, color:'#0f172a' }}>Sign your document</h2>
      </div>
      <p style={{ ...S.trust, marginBottom:16 }}>Choose how you would like to sign.</p>

      {/* Name field always required */}
      <div style={{ marginBottom:16 }}>
        <label style={S.label}>Legal full name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full legal name" style={S.input} disabled={isComplete} />
      </div>

      {/* Tabs: Type / Draw */}
      <div style={{ display:'flex', gap:0, marginBottom:16, borderRadius:10, overflow:'hidden', border:'1px solid #e2e8f0' }}>
        <button onClick={() => setSigMethod('typed')} style={{ flex:1, padding:'10px 16px', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, background: sigMethod === 'typed' ? '#1e40af' : '#f8fafc', color: sigMethod === 'typed' ? '#fff' : '#475569' }}>
          <Type style={{ width:15, height:15 }} /> Type Signature
        </button>
        <button onClick={() => setSigMethod('drawn')} style={{ flex:1, padding:'10px 16px', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, background: sigMethod === 'drawn' ? '#1e40af' : '#f8fafc', color: sigMethod === 'drawn' ? '#fff' : '#475569', borderLeft:'1px solid #e2e8f0' }}>
          <Pencil style={{ width:15, height:15 }} /> Draw Signature
        </button>
      </div>

      {/* Typed signature preview */}
      {sigMethod === 'typed' && name.trim() && (
        <div style={{ padding:24, borderRadius:12, background:'#fafafa', border:'1px solid #e2e8f0', textAlign:'center', marginBottom:16 }}>
          <p style={{ fontSize:11, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Electronic Signature Preview</p>
          <p style={{ fontFamily:"'Brush Script MT', 'Segoe Script', cursive, serif", fontSize:32, color:'#1e40af' }}>{name}</p>
        </div>
      )}

      {/* Draw canvas */}
      {sigMethod === 'drawn' && (
        <div style={{ marginBottom:16 }}>
          <div style={{ borderRadius:12, border:'2px dashed #cbd5e1', background:'#fff', overflow:'hidden', position:'relative' }}>
            <canvas ref={canvasRef} width={600} height={220} style={{ width:'100%', height:220, cursor:'crosshair', touchAction:'none', display:'block' }} />
            {!sigImageDataUrl && (
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none', color:'#cbd5e1', fontSize:14 }}>
                Sign here
              </div>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
            <button onClick={clearCanvas} style={{ ...S.btn, ...S.outline, padding:'6px 14px', fontSize:12 }}>
              <Eraser style={{ width:14, height:14 }} /> Clear
            </button>
          </div>
        </div>
      )}

      <div style={{ padding:12, borderRadius:10, background:'#f0f9ff', border:'1px solid #bae6fd', color:'#0c4a6e', fontSize:13, marginBottom:20, lineHeight:1.6 }}>
        <ShieldCheck style={{ width:14, height:14, display:'inline', verticalAlign:'-2px', marginRight:4 }} />
        Your signature will lock this document, generate a NexArtSign certificate, and keep the record for verification.
      </div>

      <button onClick={handleApprove} disabled={acting || !name.trim() || !accepted || !sigReady || missingRequiredFields.length > 0 || (otpRequired && !otpVerified)} style={{ ...S.btn, ...S.success, width:'100%', fontSize:15, padding:'14px 24px', ...(acting || !name.trim() || !sigReady ? S.disabled : {}) }}>
        {acting ? <Loader2 className="animate-spin" style={{ width:18, height:18 }} /> : <><CheckCircle style={{ width:18, height:18 }} /> Sign &amp; Approve Document</>}
      </button>

      <div style={{ borderTop:'1px solid #e2e8f0', marginTop:24, paddingTop:20 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'#64748b', marginBottom:8 }}>Need to decline?</p>
        <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Provide a reason for declining" style={{ ...S.input, minHeight:80, resize:'vertical', marginBottom:8 }} disabled={isComplete} />
        <button onClick={handleDecline} disabled={acting || !declineReason.trim()} style={{ ...S.btn, background:'#fff', color:'#dc2626', border:'1px solid #fecaca', width:'100%', ...(acting || !declineReason.trim() ? S.disabled : {}) }}>
          Decline Document
        </button>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-start', marginTop:16 }}>
        <button onClick={goBack} style={{ ...S.btn, ...S.outline, padding:'8px 16px' }}><ArrowLeft style={{ width:14, height:14 }} /> Back</button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div style={S.card}>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'#ecfdf5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <CheckCircle style={{ width:36, height:36, color:'#059669' }} />
        </div>
        <h2 style={{ fontSize:22, fontWeight:700, color:'#0f172a', marginBottom:8 }}>Document signed successfully</h2>
        <p style={S.trust}>Your signed copy has been sent to your email.</p>
        {certificateNumber && <p style={{ fontSize:13, color:'#475569', marginTop:8 }}>Certificate <strong>#{certificateNumber}</strong> was generated.</p>}
      </div>
      {deliveryStatus === 'sending' && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:'#64748b', fontSize:14, marginBottom:16 }}><Loader2 className="animate-spin" style={{ width:16, height:16 }} /> Sending signed copies...</div>}
      {deliveryStatus === 'sent' && <div style={{ display:'flex', alignItems:'center', gap:8, padding:12, borderRadius:10, background:'#ecfdf5', border:'1px solid #a7f3d0', color:'#065f46', fontSize:13, marginBottom:16 }}><MailCheck style={{ width:16, height:16 }} /> Signed copies sent to client and company.</div>}
      {deliveryStatus === 'failed' && <div style={{ display:'flex', alignItems:'center', gap:8, padding:12, borderRadius:10, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:13, marginBottom:16 }}><AlertTriangle style={{ width:16, height:16 }} /> Email delivery needs review.</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <button onClick={openSignedPdf} disabled={!pkg?.final_pdf_url && !pkg?.source_pdf_url} style={{ ...S.btn, ...S.primary, width:'100%', ...(!pkg?.final_pdf_url && !pkg?.source_pdf_url ? S.disabled : {}) }}>
          <Eye style={{ width:16, height:16 }} /> View Signed Document
        </button>
        <button onClick={openCertificateVerification} disabled={!certificateId && !certificateNumber} style={{ ...S.btn, ...S.outline, width:'100%', ...(!certificateId && !certificateNumber ? S.disabled : {}) }}>
          <ShieldCheck style={{ width:16, height:16 }} /> Verify Certificate
        </button>
      </div>
      <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:24 }}>This document has been securely archived by NexArtSign.</p>
    </div>
  );

  const renderDeclined = () => (
    <div style={S.card}>
      <div style={{ textAlign:'center' }}>
        <XCircle style={{ width:48, height:48, color:'#dc2626', margin:'0 auto 16px' }} />
        <h2 style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:8 }}>Document declined</h2>
        {(pkg.declined_reason || declineReason) && <p style={S.trust}>Reason: {pkg.declined_reason || declineReason}</p>}
      </div>
    </div>
  );

  const renderExpired = () => (
    <div style={S.card}>
      <div style={{ textAlign:'center' }}>
        <AlertTriangle style={{ width:48, height:48, color:'#d97706', margin:'0 auto 16px' }} />
        <h2 style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:8 }}>This signing package is {pkg.status}</h2>
        <p style={S.trust}>Please contact the sender if you need a new signing link.</p>
      </div>
    </div>
  );

  // Ã¢â€â‚¬Ã¢â€â‚¬ Pick the right screen Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const renderContent = () => {
    if (pkg.status === 'signed') return renderSuccess();
    if (pkg.status === 'declined') return renderDeclined();
    if (pkg.status === 'expired' || pkg.status === 'voided') return renderExpired();

    switch (currentStep) {
      case 'welcome': return renderWelcome();
      case 'identity': return renderIdentity();
      case 'review': return renderReview();
      case 'fields': return renderFields();
      case 'consent': return renderConsent();
      case 'sign': return renderSign();
      case 'success': return renderSuccess();
      default: return renderWelcome();
    }
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Progress bar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const activeStepIndex = isComplete ? STEPS.length - 1 : step;
  const progressPct = ((activeStepIndex) / (STEPS.length - 1)) * 100;

  return (
    <div style={S.page}>
      <NexArtSignBrandHeader
        companyLogoUrl={pkg.company_logo_url || pkg.audit_summary?.company_logo_url || ''}
        companyName={pkg.company_name || pkg.audit_summary?.company_name || ''}
        nexArtSignLogoUrl={pkg.signature_brand_logo_url || pkg.audit_summary?.nexartsign_logo_url || ''}
        status={headerStatus}
      />

      {/* Progress bar */}
      {!isComplete && (
        <div style={{ background:'#e2e8f0', height:3 }}>
          <div style={{ height:3, background:'linear-gradient(90deg,#1e40af,#3b82f6)', width:`${progressPct}%`, transition:'width 0.4s ease' }} />
        </div>
      )}

      {/* Document title bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'12px 24px', textAlign:'center' }}>
        <p style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>{pkg.document_title || 'Secure Document'}</p>
        <p style={{ fontSize:12, color:'#94a3b8' }}>Signer: {pkg.signer_name || name || 'Required signer'} &middot; {pkg.signer_email || ''}</p>
      </div>

      {/* Main content */}
      <div style={{ padding:'32px 16px', maxWidth: currentStep === 'review' ? 1100 : 800, margin:'0 auto', transition:'max-width 0.3s ease' }}>
        {renderContent()}

        {/* Powered-by badge below every card */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:32, padding:'16px 0' }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#1e40af,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ShieldCheck style={{ width:18, height:18, color:'#fff' }} />
          </div>
          <div>
            <p style={{ fontSize:13, color:'#475569', fontWeight:600, lineHeight:1.3 }}>
              Powered by <strong style={{ color:'#1e40af' }}>NexArt Pro</strong>
            </p>
            <p style={{ fontSize:11, color:'#94a3b8', lineHeight:1.3 }}>
              NexArtSign&trade; Secure Document Signing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
