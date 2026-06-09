import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ShieldCheck, Upload, Hash, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import { nexartClient } from '@/api/nexartClient';

async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    hash: (params.get('hash') || '').trim().toLowerCase(),
    certificate: (params.get('certificate') || '').trim(),
  };
}

function safeCertificateSummary(data) {
  const certificate = data?.certificate || {};
  const verification = data?.verification || {};

  return {
    certificate_number: certificate.certificate_number || '',
    status: certificate.status || verification.status || 'issued',
    signed_at: certificate.signed_at || verification.signed_at || '',
    expected_hash: (verification.expected_hash || certificate.final_pdf_hash || '').toLowerCase(),
  };
}

export default function VerifyDocument() {
  const { hash: initialHash, certificate } = getParams();

  const [file, setFile] = useState(null);
  const [expectedHash, setExpectedHash] = useState(initialHash);
  const [computedHash, setComputedHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [certData, setCertData] = useState(null);

  useEffect(() => {
    if (!certificate) return;

    const loadCertificate = async () => {
      try {
        const res = await nexartClient.functions.invoke('resolveSigningCertificate', { certificate });
        if (res.data?.certificate || res.data?.verification) {
          const summary = safeCertificateSummary(res.data);
          setCertData(summary);
          if (summary.expected_hash) setExpectedHash(summary.expected_hash);
        }
      } catch (err) {
        console.warn('Certificate lookup failed:', err?.message);
      }
    };

    loadCertificate();
  }, [certificate]);

  const cleanExpected = expectedHash.trim().toLowerCase();
  const isValidHash = /^[a-f0-9]{64}$/.test(cleanExpected);
  const status = computedHash
    ? (computedHash === cleanExpected ? 'verified' : 'mismatch')
    : null;

  const handleVerify = async () => {
    setError('');
    setComputedHash('');

    if (!file) {
      setError('Please select the signed PDF file.');
      return;
    }
    if (!isValidHash) {
      setError('Please enter a valid SHA-256 hash.');
      return;
    }

    setVerifying(true);
    try {
      const hash = await sha256File(file);
      setComputedHash(hash);
    } catch (err) {
      setError('Could not calculate file hash. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-950 text-white px-7 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden">
                  {appConfig?.company?.logo_url ? (
                    <img src={appConfig.company.logo_url} alt="Company logo" className="w-10 h-10 object-contain" />
                  ) : (
                    <ShieldCheck className="w-7 h-7 text-slate-900" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold">Document Verification Portal</h1>
                  <p className="text-sm text-slate-300 mt-1">
                    Official integrity verification by {appConfig?.company?.name || appConfig?.appName || 'ProEstimate FSM'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-7 space-y-6">
            {certData && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 space-y-1">
                <div className="font-semibold">Certificate #{certData.certificate_number || certificate}</div>
                <div className="text-xs text-slate-500">
                  Status: {certData.status || 'issued'}{certData.signed_at ? ` • Signed: ${new Date(certData.signed_at).toLocaleString()}` : ''}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" /> Signed PDF
              </label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" /> Expected SHA-256 Hash
              </label>
              <textarea
                value={expectedHash}
                onChange={(e) => !certData && setExpectedHash(e.target.value)}
                readOnly={Boolean(certData)}
                rows={3}
                className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono ${certData ? 'bg-slate-50 text-slate-500 cursor-default' : ''}`}
              />
              {certData && (
                <p className="text-xs text-slate-400">Hash loaded from official certificate — read only.</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <Button onClick={handleVerify} disabled={verifying} className="w-full bg-slate-900 text-white">
              <FileCheck className="w-4 h-4" /> Verify Document
            </Button>

            {computedHash && (
              <div className={`rounded-2xl border px-5 py-5 ${status === 'verified' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-start gap-3">
                  {status === 'verified' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <p className="font-bold">
                      {status === 'verified' ? 'Verified — Document hash matches the official record.' : 'Mismatch — Document may be altered.'}
                    </p>
                    <p className="text-xs mt-2 font-mono break-all">{computedHash}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}