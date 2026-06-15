import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const Login = () => {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@xeno.com');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    setError('');
    try {
      await demoLogin();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start demo session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-gray-950">
      {/* Background gradient blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-600/40 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600/30 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-glow mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">SmartCRM</h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-400" /> AI-Native Shopper Engagement Platform
          </p>
        </div>

        <div className="backdrop-blur-xl bg-white/10 border border-white/15 rounded-2xl shadow-2xl p-8 animate-slide-up">
          <h2 className="text-lg font-display font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-gray-400 mb-6">Sign in to manage your customer engagement</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-text text-gray-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition"
                  placeholder="you@brand.com"
                />
              </div>
            </div>

            <div>
              <label className="label-text text-gray-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            onClick={handleDemo}
            disabled={loading}
            className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium py-2.5 hover:bg-white/10 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-brand-400" /> Continue with demo account
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Built for the Xeno Engineering Internship Assignment · Gemini-powered AI Marketing
        </p>
      </div>
    </div>
  );
};

export default Login;
