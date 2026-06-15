import { useEffect, useState } from 'react';
import { Plus, Trash2, Filter, Play, Users, Pencil, X } from 'lucide-react';
import { segmentApi } from '../api/endpoints.js';
import Loader from '../components/common/Loader.jsx';
import { EmptyState, ErrorState } from '../components/common/States.jsx';
import Modal from '../components/common/Modal.jsx';

const FIELD_OPTIONS = [
  { value: 'totalSpend', label: 'Total Spend (₹)' },
  { value: 'totalOrders', label: 'Total Orders' },
  { value: 'lastPurchaseDate', label: 'Last Purchase (days ago)', operator: 'olderThanDays' },
  { value: 'location.city', label: 'City' },
  { value: 'category', label: 'Category' },
  { value: 'segment', label: 'Segment' },
  { value: 'leadScore', label: 'Lead Score' },
];

const OPERATOR_OPTIONS = {
  totalSpend: ['gt', 'gte', 'lt', 'lte', 'eq'],
  totalOrders: ['gt', 'gte', 'lt', 'lte', 'eq'],
  lastPurchaseDate: ['olderThanDays'],
  'location.city': ['eq', 'neq'],
  category: ['eq', 'neq'],
  segment: ['eq', 'neq'],
  leadScore: ['gt', 'gte', 'lt', 'lte'],
};

const OPERATOR_LABELS = {
  gt: '>', gte: '>=', lt: '<', lte: '<=', eq: '=', neq: '≠',
  olderThanDays: 'older than (days)',
};

const CATEGORY_VALUES = ['Fashion', 'Coffee', 'Beauty', 'Retail', 'General'];
const SEGMENT_VALUES = ['New', 'Active', 'Loyal', 'Premium', 'At Risk', 'Inactive', 'Churned'];
const CITY_VALUES = ['Chennai', 'Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi'];

const getValueInput = (field, value, onChange) => {
  if (field === 'category') {
    return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="input-field w-full">
        <option value="">Select category</option>
        {CATEGORY_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    );
  }
  if (field === 'segment') {
    return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="input-field w-full">
        <option value="">Select segment</option>
        {SEGMENT_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    );
  }
  if (field === 'location.city') {
    return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="input-field w-full">
        <option value="">Select city</option>
        {CITY_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    );
  }
  return (
    <input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder="Value"
      className="input-field w-full"
    />
  );
};

const emptyRule = () => ({ field: 'totalSpend', operator: 'gt', value: '' });

