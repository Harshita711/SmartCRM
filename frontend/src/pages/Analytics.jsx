import { useEffect, useState } from 'react';
import { Sparkles, Loader2, RefreshCw, TrendingUp, Target, MousePointerClick, Eye } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
} from 'recharts';
import { analyticsApi } from '../api/endpoints.js';
import Loader from '../components/common/Loader.jsx';
import { ErrorState, EmptyState } from '../components/common/States.jsx';
import StatCard from '../components/common/StatCard.jsx';

const pct = (v) => `${(v * 100).toFixed(1)}%`;

const Analytics = () => {
  const [summary, setSummary] = useState(null);
  const [channelPerf, setChannelPerf] = useState([]);
  const [deliveryTrend, setDeliveryTrend] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setError(false);
    try {
      const [summaryRes, channelRes, trendRes] = await Promise.all([
        analyticsApi.dashboard(),
        analyticsApi.channelPerformance(),
        analyticsApi.deliveryTrend(30),
      ]);
      setSummary(summaryRes.data.data);
      setChannelPerf(channelRes.data.data);
      setDeliveryTrend(trendRes.data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data } = await analyticsApi.insights();
      setInsights(data.data.insights);
    } catch {}
    setLoadingInsights(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Loader fullHeight label="Loading analytics…" />;
  if (error) return <ErrorState onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">30-day performance snapshot</p>
        <button onClick={refresh} disabled={refreshing} className="btn-ghost gap-1.5 text-sm">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} label="Delivery Rate" value={`${summary.deliveryRate}%`} accent="emerald" />
          <StatCard icon={Eye} label="Open Rate" value={`${summary.openRate}%`} accent="brand" />
          <StatCard icon={MousePointerClick} label="Click Rate" value={`${summary.clickRate}%`} accent="amber" />
          <StatCard icon={Target} label="Conversion Rate" value={`${summary.conversionRate}%`} accent="rose" />
        </div>
      )}

      {/* Channel performance comparison */}
      {channelPerf.length > 0 ? (
        <div className="card p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Channel Performance Comparison</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100 dark:border-surface-darkBorder text-left">
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Delivered</th>
                  <th className="px-4 py-3">Delivery Rate</th>
                  <th className="px-4 py-3">Open Rate</th>
                  <th className="px-4 py-3">Click Rate</th>
                  <th className="px-4 py-3">Conv. Rate</th>
                  <th className="px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {channelPerf.map((c) => (
                  <tr key={c.channel} className="border-b border-gray-50 dark:border-surface-darkBorder/60">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{c.channel}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.sent?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.delivered?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">{pct(c.deliveryRate)}</td>
                    <td className="px-4 py-3 text-brand-600 dark:text-brand-400 font-medium">{pct(c.openRate)}</td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-medium">{pct(c.clickRate)}</td>
                    <td className="px-4 py-3 text-teal-600 dark:text-teal-400 font-medium">{pct(c.conversionRate)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">₹{c.revenue?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={channelPerf}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="deliveryRate" name="Delivery Rate" fill="#10B981" radius={[4,4,0,0]} />
              <Bar dataKey="openRate" name="Open Rate" fill="#6366F1" radius={[4,4,0,0]} />
              <Bar dataKey="clickRate" name="Click Rate" fill="#F59E0B" radius={[4,4,0,0]} />
              <Bar dataKey="conversionRate" name="Conv. Rate" fill="#14B8A6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState title="No channel data yet" description="Launch campaigns across channels to see comparison data." />
      )}

      {/* Delivery trend */}
      {deliveryTrend.length > 0 && (
        <div className="card p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Performance Trends (30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={deliveryTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="sent" stroke="#A5B4FC" strokeWidth={2} name="Sent" dot={false} />
              <Line type="monotone" dataKey="delivered" stroke="#10B981" strokeWidth={2} name="Delivered" dot={false} />
              <Line type="monotone" dataKey="opened" stroke="#8B5CF6" strokeWidth={2} name="Opened" dot={false} />
              <Line type="monotone" dataKey="clicked" stroke="#F59E0B" strokeWidth={2} name="Clicked" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Insights */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" /> AI Insights
          </h3>
          <button onClick={loadInsights} disabled={loadingInsights} className="btn-ghost text-xs gap-1.5">
            {loadingInsights ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {loadingInsights ? 'Analyzing…' : 'Generate Insights'}
          </button>
        </div>
        {insights.length === 0 ? (
          <p className="text-sm text-gray-400">Click Generate Insights to get AI-powered observations about your campaign performance.</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-950/30">
                <span className="text-brand-500 font-bold text-sm mt-0.5">✦</span>
                <p className="text-sm text-gray-700 dark:text-gray-200">{insight}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Analytics;
