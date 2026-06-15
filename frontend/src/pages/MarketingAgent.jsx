import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Loader2, Rocket, CheckCircle, Users, Megaphone, Lightbulb, Target } from 'lucide-react';
import { aiApi, segmentApi, campaignApi } from '../api/endpoints.js';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/common/Badge.jsx';

const EXAMPLE_GOALS = [
  'Increase repeat purchases from first-time buyers',
  'Win back customers who haven\'t ordered in 90 days',
  'Grow average order value among loyal customers',
  'Expand our Chennai customer base through referrals',
  'Improve engagement with beauty product shoppers',
];

const MarketingAgent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(location.state?.plan || null);
  const [error, setError] = useState('');
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);

  const handleRun = async (text) => {
    const g = text || goal;
    if (!g.trim()) return;
    setLoading(true);
    setError('');
    setPlan(null);
    setLaunched(false);
    try {
      const { data } = await aiApi.agent(g);
      setPlan(data.data);
      setGoal(g);
    } catch (err) {
      setError(err.response?.data?.message || 'Agent failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchPlan = async () => {
    if (!plan) return;
    setLaunching(true);
    setError('');
    try {
      const segRes = await segmentApi.create({
        name: plan.recommendedAudience.name,
        description: plan.recommendedAudience.description,
        ruleGroup: plan.recommendedAudience.ruleGroup,
        source: 'ai-agent',
        naturalLanguageQuery: goal,
      });

      const campRes = await campaignApi.create({
        name: plan.campaign.name,
        segment: segRes.data.data._id,
        channel: plan.recommendedChannel,
        offer: plan.campaign.offer,
        objective: plan.campaign.objective,
        message: plan.campaign.message,
        aiGenerated: true,
        aiReasoning: plan.reasoning?.join(' → '),
      });

      await campaignApi.launch(campRes.data.data._id);
      setLaunched(true);
      setTimeout(() => navigate(`/campaigns/${campRes.data.data._id}`), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Launch failed');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="card p-6 bg-gradient-to-br from-brand-600 to-violet-700 text-white border-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg">AI Marketing Agent</h2>
            <p className="text-sm text-brand-100">Give me a business goal. I'll analyze your customers, design the audience, write the copy, and prepare the launch.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRun()}
            placeholder="e.g. Increase repeat purchases…"
            className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder:text-brand-200 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button onClick={() => handleRun()} disabled={loading || !goal.trim()} className="px-5 py-2.5 rounded-xl bg-white text-brand-700 text-sm font-semibold hover:bg-brand-50 transition disabled:opacity-60 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {loading ? 'Thinking…' : 'Run Agent'}
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Example goals</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_GOALS.map((eg) => (
            <button
              key={eg}
              onClick={() => { setGoal(eg); handleRun(eg); }}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-surface-darkBorder text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 transition"
            >
              {eg}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
            <Bot className="w-6 h-6 text-brand-500 animate-pulse-soft" />
          </div>
          <p className="font-medium text-gray-700 dark:text-gray-200">Agent is analyzing your customers…</p>
          <p className="text-sm text-gray-400">Identifying audience · designing campaign · writing copy</p>
        </div>
      )}

      {error && (
        <div className="card p-4 border border-rose-200 dark:border-rose-800">
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      )}

      {plan && !loading && (
        <div className="space-y-4 animate-slide-up">
          {/* Analysis */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white">Analysis</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200">{plan.analysis}</p>
            {plan.customerStats && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 dark:bg-surface-dark p-3 text-center">
                  <p className="text-lg font-display font-semibold text-gray-900 dark:text-white">{plan.customerStats.totalCustomers?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Total Customers</p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-surface-dark p-3 text-center">
                  <p className="text-lg font-display font-semibold text-gray-900 dark:text-white">₹{plan.customerStats.avgSpend?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Avg Spend</p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-surface-dark p-3 text-center">
                  <p className="text-lg font-display font-semibold text-gray-900 dark:text-white">{plan.customerStats.avgOrders}</p>
                  <p className="text-xs text-gray-400">Avg Orders</p>
                </div>
              </div>
            )}
          </div>

          {/* Recommended Audience */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                <Users className="w-4 h-4 text-brand-500" />
              </div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white">Recommended Audience</h3>
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{plan.recommendedAudience?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.recommendedAudience?.description}</p>
            <p className="text-sm font-semibold text-brand-600 dark:text-brand-300 mt-2">
              ~{plan.recommendedAudience?.audienceSize?.toLocaleString()} customers match
            </p>
          </div>

          {/* Campaign Draft */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white">Campaign Draft</h3>
              <Badge value={plan.recommendedChannel} />
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{plan.campaign?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1"><strong>Offer:</strong> {plan.campaign?.offer || '—'}</p>
            <div className="mt-3 rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-100 dark:border-surface-darkBorder p-4 text-sm text-gray-700 dark:text-gray-300">
              {plan.campaign?.message}
            </div>
          </div>

          {/* Reasoning steps */}
          {plan.reasoning?.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                  <Target className="w-4 h-4 text-violet-500" />
                </div>
                <h3 className="font-display font-semibold text-gray-900 dark:text-white">Agent Reasoning</h3>
              </div>
              <ol className="space-y-2">
                {plan.reasoning.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 text-xs flex items-center justify-center shrink-0 font-semibold">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {plan.expectedImpact && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 p-4">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Expected Impact</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">{plan.expectedImpact}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            {launched ? (
              <span className="inline-flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle className="w-4 h-4" /> Campaign launched! Redirecting to details…
              </span>
            ) : (
              <>
                <button onClick={handleLaunchPlan} disabled={launching} className="btn-primary gap-2">
                  {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {launching ? 'Executing plan…' : 'Execute Launch Plan'}
                </button>
                <button onClick={() => handleRun()} className="btn-secondary">Regenerate</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingAgent;
