import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderLock,
  Database,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { DashboardSummary, DashboardActivity } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<DashboardActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [sumRes, actRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/activity'),
        ]);

        if (sumRes.data.success) setSummary(sumRes.data.data);
        if (actRes.data.success) setActivity(actRes.data.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Donut chart colors: Verified (Emerald), Mismatch (Red), Pending (Amber)
  const pieData = [
    { name: 'Verified', value: summary?.evidence.verified || 0, color: '#22C55E' },
    { name: 'Mismatch', value: summary?.evidence.mismatch || 0, color: '#EF4444' },
    { name: 'Pending', value: summary?.evidence.pending || 0, color: '#F59E0B' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#94A3B8] text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading telemetry and case metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-xs text-[#94A3B8]">
            Overview of your investigations and digital evidence.
          </p>
        </div>

        <button
          onClick={() => navigate('/cases?new=true')}
          className="flex items-center gap-2 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" /> New Case
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Cases */}
        <div className="bg-[#101827] border border-[#263449] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Total Cases</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <FolderLock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">
              {summary?.cases.total || 0}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center">
              Active Cases
            </span>
          </div>
        </div>

        {/* Open Cases */}
        <div className="bg-[#101827] border border-[#263449] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Open Cases</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">
              {summary?.cases.open || 0}
            </span>
            <span className="text-[11px] text-amber-400 font-medium">Under Investigation</span>
          </div>
        </div>

        {/* Evidence Items */}
        <div className="bg-[#101827] border border-[#263449] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Evidence Items</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">
              {summary?.evidence.total || 0}
            </span>
            <span className="text-[11px] text-indigo-400 font-medium">Vault Items</span>
          </div>
        </div>

        {/* Verified Rate */}
        <div className="bg-[#101827] border border-[#263449] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Verified</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">
              {summary?.evidence.verified || 0}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">
              {summary?.evidence.verificationRate || 100}% Integrity Rate
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case Activity Area Chart */}
        <div className="lg:col-span-2 bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Case Activity (Last 14 Days)</h2>
              <p className="text-xs text-[#94A3B8]">
                Telemetry of investigation updates and evidence ingestions
              </p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity?.activityTrend || []}>
                <defs>
                  <linearGradient id="activityGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151F30',
                    borderColor: '#263449',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cases"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#activityGlow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evidence Integrity Donut Chart */}
        <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Evidence Integrity</h2>
            <p className="text-xs text-[#94A3B8]">
              Real-time cryptographic SHA-256 verification status
            </p>
          </div>

          <div className="relative h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-xl font-bold font-mono text-white">
                {summary?.evidence.verificationRate || 100}%
              </span>
              <p className="text-[10px] text-[#94A3B8]">Verified</p>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#263449] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[#94A3B8]">Verified:</span>
              <span className="font-mono text-white font-semibold">
                {summary?.evidence.verified || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-[#94A3B8]">Mismatch:</span>
              <span className="font-mono text-white font-semibold">
                {summary?.evidence.mismatch || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-[#94A3B8]">Pending:</span>
              <span className="font-mono text-white font-semibold">
                {summary?.evidence.pending || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tables: Recent Investigations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Investigations */}
        <div className="lg:col-span-2 bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Investigations</h2>
            <button
              onClick={() => navigate('/cases')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#263449] text-[#94A3B8]">
                  <th className="pb-3 font-medium">Case Reference</th>
                  <th className="pb-3 font-medium">Title</th>
                  <th className="pb-3 font-medium">Priority</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263449]/50">
                {activity?.recentCases && activity.recentCases.length > 0 ? (
                  activity.recentCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/cases/${c.id}`)}
                      className="hover:bg-[#151F30] cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-mono font-medium text-sky-400">{c.caseReference}</td>
                      <td className="py-3 text-white font-medium">{c.title}</td>
                      <td className="py-3">
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
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 text-[#94A3B8]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                      No investigation cases registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
            <button
              onClick={() => navigate('/custody')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              Timeline <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activity?.recentCustody && activity.recentCustody.length > 0 ? (
              activity.recentCustody.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg bg-[#151F30] border border-[#263449] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-sky-400 font-mono">
                      {event.evidence?.evidenceReference || 'EVID'}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-white font-medium">{event.reason}</p>
                  <p className="text-[10px] text-[#94A3B8]">
                    Actor: {event.actor?.fullName || 'System'}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-[#94A3B8]">
                No custody events recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
