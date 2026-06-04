import React, { useState } from 'react';
import { api } from '../api';

interface LoginPageProps {
  onLogin: (token: string, role: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@satark.gov');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user_id } = await api.login(email, password);
      
      // Determine role based on email (demo)
      let role = 'admin';
      if (email.includes('lakshmi')) role = 'enumerator';
      if (email.includes('suspect')) role = 'enumerator';
      if (email.includes('supervisor')) role = 'supervisor';
      if (email.includes('policy')) role = 'policy_maker';

      localStorage.setItem('satark_token', token);
      localStorage.setItem('satark_role', role);
      localStorage.setItem('satark_user_id', user_id);
      
      onLogin(token, role);
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-satark-navy to-satark-bg flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-satark-card border border-satark-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-satark-saffron mb-2">SATARK</h1>
          <p className="text-satark-textAlt text-sm">
            Government of India · Ministry of Statistics & Programme Implementation
          </p>
          <p className="text-satark-textAlt text-xs mt-2">
            "Every number can tell you why"
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-satark-textAlt text-sm mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-satark-bg border border-satark-border rounded text-satark-text placeholder-satark-textAlt focus:outline-none focus:border-satark-saffron"
              placeholder="admin@satark.gov"
            />
          </div>

          <div>
            <label className="block text-satark-textAlt text-sm mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-satark-bg border border-satark-border rounded text-satark-text placeholder-satark-textAlt focus:outline-none focus:border-satark-saffron"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-satark-saffron text-satark-navy font-semibold rounded hover:bg-yellow-400 disabled:opacity-50 transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo users */}
        <div className="mt-8 p-4 bg-satark-bg border border-satark-border rounded text-xs text-satark-textAlt">
          <p className="font-semibold mb-2">Demo Users:</p>
          <div className="space-y-1">
            <p>👤 Admin: admin@satark.gov / admin123</p>
            <p>📱 Enumerator (Good): lakshmi@satark.gov / field123</p>
            <p>⚠️ Enumerator (Suspect): suspect@satark.gov / field123</p>
            <p>👔 Supervisor: supervisor@satark.gov / super123</p>
            <p>📊 Policy Maker: policy@satark.gov / policy123</p>
          </div>
        </div>
      </div>
    </div>
  );
};
