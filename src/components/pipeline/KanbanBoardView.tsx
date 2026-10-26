import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../services/api';
import { IntentBadge } from '../crm/IntentBadge';

export interface Stage {
  id: number;
  name: string;
  order_index: number;
  leads_count?: number;
}

export interface Lead {
  id: number;
  contact_id: number;
  pipeline_id: number;
  pipeline_stage_id: number;
  assigned_user_id?: number;
  title: string;
  deal_value: number;
  status: 'open' | 'won' | 'lost';
  contact?: {
    id: number;
    phone_number: string;
    first_name: string | null;
    last_name: string | null;
    lead_score: number;
    custom_attributes?: any;
  };
  pipeline_stage?: Stage;
}

export interface Pipeline {
  id: number;
  name: string;
  stages: Stage[];
}

export const KanbanBoardView: React.FC = () => {
  const [, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Lead Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContactId, setNewContactId] = useState<number | ''>('');
  const [newDealValue, setNewDealValue] = useState<number | ''>('');
  const [newStageId, setNewStageId] = useState<number | ''>('');
  const [creating, setCreating] = useState(false);

  const fetchPipelines = async () => {
    try {
      const res = await api.get('/pipelines');
      if (res.data?.status === 'success' && res.data.data.length > 0) {
        setPipelines(res.data.data);
        setSelectedPipeline(res.data.data[0]);
      }
    } catch (err) {
      console.error('Failed to load pipelines', err);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const [leadsRes, contactsRes] = await Promise.all([
        api.get('/leads?per_page=100'),
        api.get('/contacts?per_page=100'),
      ]);
      if (leadsRes.data?.status === 'success') {
        setLeads(leadsRes.data.data);
      }
      if (contactsRes.data?.status === 'success') {
        setContacts(contactsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load leads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
    fetchLeads();
  }, []);

  const handleStageChange = async (leadId: number, targetStageId: number) => {
    try {
      const res = await api.patch(`/leads/${leadId}/stage`, {
        pipeline_stage_id: targetStageId,
      });

      if (res.data?.status === 'success') {
        const updatedLead = res.data.data;
        setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)));
      }
    } catch (err) {
      console.error('Failed to change stage', err);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPipeline || !newContactId) return;

    setCreating(true);
    try {
      const res = await api.post('/leads', {
        pipeline_id: selectedPipeline.id,
        pipeline_stage_id: newStageId || selectedPipeline.stages[0]?.id,
        contact_id: newContactId,
        title: newTitle,
        deal_value: newDealValue || 0,
        status: 'open',
      });

      if (res.data?.status === 'success') {
        setLeads((prev) => [res.data.data, ...prev]);
        setShowCreateModal(false);
        setNewTitle('');
        setNewContactId('');
        setNewDealValue('');
        setNewStageId('');
      }
    } catch (err) {
      console.error('Failed to create lead', err);
    } finally {
      setCreating(false);
    }
  };

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })
      .format(amount)
      .replace('PKR', 'Rs');
  };

  if (!selectedPipeline) {
    return <div className="text-[#475569] p-8 text-center font-poppins font-bold text-sm">Loading Sales Pipeline...</div>;
  }

  return (
    <div className="font-poppins space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Deal Kanban Pipeline</h1>
          <p className="text-xs font-semibold text-[#475569] mt-1">Visual Sales Stages & Revenue Attribution for {selectedPipeline.name}</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-sm font-extrabold rounded-lg flex items-center gap-2 shadow-sm transition-all self-start"
        >
          <Plus className="w-4 h-4" /> Create New Deal
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {selectedPipeline.stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.pipeline_stage_id === stage.id);
          const stageTotalRevenue = stageLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

          return (
            <div
              key={stage.id}
              className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 flex flex-col min-w-[260px] shadow-xs"
            >
              {/* Stage Column Header */}
              <div className="pb-3 border-b border-[#CBD5E1] mb-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#0F172A] uppercase tracking-wider">{stage.name}</span>
                  <span className="px-2.5 py-0.5 text-xs bg-[#E2E8F0] text-[#0F172A] rounded-full font-mono font-black border border-slate-300">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="text-xs text-[#059669] font-black mt-1">
                  {formatPKR(stageTotalRevenue)}
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {stageLeads.length === 0 ? (
                  <div className="text-xs text-slate-500 italic text-center py-8 border border-dashed border-[#CBD5E1] rounded-xl bg-white font-semibold">
                    No active deals
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white border border-[#CBD5E1] hover:border-[#0F9F8F] rounded-xl p-4 transition-all shadow-xs hover:shadow-md group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-extrabold text-sm text-[#0F172A] leading-snug group-hover:text-[#0F9F8F] transition-colors">
                          {lead.title}
                        </span>
                        {lead.status === 'won' ? (
                          <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#ECFDF5] text-[#059669] rounded-full border border-[#A7F3D0]">
                            Won
                          </span>
                        ) : lead.status === 'lost' ? (
                          <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#FEF2F2] text-[#B91C1C] rounded-full border border-[#FCA5A5]">
                            Lost
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#EFF6FF] text-[#2563EB] rounded-full border border-[#BFDBFE]">
                            Open
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#1E293B] font-bold mb-3">
                        {lead.contact ? (
                          <div>
                            <div className="font-extrabold text-[#0F172A]">{lead.contact.first_name || 'Contact'} {lead.contact.last_name || ''}</div>
                            <div className="text-xs text-[#475569] font-mono font-semibold">{lead.contact.phone_number}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned Contact</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-[#CBD5E1]">
                        <div className="text-sm font-black text-[#059669] font-mono">
                          {formatPKR(lead.deal_value)}
                        </div>

                        {lead.contact && (
                          <IntentBadge
                            contactId={lead.contact.id}
                            score={lead.contact.lead_score}
                            aiScoring={lead.contact.custom_attributes?.ai_scoring}
                          />
                        )}
                      </div>

                      {/* Stage Move Dropdown */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <select
                          value={lead.pipeline_stage_id}
                          onChange={(e) => handleStageChange(lead.id, Number(e.target.value))}
                          className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0F9F8F]"
                        >
                          {selectedPipeline.stages.map((stg) => (
                            <option key={stg.id} value={stg.id}>
                              Move to: {stg.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-poppins">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-xl font-black text-[#0F172A]">Create New Deal Lead</h2>
              <p className="text-xs font-semibold text-[#475569] mt-0.5">Add a new deal opportunity to the sales pipeline</p>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-[#334155] block mb-1 uppercase tracking-wider">Deal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise WhatsApp OS License"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] rounded-lg p-3 focus:border-[#0F9F8F] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#334155] block mb-1 uppercase tracking-wider">Select Contact *</label>
                <select
                  required
                  value={newContactId}
                  onChange={(e) => setNewContactId(Number(e.target.value))}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] rounded-lg p-3 focus:border-[#0F9F8F] focus:bg-white focus:outline-none"
                >
                  <option value="">Choose a contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name ? `${c.first_name} ${c.last_name || ''}` : 'Contact'} ({c.phone_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#334155] block mb-1 uppercase tracking-wider">Deal Value (PKR Rs.)</label>
                <input
                  type="number"
                  placeholder="250000"
                  value={newDealValue}
                  onChange={(e) => setNewDealValue(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] rounded-lg p-3 focus:border-[#0F9F8F] focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#334155] block mb-1 uppercase tracking-wider">Pipeline Stage</label>
                <select
                  value={newStageId}
                  onChange={(e) => setNewStageId(Number(e.target.value))}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] rounded-lg p-3 focus:border-[#0F9F8F] focus:bg-white focus:outline-none"
                >
                  {selectedPipeline.stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#CBD5E1]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-white text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors border border-[#CBD5E1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] disabled:opacity-50 text-white text-xs font-extrabold rounded-lg shadow-sm transition-all"
                >
                  {creating ? 'Creating Deal...' : 'Save Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
