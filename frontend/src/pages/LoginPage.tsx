import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee, ArrowRight, Lock, Eye, EyeOff, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import { CaosLogo } from '@/molecules/CaosLogo';
import { setAuthToken } from '../services/api';
import authService from '../services/auth';
import { APP_NAME } from '../constants/app';
import { DEMO_CAFE, DEMO_PATH } from '../constants/demo';
import { LoginIdentifierField, LoginMethod } from '@/molecules/LoginIdentifierField';
import { LoginShowcase } from '@/organisms/auth/LoginShowcase';
import { PageMascot } from '@/mascot/PageMascot';

interface LoginPageProps {
  onLoginSuccess: (userData: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res =
        loginMethod === 'email'
          ? await authService.login(email, password)
          : await authService.loginWithPhone(phone, password);
      setAuthToken(res.data.token);
      onLoginSuccess(res.data);
      if (res.data.user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(
        err.message ||
          `Invalid ${loginMethod === 'email' ? 'email' : 'phone number'} or password. Please try again.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setLoading(true);
    setError(null);

    try {
      const res = await authService.login(demoEmail, 'password123');
      setAuthToken(res.data.token);
      onLoginSuccess(res.data);
      if (res.data.user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-mascot-section="login"
      className="min-h-screen bg-slate-100 text-slate-900 flex font-sans selection:bg-red-600 selection:text-white"
    >
      {/* LEFT: the product on a branded backdrop (also the mascot's glide area) */}
      <LoginShowcase />

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: HIGHLY PROFESSIONAL LIGHT THEME FORM CONTAINER             */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[46%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-slate-50 overflow-y-auto">
        {/* Top Header Mobile Brand */}
        <div className="flex justify-between items-center lg:hidden mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <CaosLogo className="w-10 h-10 rounded-xl shadow-md shadow-red-600/30" />
            <span className="text-xl font-black text-slate-900">{APP_NAME}</span>
          </Link>
        </div>

        {/* Main Form Center Wrapper */}
        <div className="max-w-md w-full mx-auto my-auto space-y-6">
          {/* Section Header */}
          <div className="text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-700 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>Business Owner Login</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Sign In to {APP_NAME}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Sign in with your email or phone number and password, or look around the demo café
              below.
            </p>
          </div>

          {/* One-click login for the seeded demo café */}
          <div
            data-mascot-obstacle
            className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Try the demo café
              </span>
              <span className="text-[10px] text-slate-400 font-medium">No password needed</span>
            </div>

            <button
              onClick={() => handleDemoLogin(DEMO_CAFE.ownerEmail)}
              data-mascot-field="demo"
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex-shrink-0 flex items-center justify-center">
                <Coffee className="w-3.5 h-3.5" />
              </div>
              <div className="text-left truncate">
                <div className="text-[11px] font-extrabold leading-tight text-slate-900 truncate">
                  {DEMO_CAFE.name}
                </div>
                <div className="text-[9px] text-slate-500 font-medium truncate">
                  Open the owner dashboard of the demo café
                </div>
              </div>
            </button>
          </div>

          {/* Form Separator: text first, line after, so the right end of the card below stays free
              (the mascot pops up there). */}
          <div className="flex items-center gap-3 py-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider font-mono whitespace-nowrap">
              or sign in with email
            </span>
            <div className="border-t border-slate-300/80 flex-1" />
          </div>

          {/* Modern Elevated White Form Card */}
          <div
            data-mascot-peek="login-form"
            className="relative z-10 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-5"
          >
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 text-left">
                <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Email or phone number */}
              <LoginIdentifierField
                method={loginMethod}
                onMethodChange={(method) => {
                  setLoginMethod(method);
                  setError(null);
                }}
                email={email}
                onEmailChange={setEmail}
                phone={phone}
                onPhoneChange={setPhone}
              />

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-900">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] font-bold text-red-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    data-mascot-field="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer accent-red-600"
                  />
                  <span className="text-xs text-slate-600 font-semibold">
                    Remember this device for 30 days
                  </span>
                </label>
              </div>

              {/* Primary Call to Action Button */}
              <button
                type="submit"
                data-mascot-field="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing you in…
                  </span>
                ) : (
                  <>
                    Sign In to Dashboard <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-xs text-slate-600 font-medium pt-3 border-t border-slate-100">
              New to {APP_NAME}?{' '}
              <Link to={DEMO_PATH} className="text-red-600 font-extrabold hover:underline">
                Start your free trial
              </Link>
            </div>
          </div>

          {/* Security & Compliance Badges Footer */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-semibold pt-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Secure connection
            </span>
            <span>•</span>
            <span>Your data is kept private</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-500 font-medium pt-6 border-t border-slate-200/80 mt-6">
          © 2026 {APP_NAME}. Ordering and billing for cafés and restaurants.
        </div>
      </div>

      <PageMascot page="login" />
    </div>
  );
};
