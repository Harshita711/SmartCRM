import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Rocket, Loader2, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, Cell, PieChart, Pie,
} from 'recharts';
import { campaignApi, aiApi } from '../api/endpoints.js';
import Loader from '../components/common/Loader.jsx';
import { ErrorState, EmptyState } from '../components/common/States.jsx';
import Badge from '../components/common/Badge.jsx';
import Pagination from '../components/common/Pagination.jsx';

const FUNNEL_COLORS = ['#6366F1', '#8B5CF6', '#14B8A6', '#F59E0B', '#10B981', '#F43F5E'];

const rate = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) : '0.0');

// Custom funnel using a horizontal bar chart (works in all recharts versions)
const CampaignFunnel = ({ data }) => (
  <div className="space-y-2.5">
    {data.map((item, i) => {
      const pct = data[0].value > 0 ? (item.value / data[0].value) * 100 : 0;
      return (
        <div key={item.name} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-20 text-right shrink-0">{item.name}</span>
          <div className="flex-1 h-8 bg-gray-100 dark:bg-surface-darkBorder rounded-lg overflow-hidden">
            <div
              className="h-full rounded-lg flex items-center px-3 transition-all duration-500"
              style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: FUNNEL_COLORS[i] }}
            >
              <span className="text-xs font-semibold text-white truncate">{item.value.toLocaleString()}</span>
            </div>
          </div>
          <span className="text-xs text-gray-400 w-12 shrink-0">{pct.toFixed(1)}%</span>
        </div>
      );
    })}
  </div>
);

