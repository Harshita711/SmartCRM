import { useState } from 'react';
import { Wand2, Loader2, Rocket, CheckCircle, ArrowRight, Users, Megaphone } from 'lucide-react';
import { aiApi, segmentApi, campaignApi } from '../api/endpoints.js';
import { useNavigate } from 'react-router-dom';

const EXAMPLES = [
  'Create a win-back campaign for inactive premium customers',
  'Run a coffee loyalty reward for customers who bought coffee 3+ times',
  'Re-engage fashion shoppers who haven\'t purchased in 60 days with a discount',
  'Launch a VIP campaign for top spenders in Mumbai',
  'Promote new arrivals to beauty enthusiasts in Chennai',
];

const AICampaignGenerator = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);

  const handleGenerate = async (text) => {
    const p = text || prompt;
    if (!p.trim()) return;
    setLoading(true);
    setError('');
    setDraft(null);
    setLaunched(false);
    try {
      const { data } = await aiApi.campaignGenerator(p);
      setDraft(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate campaign. Try rephrasing.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!draft) return;
    setLaunching(true);
    setError('');
    try {
      // 1. Save the segment
      const segRes = await segmentApi.create({
        name: draft.segment.name,
        description: draft.segment.description,
        ruleGroup: draft.segment.ruleGroup,
        source: 'ai-generated',
        naturalLanguageQuery: prompt,
      });
      const segmentId = segRes.data.data._id;

      // 2. Create the campaign
      const campRes = await campaignApi.create({
        name: draft.campaignName,
        segment: segmentId,
        channel: draft.channel,
        offer: draft.offer,
        objective: draft.objective,
        message: draft.message,
        aiGenerated: true,
        aiReasoning: draft.reasoning,
      });
      const campaignId = campRes.data.data._id;

      // 3. Launch it
      await campaignApi.launch(campaignId);
      setLaunched(true);
      setTimeout(() => navigate(`/campaigns/${campaignId}`), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Launch failed');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-gray-900 dark:text-white">AI Campaign Generator</h2>
            <p className="text-sm text-gray-400">Describe your campaign goal. Gemini builds the full draft — audience, message, channel — instantly.</p>
          </div>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
          placeholder="Describe your campaign goal…"
          rows={3}
          className="input-field resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">Press Enter to generate</p>
          <button onClick={() => handleGenerate()} disabled={loading || !prompt.trim()} className="btn-primary gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {loading ? 'Generating…' : 'Generate campaign'}
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Try an example</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setPrompt(ex); handleGenerate(ex); }}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-surface-darkBorder text-gray-600 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-300 transition"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card p-4 border border-rose-200 dark:border-rose-800">
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      )}

      {draft && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="badge bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300">✦ AI Generated Draft</span>
            <span className="text-xs text-gray-400">Review before launching</span>
          </div>

          <div className="card p-5 space-y-4">
            <div>
              <label className="label-text">Campaign Name</label>
              <p className="text-base font-semibold text-gray-900 dark:text-white">{draft.campaignName}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-text">Channel</label>
                <p className="text-sm text-gray-700 dark:text-gray-200">{draft.channel}</p>
              </div>
              <div>
                <label className="label-text">Offer</label>
                <p className="text-sm text-gray-700 dark:text-gray-200">{draft.offer || '—'}</p>
              </div>
            </div>
            <div>
              <label className="label-text">Objective</label>
              <p className="text-sm text-gray-700 dark:text-gray-200">{draft.objective}</p>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-brand-500" />
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Audience</h3>
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{draft.segment?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{draft.segment?.description}</p>
            <p className="text-xs text-brand-600 dark:text-brand-300 mt-1.5 font-medium">
              ~{draft.segment?.audienceSize?.toLocaleString()} matching customers
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-4 h-4 text-brand-500" />
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Message Preview</h3>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-100 dark:border-surface-darkBorder p-4 text-sm text-gray-700 dark:text-gray-300">
              {draft.message}
            </div>
          </div>

          {draft.reasoning && (
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">AI Reasoning</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">{draft.reasoning}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            {launched ? (
              <span className="inline-flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle className="w-4 h-4" /> Campaign launched! Redirecting…
              </span>
            ) : (
              <>
                <button onClick={handleLaunch} disabled={launching} className="btn-primary gap-2">
                  {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {launching ? 'Launching…' : 'Launch Campaign'}
                </button>
                <button onClick={() => handleGenerate()} className="btn-secondary gap-1.5">
                  Regenerate <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AICampaignGenerator;
