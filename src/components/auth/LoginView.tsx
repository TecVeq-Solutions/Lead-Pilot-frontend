import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Shield, Sparkles } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [orgName, setOrgName] = useState('Apex Motors');
  const [name, setName] = useState('Elena Vance');
  const [email, setEmail] = useState('elena@apex.com');
  const [password, setPassword] = useState('SecurePassword123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        const res = await api.post('/auth/register', { org_name: orgName, name, email, password });
        setAuth(res.data.token, res.data.user, res.data.organization);
      } else {
        const res = await api.post('/auth/login', { email, password });
        setAuth(res.data.token, res.data.user, res.data.organization);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-darkBase p-6">
      <div className="w-full max-w-md bg-darkSurface border border-darkBorder rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">LeadPilot</h1>
            <p className="text-xs text-slate-400">AI WhatsApp Sales OS</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">
          {isRegistering ? 'Create SaaS Organization' : 'Welcome Back'}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {isRegistering ? 'Register your company sales workspace' : 'Sign in to your organization account'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Organization / Company Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-darkBase border border-darkBorder rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-darkBase border border-darkBorder rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Work Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-darkBase border border-darkBorder rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-darkBase border border-darkBorder rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {loading ? 'Authenticating...' : isRegistering ? 'Create Workspace' : 'Sign In'}
            <Sparkles className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {isRegistering ? 'Already have an organization?' : 'Need an organization account?'}{' '}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-emerald-400 hover:underline font-medium ml-1"
          >
            {isRegistering ? 'Sign In' : 'Create Organization'}
          </button>
        </div>
      </div>
    </div>
  );
};

