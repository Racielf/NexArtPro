import React, { useState } from 'react';
import { CheckCircle, XCircle, ShieldCheck, Upload, Hash, FileCheck, LockKeyhole, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';

async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function getInitialHashFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get('hash') || '').trim().toLowerCase();
}

export default function VerifyDocument() {
  const initialHash = getInitialHashFromUrl();
  const [file, setFile] = useState(null);
  const [expectedHash, setExpectedHash] = useState(initialHash);
  const [computedHash, setComputedHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

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
              <div className="hidden sm:block text-right text-xs text-slate-300 leading-relaxed">
                Secure Verification<br />SHA-256 Integrity Check
              </div>
            </div>
          </div>

          <div className="p-7 space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 flex items-start gap-2">
              <BadgeCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>This portal confirms document authenticity using cryptographic SHA-256 fingerprint comparison.</span>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
              <LockKeyhole className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>This verification happens locally in your browser. The PDF is not uploaded.</span>
            </div>

            {initialHash && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700">
                Verification hash loaded from the signed document QR code or secure verification link.
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
              {file && <p className="text-xs text-slate-500">Selected: {file.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" /> Expected SHA-256 Hash
              </label>
              <textarea
                value={expectedHash}
                onChange={(e) => setExpectedHash(e.target.value)}
                placeholder="Paste the SHA-256 hash from audit.json, VERIFY.txt, or verification QR"
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              {expectedHash && !isValidHash && (
                <p className="text-xs text-amber-600">SHA-256 must be exactly 64 hexadecimal characters.</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full bg-slate-900 hover:bg-black text-white rounded-xl h-11 gap-2"
            >
              <FileCheck className="w-4 h-4" />
              {verifying ? 'Verifying...' : 'Verify Document'}
            </Button>

            {computedHash && (
              <div className={`rounded-2xl border px-5 py-5 ${status === 'verified' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-start gap-3">
                  {status === 'verified' ? (
                    <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className={`font-bold ${status === 'verified' ? 'text-green-800' : 'text-red-800'}`}>
                      {status === 'verified'
                        ? 'Verified — this document is authentic and has not been altered since it was signed.'
                        : 'Warning — this document does not match the original signed version and may have been modified.'}
                    </p>
                    <p className="text-xs text-slate-600 mt-3">
                      Verification is based on SHA-256 fingerprint comparison. Matching hashes prove the file content is identical to the signed record.
                    </p>
                    <p className="text-xs text-slate-600 mt-3">Computed SHA-256</p>
                    <p className="font-mono text-xs break-all text-slate-800 mt-1">{computedHash}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
              {appConfig?.company?.name || appConfig?.appName || 'ProEstimate FSM'} Document Trust System
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
