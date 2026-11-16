import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, Eye, EyeOff, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        await register({
          email,
          password,
          fullName,
          badgeNumber: badgeNumber || undefined,
          department: department || undefined,
        });
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Authentication failed. Please verify credentials.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDemoCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('ForensicAdmin2026!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#080D18] flex items-center justify-center p-6 text-[#F8FAFC]">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 items-center justify-center text-sky-400 mb-2 shadow-lg shadow-sky-500/5">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-mono text-white">ICCF</h1>
          <p className="text-sm font-semibold text-sky-400">Integrity & Chain-of-Custody Focused</p>
          <p className="text-xs text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
            Preserving Digital Evidence. Protecting Its Integrity. Maintaining the Chain of Custody.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#101827] border border-[#263449] rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#263449] pb-4">
            <h2 className="text-base font-semibold text-white">
              {isRegisterMode ? 'Register Investigator' : 'Sign in to your account'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrorMessage(null);
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
            >
              {isRegisterMode ? 'Already registered? Login' : 'Create an account'}
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Special Agent Alex Morgan"
                      className="w-full bg-[#151F30] border border-[#263449] rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                      Badge Number
                    </label>
                    <input
                      type="text"
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                      placeholder="ICCF-882"
                      className="w-full bg-[#151F30] border border-[#263449] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Cyber Forensics"
                      className="w-full bg-[#151F30] border border-[#263449] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investigator@iccf.local"
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#151F30] border border-[#263449] rounded-lg pl-9 pr-10 py-2.5 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isRegisterMode ? 'Complete Registration' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          {!isRegisterMode && (
            <div className="pt-2 border-t border-[#263449] space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#94A3B8]">
                Quick Demo Accounts (Local Dev):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDemoCredentials('admin@iccf.local')}
                  className="py-1.5 px-2 bg-[#151F30] hover:bg-[#1B2940] border border-[#263449] text-[11px] rounded text-sky-400 font-medium transition-colors"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('investigator@iccf.local')}
                  className="py-1.5 px-2 bg-[#151F30] hover:bg-[#1B2940] border border-[#263449] text-[11px] rounded text-emerald-400 font-medium transition-colors"
                >
                  Investigator
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('viewer@iccf.local')}
                  className="py-1.5 px-2 bg-[#151F30] hover:bg-[#1B2940] border border-[#263449] text-[11px] rounded text-indigo-400 font-medium transition-colors"
                >
                  Viewer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
