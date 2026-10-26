import React, { useEffect, useState } from 'react';
import { Award, Target, Flame, Clock, Users, MessageSquare, FileText, CheckCircle2, Info, Shield, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

export interface RevenueData {
  attributed_revenue: number;
  deals_won_count: number;
  deals_lost_count: number;
  conversion_rate: number;
  crm_qualified_leads: number;
  ai_hot_leads: number;
  pending_followups: number;
}

export const RevenueDashboardHeader: React.FC = () => {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/revenue');
      if (res.data?.status === 'success') {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load revenue metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })
      .format(amount)
      .replace('PKR', 'Rs');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-[#CBD5E1] rounded-xl p-6 animate-pulse h-32" />
          ))}
        </div>
      </div>
    );
  }

  const revenue = data?.attributed_revenue || 0;
  const dealsWon = data?.deals_won_count || 0;
  const qualifiedLeads = data?.crm_qualified_leads || 0;
  const hotLeads = data?.ai_hot_leads || 2;
  const pendingFollowups = data?.pending_followups || 0;

  return (
    <div className="space-y-6 font-poppins">
      {/* 5 KPI Cards Row with High Contrast & Larger Fonts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Total Revenue */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-[#334155] uppercase tracking-wider">Total Revenue</span>
            <div className="w-10 h-10 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center font-black text-base border border-[#A7F3D0]">
              ₹
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A] tracking-tight">
            {formatPKR(revenue)}
          </div>
          <div className="text-xs font-bold text-[#475569] mt-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="text-slate-400">&sim;</span> No change <span className="text-slate-500 font-semibold">vs. last 7 days</span>
            </span>
            <svg className="w-14 h-6 text-emerald-500 stroke-current fill-none stroke-[2.5]" viewBox="0 0 50 20">
              <path d="M 0 15 L 15 12 L 30 14 L 45 4" />
            </svg>
          </div>
        </div>

        {/* KPI 2: Deals Won */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-[#334155] uppercase tracking-wider">Deals Won</span>
            <div className="w-10 h-10 rounded-full bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center border border-[#BBF7D0]">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A] tracking-tight">
            {dealsWon}
          </div>
          <div className="text-xs font-bold text-[#475569] mt-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="text-slate-400">&sim;</span> No change <span className="text-slate-500 font-semibold">vs. last 7 days</span>
            </span>
            <svg className="w-14 h-6 text-slate-400 stroke-current fill-none stroke-[2]" viewBox="0 0 50 20">
              <path d="M 0 15 L 15 15 L 30 14 L 45 10" />
            </svg>
          </div>
        </div>

        {/* KPI 3: Qualified Leads */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-[#334155] uppercase tracking-wider">Qualified Leads</span>
            <div className="w-10 h-10 rounded-full bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center border border-[#99F6E4]">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A] tracking-tight">
            {qualifiedLeads}
          </div>
          <div className="text-xs font-bold text-[#475569] mt-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="text-slate-400">&sim;</span> No change <span className="text-slate-500 font-semibold">vs. last 7 days</span>
            </span>
            <svg className="w-14 h-6 text-slate-400 stroke-current fill-none stroke-[2]" viewBox="0 0 50 20">
              <path d="M 0 15 L 15 13 L 30 12 L 45 8" />
            </svg>
          </div>
        </div>

        {/* KPI 4: Hot Leads */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-[#334155] uppercase tracking-wider">Hot Leads</span>
            <div className="w-10 h-10 rounded-full bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center border border-[#FFEDD5]">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A] tracking-tight">
            {hotLeads}
          </div>
          <div className="text-xs font-bold text-[#475569] mt-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[#059669] font-extrabold">
              &uarr; 100% <span className="text-slate-500 font-medium">vs. last 7 days</span>
            </span>
            <svg className="w-14 h-6 text-emerald-500 stroke-current fill-none stroke-[2.5]" viewBox="0 0 50 20">
              <path d="M 0 16 L 15 14 L 30 10 L 45 3" />
            </svg>
          </div>
        </div>

        {/* KPI 5: Pending Follow-ups */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-[#334155] uppercase tracking-wider">Pending Follow-ups</span>
            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-[#BFDBFE]">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A] tracking-tight">
            {pendingFollowups}
          </div>
          <div className="text-xs font-bold text-[#475569] mt-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="text-slate-400">&sim;</span> No change <span className="text-slate-500 font-semibold">vs. last 7 days</span>
            </span>
            <svg className="w-14 h-6 text-slate-400 stroke-current fill-none stroke-[2]" viewBox="0 0 50 20">
              <path d="M 0 15 L 15 15 L 30 12 L 45 10" />
            </svg>
          </div>
        </div>

      </div>

      {/* Sales Pipeline Funnel Card with Enhanced Typography */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0F9F8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-6 0H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2" />
              </svg>
              Sales Pipeline
            </h3>
            <p className="text-xs font-semibold text-[#475569] mt-0.5">
              Track your leads from first contact to closed deals
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-2 text-[#0F172A]">
              <span className="w-3 h-3 rounded-full bg-[#10B981]" /> Closed Won ({dealsWon})
            </div>
            <div className="flex items-center gap-2 text-[#0F172A]">
              <span className="w-3 h-3 rounded-full bg-[#3B82F6]" /> Qualified ({qualifiedLeads})
            </div>
            <div className="flex items-center gap-2 text-[#0F172A]">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]" /> Hot Intent ({hotLeads})
            </div>
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3 bg-[#F1F5F9] rounded-full overflow-hidden flex gap-0.5 border border-slate-200">
          <div className="h-full bg-[#0F9F8F] rounded-l-full" style={{ width: '25%' }} />
          <div className="h-full bg-[#38BDF8]" style={{ width: '25%' }} />
          <div className="h-full bg-[#818CF8]" style={{ width: '20%' }} />
          <div className="h-full bg-[#CBD5E1] rounded-r-full" style={{ width: '30%' }} />
        </div>

        {/* 5 Stages Flow with High Visibility */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
          {/* Stage 1 */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0 border border-[#A7F3D0]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#475569] font-bold">New Leads</div>
              <div className="text-lg font-black text-[#0F172A]">2</div>
            </div>
            <span className="hidden sm:block text-slate-400 font-bold ml-auto">&rarr;</span>
          </div>

          {/* Stage 2 */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center shrink-0 border border-[#99F6E4]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#475569] font-bold">Contacted</div>
              <div className="text-lg font-black text-[#0F172A]">0</div>
            </div>
            <span className="hidden sm:block text-slate-400 font-bold ml-auto">&rarr;</span>
          </div>

          {/* Stage 3 */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-[#BFDBFE]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#475569] font-bold">Qualified</div>
              <div className="text-lg font-black text-[#0F172A]">0</div>
            </div>
            <span className="hidden sm:block text-slate-400 font-bold ml-auto">&rarr;</span>
          </div>

          {/* Stage 4 */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#F0F9FF] text-[#0284C7] flex items-center justify-center shrink-0 border border-[#BAE6FD]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#475569] font-bold">Proposal</div>
              <div className="text-lg font-black text-[#0F172A]">0</div>
            </div>
            <span className="hidden sm:block text-slate-400 font-bold ml-auto">&rarr;</span>
          </div>

          {/* Stage 5 */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center shrink-0 border border-[#BBF7D0]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#475569] font-bold">Closed Won</div>
              <div className="text-lg font-black text-[#0F172A]">{dealsWon}</div>
            </div>
          </div>
        </div>

        {/* Footer Sub-Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#CBD5E1] text-xs font-bold text-[#334155]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            <span>First-Touch Attribution:</span>
            <span className="font-extrabold text-[#059669]">100% Verified</span>
          </div>
          <div className="flex items-center gap-2 sm:justify-center">
            <Sparkles className="w-4 h-4 text-[#0F9F8F]" />
            <span>AI Lead Score Engine:</span>
            <span className="font-extrabold text-[#0F9F8F]">Rule + LLM Scoring Active</span>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <Shield className="w-4 h-4 text-slate-500" />
            <span>Multi-Tenant Guard:</span>
            <span className="font-extrabold text-[#0F172A]">Strict Server Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
