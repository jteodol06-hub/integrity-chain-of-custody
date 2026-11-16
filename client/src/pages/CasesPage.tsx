import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FolderLock, Plus, Search, Filter, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { Case, User } from '../types';
import { useAuth } from '../hooks/useAuth';

export const CasesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('new') === 'true');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Ransomware');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchCases();
    fetchUsers();
  }, [statusFilter, priorityFilter]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;

      const res = await api.get('/cases', { params });
      if (res.data.success) {
        setCases(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSubmitting(true);

    try {
      const res = await api.post('/cases', {
        title,
        description,
        category,
        priority,
        assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : undefined,
      });

      if (res.data.success) {
        setIsModalOpen(false);
        setSearchParams({});
        setTitle('');
        setDescription('');
        setAssignedUserIds([]);
        fetchCases();
        navigate(`/cases/${res.data.data.id}`);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to create investigation case.';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Investigations</h1>
          <p className="text-xs text-[#94A3B8]">
            Manage authorized cybersecurity cases and evidence custody.
          </p>
        </div>

        {user?.role !== 'VIEWER' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" /> New Case
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-[#101827] border border-[#263449] p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCases()}
            placeholder="Search cases by reference, title, or description..."
            className="w-full bg-[#151F30] border border-[#263449] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#94A3B8]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#151F30] border border-[#263449] text-xs text-[#F8FAFC] rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="CLOSED">Closed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#151F30] border border-[#263449] text-xs text-[#F8FAFC] rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-[#101827] border border-[#263449] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#263449] bg-[#151F30]/50 text-[#94A3B8]">
                <th className="py-3.5 px-4 font-medium">Case Reference</th>
                <th className="py-3.5 px-4 font-medium">Title & Category</th>
                <th className="py-3.5 px-4 font-medium">Priority</th>
                <th className="py-3.5 px-4 font-medium">Status</th>
                <th className="py-3.5 px-4 font-medium">Evidence Count</th>
                <th className="py-3.5 px-4 font-medium">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263449]/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A3B8]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                      <span>Loading case repository...</span>
                    </div>
                  </td>
                </tr>
              ) : cases.length > 0 ? (
                cases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    className="hover:bg-[#151F30] cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-sky-400">
                      {c.caseReference}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-white">{c.title}</p>
                      <p className="text-[11px] text-[#94A3B8]">{c.category}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.priority === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : c.priority === 'HIGH'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                        }`}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#F8FAFC]">
                      {c._count?.evidenceItems || 0} items
                    </td>
                    <td className="py-3.5 px-4 text-[#94A3B8]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A3B8] space-y-2">
                    <FolderLock className="w-8 h-8 text-[#94A3B8] mx-auto opacity-40" />
                    <p>No investigation cases match your current filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101827] border border-[#263449] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#263449] pb-3">
              <div className="flex items-center gap-2">
                <FolderLock className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-semibold text-white">
                  Create New Investigation Case
                </h3>
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

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">Case Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. LockBit Ransomware Infiltration Analysis"
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#94A3B8] mb-1.5">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#151F30] border border-[#263449] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Ransomware">Ransomware</option>
                    <option value="Insider Threat">Insider Threat</option>
                    <option value="Data Breach">Data Breach</option>
                    <option value="Phishing">Phishing Campaign</option>
                    <option value="Malware Analysis">Malware Analysis</option>
                    <option value="Unauthorized Access">Unauthorized Access</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#94A3B8] mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#151F30] border border-[#263449] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed narrative of the incident, affected systems, and forensic objectives..."
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg p-3 text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#94A3B8] mb-1.5">
                  Assign Investigators
                </label>
                <select
                  multiple
                  value={assignedUserIds}
                  onChange={(e) =>
                    setAssignedUserIds(
                      Array.from(e.target.selectedOptions, (option) => option.value)
                    )
                  }
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg p-2 text-white focus:outline-none focus:border-sky-500 h-24"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role} - {u.email})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#94A3B8] mt-1">
                  Hold Ctrl/Cmd to select multiple investigators.
                </p>
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
                  {modalSubmitting ? 'Creating Case...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
