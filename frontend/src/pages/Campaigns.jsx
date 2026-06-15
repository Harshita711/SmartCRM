import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Megaphone, Rocket, Pause, Trash2, Loader2 } from 'lucide-react';
import { campaignApi, segmentApi, aiApi } from '../api/endpoints.js';
import Loader from '../components/common/Loader.jsx';
import { EmptyState, ErrorState } from '../components/common/States.jsx';
import Badge from '../components/common/Badge.jsx';
import Modal from '../components/common/Modal.jsx';
import Pagination from '../components/common/Pagination.jsx';

const CHANNELS = ['Email', 'SMS', 'WhatsApp', 'Push'];

const CreateCampaignModal = ({ isOpen, onClose, onCreated }) => {
  const [segments, setSegments] = useState([]);
  const [form, setForm] = useState({
    name: '', segment: '', channel: 'Email', offer: '', objective: '', message: '',
  });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    segmentApi.list().then(({ data }) => setSegments(data.data)).catch(() => {});
  }, [isOpen]);

  const handleGenerateMessage = async () => {
    setGenerating(true);
    try {
      const seg = segments.find((s) => s._id === form.segment);
      const { data } = await aiApi.generateMessage({
        objective: form.objective,
        offer: form.offer,
        channel: form.channel,
        audienceDescription: seg?.name || '',
      });
      setForm((f) => ({ ...f, message: data.data.message }));
    } catch (err) {
      setError('Could not generate message');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.segment || !form.message.trim()) {
      setError('Name, segment, and message are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await campaignApi.create(form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create campaign');
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const selectedSeg = segments.find((s) => s._id === form.segment);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Campaign"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create campaign'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label-text">Campaign name</label>
          <input value={form.name} onChange={set('name')} placeholder="e.g. Summer win-back" className="input-field" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text">Audience segment</label>
            <select value={form.segment} onChange={set('segment')} className="input-field">
              <option value="">Select a segment</option>
              {segments.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.audienceSize?.toLocaleString()} people)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Channel</label>
            <select value={form.channel} onChange={set('channel')} className="input-field">
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text">Objective</label>
            <input value={form.objective} onChange={set('objective')} placeholder="e.g. Re-engage inactive users" className="input-field" />
          </div>
          <div>
            <label className="label-text">Offer</label>
            <input value={form.offer} onChange={set('offer')} placeholder="e.g. 20% off all orders" className="input-field" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label-text mb-0">Message</label>
            <button onClick={handleGenerateMessage} disabled={generating} className="btn-ghost text-xs gap-1 py-1">
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : '✦'}
              {generating ? 'Generating…' : 'AI Generate'}
            </button>
          </div>
          <textarea
            value={form.message}
            onChange={set('message')}
            rows={4}
            placeholder={`Write your ${form.channel} message here. Use {{name}} for personalization.`}
            className="input-field resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">{form.message.length} chars · Use {'{{name}}'} for personalization</p>
        </div>

        {selectedSeg && (
          <div className="rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-100 dark:border-surface-darkBorder p-3 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">{selectedSeg.name}</span>
            <span className="text-gray-400 ml-2">· {selectedSeg.audienceSize?.toLocaleString()} recipients</span>
          </div>
        )}

        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
    </Modal>
  );
};

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const fetchCampaigns = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await campaignApi.list({ page, limit: 10, status: statusFilter });
      setCampaigns(data.data);
      setPagination(data.pagination);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchCampaigns(1); }, [fetchCampaigns]);

  const handleLaunch = async (id) => {
    if (!window.confirm('Launch this campaign now? Messages will be sent to all matching customers.')) return;
    setActionLoading((p) => ({ ...p, [id]: 'launching' }));
    try {
      await campaignApi.launch(id);
      await fetchCampaigns(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Launch failed');
    } finally {
      setActionLoading((p) => ({ ...p, [id]: null }));
    }
  };

  const handlePause = async (id) => {
    setActionLoading((p) => ({ ...p, [id]: 'pausing' }));
    try {
      await campaignApi.pause(id);
      await fetchCampaigns(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Pause failed');
    } finally {
      setActionLoading((p) => ({ ...p, [id]: null }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign and all its communications?')) return;
    try {
      await campaignApi.remove(id);
      await fetchCampaigns(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const STATUS_OPTIONS = ['', 'draft', 'scheduled', 'running', 'completed', 'paused', 'failed'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-surface-darkCard border border-gray-200 dark:border-surface-darkBorder text-gray-600 dark:text-gray-300 hover:border-brand-400'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {loading ? (
        <Loader label="Loading campaigns…" />
      ) : error ? (
        <ErrorState onRetry={() => fetchCampaigns(pagination.page)} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first campaign to start engaging customers."
          action={<button onClick={() => setCreateOpen(true)} className="btn-primary">Create campaign</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100 dark:border-surface-darkBorder">
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Segment</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Delivered</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const busy = actionLoading[c._id];
                  return (
                    <tr key={c._id} className="border-b border-gray-50 dark:border-surface-darkBorder/60 hover:bg-gray-50 dark:hover:bg-surface-darkBorder/40 transition">
                      <td className="px-4 py-3">
                        <Link to={`/campaigns/${c._id}`} className="font-medium text-gray-800 dark:text-gray-100 hover:text-brand-600">
                          {c.name}
                        </Link>
                        {c.aiGenerated && <span className="ml-1.5 text-xs text-violet-500">✦ AI</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.segment?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.channel}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.stats?.sent?.toLocaleString() || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.stats?.delivered?.toLocaleString() || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.stats?.opened?.toLocaleString() || '—'}</td>
                      <td className="px-4 py-3"><Badge value={c.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {['draft', 'scheduled', 'paused'].includes(c.status) && (
                            <button onClick={() => handleLaunch(c._id)} disabled={!!busy} className="btn-primary px-2.5 py-1.5 text-xs gap-1">
                              {busy === 'launching' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                              Launch
                            </button>
                          )}
                          {c.status === 'running' && (
                            <button onClick={() => handlePause(c._id)} disabled={!!busy} className="btn-secondary px-2.5 py-1.5 text-xs gap-1">
                              {busy === 'pausing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                              Pause
                            </button>
                          )}
                          {!['running'].includes(c.status) && (
                            <button onClick={() => handleDelete(c._id)} className="btn-danger px-2.5 py-1.5 text-xs">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} onPageChange={fetchCampaigns} />
        </div>
      )}

      <CreateCampaignModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => fetchCampaigns(1)} />
    </div>
  );
};

export default Campaigns;
