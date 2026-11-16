import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Database,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { api } from '../services/api';
import { Evidence, Case } from '../types';
import { useAuth } from '../hooks/useAuth';
import { formatBytes } from '../utils';

export const EvidenceVaultPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Register Modal state
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('register') === 'true');
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('System Logs');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvidenceVault();
    fetchCases();
  }, [statusFilter]);

  const fetchEvidenceVault = async () => {
    setLoading(true);
    try {
      // In ICCF, we fetch cases and aggregate all evidence items
      const casesRes = await api.get('/cases');
      if (casesRes.data.success) {
        const allCases: Case[] = casesRes.data.data;
        const evidencePromises = allCases.map((c) => api.get(`/cases/${c.id}/evidence`));
        const evidenceResponses = await Promise.all(evidencePromises);

        const aggregated: Evidence[] = [];
        evidenceResponses.forEach((res, index) => {
          if (res.data.success) {
            const items = res.data.data.map((item: Evidence) => ({
              ...item,
              case: {
                id: allCases[index].id,
                caseReference: allCases[index].caseReference,
                title: allCases[index].title,
                status: allCases[index].status,
              },
            }));
            aggregated.push(...items);
          }
        });

        setEvidence(aggregated);
      }
    } catch (err) {
      console.error('Failed to load evidence vault:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const res = await api.get('/cases');
      if (res.data.success) {
        setCases(res.data.data);
        if (!selectedCaseId && res.data.data.length > 0) {
          setSelectedCaseId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    }
  };

  const handleRegisterEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setModalError('Please choose a valid forensic artifact file to upload.');
      return;
    }

    if (!selectedCaseId) {
      setModalError('Please select an active investigation case.');
      return;
    }

    setModalError(null);
    setModalSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('file', selectedFile);

      const res = await api.post(`/cases/${selectedCaseId}/evidence`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setIsModalOpen(false);
        setSearchParams({});
        setTitle('');
        setDescription('');
        setSelectedFile(null);
        fetchEvidenceVault();
        navigate(`/evidence/${res.data.data.id}`);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to upload evidence.';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  const filteredEvidence = evidence.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.evidenceReference.toLowerCase().includes(search.toLowerCase()) ||
      item.sha256Hash.toLowerCase().includes(search.toLowerCase()) ||
      item.originalFilename.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || item.latestVerificationStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Evidence Vault</h1>
          <p className="text-xs text-[#94A3B8]">Manage and verify digital evidence.</p>
        </div>

        {user?.role !== 'VIEWER' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Register Evidence
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-[#101827] border border-[#263449] p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search evidence by ID, filename, or SHA-256 hash..."
            className="w-full bg-[#151F30] border border-[#263449] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#94A3B8]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#151F30] border border-[#263449] text-xs text-[#F8FAFC] rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Verification Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="NOT_VERIFIED">Pending / Not Verified</option>
            <option value="MISMATCH">Mismatch / Corrupted</option>
          </select>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="bg-[#101827] border border-[#263449] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#263449] bg-[#151F30]/50 text-[#94A3B8]">
                <th className="py-3.5 px-4 font-medium">ID</th>
                <th className="py-3.5 px-4 font-medium">Title</th>
                <th className="py-3.5 px-4 font-medium">Case Reference</th>
                <th className="py-3.5 px-4 font-medium">Type</th>
                <th className="py-3.5 px-4 font-medium">Hash Status</th>
                <th className="py-3.5 px-4 font-medium">Registered</th>
                <th className="py-3.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263449]/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                      <span>Scanning cryptographic vault records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEvidence.length > 0 ? (
                filteredEvidence.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/evidence/${item.id}`)}
                    className="hover:bg-[#151F30] cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-sky-400">
                      {item.evidenceReference}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-[11px] text-[#94A3B8] font-mono">
                        {item.originalFilename}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-sky-400">
                      {item.case?.caseReference || 'ICCF-CASE'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#1B2940] text-[#94A3B8] border border-[#263449]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.latestVerificationStatus === 'VERIFIED'
                              ? 'bg-emerald-400'
                              : item.latestVerificationStatus === 'MISMATCH'
                                ? 'bg-rose-400'
                                : 'bg-amber-400'
                          }`}
                        />
                        <span
                          className={`font-medium ${
                            item.latestVerificationStatus === 'VERIFIED'
                              ? 'text-emerald-400'
                              : item.latestVerificationStatus === 'MISMATCH'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                          }`}
                        >
                          {item.latestVerificationStatus === 'NOT_VERIFIED'
                            ? 'Pending'
                            : item.latestVerificationStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#94A3B8]">
                      {new Date(item.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => navigate(`/evidence/${item.id}`)}
                          title="View Details & Custody"
                          className="p-1.5 text-[#94A3B8] hover:text-white rounded hover:bg-[#1B2940]"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`/api/evidence/${item.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          download={item.originalFilename}
                          title="Download Evidence Stream"
                          className="p-1.5 text-[#94A3B8] hover:text-sky-400 rounded hover:bg-[#1B2940]"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8] space-y-2">
                    <Database className="w-8 h-8 text-[#94A3B8] mx-auto opacity-40" />
                    <p>No digital evidence items found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Evidence Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101827] border border-[#263449] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#263449] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-semibold text-white">Register Digital Evidence</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterEvidence} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">Associated Case *</label>
                <select
                  required
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseReference} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">Evidence Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Memory Dump - Compromised DC01"
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">
                  Evidence Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="System Logs">System Logs</option>
                  <option value="Disk Image">Disk Image (.raw, .img)</option>
                  <option value="Memory Dump">Memory Dump (.dmp, .raw)</option>
                  <option value="Network Capture">Network Capture (.pcap)</option>
                  <option value="Document">Confidential Document (.pdf, .txt, .csv)</option>
                  <option value="Archive">Forensic Archive (.zip)</option>
                </select>
              </div>

              {/* File Attachment Dropzone */}
              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">Physical File *</label>
                <div className="border-2 border-dashed border-[#263449] hover:border-sky-500/50 rounded-xl p-4 text-center cursor-pointer bg-[#151F30]/40 transition-colors relative">
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-sky-400">
                      <FileText className="w-5 h-5" />
                      <span className="font-medium text-white truncate max-w-xs">
                        {selectedFile.name} ({formatBytes(selectedFile.size)})
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud className="w-8 h-8 text-[#94A3B8] mx-auto" />
                      <p className="text-white font-medium">Click or drag forensic file here</p>
                      <p className="text-[10px] text-[#94A3B8]">
                        PDF, TXT, CSV, PNG, JPG, ZIP, PCAP, LOG (Max 50MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">Acquisition Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Acquisition hardware, extraction methodology, or hash notes..."
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#263449]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#151F30] hover:bg-[#1B2940] text-[#94A3B8] rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {modalSubmitting ? 'Computing SHA-256...' : 'Register Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
