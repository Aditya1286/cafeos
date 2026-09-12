import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Coffee, Shield, UtensilsCrossed, ArrowRight, Lock, Mail, 
  Eye, EyeOff, CheckCircle2, Sparkles, Zap, Layers, UserCheck
} from 'lucide-react';
import { apiRequest, setAuthToken } from '../services/api';
import { APP_NAME, APP_SLUG } from '../constants/app';

interface LoginPageProps {
  onLoginSuccess: (userData: any) => void;
}

const carouselSlides = [
  {
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=80',
    tag: 'INTELLIGENT POS & KDS',
    title: "Automate Kitchen Operations.",
    subtitle: 'Reduce order fulfillment time by 65% with real-time Socket.IO ticket routing across kitchens & baristas.'
  },
  {
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1400&q=80',
    tag: 'CONTACTLESS DINING',
    title: 'Instant QR Table Ordering.',
    subtitle: 'Customers scan, customize dishes, and pay seamlessly right from their phone browser — zero app download required.'
  },
  {
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1400&q=80',
    tag: 'AUDITABLE FINANCIALS',
    title: 'Double-Entry Financial Ledger.',
    subtitle: 'Integer paise currency precision, inventory BOM auto-deduction, and automated platform fee settlements.'
  }
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/auth/login', 'POST', { email, password });
      setAuthToken(res.data.token);
      onLoginSuccess(res.data);
      if (res.data.user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
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
      const res = await apiRequest('/auth/login', 'POST', { email: demoEmail, password: 'password123' });
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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans selection:bg-red-600 selection:text-white">
      
      {/* ========================================================================= */}
      {/* LEFT COLUMN: CRISP HIGH-DEF CAROUSEL & FLOATING STATS OVERLAY (UNBLURRED) */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:w-[54%] relative flex-col justify-between p-12 overflow-hidden bg-slate-950">
        
        {/* Crisp Unblurred Slides */}
        {carouselSlides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              currentSlide === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center filter-none scale-100 transition-transform duration-10000"
            />
            {/* Multi-stage subtle dark gradient overlay for typography readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/30" />
          </div>
        ))}

        {/* Top Header & Platform Operational Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-red-600 flex items-center justify-center shadow-xl shadow-red-600/40 group-hover:scale-105 transition-transform duration-300">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white">{APP_NAME}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-red-600/30 text-red-300 rounded-full border border-red-500/30 font-bold">PROD</span>
              </div>
              <span className="text-xs text-slate-300 font-semibold block">Enterprise Multi-Tenant SaaS</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Operational</span>
          </div>
        </div>

        {/* Bottom Floating Feature Banner & Slide Control */}
        <div className="relative z-10 space-y-6 max-w-xl">
          
          {/* Glass Stats Badge */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-white">
            <div className="text-left space-y-0.5">
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-red-500" /> KDS Speed
              </div>
              <div className="text-base font-black text-white">&lt; 120ms</div>
            </div>
            <div className="text-left space-y-0.5 border-x border-white/10 px-3">
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" /> Accuracy
              </div>
              <div className="text-base font-black text-white">99.99%</div>
            </div>
            <div className="text-left space-y-0.5 pl-1">
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-amber-400" /> Multi-Tenant
              </div>
              <div className="text-base font-black text-white">500+ Businesses</div>
            </div>
          </div>

          {/* Slide Text Content */}
          <div className="space-y-2 text-left">
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-red-400 bg-red-950/60 border border-red-800/50 px-2.5 py-1 rounded-md inline-block">
              {carouselSlides[currentSlide].tag}
            </span>
            <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-md">
              {carouselSlides[currentSlide].title}
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed font-medium drop-shadow-sm">
              {carouselSlides[currentSlide].subtitle}
            </p>
          </div>

          {/* Interactive Slide Controls */}
          <div className="flex items-center gap-3 pt-2">
            {carouselSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-500 ${
                  currentSlide === idx 
                    ? 'w-10 bg-red-600 shadow-lg shadow-red-600/60' 
                    : 'w-3 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: HIGHLY PROFESSIONAL LIGHT THEME FORM CONTAINER             */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[46%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-slate-50 overflow-y-auto">
        
        {/* Top Header Mobile Brand */}
        <div className="flex justify-between items-center lg:hidden mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/30">
              <Coffee className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-slate-900">{APP_NAME}</span>
          </Link>

          <Link to="/register" className="text-xs font-bold text-red-600 hover:text-red-700">
            Create Account →
          </Link>
        </div>

        {/* Main Form Center Wrapper */}
        <div className="max-w-md w-full mx-auto my-auto space-y-6">
          
          {/* Section Header */}
          <div className="text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-700 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>Enterprise Business Management Portal</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sign In to {APP_NAME}</h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Enter your registered credentials or select an instant demo profile below.
            </p>
          </div>

          {/* Segmented Control Switcher (Sign In vs Register) */}
          <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-2xl border border-slate-300/60 font-bold text-xs">
            <button
              type="button"
              className="py-2.5 rounded-xl bg-white text-slate-900 shadow-sm border border-slate-200/80 flex items-center justify-center gap-2 transition-all"
            >
              <UserCheck className="w-4 h-4 text-red-600" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 flex items-center justify-center gap-2 transition-all"
            >
              Create Account
            </button>
          </div>

          {/* 1-Click Instant Demo Login Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> 1-Click Instant Demo Profiles
              </span>
              <span className="text-[10px] text-slate-400 font-medium">No password needed</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleDemoLogin('owner@artisan.com')}
                type="button"
                className="py-2.5 px-2.5 rounded-xl bg-red-50/80 hover:bg-red-100 border border-red-200 text-red-900 font-bold text-xs flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex-shrink-0 flex items-center justify-center">
                    <UtensilsCrossed className="w-3 h-3" />
                  </div>
                  <div className="text-left truncate">
                    <div className="text-[10px] font-extrabold leading-tight text-slate-900 truncate">Business #1 (Artisan)</div>
                    <div className="text-[8px] text-slate-500 font-mono truncate">owner@artisan.com</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleDemoLogin('owner@beanandbutter.com')}
                type="button"
                className="py-2.5 px-2.5 rounded-xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex-shrink-0 flex items-center justify-center">
                    <Coffee className="w-3 h-3" />
                  </div>
                  <div className="text-left truncate">
                    <div className="text-[10px] font-extrabold leading-tight text-slate-900 truncate">Business #2 (Bakery)</div>
                    <div className="text-[8px] text-slate-500 font-mono truncate">owner@beanandbutter.com</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleDemoLogin(`admin@${APP_SLUG}.com`)}
                type="button"
                className="py-2.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-900 font-bold text-xs flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex-shrink-0 flex items-center justify-center">
                    <Shield className="w-3 h-3" />
                  </div>
                  <div className="text-left truncate">
                    <div className="text-[10px] font-extrabold leading-tight text-slate-900 truncate">Super Admin</div>
                    <div className="text-[8px] text-slate-500 font-mono truncate">admin@{APP_SLUG}.com</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Form Separator */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-300/80 w-full" />
            <span className="bg-slate-50 px-3 text-[11px] font-extrabold uppercase text-slate-400 tracking-wider font-mono absolute">
              or sign in with email
            </span>
          </div>

          {/* Modern Elevated White Form Card */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-5">
            
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 text-left">
                <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Work Email Field */}
              <div>
                <label className="block text-xs font-extrabold text-slate-900 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@artisan.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-900">
                    Password
                  </label>
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Demo environment: Use password123 or click the instant demo buttons above.'); }} className="text-[11px] font-bold text-red-600 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
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
                  <span className="text-xs text-slate-600 font-semibold">Remember this device for 30 days</span>
                </label>
              </div>

              {/* Primary Call to Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Authenticating Session...
                  </span>
                ) : (
                  <>
                    Sign In to Dashboard <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-xs text-slate-600 font-medium pt-3 border-t border-slate-100">
              Don't have a business account yet?{' '}
              <Link to="/register" className="text-red-600 font-extrabold hover:underline">
                Create Free Trial Account
              </Link>
            </div>
          </div>

          {/* Security & Compliance Badges Footer */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-semibold pt-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 256-bit TLS Encrypted
            </span>
            <span>•</span>
            <span>Multi-Tenant Isolated</span>
            <span>•</span>
            <span>SOC2 Type II</span>
          </div>

        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-500 font-medium pt-6 border-t border-slate-200/80 mt-6">
          © 2026 {APP_NAME} SaaS Platform Inc. • Empowering 500+ Hospitality Businesses Globally
        </div>
      </div>

    </div>
  );
};

