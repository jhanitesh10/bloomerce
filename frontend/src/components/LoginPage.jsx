import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, MessageSquare, Zap, TrendingUp, Layers, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const PIE_DATA = [
  { name: 'Amazon', value: 45 },
  { name: 'Nykaa', value: 25 },
  { name: 'Myntra', value: 20 },
  { name: 'Others', value: 10 },
];

const TREND_DATA = [
  { month: 'Jan', visibility: 45 },
  { month: 'Feb', visibility: 52 },
  { month: 'Mar', visibility: 48 },
  { month: 'Apr', visibility: 70 },
  { month: 'May', visibility: 85 },
  { month: 'Jun', visibility: 92 },
];

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

const LoginPage = () => {
  const [activeWidget, setActiveWidget] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWidget((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Handle tokens from backend callback (Google Login)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userData = params.get('user');

    if (token && userData) {
      localStorage.setItem('bloomerce_token', token);
      localStorage.setItem('bloomerce_user', userData);
      window.location.href = '/skus';
    }
  }, []);

  // Unified handleSubmit for Login and Signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isSignup && (!firstName || !lastName)) return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isSignup) {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/register`, {
          email,
          password,
          first_name: firstName,
          last_name: lastName
        });
        if (response.data.success) {
          setSuccess("Account created! You can now log in.");
          setIsSignup(false);
        }
      } else {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/direct-login`, {
          email,
          password
        });
        if (response.data.success) {
          localStorage.setItem('bloomerce_token', response.data.tokens.access_token);
          localStorage.setItem('bloomerce_user', JSON.stringify(response.data.user));
          window.location.href = '/skus';
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Action failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle social login via backend redirect
  const handleSocialLogin = (connection) => {
    if (connection === 'google') {
      window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-indigo-500/10 relative overflow-x-hidden">

      {/* ── Background Decorative Elements ── */}
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-indigo-200/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-emerald-100/10 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Brand Header (Fixed & Slim) ── */}
      <div className="fixed top-0 left-0 w-full py-3 lg:py-4 px-8 lg:px-20 flex justify-between items-center z-50 bg-white/30 backdrop-blur-md border-b border-slate-200/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-indigo-50">
            <img src="/bloomerce_logo.svg" alt="Bloomerce" className="w-5 h-5 lg:w-7 lg:h-7 object-contain" />
          </div>
          <span className="text-xl lg:text-2xl font-black tracking-tight text-[#0f172a]">
            <span className="text-indigo-600">Bloom</span>erce
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-6">
           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Enterprise v2.0</span>
           <div className="h-3 w-px bg-slate-200/50" />
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Systems Nominal</span>
           </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-screen flex flex-col lg:flex-row max-w-[1300px] mx-auto px-8 lg:px-12 pt-20 lg:pt-24 pb-10 lg:pb-16 items-center justify-center relative z-10">

        {/* ── Command Center Gallery (Feature Slide) ── */}
        <div className="w-full lg:w-[55%] flex flex-col justify-center min-h-[400px] lg:min-h-0 order-2 lg:order-1">
          <div className="relative w-full max-w-[540px] flex flex-col gap-8">
            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4 mb-2">
               <div className="bg-white border border-white p-5 rounded-[24px] shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6366f1]/10 flex items-center justify-center text-[#6366f1]"><Zap size={20} /></div>
                  <div>
                    <p className="text-[#0f172a] text-[11px] font-bold uppercase tracking-wider leading-none">Smart Fill</p>
                    <p className="text-[#64748b] text-[9px] font-medium mt-1">Multi-Channel AI</p>
                  </div>
               </div>
               <div className="bg-white border border-white p-5 rounded-[24px] shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500"><Sparkles size={20} /></div>
                  <div>
                    <p className="text-[#0f172a] text-[11px] font-bold uppercase tracking-wider leading-none">AI Vision</p>
                    <p className="text-[#64748b] text-[9px] font-medium mt-1">Future Insights</p>
                  </div>
               </div>
            </div>

            {/* Widgets */}
            <div className="relative min-h-[320px] flex items-center">
                {/* WIDGET 0: AI CONTENT GENERATOR */}
                <div className={`w-full transition-all duration-700 transform ${activeWidget === 0 ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none absolute'}`}>
                  <div className="bg-white/80 backdrop-blur-xl border border-white p-6 rounded-[32px] shadow-xl shadow-indigo-500/5">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <Layers size={20} />
                           </div>
                           <div>
                              <p className="text-[#0f172a] text-xs font-bold">Auto-Cataloging</p>
                              <p className="text-[10px] text-[#64748b]">Multi-Channel Sync</p>
                           </div>
                        </div>
                        <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100">
                           80% AUTO-FILLED
                        </div>
                     </div>

                     <div className="grid grid-cols-4 gap-3 mb-6">
                        {['Amazon', 'Nykaa', 'Myntra', 'Flipkart'].map((channel) => (
                           <div key={channel} className="aspect-square rounded-2xl bg-[#f8fafc] border border-[#f1f5f9] flex items-center justify-center relative group">
                              <span className="text-[8px] font-black text-[#94a3b8] uppercase tracking-tighter">{channel}</span>
                              <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                           </div>
                        ))}
                     </div>

                     <p className="text-[#475569] text-[13px] leading-relaxed font-medium">
                        One-click deployment across all major marketplaces. Our AI generates channel-specific descriptions, attributes, and SEO metadata instantly.
                     </p>
                  </div>
                </div>

                {/* WIDGET 1: TRENDING UPDATES */}
                <div className={`w-full transition-all duration-700 transform ${activeWidget === 1 ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none absolute'}`}>
                  <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[40px] shadow-xl shadow-indigo-500/5">
                    <div className="flex justify-between items-start mb-6">
                       <div>
                          <p className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-1">Trending Velocity</p>
                          <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">Visibility Boost</h2>
                       </div>
                       <div className="flex items-center gap-1 text-emerald-500 font-bold text-sm">
                          <TrendingUp size={16} />
                          +42%
                       </div>
                    </div>

                    <div className="h-[120px] w-full flex items-end gap-2 mb-6">
                       {TREND_DATA.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2">
                             <div
                                className="w-full bg-indigo-500 rounded-t-lg transition-all duration-1000"
                                style={{
                                   height: activeWidget === 1 ? `${d.visibility}%` : '0%',
                                   opacity: i === 5 ? 1 : 0.4 + (i * 0.1)
                                }}
                             />
                             <span className="text-[9px] font-bold text-[#94a3b8]">{d.month}</span>
                          </div>
                       ))}
                    </div>

                    <p className="text-[#475569] text-[13px] leading-relaxed font-medium">
                       Quarterly Trend Injection: We refresh your catalog every 3 months with trending style tags and keywords to revive market visibility.
                    </p>
                  </div>
                </div>

                {/* WIDGET 2: AI INSIGHTS (LENS) */}
                <div className={`w-full transition-all duration-700 transform ${activeWidget === 2 ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none absolute'}`}>
                   <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[32px] shadow-xl shadow-indigo-500/5 flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                           <Sparkles size={22} fill="currentColor" />
                        </div>
                        <div>
                           <p className="text-[#0f172a] text-base font-bold">AI Vision Insights</p>
                           <p className="text-[11px] text-[#64748b]">Channel Expansion Foresight</p>
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50">
                         <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase">Future Growth Potential</span>
                            <span className="text-[10px] font-black text-indigo-700">HIGH</span>
                         </div>
                         <div className="h-2 bg-white rounded-full overflow-hidden border border-indigo-100">
                            <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 w-[92%] transition-all duration-1000 ease-out" style={{ width: activeWidget === 2 ? '92%' : '0%' }} />
                         </div>
                      </div>

                      <p className="text-[#475569] text-[13px] leading-relaxed font-medium">
                         Wear the "AI Glass" to see through the noise. Get predictive insights on channel-specific growth and strategic expansion moves.
                      </p>
                   </div>
                </div>
            </div>

            <div className="flex justify-center gap-2 mt-4">
                {[0,1,2].map((i) => (
                    <button key={i} onClick={() => setActiveWidget(i)} className={`h-1.5 rounded-full transition-all duration-300 ${activeWidget === i ? 'w-8 bg-[#6366f1]' : 'w-2 bg-[#e2e8f0]'}`} />
                ))}
            </div>
          </div>
        </div>

        {/* ── Glassmorphic Login Form ── */}
        <div className="w-full lg:w-[40%] flex flex-col order-1 lg:order-2">
          <div className="w-full bg-white/70 backdrop-blur-3xl border border-white p-8 lg:p-12 rounded-[48px] shadow-2xl shadow-indigo-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-600">
               <Lock size={120} />
            </div>

            <div className="relative z-10">
              <div className="mb-10">
                <h1 className="text-4xl lg:text-5xl font-black text-[#0f172a] mb-4 tracking-tighter leading-[1.1]">
                  {isSignup ? "Create" : "Welcome"} <br/>
                  <span className="text-indigo-600">{isSignup ? "Account" : "Back."}</span>
                </h1>
                <p className="text-slate-500 font-medium text-sm lg:text-base">
                  {isSignup ? "Join the enterprise commerce network." : "Identity verification required to access."}
                </p>
              </div>

              {success && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-[11px] font-bold">
                   <CheckCircle2 size={16} />
                   {success}
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[11px] font-bold animate-in fade-in slide-in-from-top-2">
                   <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Lock size={12} />
                   </div>
                   {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup && (
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      className="w-full h-14 px-5 rounded-[20px] border border-slate-200 bg-white/50 text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium"
                    />
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      className="w-full h-14 px-5 rounded-[20px] border border-slate-200 bg-white/50 text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="relative group">
                     <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                     <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full h-15 pl-14 pr-5 rounded-[20px] border border-slate-200 bg-white/50 text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="relative group">
                     <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                     <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignup ? "Create Password" : "Security Token / Password"}
                      className="w-full h-15 pl-14 pr-5 rounded-[20px] border border-slate-200 bg-white/50 text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-15 rounded-[20px] bg-[#0f172a] hover:bg-black text-white font-bold text-base shadow-xl shadow-black/10 flex items-center justify-center gap-3 group transition-all"
                >
                  {isLoading ? (isSignup ? "Creating..." : "Verifying...") : (isSignup ? "Create Account" : "Enter Command Center")}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Button>

                <div className="flex items-center gap-4 py-4">
                   <div className="flex-1 h-px bg-slate-100" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Single Sign-On</span>
                   <div className="flex-1 h-px bg-slate-100" />
                </div>

                  <button
                    type="button"
                    disabled={true}
                    className="w-full h-14 rounded-[20px] border border-slate-200 bg-slate-50 text-slate-400 font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-not-allowed opacity-50 pointer-events-none"
                  >
                    <img src="https://www.vectorlogo.zone/logos/google/google-icon.svg" className="w-5 h-5 grayscale" alt="Google" />
                    Continue with Google (Coming Soon)
                  </button>
              </form>

              <div className="mt-8 text-center">
                 <button
                  type="button"
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-indigo-600 font-bold text-sm hover:underline"
                 >
                   {isSignup ? "Already have an account? Log in" : "Don't have an account? Sign up"}
                 </button>
              </div>

              <div className="mt-10 pt-8 text-center border-t border-slate-100">
                 <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    Encrypted Session Active
                 </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