const CampaignDetail = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [comms, setComms] = useState([]);
  const [commPagination, setCommPagination] = useState({ total: 0, page: 1, totalPages: 1, limit: 20 });
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setError(false);
    try {
      const [campaignRes, commsRes] = await Promise.all([
        campaignApi.getById(id),
        campaignApi.communications(id, { page: 1, limit: 20 }),
      ]);
      setCampaign(campaignRes.data.data);
      setComms(commsRes.data.data);
      setCommPagination(commsRes.data.pagination);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchComms = async (page) => {
    try {
      const { data } = await campaignApi.communications(id, { page, limit: 20 });
      setComms(data.data);
      setCommPagination(data.pagination);
    } catch {}
  };

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadRecommendations = async () => {
    setLoadingRec(true);
    try {
      const { data } = await aiApi.optimize(id);
      setRecommendations(data.data.recommendations);
    } catch {}
    setLoadingRec(false);
  };

  const handleLaunch = async () => {
    if (!window.confirm('Launch this campaign now?')) return;
    setLaunching(true);
    try {
      await campaignApi.launch(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Launch failed');
    } finally {
      setLaunching(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <Loader fullHeight label="Loading campaign…" />;
  if (error || !campaign) return <ErrorState onRetry={load} />;

  const s = campaign.stats || {};

  const funnelData = [
    { value: s.audienceSize || 0, name: 'Audience' },
    { value: s.sent || 0, name: 'Sent' },
    { value: s.delivered || 0, name: 'Delivered' },
    { value: s.opened || 0, name: 'Opened' },
    { value: s.clicked || 0, name: 'Clicked' },
    { value: s.converted || 0, name: 'Converted' },
  ].filter((d) => d.value > 0);

  const abData = campaign.isAbTest
    ? campaign.variants?.map((v) => ({
        name: `Variant ${v.name}`,
        Sent: v.stats?.sent || 0,
        Opened: v.stats?.opened || 0,
        Clicked: v.stats?.clicked || 0,
        Converted: v.stats?.converted || 0,
      }))
    : [];

  // Pie chart data for status breakdown
  const statusPieData = [
    { name: 'Delivered', value: s.delivered || 0, fill: '#10B981' },
    { name: 'Opened', value: s.opened || 0, fill: '#6366F1' },
    { name: 'Clicked', value: s.clicked || 0, fill: '#F59E0B' },
    { name: 'Converted', value: s.converted || 0, fill: '#14B8A6' },
    { name: 'Failed', value: s.failed || 0, fill: '#F43F5E' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600">
          <ArrowLeft className="w-4 h-4" /> All campaigns
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={refreshing} className="btn-ghost gap-1.5">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {['draft', 'scheduled', 'paused'].includes(campaign.status) && (
            <button onClick={handleLaunch} disabled={launching} className="btn-primary gap-2">
              {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {launching ? 'Launching…' : 'Launch Campaign'}
            </button>
          )}
        </div>
      </div>

      {/* Campaign header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display font-semibold text-xl text-gray-900 dark:text-white">{campaign.name}</h2>
              {campaign.aiGenerated && <span className="badge bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300 text-xs">✦ AI</span>}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
              <span><strong className="text-gray-700 dark:text-gray-200">Segment:</strong> {campaign.segment?.name}</span>
              <span><strong className="text-gray-700 dark:text-gray-200">Channel:</strong> {campaign.channel}</span>
              {campaign.offer && <span><strong className="text-gray-700 dark:text-gray-200">Offer:</strong> {campaign.offer}</span>}
            </div>
            {campaign.aiReasoning && (
              <p className="text-sm text-gray-400 italic mt-2">"{campaign.aiReasoning}"</p>
            )}
          </div>
          <Badge value={campaign.status} />
        </div>
        <div className="mt-4 rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-100 dark:border-surface-darkBorder p-4 text-sm text-gray-700 dark:text-gray-300">
          {campaign.message}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Audience', value: s.audienceSize || 0 },
          { label: 'Sent', value: s.sent || 0 },
          { label: 'Delivered', value: s.delivered || 0 },
          { label: 'Failed', value: s.failed || 0 },
          { label: 'Opened', value: s.opened || 0 },
          { label: 'Read', value: s.read || 0 },
          { label: 'Clicked', value: s.clicked || 0 },
          { label: 'Converted', value: s.converted || 0 },
        ].map(({ label, value }) => (
          <div key={label} className="card p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-display font-semibold mt-1 text-gray-900 dark:text-white">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Rate metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Delivery Rate', value: rate(s.delivered, s.sent) + '%' },
          { label: 'Open Rate', value: rate(s.opened, s.delivered) + '%' },
          { label: 'Click Rate', value: rate(s.clicked, s.opened) + '%' },
          { label: 'Conversion Rate', value: rate(s.converted, s.sent) + '%' },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-display font-semibold mt-1 text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Funnel + Pie charts */}
      {funnelData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Campaign Funnel</h3>
            <CampaignFunnel data={funnelData} />
          </div>

          {statusPieData.length > 0 && (
            <div className="card p-5">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* A/B test comparison */}
      {campaign.isAbTest && abData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">A/B Variant Comparison</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={abData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Sent" fill="#A5B4FC" radius={[4,4,0,0]} />
              <Bar dataKey="Opened" fill="#8B5CF6" radius={[4,4,0,0]} />
              <Bar dataKey="Clicked" fill="#F59E0B" radius={[4,4,0,0]} />
              <Bar dataKey="Converted" fill="#10B981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Recommendations */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" /> AI Optimization Suggestions
          </h3>
          <button onClick={loadRecommendations} disabled={loadingRec} className="btn-ghost text-xs gap-1.5">
            {loadingRec ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {loadingRec ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
        {recommendations.length === 0 ? (
          <p className="text-sm text-gray-400">Click Analyze to get AI-powered suggestions for improving this campaign.</p>
        ) : (
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-200">
                <span className="w-5 h-5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-300 text-xs flex items-center justify-center shrink-0 font-semibold mt-0.5">{i + 1}</span>
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Communications log */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-surface-darkBorder">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white">Communications Log</h3>
          <p className="text-xs text-gray-400 mt-0.5">{commPagination.total.toLocaleString()} total messages</p>
        </div>
        {comms.length === 0 ? (
          <EmptyState title="No messages yet" description="Messages will appear here once the campaign is launched." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100 dark:border-surface-darkBorder">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Variant</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {comms.map((comm) => (
                    <tr key={comm._id} className="border-b border-gray-50 dark:border-surface-darkBorder/60 hover:bg-gray-50 dark:hover:bg-surface-darkBorder/40 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{comm.customer?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{comm.customer?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{comm.channel}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{comm.variant}</td>
                      <td className="px-4 py-3"><Badge value={comm.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(comm.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...commPagination} onPageChange={fetchComms} />
          </>
        )}
      </div>
    </div>
  );
};

export default CampaignDetail;
