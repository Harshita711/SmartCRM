import { useEffect, useState } from 'react';
import {
  Users, ShoppingCart, Megaphone, Send, TrendingUp,
  MousePointerClick, Eye, Target, BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import StatCard from '../components/common/StatCard.jsx';
import Loader from '../components/common/Loader.jsx';
import { ErrorState, EmptyState } from '../components/common/States.jsx';
import Badge from '../components/common/Badge.jsx';
import { analyticsApi } from '../api/endpoints.js';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [audienceGrowth, setAudienceGrowth] = useState([]);
  const [deliveryTrend, setDeliveryTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [summaryRes, campaignsRes, activityRes, growthRes, trendRes] = await Promise.all([
        analyticsApi.dashboard(),
        analyticsApi.recentCampaigns(),
        analyticsApi.recentActivity(),
        analyticsApi.audienceGrowth(30),
        analyticsApi.deliveryTrend(14),
      ]);
      setSummary(summaryRes.data.data);
      setRecentCampaigns(campaignsRes.data.data);
      setRecentActivity(activityRes.data.data);
      setAudienceGrowth(growthRes.data.data);
      setDeliveryTrend(trendRes.data.data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <Loader fullHeight label="Loading dashboard..." />;
  if (error) return <ErrorState onRetry={loadData} />;

  return (
    <div className="space-y-6">
      {/* Primary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Customers" value={summary.totalCustomers.toLocaleString()} accent="brand" />
        <StatCard icon={ShoppingCart} label="Total Orders" value={summary.totalOrders.toLocaleString()} accent="emerald" />
        <StatCard icon={Megaphone} label="Active Campaigns" value={summary.activeCampaigns} accent="amber" />
        <StatCard icon={Send} label="Messages Sent" value={summary.messagesSent.toLocaleString()} accent="teal" />
      </div>

      {/* Rate stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Delivery Rate" value={`${summary.deliveryRate}%`} accent="emerald" />
        <StatCard icon={Eye} label="Open Rate" value={`${summary.openRate}%`} accent="brand" />
        <StatCard icon={MousePointerClick} label="Click Rate" value={`${summary.clickRate}%`} accent="amber" />
        <StatCard icon={Target} label="Conversion Rate" value={`${summary.conversionRate}%`} accent="rose" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white">Audience Growth</h3>
              <p className="text-xs text-gray-400">New customers over the last 30 days</p>
            </div>
            <BarChart2 className="w-4 h-4 text-brand-400" />
          </div>
          {audienceGrowth.length === 0 ? (
            <EmptyState title="No growth data yet" description="New customer signups will appear here." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={audienceGrowth}>
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="newCustomers" stroke="#6366F1" fill="url(#growthGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white">Delivery Analytics</h3>
              <p className="text-xs text-gray-400">Sent vs delivered vs failed (14 days)</p>
            </div>
          </div>
          {deliveryTrend.length === 0 ? (
            <EmptyState title="No delivery data yet" description="Launch a campaign to see delivery trends." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deliveryTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="sent" fill="#A5B4FC" radius={[4, 4, 0, 0]} name="Sent" />
                <Bar dataKey="delivered" fill="#10B981" radius={[4, 4, 0, 0]} name="Delivered" />
                <Bar dataKey="failed" fill="#F43F5E" radius={[4, 4, 0, 0]} name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Campaign performance line chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">Campaign Performance</h3>
            <p className="text-xs text-gray-400">Opens vs clicks over the last 14 days</p>
          </div>
        </div>
        {deliveryTrend.length === 0 ? (
          <EmptyState title="No performance data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={deliveryTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="opened" stroke="#8B5CF6" strokeWidth={2} name="Opened" dot={false} />
              <Line type="monotone" dataKey="clicked" stroke="#F59E0B" strokeWidth={2} name="Clicked" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent campaigns + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">Recent Campaigns</h3>
            <Link to="/campaigns" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {recentCampaigns.length === 0 ? (
            <EmptyState title="No campaigns yet" description="Create your first campaign to get started." />
          ) : (
            <div className="space-y-3">
              {recentCampaigns.map((c) => (
                <Link
                  to={`/campaigns/${c._id}`}
                  key={c._id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-surface-darkBorder transition"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.channel} · {c.segment?.name || 'Unknown segment'}</p>
                  </div>
                  <Badge value={c.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyState title="No activity yet" description="Communication events will appear here in real time." />
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-surface-darkBorder transition">
                  <Badge value={a.status} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-200">{a.description}</p>
                    <p className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
