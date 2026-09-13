import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Coffee, Shield, UtensilsCrossed, ArrowRight, Lock, Mail,
  User, Phone, Store, Globe, CheckCircle2, Sparkles, Zap, Layers, UserPlus, Eye, EyeOff, Clock
} from 'lucide-react';
import { apiRequest, setAuthToken } from '../services/api';
import { APP_NAME, APP_SLUG } from '../constants/app';
import { useOtpVerification } from '../hooks/useOtpVerification';
import { formatTime } from '../utils/DateUtils';

interface RegisterPageProps {
  onRegisterSuccess: (userData: any) => void;
}

const carouselSlides = [
  {
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=80',
    tag: 'INTELLIGENT POS & KDS',
    title: "Automate Kitchen Operations.",
    subtitle: 'Reduce order fulfillment time by 65% with real-time ticket routing across kitchens & baristas.'
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

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess }) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    businessName: '',
    slug: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const otp = useOtpVerification(formData.phone);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'businessName' && (!prev.slug || prev.slug === prev.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-'))) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]/g, '-');
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError('Please agree to the Merchant Terms of Service to continue.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/auth/register', 'POST', formData);
      setAuthToken(res.data.token);
      onRegisterSuccess(res.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify your details.');
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
      {/* RIGHT COLUMN: HIGHLY PROFESSIONAL LIGHT THEME SIGNUP CONTAINER          */}
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

          <Link to="/login" className="text-xs font-bold text-red-600 hover:text-red-700">
            Sign In →
          </Link>
        </div>

        {/* Main Form Center Wrapper */}
        <div className="max-w-md w-full mx-auto my-auto space-y-6">
          
          {/* Section Header */}
          <div className="text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-700 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>14-Day Free Trial • Instant Setup</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Business Account</h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Launch your business's digital menu, KDS kitchen display, and POS in under 2 minutes.
            </p>
          </div>

          {/* Segmented Control Switcher (Sign In vs Register) */}
          <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-2xl border border-slate-300/60 font-bold text-xs">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 flex items-center justify-center gap-2 transition-all"
            >
              Sign In
            </button>
            <button
              type="button"
              className="py-2.5 rounded-xl bg-white text-slate-900 shadow-sm border border-slate-200/80 flex items-center justify-center gap-2 transition-all"
            >
              <UserPlus className="w-4 h-4 text-red-600" /> Create Account
            </button>
          </div>

          {/* Step Process Indicator */}
          <div className="flex items-center justify-between px-2 text-xs font-bold">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-red-600' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${step >= 1 ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'bg-slate-200 text-slate-500'}`}>1</span>
              <span>Account Credentials</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-red-600' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${step >= 2 ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'bg-slate-200 text-slate-500'}`}>2</span>
              <span>Business Setup</span>
            </div>
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
              {step === 1 ? (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-900 mb-1.5">Owner Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Rajesh Sharma"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-900 mb-1.5">Work Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="owner@yourbusiness.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Mobile Phone */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-900 mb-1.5">Phone Number</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          required
                          disabled={otp.otpVerified}
                          value={formData.phone}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setFormData((prev) => ({ ...prev, phone: digits }));
                          }}
                          placeholder="9876543210"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all disabled:opacity-60"
                        />
                      </div>
                      {!otp.otpVerified && (
                        <button
                          type="button"
                          onClick={otp.sendOtp}
                          disabled={otp.sending || !otp.canResend}
                          className="px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold whitespace-nowrap disabled:opacity-40 transition-all"
                        >
                          {otp.sending ? 'Sending...' : otp.otpSent ? 'Resend' : 'Send OTP'}
                        </button>
                      )}
                    </div>

                    {otp.otpSent && !otp.canResend && !otp.otpVerified && (
                      <span className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-slate-400 tabular-nums">
                        <Clock className="w-3.5 h-3.5" /> Resend available in {formatTime(otp.resendSecondsLeft)}
                      </span>
                    )}

                    {/* Staging-only: backend echoes the OTP back instead of sending a real
                        SMS, so testers don't need a phone to complete the flow. Never
                        appears against the production OTP provider. */}
                    {otp.devOtp && (
                      <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-dashed border-amber-300">
                        <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-700">
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-400/30 uppercase tracking-wider">Staging</span>
                          Test OTP
                        </span>
                        <span className="text-sm font-black text-amber-800 tracking-[0.2em]">{otp.devOtp}</span>
                      </div>
                    )}

                    {otp.otpVerified && (
                      <p className="mt-1.5 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Phone verified
                      </p>
                    )}

                    {otp.otpSent && !otp.otpVerified && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Enter OTP"
                          value={otp.otpCode}
                          onChange={(e) => otp.setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-semibold outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 transition-all"
                        />
                        <button
                          type="button"
                          onClick={otp.verifyOtp}
                          disabled={otp.verifying}
                          className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold whitespace-nowrap disabled:opacity-40 transition-all"
                        >
                          {otp.verifying ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                    )}

                    {otp.error && (
                      <p className="mt-1.5 text-[11px] font-bold text-rose-600">{otp.error}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-900 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
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

                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.name || !formData.email || !formData.phone || !formData.password) {
                        setError('Please fill in all fields before continuing.');
                        return;
                      }
                      if (!otp.otpVerified) {
                        setError('Please verify your phone number before continuing.');
                        return;
                      }
                      setError(null);
                      setStep(2);
                    }}
                    disabled={!otp.otpVerified}
                    className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-50"
                  >
                    Continue to Business Details <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-900 mb-1.5">Business Name</label>
                    <div className="relative">
                      <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        placeholder="The Artisan Roastery & Bakery"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Business Subdomain / URL Slug */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-900 mb-1.5">Unique Customer Menu URL Slug</label>
                    <div className="relative flex items-center">
                      <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        name="slug"
                        value={formData.slug}
                        onChange={handleInputChange}
                        placeholder="artisan-cafe"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 text-xs text-slate-900 font-mono outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      Your QR menu link: <span className="text-red-600 font-bold">{APP_SLUG}.app/c/{formData.slug || 'your-slug'}</span>
                    </p>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer accent-red-600 shrink-0"
                    />
                    <span className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      I agree to the{' '}
                      <Link to="/terms" target="_blank" className="text-red-600 font-bold hover:underline">
                        Merchant Terms of Service
                      </Link>
                      , including the commission and billing terms.
                    </span>
                  </label>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-extrabold text-xs transition-all"
                    >
                      ← Back
                    </button>

                    <button
                      type="submit"
                      disabled={loading || !agreedToTerms}
                      className="w-2/3 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating Business...
                        </span>
                      ) : (
                        <>
                          Complete & Launch Business <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>

            <div className="text-center text-xs text-slate-600 font-medium pt-3 border-t border-slate-100">
              Already have an account?{' '}
              <Link to="/login" className="text-red-600 font-extrabold hover:underline">
                Sign In Instead
              </Link>
            </div>

            <p className="text-[10px] text-center text-slate-400">
              By creating an account, you agree to {APP_NAME}'s{' '}
              <Link to="/terms" target="_blank" className="text-slate-500 font-bold hover:underline">
                Merchant Terms of Service
              </Link>.
            </p>
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