const RuleBuilder = ({ ruleGroup, onChange }) => {
  const rules = ruleGroup.rules || [];
  const condition = ruleGroup.condition || 'AND';

  const updateRule = (idx, patch) => {
    const next = rules.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange({ ...ruleGroup, rules: next });
  };

  const addRule = () => onChange({ ...ruleGroup, rules: [...rules, emptyRule()] });

  const removeRule = (idx) => onChange({ ...ruleGroup, rules: rules.filter((_, i) => i !== idx) });

  const setCondition = (c) => onChange({ ...ruleGroup, condition: c });

  return (
    <div className="border border-gray-200 dark:border-surface-darkBorder rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Match</span>
        {['AND', 'OR'].map((c) => (
          <button
            key={c}
            onClick={() => setCondition(c)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              condition === c
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-500 dark:bg-surface-darkBorder dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {c}
          </button>
        ))}
        <span className="text-xs text-gray-500">of the following rules:</span>
      </div>

      {rules.map((rule, idx) => (
        <div key={idx} className="flex items-center gap-2 flex-wrap">
          <select
            value={rule.field}
            onChange={(e) => {
              const field = e.target.value;
              const ops = OPERATOR_OPTIONS[field] || ['eq'];
              updateRule(idx, { field, operator: ops[0], value: '' });
            }}
            className="input-field w-auto"
          >
            {FIELD_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={rule.operator}
            onChange={(e) => updateRule(idx, { operator: e.target.value })}
            className="input-field w-auto"
          >
            {(OPERATOR_OPTIONS[rule.field] || ['eq']).map((op) => (
              <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
            ))}
          </select>
          <div className="min-w-[140px]">
            {getValueInput(rule.field, rule.value, (val) => updateRule(idx, { value: val }))}
          </div>
          <button onClick={() => removeRule(idx)} className="text-gray-400 hover:text-rose-500 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button onClick={addRule} className="btn-ghost text-xs gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Add rule
      </button>
    </div>
  );
};

const defaultRuleGroup = () => ({ condition: 'AND', rules: [emptyRule()], groups: [] });

const Segments = () => {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', ruleGroup: defaultRuleGroup() });
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await segmentApi.list();
      setSegments(data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', ruleGroup: defaultRuleGroup() });
    setPreview(null);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (seg) => {
    setEditing(seg);
    setForm({ name: seg.name, description: seg.description || '', ruleGroup: seg.ruleGroup });
    setPreview(null);
    setFormError('');
    setModalOpen(true);
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setFormError('');
    try {
      const { data } = await segmentApi.preview(form.ruleGroup);
      setPreview(data.data);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await segmentApi.update(editing._id, form);
      } else {
        await segmentApi.create({ ...form, source: 'manual' });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this segment?')) return;
    try {
      await segmentApi.remove(id);
      setSegments((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{segments.length} segments</p>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> New Segment
        </button>
      </div>

      {loading ? (
        <Loader label="Loading segments..." />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : segments.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No segments yet"
          description="Create your first audience segment to start targeting campaigns."
          action={<button onClick={openCreate} className="btn-primary">Create segment</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((seg) => (
            <div key={seg._id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-gray-900 dark:text-white">{seg.name}</h3>
                  {seg.description && <p className="text-xs text-gray-400 mt-0.5">{seg.description}</p>}
                </div>
                <span className={`badge text-xs ${seg.source === 'ai-generated' ? 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300' : 'bg-gray-100 text-gray-500'}`}>
                  {seg.source === 'ai-generated' ? '✦ AI' : 'Manual'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                  <Users className="w-4 h-4 text-brand-600 dark:text-brand-300" />
                </div>
                <div>
                  <p className="text-lg font-display font-semibold text-gray-900 dark:text-white">{seg.audienceSize?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">matching customers</p>
                </div>
              </div>

              {seg.naturalLanguageQuery && (
                <p className="text-xs italic text-gray-400">"{seg.naturalLanguageQuery}"</p>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-surface-darkBorder">
                <button onClick={() => openEdit(seg)} className="btn-ghost text-xs gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(seg._id)} className="btn-danger text-xs gap-1 py-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Segment' : 'Create Segment'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handlePreview} disabled={previewLoading} className="btn-secondary gap-1.5">
              <Play className="w-3.5 h-3.5" /> {previewLoading ? 'Previewing…' : 'Preview audience'}
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create segment'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-text">Segment name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. High-value Chennai customers"
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description of this audience"
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Audience rules</label>
            <RuleBuilder
              ruleGroup={form.ruleGroup}
              onChange={(rg) => setForm((f) => ({ ...f, ruleGroup: rg }))}
            />
          </div>

          {formError && <p className="text-sm text-rose-500">{formError}</p>}

          {preview && (
            <div className="rounded-xl bg-brand-50 dark:bg-brand-950/40 p-4">
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                Preview: {preview.audienceSize.toLocaleString()} customers match
              </p>
              {preview.sample?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {preview.sample.map((c) => (
                    <li key={c._id} className="text-xs text-brand-600 dark:text-brand-400">
                      {c.name} · {c.location?.city} · ₹{c.totalSpend?.toLocaleString()} · {c.segment}
                    </li>
                  ))}
                  {preview.audienceSize > 5 && (
                    <li className="text-xs text-brand-400">…and {preview.audienceSize - 5} more</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Segments;
