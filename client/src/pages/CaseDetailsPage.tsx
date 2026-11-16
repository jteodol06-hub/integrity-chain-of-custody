import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, User, AlertCircle, Database, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { Case, Evidence } from '../types';
import { useAuth } from '../hooks/useAuth';
import { formatBytes } from '../utils';

export const CaseDetailsPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'custody'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCaseDetails();
  }, [caseId]);

  const fetchCaseDetails = async () => {
    setLoading(true);
    try {
      const [caseRes, evidRes] = await Promise.all([
        api.get(`/cases/${caseId}`),
        api.get(`/cases/${caseId}/evidence`),
      ]);

      if (caseRes.data.success) setCaseData(caseRes.data.data);
      if (evidRes.data.success) setEvidenceList(evidRes.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to retrieve case details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await api.patch(`/cases/${caseId}`, { status: newStatus });
      fetchCaseDetails();
    } catch (err) {
      console.error('Failed to update case status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#94A3B8] text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading investigation file...</span>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-base font-semibold text-white">Access Denied or Case Not Found</h2>
        <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">{error}</p>
        <button
          onClick={() => navigate('/cases')}
          className="px-4 py-2 bg-[#151F30] hover:bg-[#1B2940] text-sky-400 rounded-lg text-xs font-medium"
        >
          Return to Cases
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/cases')}
        className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Investigations
      </button>

      {/* Case Header Card */}
      <div className="bg-[#101827] border border-[#263449] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold">
                {caseData.caseReference}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  caseData.status === 'CLOSED'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {caseData.status}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  caseData.priority === 'CRITICAL'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : caseData.priority === 'HIGH'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                }`}
              >
                {caseData.priority} Priority
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{caseData.title}</h1>
          </div>

          {/* Action buttons */}
          {user?.role !== 'VIEWER' && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigate(`/evidence?register=true&caseId=${caseData.id}`)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" /> Register Evidence
              </button>

              {caseData.status !== 'CLOSED' ? (
                <button
                  onClick={() => handleUpdateStatus('CLOSED')}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-medium transition-colors"
                >
                  Close Case
                </button>
              ) : (
                <button
                  onClick={() => handleUpdateStatus('OPEN')}
                  className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                >
                  Reopen Case
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-[#263449] pt-2 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 font-semibold transition-colors relative ${
              activeTab === 'overview' ? 'text-sky-400' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Overview
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`pb-3 font-semibold transition-colors relative ${
              activeTab === 'evidence' ? 'text-sky-400' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Evidence Vault ({evidenceList.length})
            {activeTab === 'evidence' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Narrative & Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Case Narrative & Incident Description
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed whitespace-pre-wrap">
                {caseData.description}
              </p>
            </div>

            {/* Evidence Summary Table */}
            <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Associated Evidence Items
                </h3>
                <button
                  onClick={() => setActiveTab('evidence')}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                >
                  View all ({evidenceList.length})
                </button>
              </div>

              <div className="space-y-2">
                {evidenceList.length > 0 ? (
                  evidenceList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/evidence/${item.id}`)}
                      className="p-3.5 rounded-lg bg-[#151F30] border border-[#263449] hover:border-sky-500/40 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{item.title}</p>
                          <p className="text-[11px] text-[#94A3B8] font-mono">
                            {item.evidenceReference} • {item.originalFilename} (
                            {formatBytes(item.fileSizeBytes)})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.latestVerificationStatus === 'VERIFIED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : item.latestVerificationStatus === 'MISMATCH'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {item.latestVerificationStatus}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8]" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#94A3B8] text-center py-6">
                    No digital evidence items registered to this investigation yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div className="space-y-6">
            <div className="bg-[#101827] border border-[#263449] rounded-xl p-5 space-y-4 text-xs">
              <h3 className="font-semibold text-white uppercase tracking-wider border-b border-[#263449] pb-3">
                Metadata & Access Control
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#94A3B8]">Incident Category:</span>
                  <p className="font-semibold text-white mt-0.5">{caseData.category}</p>
                </div>

                <div>
                  <span className="text-[#94A3B8]">Creation Date:</span>
                  <p className="font-mono text-white mt-0.5">
                    {new Date(caseData.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <span className="text-[#94A3B8]">Registered By:</span>
                  <p className="font-medium text-white mt-0.5">
                    {caseData.createdBy?.fullName || 'System Admin'} ({caseData.createdBy?.role})
                  </p>
                </div>

                <div>
                  <span className="text-[#94A3B8]">Assigned Investigators:</span>
                  <div className="mt-1.5 space-y-1.5">
                    {caseData.assignments && caseData.assignments.length > 0 ? (
                      caseData.assignments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2 p-2 rounded bg-[#151F30] border border-[#263449]"
                        >
                          <User className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-white font-medium">{a.user.fullName}</span>
                          <span className="text-[10px] text-[#94A3B8] font-mono">
                            {a.user.badgeNumber || 'AGENT'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-[#94A3B8]">Only creator assigned.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Evidence Vault */}
      {activeTab === 'evidence' && (
        <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Registered Digital Evidence</h3>
            <button
              onClick={() => navigate(`/evidence?register=true&caseId=${caseData.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Upload File
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#263449] text-[#94A3B8]">
                  <th className="pb-3 font-medium">Evidence ID</th>
                  <th className="pb-3 font-medium">Title & Filename</th>
                  <th className="pb-3 font-medium">Size</th>
                  <th className="pb-3 font-medium">SHA-256 Digest</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Integrity Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263449]/50">
                {evidenceList.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/evidence/${item.id}`)}
                    className="hover:bg-[#151F30] cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-mono text-sky-400 font-semibold">
                      {item.evidenceReference}
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-[11px] text-[#94A3B8]">{item.originalFilename}</p>
                    </td>
                    <td className="py-3 font-mono text-[#F8FAFC]">
                      {formatBytes(item.fileSizeBytes)}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-[#94A3B8]">
                      {item.sha256Hash.slice(0, 12)}...{item.sha256Hash.slice(-8)}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.latestVerificationStatus === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : item.latestVerificationStatus === 'MISMATCH'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {item.latestVerificationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
