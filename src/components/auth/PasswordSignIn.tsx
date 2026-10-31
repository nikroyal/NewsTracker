import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { signInWithPassword } from '../../lib/auth-service';

interface PasswordSignInProps {
  onSuccess: () => void;
}

export const PasswordSignIn: React.FC<PasswordSignInProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    const result = await signInWithPassword(password);
    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F4F3EE]">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl p-8 shadow-sm relative">
        <div className="relative z-10">
          {/* Logo / Header */}
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-[#1C1B18] text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#1C1B18] font-['Geist',sans-serif]">
                NewsTracker
              </h1>
              <p className="text-[10px] text-[#68665E] font-mono tracking-wider">
                CONFIDENTIAL PLATFORM ACCESS
              </p>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-sm font-semibold text-[#1C1B18]">Enter Access Password</h2>
            <p className="text-xs text-[#68665E] mt-1">Single-user protected platform with Firestore persistence</p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#68665E] mb-2 uppercase tracking-wider">
                Platform Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoFocus
                  required
                  className="w-full bg-[#FAF9F5] border border-[#E6E5DE] rounded-xl px-4 py-3 pl-10 text-sm text-[#1C1B18] placeholder-[#9E9C92] focus:outline-none focus:border-[#1C1B18] focus:bg-[#FFFFFF] transition-all font-mono"
                />
                <Lock className="w-4 h-4 text-[#9E9C92] absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-[#1C1B18] hover:bg-[#2D2D2D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Unlock Platform'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#E6E5DE] text-center">
            <p className="text-[11px] text-[#9E9C92] font-mono">
              Cloudflare Edge & Firebase Spark Tier Protected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordSignIn;
