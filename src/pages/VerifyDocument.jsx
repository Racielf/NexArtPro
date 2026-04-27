import React, { useState } from 'react';
import { CheckCircle, XCircle, ShieldCheck, Upload, Hash, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function VerifyDocument() {
  const [file, setFile] = useState(null);
  const [expectedHash, setExpectedHash] = useState('');
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
          <div className="bg-slate-900 text-white px-7 py-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Document Verification</h1>
                <p className="text-sm text-slate-300 mt-1">Verify a signed estimate PDF using its SHA-256 hash.</p>
              </div>
            </div>
          </div>

          <div className="p-7 space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
              This verification happens locally in your browser. The PDF is not uploaded.
            </div>

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
                placeholder="Paste the SHA-256 hash from audit.json or VERIFY.txt"
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
                      {status === 'verified' ? 'Verified — document matches' : 'Mismatch — document may have been changed'}
                    </p>
                    <p className="text-xs text-slate-600 mt-2">Computed SHA-256</p>
                    <p className="font-mono text-xs break-all text-slate-800 mt-1">{computedHash}</p>
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
