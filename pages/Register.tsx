import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus, Rocket } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';

const defaultForm = {
  username: '',
  email: '',
  password: ''
};

type RegistrationMode = 'init' | 'register';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<RegistrationMode>('init');
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof typeof defaultForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleModeChange = (nextMode: RegistrationMode) => {
    setMode(nextMode);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.username || !form.email || !form.password) {
      setError('Please complete every field.');
      return;
    }

    if (form.password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { ...form };
      const response = mode === 'init'
        ? await api.auth.initAdmin(payload)
        : await api.auth.register(payload);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7), transparent 40%)' }} />
          <div className="relative space-y-6">
            <div className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
              <Rocket className="w-4 h-4 mr-2" />
              First-run setup
            </div>
            <h1 className="text-4xl font-bold leading-tight">
              Launch your ZenLog workspace in minutes.
            </h1>
            <p className="text-lg text-white/80">
              Create the very first admin account or onboard a new collaborator. All calls map directly to the `/api/v1/auth/*` endpoints documented by the backend.
            </p>
            <dl className="space-y-4">
              <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center">
                <ShieldCheck className="w-5 h-5 text-emerald-200 mr-3" />
                <div>
                  <dt className="text-sm uppercase tracking-wide text-white/70">Admin Init</dt>
                  <dd className="text-base font-semibold">`POST /auth/admin/init`</dd>
                </div>
              </div>
              <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center">
                <UserPlus className="w-5 h-5 text-sky-200 mr-3" />
                <div>
                  <dt className="text-sm uppercase tracking-wide text-white/70">Standard Signup</dt>
                  <dd className="text-base font-semibold">`POST /auth/register`</dd>
                </div>
              </div>
            </dl>
            <p className="text-sm text-white/70">
              Passwords must be 12+ characters. Tokens are saved automatically so you can jump straight into the dashboard once registration succeeds.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">Choose flow</p>
              <h2 className="text-2xl font-bold text-gray-900">{mode === 'init' ? 'Initialize Admin' : 'Register User'}</h2>
            </div>
            <div className="bg-gray-100 rounded-full p-1 flex text-sm font-semibold">
              <button
                type="button"
                onClick={() => handleModeChange('init')}
                className={`px-4 py-1.5 rounded-full transition-colors ${mode === 'init' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500'}`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                className={`px-4 py-1.5 rounded-full transition-colors ${mode === 'register' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500'}`}
              >
                User
              </button>
            </div>
          </div>

          {mode === 'init' ? (
            <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl p-4 text-sm mb-6">
              This endpoint should only be used once to bootstrap your workspace. If an admin already exists, the backend will reject additional init attempts.
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4 text-sm mb-6">
              Use this flow after an administrator has invited you. Accounts created here have basic user permissions by default.
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={handleChange('username')}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                placeholder="jane-doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                placeholder="Minimum 12 characters"
                required
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {mode === 'init' ? 'Create Admin & Continue' : 'Register & Continue'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have credentials?{' '}
            <Link to="/login" className="text-indigo-600 font-medium">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
