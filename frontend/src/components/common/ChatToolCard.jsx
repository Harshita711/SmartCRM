import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Megaphone, Sparkles, TrendingUp, CheckCircle2, ArrowRight,
  Mail, MessageSquare, Smartphone, Bell, Loader2, BarChart3, Target,
} from 'lucide-react';
import Badge from './Badge.jsx';
import { segmentApi, campaignApi } from '../../api/endpoints.js';

const CHANNEL_ICON = { Email: Mail, SMS: MessageSquare, WhatsApp: Smartphone, Push: Bell };

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

const CardShell = ({ icon: Icon, iconBg, title, subtitle, children }) => (
  <div className="rounded-2xl border border-gray-100 dark:border-surface-darkBorder bg-white dark:bg-surface-darkCard overflow-hidden shadow-sm">
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-surface-darkBorder">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className="w-4.5 h-4.5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-display font-semibold text-gray-900 dark:text-white truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-4 py-3 space-y-3">{children}</div>
  </div>
);

const StatPill = ({ label, value }) => (
  <div className="rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-100 dark:border-surface-darkBorder px-3 py-2">
    <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{value}</p>
  </div>
);

const SampleTable = ({ sample = [] }) => {
  if (!sample.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 dark:border-surface-darkBorder overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50 dark:bg-surface-dark">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">City</th>
            <th className="px-3 py-2">Segment</th>
            <th className="px-3 py-2 text-right">Spend</th>
          </tr>
        </thead>
        <tbody>
          {sample.slice(0, 4).map((c, i) => (
            <tr key={i} className="border-t border-gray-100 dark:border-surface-darkBorder">
              <td className="px-3 py-2 text-gray-700 dark:text-gray-200 truncate max-w-[110px]">{c.name}</td>
              <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{c.location?.city || '-'}</td>
              <td className="px-3 py-2"><Badge value={c.segment} /></td>
              <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{fmtINR(c.totalSpend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Audience preview card (build_audience_preview)                       */
/* ------------------------------------------------------------------ */

const AudiencePreviewCard = ({ data }) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await segmentApi.create({
        name: data.name,
        description: data.description,
        ruleGroup: data.ruleGroup,
        source: 'ai-generated',
        naturalLanguageQuery: data.naturalLanguageQuery,
      });
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save segment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell icon={Users} iconBg="bg-gradient-to-br from-brand-500 to-violet-600" title={data.name} subtitle={data.description}>
      <div className="flex items-center gap-2">
        <Badge value="Preview" className="!bg-violet-50 !text-violet-600 dark:!bg-violet-950 dark:!text-violet-300" />
        <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{fmtNum(data.audienceSize)}</p>
        <p className="text-xs text-gray-400 -ml-1">matching customers</p>
      </div>
      <SampleTable sample={data.sample} />
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        {saved ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Saved as segment</span>
        ) : (
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-3 py-1.5 gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Save as segment
          </button>
        )}
        <button onClick={() => navigate('/segments')} className="btn-ghost text-xs px-3 py-1.5 gap-1.5">
          View segments <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </CardShell>
  );
};

/* ------------------------------------------------------------------ */
/* Segment created card (create_segment)                                */
/* ------------------------------------------------------------------ */

const SegmentCreatedCard = ({ data }) => {
  const navigate = useNavigate();
  return (
    <CardShell icon={Users} iconBg="bg-gradient-to-br from-emerald-500 to-teal-600" title={data.name} subtitle={data.description}>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Segment saved</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatPill label="Audience size" value={fmtNum(data.audienceSize)} />
        <StatPill label="Source" value="AI generated" />
      </div>
      <button onClick={() => navigate('/segments')} className="btn-ghost text-xs px-3 py-1.5 gap-1.5">
        View in Segments <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </CardShell>
  );
};

/* ------------------------------------------------------------------ */
/* Campaign draft card (generate_campaign_draft)                        */
/* ------------------------------------------------------------------ */

const CampaignDraftCard = ({ data }) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const ChannelIcon = CHANNEL_ICON[data.channel] || Mail;

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const segRes = await segmentApi.create({
        name: data.segment.name,
        description: data.segment.description,
        ruleGroup: data.segment.ruleGroup,
        source: 'ai-generated',
        naturalLanguageQuery: data.prompt,
      });
      const segment = segRes.data.data;
      const campRes = await campaignApi.create({
        name: data.campaignName,
        segment: segment._id,
        channel: data.channel,
        offer: data.offer,
        objective: data.objective,
        message: data.message,
        aiGenerated: true,
        aiReasoning: data.reasoning,
      });
      setSaved(campRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell icon={Megaphone} iconBg="bg-gradient-to-br from-brand-500 to-violet-600" title={data.campaignName} subtitle={data.segment?.name}>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge value="Draft" />
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <ChannelIcon className="w-3.5 h-3.5" /> {data.channel}
        </span>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{fmtNum(data.segment?.audienceSize)} customers</span>
      </div>
      {data.offer && (
        <p className="text-xs text-gray-600 dark:text-gray-300"><span className="font-semibold">Offer:</span> {data.offer}</p>
      )}
      <div className="rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-100 dark:border-surface-darkBorder px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Message</p>
        <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{data.message}</p>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        {saved ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Campaign saved as draft</span>
        ) : (
          <button onClick={handleCreate} disabled={saving} className="btn-primary text-xs px-3 py-1.5 gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Create campaign
          </button>
        )}
        <button onClick={() => navigate(saved ? `/campaigns/${saved._id}` : '/campaigns')} className="btn-ghost text-xs px-3 py-1.5 gap-1.5">
          View campaigns <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </CardShell>
  );
};

/* ------------------------------------------------------------------ */
/* Campaign created card (create_campaign)                              */
/* ------------------------------------------------------------------ */

const CampaignCreatedCard = ({ data }) => {
  const navigate = useNavigate();
  const ChannelIcon = CHANNEL_ICON[data.channel] || Mail;
  return (
    <CardShell icon={Megaphone} iconBg="bg-gradient-to-br from-emerald-500 to-teal-600" title={data.name} subtitle={data.segment?.name}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Created as draft</span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <ChannelIcon className="w-3.5 h-3.5" /> {data.channel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatPill label="Audience" value={fmtNum(data.segment?.audienceSize)} />
        <StatPill label="Status" value={data.status} />
      </div>
      <div className="rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-100 dark:border-surface-darkBorder px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Message</p>
        <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{data.message}</p>
      </div>
      <button onClick={() => navigate(`/campaigns/${data.id}`)} className="btn-primary text-xs px-3 py-1.5 gap-1.5">
        Open campaign <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </CardShell>
  );
};

/* ------------------------------------------------------------------ */
/* Marketing agent plan card (run_marketing_agent)                      */
/* ------------------------------------------------------------------ */

const AgentPlanCard = ({ data }) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const channel = data.recommendedChannel;
  const ChannelIcon = CHANNEL_ICON[channel] || Mail;

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const segRes = await segmentApi.create({
        name: data.recommendedAudience.name,
        description: data.recommendedAudience.description,
        ruleGroup: data.recommendedAudience.ruleGroup,
        source: 'ai-agent',
        naturalLanguageQuery: data.goal,
      });
      const segment = segRes.data.data;
      const campRes = await campaignApi.create({
        name: data.campaign.name,
        segment: segment._id,
        channel,
        offer: data.campaign.offer,
        objective: data.campaign.objective,
        message: data.campaign.message,
        aiGenerated: true,
        aiReasoning: Array.isArray(data.reasoning) ? data.reasoning.join(' ') : data.reasoning,
      });
      setSaved(campRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell icon={Target} iconBg="bg-gradient-to-br from-brand-500 to-violet-600" title={data.campaign?.name} subtitle="AI Marketing Agent plan">
      <p className="text-xs text-gray-600 dark:text-gray-300">{data.analysis}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <ChannelIcon className="w-3.5 h-3.5" /> {channel}
        </span>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{fmtNum(data.recommendedAudience?.audienceSize)} customers</span>
      </div>
      {data.campaign?.offer && (
        <p className="text-xs text-gray-600 dark:text-gray-300"><span className="font-semibold">Offer:</span> {data.campaign.offer}</p>
      )}
      <div className="rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-100 dark:border-surface-darkBorder px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Message</p>
        <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{data.campaign?.message}</p>
      </div>
      {data.expectedImpact && (
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" /> {data.expectedImpact}
        </p>
      )}
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        {saved ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Campaign saved as draft</span>
        ) : (
          <button onClick={handleCreate} disabled={saving} className="btn-primary text-xs px-3 py-1.5 gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Create this campaign
          </button>
        )}
        <button onClick={() => navigate(saved ? `/campaigns/${saved._id}` : '/campaigns')} className="btn-ghost text-xs px-3 py-1.5 gap-1.5">
          View campaigns <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </CardShell>
  );
};

/* ------------------------------------------------------------------ */
/* Analytics summary card (get_analytics_summary)                       */
/* ------------------------------------------------------------------ */

const AnalyticsSummaryCard = ({ data }) => {
  const navigate = useNavigate();
  return (
    <CardShell icon={BarChart3} iconBg="bg-gradient-to-br from-indigo-500 to-brand-600" title="Live CRM Snapshot">
      <div className="grid grid-cols-2 gap-2">
        <StatPill label="Customers" value={fmtNum(data.totalCustomers)} />
        <StatPill label="Orders" value={fmtNum(data.totalOrders)} />
        <StatPill label="Revenue" value={fmtINR(data.totalRevenue)} />
        <StatPill label="Active campaigns" value={fmtNum(data.activeCampaigns)} />
        <StatPill label="Delivery rate" value={`${data.deliveryRate}%`} />
        <StatPill label="Open rate" value={`${data.openRate}%`} />
        <StatPill label="Click rate" value={`${data.clickRate}%`} />
        <StatPill label="Conversion rate" value={`${data.conversionRate}%`} />
      </div>
      <button onClick={() => navigate('/analytics')} className="btn-ghost text-xs px-3 py-1.5 gap-1.5">
        Full analytics <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </CardShell>
  );
};

/* ------------------------------------------------------------------ */
/* Recent campaigns list card (list_recent_campaigns)                   */
/* ------------------------------------------------------------------ */

const CampaignListCard = ({ data }) => {
  const navigate = useNavigate();
  const items = data.items || [];
  return (
    <CardShell icon={Megaphone} iconBg="bg-gradient-to-br from-brand-500 to-violet-600" title="Recent Campaigns">
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">No campaigns yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const ChannelIcon = CHANNEL_ICON[c.channel] || Mail;
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/campaigns/${c.id}`)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-100 dark:border-surface-darkBorder px-3 py-2 hover:border-brand-300 transition text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChannelIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{c.name}</span>
                </div>
                <Badge value={c.status} />
              </button>
            );
          })}
        </div>
      )}
      <button onClick={() => navigate('/campaigns')} className="btn-ghost text-xs px-3 py-1.5 gap-1.5">
        View all campaigns <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </CardShell>
  );
};

/* ------------------------------------------------------------------ */
/* Dispatcher                                                            */
/* ------------------------------------------------------------------ */

const CARD_COMPONENTS = {
  audience_preview: AudiencePreviewCard,
  segment_created: SegmentCreatedCard,
  campaign_draft: CampaignDraftCard,
  campaign_created: CampaignCreatedCard,
  agent_plan: AgentPlanCard,
  analytics_summary: AnalyticsSummaryCard,
  campaign_list: CampaignListCard,
};

const ChatToolCard = ({ card }) => {
  if (!card || !card.type) return null;
  const Component = CARD_COMPONENTS[card.type];
  if (!Component) return null;
  return <Component data={card.data} />;
};

export default ChatToolCard;
