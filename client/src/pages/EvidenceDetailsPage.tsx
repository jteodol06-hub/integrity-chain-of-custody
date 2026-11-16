import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Download,
  Copy,
  Check,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { Evidence, User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { formatBytes } from '../utils';

export const EvidenceDetailsPage: React.FC = () => {
  const { evidenceId } = useParams<{ evidenceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'custody' | 'verifications'>('custody');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Chain verification state
  const [chainVerificationResult, setChainVerificationResult] = useState<{
    isValid: boolean;
    details: string;
    totalEvents?: number;
    latestEventHash?: string;
  } | null>(null);
  const [verifyingChain, setVerifyingChain] = useState(false);

  // Transfer Modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetCustodianId, setTargetCustodianId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvidenceData();
    fetchUsers();
  }, [evidenceId]);

  const fetchEvidenceData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/evidence/${evidenceId}`);
      if (res.data.success) {
        setEvidence(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load evidence details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      if (res.data.success) {
        setUsers(res.data.data);
        if (res.data.data.length > 0) {
          setTargetCustodianId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const res = await api.post(`/evidence/${evidenceId}/verify`, {
        notes: `Interactive verification run by ${user?.fullName}`,
      });
      if (res.data.success) {
        fetchEvidenceData();
      }
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    try {
      const res = await api.post(`/evidence/${evidenceId}/custody/verify`);
      if (res.data.success) {
        setChainVerificationResult(res.data.data);
      }
    } catch (err) {
      console.error('Chain verification failed:', err);
    } finally {
      setVerifyingChain(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    setTransferSubmitting(true);

    try {
      const res = await api.post(`/evidence/${evidenceId}/transfer`, {
        newCustodianId: targetCustodianId,
        reason: transferReason,
        notes: transferNotes || undefined,
      });

      if (res.data.success) {
        setIsTransferModalOpen(false);
        setTransferReason('');
        setTransferNotes('');
        fetchEvidenceData();
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to transfer custody.';
      setTransferError(msg);
    } finally {
      setTransferSubmitting(false);
    }
  };

  if (loading || !evidence) {
    return (
      <div className="flex items-center justify-center h-64 text-[#94A3B8] text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Retrieving evidence bitstream and chain of custody ledger...</span>
        </div>
      </div>
    );
  }

  const latestVerification = evidence.verifications?.[0];
  const isIntegrityConfirmed = evidence.latestVerificationStatus === 'VERIFIED';
  const isMismatch = evidence.latestVerificationStatus === 'MISMATCH';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/evidence')}
        className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Evidence Vault
      </button>

      {/* Flagship Header Card */}
      <div className="bg-[#101827] border border-[#263449] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold">
                {evidence.evidenceReference}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1.5 ${
                  isIntegrityConfirmed
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : isMismatch
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {evidence.latestVerificationStatus === 'NOT_VERIFIED'
                  ? 'Pending Verification'
                  : evidence.latestVerificationStatus}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                {evidence.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{evidence.title}</h1>
            <p className="text-xs text-[#94A3B8]">
              Associated Case:{' '}
              <span
                onClick={() => navigate(`/cases/${evidence.case?.id}`)}
                className="text-sky-400 hover:underline cursor-pointer font-mono font-medium"
              >
                {evidence.case?.caseReference} — {evidence.case?.title}
              </span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <a
              href={`/api/evidence/${evidence.id}/download`}
              target="_blank"
              rel="noreferrer"
              download={evidence.originalFilename}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#151F30] hover:bg-[#1B2940] border border-[#263449] text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>

            {user?.role !== 'VIEWER' && (
              <>
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#1B2940] hover:bg-[#223552] border border-[#263449] text-sky-400 rounded-lg text-xs font-medium transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Transfer Custody
                </button>

                <button
                  onClick={handleVerifyIntegrity}
                  disabled={verifying}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                  {verifying ? 'Verifying Live...' : 'Verify Integrity'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 border-b border-[#263449] pt-2 text-xs">
          <button
            onClick={() => setActiveTab('custody')}
            className={`pb-3 font-semibold transition-colors relative ${
              activeTab === 'custody' ? 'text-sky-400' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Chain of Custody Timeline ({evidence.custodyEvents?.length || 0})
            {activeTab === 'custody' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 font-semibold transition-colors relative ${
              activeTab === 'details' ? 'text-sky-400' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            SHA-256 Hashes & Details
            {activeTab === 'details' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('verifications')}
            className={`pb-3 font-semibold transition-colors relative ${
              activeTab === 'verifications' ? 'text-sky-400' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Verification Audit Log ({evidence.verifications?.length || 0})
            {activeTab === 'verifications' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content: Chain of Custody (Matching mockup layout) */}
      {activeTab === 'custody' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Interactive Chronological Timeline */}
          <div className="lg:col-span-2 bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#263449] pb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Chain of Custody Timeline</h2>
                <p className="text-xs text-[#94A3B8]">
                  Append-only, hash-linked cryptographic event ledger tracking evidence lifecycle
                </p>
              </div>
            </div>

            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#263449]">
              {evidence.custodyEvents && evidence.custodyEvents.length > 0 ? (
                evidence.custodyEvents.map((evt, idx) => (
                  <div key={evt.id} className="relative group">
                    {/* Node circle */}
                    <div
                      className={`absolute -left-[29px] top-1.5 w-4 h-4 rounded-full border-2 bg-[#101827] ${
                        idx === 0
                          ? 'border-emerald-400'
                          : evt.eventType === 'EVIDENCE_TRANSFERRED'
                            ? 'border-indigo-400'
                            : evt.eventType === 'EVIDENCE_VERIFIED'
                              ? 'border-sky-400'
                              : 'border-amber-400'
                      }`}
                    />

                    <div className="bg-[#151F30] border border-[#263449] rounded-xl p-4 space-y-2 hover:border-sky-500/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {evt.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] font-mono text-[#94A3B8]">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-[#F8FAFC]">{evt.reason}</p>
                      {evt.notes && <p className="text-xs text-[#94A3B8] italic">{evt.notes}</p>}

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[#94A3B8] pt-2 border-t border-[#263449]/60">
                        <div>
                          <span>Actor: </span>
                          <span className="text-white font-medium">
                            {evt.actor?.fullName || 'Authorized Investigator'}
                          </span>
                        </div>
                        {evt.newCustodian && (
                          <div>
                            <span>Custodian: </span>
                            <span className="text-sky-400 font-medium">
                              {evt.newCustodian.fullName}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Cryptographic Link Hashes */}
                      <div className="bg-[#101827] rounded-lg p-2.5 text-[10px] font-mono space-y-1 border border-[#263449]/40 mt-2">
                        <div className="flex items-center justify-between text-[#94A3B8]">
                          <span>Prev Hash:</span>
                          <span className="truncate max-w-[280px]">
                            {evt.previousEventHash.slice(0, 16)}...{evt.previousEventHash.slice(-8)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sky-400">
                          <span>Event Hash:</span>
                          <span className="truncate max-w-[280px] font-semibold">
                            {evt.currentEventHash.slice(0, 16)}...{evt.currentEventHash.slice(-8)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#94A3B8]">No custody records generated yet.</p>
              )}
            </div>
          </div>

          {/* Right: Chain Verification Card & Actions */}
          <div className="space-y-6">
            <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Chain Verified</h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    All custody events are intact and cryptographically linked.
                  </p>
                </div>
              </div>

              <button
                onClick={handleVerifyChain}
                disabled={verifyingChain}
                className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifyingChain ? 'animate-spin' : ''}`} />
                {verifyingChain ? 'Recomputing Chain Hashes...' : 'Verify Chain Integrity'}
              </button>

              {chainVerificationResult && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    chainVerificationResult.isValid
                      ? 'bg-emerald-950/20 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/20 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  <p className="font-semibold">
                    {chainVerificationResult.isValid
                      ? '✓ Chain Validated Successfully'
                      : '⚠ Tamper Alert Detected'}
                  </p>
                  <p className="text-[11px] mt-1">{chainVerificationResult.details}</p>
                </div>
              )}

              {/* Latest Event Hash Display Box */}
              <div className="space-y-1.5 pt-2 border-t border-[#263449]">
                <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>Event Hash (Latest):</span>
                  <button
                    onClick={() =>
                      evidence.custodyEvents &&
                      evidence.custodyEvents.length > 0 &&
                      handleCopy(
                        evidence.custodyEvents[evidence.custodyEvents.length - 1].currentEventHash,
                        'latest'
                      )
                    }
                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium text-[11px]"
                  >
                    {copiedHash === 'latest' ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedHash === 'latest' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-[#151F30] border border-[#263449] font-mono text-[11px] text-white break-all">
                  {evidence.custodyEvents && evidence.custodyEvents.length > 0
                    ? evidence.custodyEvents[evidence.custodyEvents.length - 1].currentEventHash
                    : 'N/A'}
                </div>
              </div>
            </div>

            {/* Evidence File Details */}
            <div className="bg-[#101827] border border-[#263449] rounded-xl p-5 space-y-3 text-xs">
              <h3 className="font-semibold text-white uppercase tracking-wider border-b border-[#263449] pb-2">
                Artifact Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Original Filename:</span>
                  <span className="font-mono text-white">{evidence.originalFilename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">File Size:</span>
                  <span className="font-mono text-white">
                    {formatBytes(evidence.fileSizeBytes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">MIME Type:</span>
                  <span className="font-mono text-white">{evidence.mimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Registered By:</span>
                  <span className="text-white font-medium">{evidence.uploadedBy?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Registration Date:</span>
                  <span className="text-white">
                    {new Date(evidence.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Details & Dual Hash Verification Screen (Matching mockup) */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dual Hashes Box */}
          <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Cryptographic Integrity Hashes (SHA-256)
            </h2>

            {/* Original Baseline Hash */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8] font-medium">
                  Original Hash (At Intake Baseline):
                </span>
                <button
                  onClick={() => handleCopy(evidence.sha256Hash, 'original')}
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 text-xs"
                >
                  {copiedHash === 'original' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedHash === 'original' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3 bg-[#151F30] border border-[#263449] rounded-lg font-mono text-xs text-white break-all">
                {evidence.sha256Hash}
              </div>
            </div>

            {/* Current Calculated Hash */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8] font-medium">
                  Latest Recalculated Hash (From Vault Disk):
                </span>
                <button
                  onClick={() =>
                    latestVerification && handleCopy(latestVerification.calculatedHash, 'current')
                  }
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 text-xs"
                >
                  {copiedHash === 'current' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedHash === 'current' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div
                className={`p-3 rounded-lg font-mono text-xs break-all border ${
                  isIntegrityConfirmed
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                    : isMismatch
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                      : 'bg-[#151F30] border-[#263449] text-[#94A3B8]'
                }`}
              >
                {latestVerification
                  ? latestVerification.calculatedHash
                  : 'Not verified yet — click button to compute'}
              </div>
            </div>
          </div>

          {/* Verification Badge Card (Matching mockup center card) */}
          <div className="bg-[#101827] border border-[#263449] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isIntegrityConfirmed
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : isMismatch
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isIntegrityConfirmed ? (
                <ShieldCheck className="w-8 h-8" />
              ) : isMismatch ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <FileCheck2 className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {isIntegrityConfirmed
                  ? 'File Integrity Confirmed'
                  : isMismatch
                    ? 'Cryptographic Mismatch Detected'
                    : 'Integrity Verification Pending'}
              </h3>
              <p className="text-xs text-[#94A3B8] max-w-sm">
                {isIntegrityConfirmed
                  ? 'The physical file stored in the vault bit-for-bit matches the original acquisition baseline hash.'
                  : isMismatch
                    ? 'WARNING: The physical file bytes differ from the baseline! Evidence may be altered or corrupted.'
                    : 'Click below to stream the physical vault file and recalculate its live SHA-256 digest.'}
              </p>
            </div>

            {user?.role !== 'VIEWER' && (
              <button
                onClick={handleVerifyIntegrity}
                disabled={verifying}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-sky-500/10 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
                {verifying ? 'Recalculating Live SHA-256...' : 'Run Verification Again'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Verification History Log */}
      {activeTab === 'verifications' && (
        <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Integrity Verification Audit History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#263449] text-[#94A3B8]">
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">Verifier</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Calculated SHA-256</th>
                  <th className="pb-3 font-medium">Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263449]/50">
                {evidence.verifications && evidence.verifications.length > 0 ? (
                  evidence.verifications.map((v) => (
                    <tr key={v.id} className="hover:bg-[#151F30]">
                      <td className="py-3 font-mono text-[#94A3B8]">
                        {new Date(v.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 text-white font-medium">
                        {v.verifiedBy?.fullName || 'Examiner'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            v.status === 'VERIFIED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-[#94A3B8] text-[11px]">
                        {v.calculatedHash.slice(0, 16)}...{v.calculatedHash.slice(-8)}
                      </td>
                      <td className="py-3 text-[#94A3B8]">{v.notes || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                      No previous verification attempts recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer Custody Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101827] border border-[#263449] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#263449] pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-semibold text-white">Transfer Evidence Custody</h3>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {transferError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">
                  New Authorized Custodian *
                </label>
                <select
                  required
                  value={targetCustodianId}
                  onChange={(e) => setTargetCustodianId(e.target.value)}
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role} - {u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">
                  Transfer Reason (Mandatory for Chain of Custody) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Transferred to Forensic Hardware Lab for chip-off extraction and carver analysis..."
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">
                  Transfer Notes & Physical Details
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Sealed tamper-evident anti-static bag #A-449"
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#263449]">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-[#151F30] hover:bg-[#1B2940] text-[#94A3B8] rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  {transferSubmitting ? 'Appending Event Hash...' : 'Commit Custody Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
