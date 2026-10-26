import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Send, Plus, RefreshCw, CheckCircle2, Clock, AlertTriangle, Play,
  BarChart3, Users, MessageSquare, Eye, X, Check,
  Sparkles, ShieldCheck
} from 'lucide-react';
import { AICampaignCopyModal } from '../ai/AICampaignCopyModal';

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
  buttons?: Array<{
    type?: string;
    text?: string;
    url?: string;
  }>;
}

interface Template {
  id: number;
  name: string;
  language: string;
  category: string;
  status: string;
  components?: TemplateComponent[];
}

interface Campaign {
  id: number;
  name: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'FAILED';
  total_audience: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  scheduled_at?: string | null;
  created_at: string;
  template?: Template;
  phoneNumber?: {
    id: number;
    display_phone_number: string;
    verified_name: string;
  };
  metrics?: {
    delivery_rate_percentage: number;
    read_rate_percentage: number;
  };
}

export const CampaignsView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiCopyModal, setShowAiCopyModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create form state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [formName, setFormName] = useState('');
  const [formTemplateId, setFormTemplateId] = useState<number | ''>('');
  const [formPhoneId, setFormPhoneId] = useState<number | ''>('');
  const [formScheduleDate, setFormScheduleDate] = useState('');
  const [formVariables, setFormVariables] = useState<Record<string, string>>({});
  const [launchImmediately, setLaunchImmediately] = useState(true);
  const [creating, setCreating] = useState(false);

  // Helper to extract placeholders from template components (HEADER, BODY, and dynamic URL BUTTONS)
  const extractTemplatePlaceholders = (template?: Template | null): string[] => {
    if (!template || !template.components || !Array.isArray(template.components)) {
      return [];
    }
    const placeholders: Record<string, boolean> = {};
    for (const comp of template.components) {
      const text = comp.text || '';
      if (text) {
        const matches = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
        if (matches) {
          for (const m of matches) {
            const v = m.replace(/[{}]/g, '').trim();
            if (v) placeholders[v] = true;
          }
        }
      }
      if (comp.buttons && Array.isArray(comp.buttons)) {
        for (const btn of comp.buttons) {
          const url = btn.url || '';
          if (url) {
            const matches = url.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
            if (matches) {
              for (const m of matches) {
                const v = m.replace(/[{}]/g, '').trim();
                if (v) placeholders[v] = true;
              }
            }
          }
        }
      }
    }
    return Object.keys(placeholders);
  };

  const handleTemplateChange = (newTemplateId: number | '') => {
    setFormTemplateId(newTemplateId);
    if (!newTemplateId) {
      setFormVariables({});
      return;
    }
    const tmpl = templates.find(t => t.id === Number(newTemplateId));
    const placeholders = extractTemplatePlaceholders(tmpl);
    const updatedVars: Record<string, string> = {};
    placeholders.forEach((ph, idx) => {
      if (formVariables[ph]) {
        updatedVars[ph] = formVariables[ph];
      } else {
        if (idx === 0) updatedVars[ph] = 'contact.first_name';
        else if (idx === 1) updatedVars[ph] = 'contact.last_name';
        else if (idx === 2) updatedVars[ph] = 'contact.phone_number';
        else updatedVars[ph] = 'contact.email';
      }
    });
    setFormVariables(updatedVars);
  };

  useEffect(() => {
    fetchCampaigns();
    fetchTemplatesAndAccount();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/campaigns');
      if (res.data && res.data.data) {
        setCampaigns(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplatesAndAccount = async () => {
    try {
      const [tmplRes, accRes] = await Promise.all([
        api.get('/templates?status=APPROVED'),
        api.get('/whatsapp/account'),
      ]);

      if (tmplRes.data && tmplRes.data.data) {
        const fetchedTemplates: Template[] = tmplRes.data.data;
        setTemplates(fetchedTemplates);
        if (fetchedTemplates.length > 0 && !formTemplateId) {
          const first = fetchedTemplates[0];
          setFormTemplateId(first.id);
          const phs = extractTemplatePlaceholders(first);
          const initVars: Record<string, string> = {};
          phs.forEach((ph, idx) => {
            if (idx === 0) initVars[ph] = 'contact.first_name';
            else if (idx === 1) initVars[ph] = 'contact.last_name';
            else if (idx === 2) initVars[ph] = 'contact.phone_number';
            else initVars[ph] = 'contact.email';
          });
          setFormVariables(initVars);
        }
      }

      if (accRes.data && accRes.data.data && accRes.data.data.phone_number) {
        const phone = accRes.data.data.phone_number;
        setPhoneNumbers([phone]);
        setFormPhoneId(phone.id);
      }
    } catch (err) {
      console.error('Failed to load templates or account:', err);
    }
  };

  const handleSyncTemplates = async () => {
    setSyncingTemplates(true);
    setFeedbackMsg(null);
    try {
      const res = await api.post('/templates/sync');
      setFeedbackMsg({
        type: 'success',
        text: res.data.message || 'Templates synced successfully from Meta WhatsApp Platform!',
      });
      fetchTemplatesAndAccount();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to sync templates from Meta.',
      });
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleLaunchCampaign = async (id: number) => {
    setActionLoading(id);
    setFeedbackMsg(null);
    try {
      const res = await api.post(`/campaigns/${id}/launch`);
      setFeedbackMsg({
        type: 'success',
        text: res.data.message || 'Campaign launched! Outbound correlation tokens generated.',
      });
      fetchCampaigns();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to launch campaign.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryCampaign = async (id: number) => {
    setActionLoading(id);
    setFeedbackMsg(null);
    try {
      const res = await api.post(`/campaigns/${id}/retry`);
      setFeedbackMsg({
        type: 'success',
        text: res.data.message || 'Campaign reset for safe retry! Ambiguous timeouts preserved.',
      });
      fetchCampaigns();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to retry campaign.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formTemplateId || !formPhoneId) {
      alert('Please fill in Campaign Name, WhatsApp Phone Number, and Approved Template.');
      return;
    }

    // Validate dynamic variables against detected template placeholders
    const activePlaceholders = extractTemplatePlaceholders(selectedTemplateDetails);
    const cleanedMapping: Record<string, string> = {};

    for (const ph of activePlaceholders) {
      const val = (formVariables[ph] || '').trim();
      if (!val) {
        alert(`Please provide a CRM field mapping or static value for variable {{${ph}}}.`);
        return;
      }
      cleanedMapping[ph] = val;
    }

    setCreating(true);
    setFeedbackMsg(null);
    try {
      const payload: any = {
        name: formName,
        template_id: formTemplateId,
        whatsapp_phone_number_id: formPhoneId,
        variable_mapping: activePlaceholders.length > 0 ? cleanedMapping : {},
      };

      if (!launchImmediately && formScheduleDate) {
        payload.status = 'SCHEDULED';
        payload.scheduled_at = formScheduleDate;
      } else {
        payload.status = 'DRAFT';
      }

      const createRes = await api.post('/campaigns', payload);
      const newCampaign = createRes.data.data;

      // If launch immediately chosen, trigger launch
      if (launchImmediately && newCampaign?.id) {
        await api.post(`/campaigns/${newCampaign.id}/launch`);
        setFeedbackMsg({
          type: 'success',
          text: `Campaign "${formName}" created and dispatched to queue!`,
        });
      } else {
        setFeedbackMsg({
          type: 'success',
          text: `Campaign "${formName}" scheduled/saved successfully!`,
        });
      }

      setShowCreateModal(false);
      resetCreateForm();
      fetchCampaigns();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to create campaign.',
      });
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setFormName('');
    const firstTmpl = templates[0];
    const firstId = firstTmpl?.id || '';
    setFormTemplateId(firstId);
    setFormScheduleDate('');
    const placeholders = extractTemplatePlaceholders(firstTmpl);
    const initialVars: Record<string, string> = {};
    placeholders.forEach((ph, idx) => {
      if (idx === 0) initialVars[ph] = 'contact.first_name';
      else if (idx === 1) initialVars[ph] = 'contact.last_name';
      else if (idx === 2) initialVars[ph] = 'contact.phone_number';
      else initialVars[ph] = 'contact.email';
    });
    setFormVariables(initialVars);
    setLaunchImmediately(true);
  };

  const handleOpenDetailModal = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    try {
      const res = await api.get(`/campaigns/${campaign.id}`);
      if (res.data && res.data.data) {
        setSelectedCampaign(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load fresh campaign metrics:', err);
    }
  };

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.template?.name && c.template.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Calculate overall statistics
  const totalCampaigns = campaigns.length;
  const totalAudience = campaigns.reduce((acc, c) => acc + (c.total_audience || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.delivered_count || 0), 0);
  const totalRead = campaigns.reduce((acc, c) => acc + (c.read_count || 0), 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0);

  const avgDeliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const avgReadRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

  const selectedTemplateDetails = templates.find(t => t.id === Number(formTemplateId));
  const detectedPlaceholders = extractTemplatePlaceholders(selectedTemplateDetails);

  const renderPreviewText = () => {
    const rawBody = selectedTemplateDetails?.components?.find(c => c.type === 'BODY')?.text || '';
    if (!rawBody) return 'No body text found for this template.';

    let preview = rawBody;
    detectedPlaceholders.forEach(ph => {
      const mapped = formVariables[ph];
      let display = `{{${ph}}}`;
      if (mapped) {
        if (mapped === 'contact.first_name') display = '[First Name]';
        else if (mapped === 'contact.last_name') display = '[Last Name]';
        else if (mapped === 'contact.phone_number') display = '[Phone Number]';
        else if (mapped === 'contact.email') display = '[Email]';
        else display = `[${mapped}]`;
      }
      preview = preview.replaceAll(`{{${ph}}}`, display);
    });
    return preview;
  };

  return (
    <div className="space-y-6">

      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Stage 3B Webhook Engine Active
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight mt-1 flex items-center gap-2.5">
            Broadcast Campaigns
          </h1>
          <p className="text-xs font-semibold text-[#475569] mt-0.5">
            Send bulk marketing & notification templates with live webhook delivery tracking and correlation tokens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncTemplates}
            disabled={syncingTemplates}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#0F172A] text-xs font-extrabold rounded-lg border border-[#CBD5E1] flex items-center gap-2 shadow-xs transition-all disabled:opacity-60"
            title="Sync latest approved templates from Meta WhatsApp Business Manager"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${syncingTemplates ? 'animate-spin' : ''}`} />
            {syncingTemplates ? 'Syncing...' : 'Sync Templates'}
          </button>

          <button
            onClick={() => setShowAiCopyModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-extrabold rounded-lg flex items-center gap-2 shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-200" /> AI Copy Generator
          </button>

          <button
            onClick={() => {
              resetCreateForm();
              if (templates.length > 0) {
                const targetId = formTemplateId ? Number(formTemplateId) : templates[0].id;
                const tmpl = templates.find(t => t.id === targetId) || templates[0];
                setFormTemplateId(tmpl.id);
                const phs = extractTemplatePlaceholders(tmpl);
                const initialVars: Record<string, string> = {};
                phs.forEach((ph, idx) => {
                  if (formVariables[ph]) {
                    initialVars[ph] = formVariables[ph];
                  } else {
                    if (idx === 0) initialVars[ph] = 'contact.first_name';
                    else if (idx === 1) initialVars[ph] = 'contact.last_name';
                    else if (idx === 2) initialVars[ph] = 'contact.phone_number';
                    else initialVars[ph] = 'contact.email';
                  }
                });
                setFormVariables(initialVars);
              }
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-sm font-extrabold rounded-lg flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> New Broadcast Campaign
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${feedbackMsg.type === 'success'
            ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Campaigns */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#475569] uppercase tracking-wider">Total Campaigns</div>
            <div className="text-2xl font-black text-[#0F172A] mt-1">{totalCampaigns}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Dispatched or scheduled</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center font-bold border border-[#99F6E4]">
            <Send className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Audience */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#475569] uppercase tracking-wider">Messages Sent</div>
            <div className="text-2xl font-black text-[#0F172A] mt-1">{totalSent.toLocaleString()}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">of {totalAudience.toLocaleString()} audience</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold border border-[#BFDBFE]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Delivered % */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#475569] uppercase tracking-wider">Delivered Rate</div>
            <div className="text-2xl font-black text-[#059669] mt-1">{avgDeliveryRate}%</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">{totalDelivered.toLocaleString()} confirmed</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center font-bold border border-[#A7F3D0]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Read Rate % */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#475569] uppercase tracking-wider">Read Engagement</div>
            <div className="text-2xl font-black text-[#7C3AED] mt-1">{avgReadRate}%</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">{totalRead.toLocaleString()} read receipts</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center font-bold border border-[#DDD6FE]">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: Failed */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#475569] uppercase tracking-wider">Failed / Undelivered</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{totalFailed.toLocaleString()}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Recoverable via retry</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filters & Campaigns Table */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-xs overflow-hidden">
        {/* Table Control Bar */}
        <div className="p-4 border-b border-[#CBD5E1] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#F8FAFC]">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold">
            {['ALL', 'RUNNING', 'COMPLETED', 'SCHEDULED', 'DRAFT', 'FAILED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === st
                  ? 'bg-[#0D2038] text-white shadow-xs'
                  : 'bg-white text-[#475569] hover:bg-slate-200/60 border border-[#CBD5E1]'
                  }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search campaigns or templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#0F9F8F]"
            />
            <button
              onClick={fetchCampaigns}
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-[#CBD5E1] rounded-lg hover:bg-slate-50"
              title="Refresh Campaigns"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-[#0F172A]">
            <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[11px] text-[#475569] uppercase tracking-wider font-extrabold">
              <tr>
                <th className="px-6 py-4">Campaign Name & Template</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Audience Progress</th>
                <th className="px-6 py-4">Delivered Rate</th>
                <th className="px-6 py-4">Read Rate</th>
                <th className="px-6 py-4">Failed</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBD5E1]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#475569] font-bold">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#0F9F8F] mb-2" />
                    Loading broadcast campaigns...
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#475569] font-bold">
                    <Send className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No broadcast campaigns found. Click <strong className="text-[#0F9F8F]">"New Broadcast Campaign"</strong> to launch your first WhatsApp blast!
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map(c => {
                  const delRate = c.sent_count > 0 ? Math.round((c.delivered_count / c.sent_count) * 100) : 0;
                  const readRate = c.delivered_count > 0 ? Math.round((c.read_count / c.delivered_count) * 100) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Template */}
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-sm text-[#0F172A] flex items-center gap-2">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-[#475569] mt-0.5 flex items-center gap-2 font-medium">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600">
                            {c.template?.name || 'Custom Template'}
                          </span>
                          <span>• {new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {c.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                            <Check className="w-3 h-3 stroke-[3]" /> Completed
                          </span>
                        )}
                        {c.status === 'RUNNING' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                            <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" /> Running
                          </span>
                        )}
                        {c.status === 'SCHEDULED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
                            <Clock className="w-3 h-3" /> Scheduled
                          </span>
                        )}
                        {c.status === 'DRAFT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300">
                            Draft
                          </span>
                        )}
                        {c.status === 'FAILED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </td>

                      {/* Audience Progress */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#0F172A] mb-1">
                          <span>{c.sent_count} / {c.total_audience}</span>
                          <span className="text-slate-500">
                            {c.total_audience > 0 ? Math.round((c.sent_count / c.total_audience) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-28 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#0F9F8F] h-full rounded-full transition-all"
                            style={{ width: `${c.total_audience > 0 ? (c.sent_count / c.total_audience) * 100 : 0}%` }}
                          />
                        </div>
                      </td>

                      {/* Delivered Rate */}
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-[#059669] flex items-center gap-1">
                          {delRate}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {c.delivered_count} delivered
                        </div>
                      </td>

                      {/* Read Rate */}
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-[#7C3AED] flex items-center gap-1">
                          {readRate}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {c.read_count} read
                        </div>
                      </td>

                      {/* Failed */}
                      <td className="px-6 py-4 font-extrabold">
                        {c.failed_count > 0 ? (
                          <span className="text-rose-600 font-black">{c.failed_count}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-2">
                        {/* Launch button for DRAFT / SCHEDULED */}
                        {inArray(c.status, ['DRAFT', 'SCHEDULED']) && (
                          <button
                            onClick={() => handleLaunchCampaign(c.id)}
                            disabled={actionLoading === c.id}
                            className="px-3 py-1.5 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-xs font-extrabold rounded-lg inline-flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            {actionLoading === c.id ? 'Launching...' : 'Launch'}
                          </button>
                        )}

                        {/* Retry button for FAILED */}
                        {c.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetryCampaign(c.id)}
                            disabled={actionLoading === c.id}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-lg inline-flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                          >
                            <RefreshCw className="w-3 h-3" />
                            {actionLoading === c.id ? 'Resetting...' : 'Retry'}
                          </button>
                        )}

                        {/* View Metrics Detail button */}
                        <button
                          onClick={() => handleOpenDetailModal(c)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0F172A] border border-[#CBD5E1] text-xs font-extrabold rounded-lg inline-flex items-center gap-1 shadow-xs transition-all"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                          Analytics
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal: Create Broadcast Campaign */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#CBD5E1] space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-4">
              <div>
                <h3 className="text-lg font-black text-[#0F172A]">Create Broadcast Campaign</h3>
                <p className="text-xs font-semibold text-[#475569] mt-0.5">
                  Official WhatsApp Business Cloud API Broadcast
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Campaign Name */}
              <div>
                <label className="block text-xs font-extrabold text-[#0F172A] mb-1">
                  Campaign Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eid Mega Sale Offer"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F9F8F] focus:bg-white"
                />
              </div>

              {/* WhatsApp Phone Number Selection */}
              <div>
                <label className="block text-xs font-extrabold text-[#0F172A] mb-1">
                  Sending WhatsApp Phone Number <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formPhoneId}
                  onChange={e => setFormPhoneId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F9F8F] focus:bg-white"
                >
                  {phoneNumbers.length === 0 ? (
                    <option value="">No connected phone numbers found in WhatsApp Setup</option>
                  ) : (
                    phoneNumbers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.verified_name} ({p.display_phone_number})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* WhatsApp Approved Template Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-extrabold text-[#0F172A]">
                    Approved Message Template <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSyncTemplates}
                    className="text-[11px] font-bold text-[#0F9F8F] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Sync Meta
                  </button>
                </div>
                <select
                  required
                  value={formTemplateId}
                  onChange={e => handleTemplateChange(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F9F8F] focus:bg-white"
                >
                  {templates.length === 0 ? (
                    <option value="">No APPROVED templates found (click 'Sync Meta')</option>
                  ) : (
                    templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.language}) - {t.category}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Template Preview Box */}
              {selectedTemplateDetails && (
                <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#0F9F8F]" /> Template Preview
                  </div>
                  <div className="text-xs font-semibold text-[#0F172A] bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {renderPreviewText()}
                  </div>
                </div>
              )}

              {/* Dynamic Variable Mapping */}
              <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-[#0F172A] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0F9F8F]" /> Dynamic Variable Mapping
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {detectedPlaceholders.length} placeholder{detectedPlaceholders.length === 1 ? '' : 's'} detected
                  </span>
                </div>

                {detectedPlaceholders.length === 0 ? (
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>This template contains no dynamic placeholders. No variable mapping required.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-[#475569] font-medium">
                      Map each WhatsApp placeholder to a contact CRM field or provide a static value:
                    </p>
                    {detectedPlaceholders.map(ph => {
                      const val = formVariables[ph] ?? '';
                      const isStandardField = ['contact.first_name', 'contact.last_name', 'contact.phone_number', 'contact.email'].includes(val);

                      return (
                        <div key={ph} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded bg-emerald-50 text-[#0F9F8F] border border-emerald-200">
                              &#123;&#123;{ph}&#125;&#125;
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                              {isStandardField ? 'CRM Field' : 'Custom / Static Value'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={isStandardField ? val : '__custom__'}
                              onChange={e => {
                                const selected = e.target.value;
                                if (selected === '__custom__') {
                                  setFormVariables(prev => ({ ...prev, [ph]: '' }));
                                } else {
                                  setFormVariables(prev => ({ ...prev, [ph]: selected }));
                                }
                              }}
                              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F9F8F]"
                            >
                              <option value="contact.first_name">Contact First Name (contact.first_name)</option>
                              <option value="contact.last_name">Contact Last Name (contact.last_name)</option>
                              <option value="contact.phone_number">Contact Phone (contact.phone_number)</option>
                              <option value="contact.email">Contact Email (contact.email)</option>
                              <option value="__custom__">Custom Static Value or Attribute...</option>
                            </select>

                            {!isStandardField && (
                              <input
                                type="text"
                                required
                                placeholder="e.g. 20% OFF, VIP, or custom_attributes.key"
                                value={val}
                                onChange={e => {
                                  const text = e.target.value;
                                  setFormVariables(prev => ({ ...prev, [ph]: text }));
                                }}
                                className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F9F8F]"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dispatch Mode: Immediate vs Schedule */}
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-xs font-extrabold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dispatchMode"
                      checked={launchImmediately}
                      onChange={() => setLaunchImmediately(true)}
                      className="accent-[#0F9F8F]"
                    />
                    <span>Launch Immediately</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dispatchMode"
                      checked={!launchImmediately}
                      onChange={() => setLaunchImmediately(false)}
                      className="accent-[#0F9F8F]"
                    />
                    <span>Schedule for Later</span>
                  </label>
                </div>

                {!launchImmediately && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Schedule Execution Time</label>
                    <input
                      type="datetime-local"
                      required={!launchImmediately}
                      value={formScheduleDate}
                      onChange={e => setFormScheduleDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                    />
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-[#CBD5E1] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-[#475569] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {launchImmediately ? 'Create & Launch Broadcast' : 'Save Scheduled Campaign'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Campaign Analytics & Webhook Detail */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#CBD5E1] space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-4">
              <div>
                <span className="text-[11px] font-extrabold text-[#0F9F8F] uppercase tracking-wider">
                  Real-time Delivery Analytics
                </span>
                <h3 className="text-xl font-black text-[#0F172A] mt-0.5">{selectedCampaign.name}</h3>
                <div className="text-xs text-[#475569] font-medium flex items-center gap-2 mt-1">
                  <span>Template: <strong className="text-[#0F172A]">{selectedCampaign.template?.name || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Status: <strong className="text-[#0F172A]">{selectedCampaign.status}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Breakdown 4-Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className="text-[10px] font-extrabold text-slate-500 uppercase">Total Sent</div>
                <div className="text-2xl font-black text-[#0F172A] mt-1">{selectedCampaign.sent_count}</div>
                <div className="text-[10px] text-slate-400 font-semibold">of {selectedCampaign.total_audience}</div>
              </div>

              <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-center">
                <div className="text-[10px] font-extrabold text-[#059669] uppercase">Delivered</div>
                <div className="text-2xl font-black text-[#059669] mt-1">{selectedCampaign.delivered_count}</div>
                <div className="text-[10px] text-[#059669] font-bold">
                  {selectedCampaign.metrics?.delivery_rate_percentage || (selectedCampaign.sent_count > 0 ? Math.round((selectedCampaign.delivered_count / selectedCampaign.sent_count) * 100) : 0)}%
                </div>
              </div>

              <div className="p-3.5 bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl text-center">
                <div className="text-[10px] font-extrabold text-[#7C3AED] uppercase">Read Receipts</div>
                <div className="text-2xl font-black text-[#7C3AED] mt-1">{selectedCampaign.read_count}</div>
                <div className="text-[10px] text-[#7C3AED] font-bold">
                  {selectedCampaign.metrics?.read_rate_percentage || (selectedCampaign.delivered_count > 0 ? Math.round((selectedCampaign.read_count / selectedCampaign.delivered_count) * 100) : 0)}%
                </div>
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <div className="text-[10px] font-extrabold text-rose-600 uppercase">Failed</div>
                <div className="text-2xl font-black text-rose-600 mt-1">{selectedCampaign.failed_count}</div>
                <div className="text-[10px] text-rose-500 font-bold">Undelivered</div>
              </div>
            </div>

            {/* Stage 3B Technical Safeguards Info Card */}
            <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-2 text-xs">
              <div className="font-extrabold text-[#0F172A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#059669]" /> Enterprise Webhook Tracking Safeguards
              </div>
              <ul className="text-slate-600 space-y-1 font-medium pl-5 list-disc text-[11px]">
                <li><strong className="text-slate-800">HMAC-SHA256 Correlation Token:</strong> Every message carries a tamper-resistant token verifying exact recipient attribution without phone heuristics.</li>
                <li><strong className="text-slate-800">Fast Webhook Race Guard:</strong> Sub-second delivery webhooks are safely buffered with automatic 5s delayed queue retries.</li>
                <li><strong className="text-slate-800">Monotonic Status Progression:</strong> Out-of-order callbacks cannot downgrade delivered/read states or double-count metrics.</li>
              </ul>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-400 font-medium">
                Campaign ID: #{selectedCampaign.id}
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-5 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-xs font-extrabold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 7: AI Campaign Copy Generator Modal */}
      <AICampaignCopyModal
        isOpen={showAiCopyModal}
        onClose={() => setShowAiCopyModal(false)}
        onUseVariationInNewCampaign={(variation) => {
          setFormName(`Campaign: ${variation.title}`);
          setShowCreateModal(true);
        }}
      />

    </div>
  );
};

function inArray(item: string, array: string[]): boolean {
  return array.includes(item);
}
