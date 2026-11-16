import React, { useEffect, useState } from 'react';
import { ShieldAlert, Filter } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { useAuth } from '../hooks/useAuth';

export const AuditTrailPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter, page]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (actionFilter) params.action = actionFilter;

      const res = await api.get('/audit', { params });
      if (res.data.success) {
        setLogs(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-12 text-center space-y-3 bg-[#101827] border border-[#263449] rounded-2xl max-w-lg mx-auto mt-12">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-base font-semibold text-white">Administrative Access Required</h2>
        <p className="text-xs text-[#94A3B8]">
          The ICCF security audit log contains sensitive operational telemetry and is restricted to
          the Administrator role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Audit Trail</h1>
          <p className="text-xs text-[#94A3B8]">
            Immutable chronological log of authentication, evidence access, and case modifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#94A3B8]" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#151F30] border border-[#263449] text-xs text-[#F8FAFC] rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Actions</option>
            <option value="AUTH_LOGIN_SUCCESS">Login Success</option>
            <option value="AUTH_LOGIN_FAILED">Login Failed</option>
            <option value="AUTH_REGISTER">User Registration</option>
            <option value="CASE_CREATE">Case Created</option>
            <option value="CASE_UPDATE">Case Updated</option>
            <option value="EVIDENCE_UPLOAD">Evidence Ingested</option>
            <option value="EVIDENCE_DOWNLOAD">Evidence Downloaded</option>
            <option value="EVIDENCE_INTEGRITY_VERIFY">Integrity Verified</option>
            <option value="CUSTODY_TRANSFER">Custody Transferred</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-[#101827] border border-[#263449] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#263449] bg-[#151F30]/50 text-[#94A3B8]">
                <th className="py-3.5 px-4 font-medium">Timestamp</th>
                <th className="py-3.5 px-4 font-medium">Actor</th>
                <th className="py-3.5 px-4 font-medium">Action</th>
                <th className="py-3.5 px-4 font-medium">Resource Type</th>
                <th className="py-3.5 px-4 font-medium">Outcome</th>
                <th className="py-3.5 px-4 font-medium">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263449]/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A3B8]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                      <span>Loading audit records...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#151F30] transition-colors">
                    <td className="py-3 px-4 font-mono text-[#94A3B8]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {log.actor?.fullName || 'System / Unauthenticated'}
                      {log.actor?.role && (
                        <span className="ml-1 text-[10px] text-sky-400 font-mono">
                          [{log.actor.role}]
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-400 font-semibold">{log.action}</td>
                    <td className="py-3 px-4 text-[#94A3B8] font-mono">{log.resourceType}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.outcome === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#94A3B8]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A3B8]">
                    No audit records found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#263449] flex items-center justify-between text-xs text-[#94A3B8]">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-[#151F30] hover:bg-[#1B2940] disabled:opacity-40 rounded"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-[#151F30] hover:bg-[#1B2940] disabled:opacity-40 rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
