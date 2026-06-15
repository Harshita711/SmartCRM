import { useState } from 'react';
import { Sparkles, Loader2, Users, ArrowRight, CheckCircle, Save } from 'lucide-react';
import { aiApi, segmentApi } from '../api/endpoints.js';
import { useNavigate } from 'react-router-dom';

const EXAMPLES = [
  'Find customers who spent above ₹5000 and have not purchased in 45 days',
  'Find loyal customers from Chennai',
  'Find customers who purchased coffee more than 3 times',
  'Find premium customers from Mumbai or Delhi',
  'Find inactive beauty shoppers with high lead scores',
];

const AIAudienceBuilder = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleBuild = async (text) => {
    const q = text || query;
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSaved(false);
    try {
      const { data } = await aiApi.audienceFromText(q);
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not build audience. Try rephrasing.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSegment = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await segmentApi.create({
        name: result.name,
        description: result.description,
        ruleGroup: result.ruleGroup,
        source: 'ai-generated',
        naturalLanguageQuery: query,
      });
      setSaved(true);
      setTimeout(() => navigate('/segments'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save segment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-gray-900 dark:text-white">AI Audience Builder</h2>
            <p className="text-sm text-gray-400">Describe your audience in plain English. Gemini converts it to segment filters.</p>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleBuild(); } }}
            placeholder="Describe your target audience…"
            rows={3}
            className="input-field resize-none"
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">Press Enter or click Build to generate</p>
          <button onClick={() => handleBuild()} disabled={loading || !query.trim()} className="btn-primary gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Building…' : 'Build audience'}
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Try an example</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setQuery(ex); handleBuild(ex); }}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-surface-darkBorder text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition"
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

      {result && (
        <div className="card p-6 space-y-5 animate-slide-up">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <span className="badge bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300 mb-2">✦ AI Generated</span>
              <h3 className="font-display font-semibold text-lg text-gray-900 dark:text-white">{result.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{result.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-600 dark:text-brand-300" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{result.audienceSize.toLocaleString()}</p>
                <p className="text-xs text-gray-400">matching customers</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Generated Filters</p>
            <div className="rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-100 dark:border-surface-darkBorder p-4 font-mono text-xs overflow-x-auto">
              <pre className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(result.ruleGroup, null, 2)}
              </pre>
            </div>
          </div>

          {result.sample?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sample Matches</p>
              <div className="rounded-xl border border-gray-100 dark:border-surface-darkBorder overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-surface-darkBorder">
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">City</th>
                      <th className="px-4 py-2.5">Spend</th>
                      <th className="px-4 py-2.5">Orders</th>
                      <th className="px-4 py-2.5">Segment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sample.map((c) => (
                      <tr key={c._id} className="border-b border-gray-50 dark:border-surface-darkBorder/50">
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">{c.name}</td>
                        <td className="px-4 py-2.5 text-gray-500">{c.location?.city}</td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">₹{c.totalSpend?.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{c.totalOrders}</td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{c.segment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-surface-darkBorder">
            {saved ? (
              <span className="inline-flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle className="w-4 h-4" /> Segment saved! Redirecting…
              </span>
            ) : (
              <button onClick={handleSaveSegment} disabled={saving} className="btn-primary gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save as segment'}
              </button>
            )}
            <button
              onClick={() => navigate('/campaigns', { state: { segment: result } })}
              className="btn-secondary gap-2"
            >
              Use in campaign <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAudienceBuilder;
