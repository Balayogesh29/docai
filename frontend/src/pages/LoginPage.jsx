import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import { getFriendlyAuthErrorMessage } from '../utils/authErrors';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-xs text-slate-500">Sign in to your DocAI research workspace</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-600 text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            id="email"
            placeholder="alex.carter@institution.edu"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <span className="text-[11px] font-medium text-brand-600 hover:underline cursor-not-allowed">
                Forgot password?
              </span>
            </div>
            <Input
              type="password"
              id="password"
              placeholder="••••••••"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            icon={LogIn}
          >
            Sign In
          </Button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="absolute inset-x-0 h-px bg-slate-200"></div>
          <span className="relative bg-white px-3.5 text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            Or continue with
          </span>
        </div>

        {/* Google Authentication */}
        <Button
          variant="outline"
          className="w-full bg-white text-slate-700 hover:bg-slate-50 border-slate-300"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.77 14.93 1 12 1 7.35 1 3.37 3.68 1.41 7.59l3.79 2.94c.9-2.7 3.42-4.49 6.8-4.49z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.38-4.88 3.38-8.5z"
            />
            <path
              fill="#FBBC05"
              d="M5.2 10.53c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.41 3.23C.51 5.03 0 7.03 0 9.15s.51 4.12 1.41 5.92l3.79-2.94z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.5 1.18-4.3 1.18-3.38 0-5.9-1.79-6.8-4.49L1.41 16.8C3.37 20.71 7.35 23 12 23z"
            />
          </svg>
          Google Account
        </Button>

        {/* Register Footer */}
        <div className="text-center pt-2 text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
