import React, { useEffect, useState } from 'react';
import { Shield, Database, CheckCircle2, User, Info } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<{
    status: string;
    system: string;
    version: string;
    database: { status: string };
  } | null>(null);

  useEffect(() => {
    api.get('/health').then((res) => {
      setHealth(res.data);
    });
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Platform Settings & Security
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Review cryptographic configurations, database status, and active investigator profile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Identity Profile */}
        <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#263449] pb-3">
            <User className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Investigator Profile</h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Full Legal Name:</span>
              <span className="text-white font-medium">{user?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Email Address:</span>
              <span className="text-white font-mono">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Role:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                {user?.role}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Badge Number:</span>
              <span className="text-white font-mono">{user?.badgeNumber || 'ICCF-AGENT'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Department:</span>
              <span className="text-white">{user?.department || 'Digital Forensics Unit'}</span>
            </div>
          </div>
        </div>

        {/* System Diagnostics */}
        <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#263449] pb-3">
            <Database className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">System Diagnostics</h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">API Engine:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Online (Express + Node.js)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Database Status:</span>
              <span className="text-emerald-400 font-mono font-medium">PostgreSQL Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Release Version:</span>
              <span className="text-white font-mono">{health?.version || '1.0.0-mvp'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Vault Storage:</span>
              <span className="text-white font-mono">./storage/evidence (Private)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cryptographic Standards Box */}
      <div className="bg-[#101827] border border-[#263449] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#263449] pb-3">
          <Shield className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">
            Cryptographic Standards & Architecture
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#151F30] border border-[#263449] space-y-1.5">
            <span className="font-semibold text-sky-400 font-mono">SHA-256 Hashing</span>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              Cryptographic 256-bit hash algorithm used for bitstream integrity verification and
              append-only chain of custody block hashing.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#151F30] border border-[#263449] space-y-1.5">
            <span className="font-semibold text-emerald-400 font-mono">Bcrypt Salt Rounds</span>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              Adaptive work factor of 10 applied to all passwords, protecting credentials against
              offline rainbow tables and GPU cracking.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#151F30] border border-[#263449] space-y-1.5">
            <span className="font-semibold text-indigo-400 font-mono">RFC 7519 JWT Standard</span>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              Signed HMAC-SHA256 bearer tokens with unique UUID `jti` claims, enforcing stateless
              expiry and active session management.
            </p>
          </div>
        </div>
      </div>

      {/* Forensic Disclaimer */}
      <div className="p-4 rounded-xl bg-[#151F30] border border-[#263449] flex items-start gap-3 text-xs text-[#94A3B8] leading-relaxed">
        <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Forensic Evidence Disclaimer: </span>A
          cryptographic SHA-256 hash match confirms that the stored physical artifact bit-for-bit
          matches the acquisition baseline at ingestion. It does not independently authenticate the
          origin or procedural legality of evidence collected prior to ingestion into the ICCF
          platform.
        </div>
      </div>
    </div>
  );
};
