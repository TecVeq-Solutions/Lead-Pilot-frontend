import React, { useState, Suspense, lazy } from 'react';
import { useAuthStore } from './stores/authStore';
import { LoginView } from './components/auth/LoginView';
import { RevenueDashboardHeader } from './components/analytics/RevenueDashboardHeader';
import { IntentBadge } from './components/crm/IntentBadge';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ConnectionStatusBanner } from './components/common/ConnectionStatusBanner';
import {
  Shield, LayoutDashboard, Trello, Users, Settings, LogOut, MessageSquare,
  Upload, Sparkles, Building2, UserCheck, Activity, Search, Bell, Calendar,
  Send, ChevronDown, ChevronRight, ArrowUp, RefreshCw, Zap, Megaphone, Inbox,
  CreditCard
} from 'lucide-react';
import { api } from './services/api';

// Code-split heavy views via dynamic imports to reduce initial bundle parse time
const LiveInboxView = lazy(() => import('./components/inbox/LiveInboxView').then(m => ({ default: m.LiveInboxView })));
const SalesIntelligenceView = lazy(() => import('./components/intelligence/SalesIntelligenceView').then(m => ({ default: m.SalesIntelligenceView })));
const KanbanBoardView = lazy(() => import('./components/pipeline/KanbanBoardView').then(m => ({ default: m.KanbanBoardView })));
const CampaignsView = lazy(() => import('./components/campaigns/CampaignsView').then(m => ({ default: m.CampaignsView })));
const WhatsAppSettingsView = lazy(() => import('./components/settings/WhatsAppSettingsView').then(m => ({ default: m.WhatsAppSettingsView })));
const BillingSettingsView = lazy(() => import('./components/settings/BillingSettingsView').then(m => ({ default: m.BillingSettingsView })));
const CsvImportModal = lazy(() => import('./components/contacts/CsvImportModal').then(m => ({ default: m.CsvImportModal })));

const ViewLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Loading view...' }) => (
  <div className="flex flex-col items-center justify-center p-16 space-y-4 min-h-[360px] animate-fade-in">
    <div className="w-9 h-9 border-3 border-teal-500/20 border-t-[#0F9F8F] rounded-full animate-spin" />
    <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">{label}</p>
  </div>
);

export const App: React.FC = () => {
  const { token, user, organization, clearAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox' | 'intelligence' | 'pipeline' | 'campaigns' | 'whatsapp' | 'contacts' | 'settings' | 'billing'>('dashboard');
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  if (!token || !user || !organization) {
    return <LoginView />;
  }

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await api.get('/contacts');
      setContacts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContacts(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F3F6FA] text-[#0F172A] font-poppins overflow-hidden selection:bg-[#0F9F8F]/20 selection:text-[#0F9F8F]">

      {/* 1. Deep Navy Sidebar (#0D2038) */}
      <aside className="w-80 4xl:w-80 bg-[#0D2038] flex flex-col justify-between p-5 4xl:p-6 shrink-0 text-white z-20 shadow-xl">
        <div>
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="p-3 bg-[#0F9F8F] text-white rounded-xl shadow-lg">
              <Send className="w-6 h-6 transform -rotate-12" />
            </div>
            <div>
              <div className="font-black text-white text-xl 4xl:text-2xl tracking-tight leading-none">
                LeadPilot
              </div>
              <div className="text-xs text-[#CBD5E1] font-medium mt-1 leading-tight">
                AI-Powered WhatsApp Sales OS
              </div>
            </div>
          </div>

          {/* Navigation Links with High Visibility */}
          <nav className="space-y-2 4xl:space-y-2.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm 4xl:text-base font-bold transition-all duration-200 ${activeTab === 'dashboard'
                ? 'bg-[#103B52] text-white shadow-md'
                : 'text-[#CBD5E1] hover:bg-[#103B52]/60 hover:text-white'
                }`}
            >
              <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-[#14B8A6]' : 'text-[#CBD5E1]'}`} />
              Executive Dashboard
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm 4xl:text-base font-bold transition-all duration-200 ${activeTab === 'inbox'
                ? 'bg-[#103B52] text-white shadow-md'
                : 'text-[#CBD5E1] hover:bg-[#103B52]/60 hover:text-white'
                }`}
            >
              <Inbox className={`w-5 h-5 ${activeTab === 'inbox' ? 'text-[#14B8A6]' : 'text-[#CBD5E1]'}`} />
              Live Shared Inbox
            </button>

            <button
              onClick={() => setActiveTab('intelligence')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm 4xl:text-base font-bold transition-all duration-200 ${activeTab === 'intelligence'
                ? 'bg-[#103B52] text-white shadow-md'
                : 'text-[#CBD5E1] hover:bg-[#103B52]/60 hover:text-white'
                }`}
            >
              <Sparkles className={`w-5 h-5 ${activeTab === 'intelligence' ? 'text-[#14B8A6]' : 'text-[#CBD5E1]'}`} />
              Sales Intelligence
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm 4xl:text-base font-bold transition-all duration-200 ${activeTab === 'pipeline'
                ? 'bg-[#103B52] text-white shadow-md'
                : 'text-[#CBD5E1] hover:bg-[#103B52]/60 hover:text-white'
                }`}
            >
              <Trello className={`w-5 h-5 ${activeTab === 'pipeline' ? 'text-[#14B8A6]' : 'text-[#CBD5E1]'}`} />
              Sales Kanban Board
            </button>

            <button
              onClick={() => setActiveTab('campaigns')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm 4xl:text-base font-bold transition-all duration-200 ${activeTab === 'campaigns'
                ? 'bg-[#103B52] text-white shadow-md'
                : 'text-[#CBD5E1] hover:bg-[#103B52]/60 hover:text-white'
                }`}
            >
              <Megaphone className={`w-5 h-5 ${activeTab === 'campaigns' ? 'text-[#14B8A6]' : 'text-[#CBD5E1]'}`} />
              Broadcast Campaigns
            </button>

            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm 4xl:text-base font-bold transition-all duration-200 ${activeTab === 'whatsapp'
                ? 'bg-[#103B52] text-white shadow-md'
                : 'text-[#CBD5E1] hover:bg-[#103B52]/60 hover:text-white'
                }`}
            >
              <MessageSquare className={`w-5 h-5 ${activeTab === 'whatsapp' ? 'text-[#14B8A6]' : 'text-[#CBD5E1]'}`} />
              WhatsApp Setup
            </button>

            <button
              onClick={() => { setActiveTab('contacts'); fetchContacts(); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm 4xl:text-base font-bold transition-all duration-200 ${activeTab === 'contacts'
                ? 'bg-[#103B52] text-white shadow-md'
                : 'text-[#CBD5E1] hover:bg-[#103B52]/60 hover:text-white'
                }`}
            >
              <Users className={`w-5 h-5 ${activeTab === 'contacts' ? 'text-[#14B8A6]' : 'text-[#CBD5E1]'}`} />
              Contacts Directory
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm 4xl:text-base font-bold transition-all duration-200 ${activeTab === 'settings'
                ? 'bg-[#103B52] text-white shadow-md'
                : 'text-[#CBD5E1] hover:bg-[#103B52]/60 hover:text-white'
                }`}
            >
              <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-[#14B8A6]' : 'text-[#CBD5E1]'}`} />
              Organization Settings
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm 4xl:text-base font-bold transition-all duration-200 ${activeTab === 'billing'
                ? 'bg-[#103B52] text-white shadow-md'
                : 'text-[#CBD5E1] hover:bg-[#103B52]/60 hover:text-white'
                }`}
            >
              <CreditCard className={`w-5 h-5 ${activeTab === 'billing' ? 'text-[#14B8A6]' : 'text-[#CBD5E1]'}`} />
              Billing & Licensing
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Section: Tenant & User Info */}
        <div className="space-y-2.5 pt-4 border-t border-[#103B52]">
          {/* Active Tenant Box */}
          <div className="bg-[#103B52]/80 border border-[#103B52] rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0F9F8F]/25 text-[#14B8A6] flex items-center justify-center font-bold text-sm shrink-0 border border-[#0F9F8F]/40">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-sm font-extrabold text-white truncate">{organization.name}</div>
              <div className="text-xs text-[#10B981] font-bold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" /> Active Tenant
              </div>
            </div>
          </div>

          {/* User Account Box */}
          <div className="bg-[#103B52]/50 hover:bg-[#103B52]  border border-[#103B52] rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-slate-500">
                {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-extrabold text-white truncate">{user.name}</div>
                <div className="text-xs text-[#CBD5E1] font-medium truncate capitalize">{user.role.replace('_', ' ')}</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#CBD5E1]" />
          </div>

          {/* Sign Out Button */}
          <button
            onClick={clearAuth}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-[#CBD5E1] hover:text-rose-400 hover:bg-rose-500/15 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* 2. Main Content View Area */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Real-Time & Network Resilience Status Banner */}
        <ConnectionStatusBanner />

        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-[#CBD5E1] px-6 flex items-center justify-between shrink-0 z-10 shadow-xs">
          {/* Search Pill */}
          <div className="relative w-80 lg:w-96">
            <Search className="w-4.5 h-4.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads, contacts, or deals..."
              className="w-full pl-10 pr-12 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-full text-sm text-[#0F172A] placeholder:text-slate-500 font-semibold focus:outline-none focus:border-[#0F9F8F] focus:bg-white transition-colors"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500 border border-slate-300 px-2 py-0.5 rounded bg-white">
              ⌘K
            </span>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
            </button>

            {/* User Profile Mini */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-300">
              <div className="w-9 h-9 rounded-full bg-[#0D2038] text-white text-xs font-black flex items-center justify-center border border-slate-400">
                {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-extrabold text-[#0F172A] leading-none">{user.name}</div>
                <div className="text-xs font-bold text-[#475569] leading-tight mt-1 capitalize">{user.role.replace('_', ' ')}</div>
              </div>
            </div>

            {/* Date Range Selector Pill */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#0F172A] shadow-xs cursor-pointer hover:bg-slate-50">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Apr 22, 2025 - Apr 28, 2025</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>

            {/* Quick Action Button: Live Inbox */}
            <button
              onClick={() => setActiveTab('inbox')}
              className="px-4 py-2 bg-[#0D2038] hover:bg-[#103B52] text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-xs transition-all duration-200"
            >
              <Inbox className="w-4 h-4 text-[#14B8A6]" />
              <span>Live Inbox</span>
            </button>

            {/* Primary Action Button: Launch WhatsApp */}
            <button
              onClick={() => setActiveTab('whatsapp')}
              className="px-5 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-sm transition-all duration-200"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              Launch WhatsApp
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard Viewport / Full-Height Inbox Viewport */}
        <div className={`flex-1 ${activeTab === 'inbox' ? 'flex overflow-hidden w-full' : 'overflow-y-auto p-6 md:p-8 space-y-6 max-w-[2500px] w-full mx-auto'}`}>
          {activeTab === 'dashboard' && (
            <div className="space-y-6">

              {/* Welcome Heading Banner */}
              <div className="space-y-1">
                <div className="text-xs font-extrabold text-[#0F9F8F] uppercase tracking-wider">
                  AI-Powered WhatsApp Sales Operating System
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-[#0F172A] tracking-tight">
                  Welcome back, {user.name.split(' ')[0]} 👋
                </h1>
                <p className="text-sm font-semibold text-[#475569]">
                  Here's what's happening with your sales pipeline today.
                </p>
              </div>

              {/* 5 KPI Cards & Sales Pipeline Component */}
              <RevenueDashboardHeader />

              {/* 3 Bottom Dashboard Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Card 1: Recent Activity */}
                <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#0F9F8F]" /> Recent Activity
                      </h3>
                      <p className="text-xs font-semibold text-[#475569] mt-0.5">Latest lead updates and follow-ups</p>
                    </div>
                    <button className="text-xs font-bold text-[#0F9F8F] hover:underline">View all</button>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div className="flex items-start gap-3.5 text-xs">
                      <div className="w-9 h-9 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0 border border-[#A7F3D0] mt-0.5">
                        <MessageSquare className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-[#0F172A]">New WhatsApp enquiry</div>
                        <div className="text-xs font-semibold text-[#334155] truncate">Customer interested in car rental services...</div>
                      </div>
                      <div className="text-xs font-bold text-slate-500 shrink-0">2h ago ●</div>
                    </div>

                    <div className="flex items-start gap-3.5 text-xs">
                      <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-[#BFDBFE] mt-0.5">
                        <Users className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-[#0F172A]">Lead moved to Qualified</div>
                        <div className="text-xs font-semibold text-[#334155] truncate">John Doe • AutoSphere Rental</div>
                      </div>
                      <div className="text-xs font-bold text-slate-500 shrink-0">4h ago</div>
                    </div>

                    <div className="flex items-start gap-3.5 text-xs">
                      <div className="w-9 h-9 rounded-full bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center shrink-0 border border-[#99F6E4] mt-0.5">
                        <Calendar className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-[#0F172A]">Follow-up scheduled</div>
                        <div className="text-xs font-semibold text-[#334155] truncate">Sarah Khan • 25 Apr 2025, 10:00 AM</div>
                      </div>
                      <div className="text-xs font-bold text-slate-500 shrink-0">5h ago</div>
                    </div>

                    <div className="flex items-start gap-3.5 text-xs">
                      <div className="w-9 h-9 rounded-full bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center shrink-0 border border-[#DDD6FE] mt-0.5">
                        <MessageSquare className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-[#0F172A]">New message received</div>
                        <div className="text-xs font-semibold text-[#334155] truncate">Ali Raza • Looking for premium package...</div>
                      </div>
                      <div className="text-xs font-bold text-slate-500 shrink-0">6h ago</div>
                    </div>
                  </div>
                </div>

                {/* Card 2: AI Lead Insights */}
                <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#0F9F8F]" /> AI Lead Insights
                      </h3>
                      <p className="text-xs font-semibold text-[#475569] mt-0.5">Actionable recommendations to boost sales</p>
                    </div>
                    <button className="text-xs font-bold text-[#0F9F8F] hover:underline">View all</button>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0 border border-[#A7F3D0]">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-[#0F172A]">High Intent Lead Detected</div>
                          <div className="text-xs font-semibold text-[#475569]">John Doe showed strong buying signals</div>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 text-xs font-extrabold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg hover:bg-emerald-100 transition-colors shrink-0">
                        Prioritize
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-[#BFDBFE]">
                          <ArrowUp className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-[#0F172A]">Follow Up Recommended</div>
                          <div className="text-xs font-semibold text-[#475569]">3 leads haven't been contacted in 2+ days</div>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 text-xs font-extrabold text-slate-800 bg-slate-200/80 border border-slate-300 rounded-lg hover:bg-slate-300 transition-colors shrink-0">
                        View Leads
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center shrink-0 border border-[#99F6E4]">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-[#0F172A]">Best Time to Reach</div>
                          <div className="text-xs font-semibold text-[#475569]">Your leads are most active 10 AM - 12 PM</div>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 text-xs font-extrabold text-slate-800 bg-slate-200/80 border border-slate-300 rounded-lg hover:bg-slate-300 transition-colors shrink-0">
                        View Schedule
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 3: Upcoming Follow-ups */}
                <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#0F9F8F]" /> Upcoming Follow-ups
                      </h3>
                      <p className="text-xs font-semibold text-[#475569] mt-0.5">Stay on track with scheduled activities</p>
                    </div>
                    <button className="text-xs font-bold text-[#0F9F8F] hover:underline">View all</button>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-300">
                          SK
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-[#0F172A]">Sarah Khan</div>
                          <div className="text-xs font-semibold text-[#475569]">Product Inquiry • 25 Apr 2025, 10:00 AM</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-extrabold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] rounded-full">
                        Today
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-300">
                          MA
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-[#0F172A]">Muhammad Ali</div>
                          <div className="text-xs font-semibold text-[#475569]">Pricing Discussion • 26 Apr 2025, 02:00 PM</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-extrabold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] rounded-full">
                        Tomorrow
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-300">
                          AM
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-[#0F172A]">Ayesha Malik</div>
                          <div className="text-xs font-semibold text-[#475569]">Demo Call • 27 Apr 2025, 11:00 AM</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-extrabold text-slate-700 bg-slate-100 border border-slate-300 rounded-full">
                        Sun
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-300">
                          UT
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-[#0F172A]">Usman Tariq</div>
                          <div className="text-xs font-semibold text-[#475569]">Follow Up • 28 Apr 2025, 04:00 PM</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-extrabold text-slate-700 bg-slate-100 border border-slate-300 rounded-full">
                        Mon
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom System & Tenant Status Bar */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-4.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-bold">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#ECFDF5] text-[#059669] rounded-lg border border-[#A7F3D0]">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#0F172A]">System & Tenant Status</div>
                    <div className="text-xs font-semibold text-[#475569]">Your platform is running smoothly</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-xs text-[#334155]">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>Tenant: <strong className="text-[#0F172A] font-extrabold">{organization.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    <span>Operator: <strong className="text-[#0F172A] font-extrabold">{user.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span>CRM Engine: <strong className="text-[#059669] font-extrabold">Online</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span>WhatsApp Integration: <strong className="text-[#059669] font-extrabold">Connected</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span>Server: <strong className="text-[#059669] font-extrabold">Healthy</strong></span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'inbox' && (
            <ErrorBoundary viewName="Live Inbox">
              <Suspense fallback={<ViewLoadingFallback label="Loading Live Inbox..." />}>
                <LiveInboxView />
              </Suspense>
            </ErrorBoundary>
          )}

          {activeTab === 'intelligence' && (
            <ErrorBoundary viewName="Sales Intelligence & Visual Workflow Canvas">
              <Suspense fallback={<ViewLoadingFallback label="Loading Sales Intelligence..." />}>
                <SalesIntelligenceView onNavigateToInbox={() => setActiveTab('inbox')} />
              </Suspense>
            </ErrorBoundary>
          )}

          {activeTab === 'pipeline' && (
            <ErrorBoundary viewName="Deals Kanban Pipeline">
              <Suspense fallback={<ViewLoadingFallback label="Loading Deals Pipeline..." />}>
                <KanbanBoardView />
              </Suspense>
            </ErrorBoundary>
          )}

          {activeTab === 'campaigns' && (
            <ErrorBoundary viewName="Broadcast Campaigns Manager">
              <Suspense fallback={<ViewLoadingFallback label="Loading Campaigns Manager..." />}>
                <CampaignsView />
              </Suspense>
            </ErrorBoundary>
          )}

          {activeTab === 'whatsapp' && (
            <ErrorBoundary viewName="WhatsApp Integration Settings">
              <Suspense fallback={<ViewLoadingFallback label="Loading WhatsApp Settings..." />}>
                <WhatsAppSettingsView />
              </Suspense>
            </ErrorBoundary>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Contacts Directory</h1>
                  <p className="text-xs font-semibold text-[#475569]">Tenant-Isolated Contact Records for {organization.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-5 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-sm font-extrabold rounded-lg flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Upload className="w-4 h-4" /> Bulk CSV Import
                  </button>
                  <button
                    onClick={fetchContacts}
                    className="px-5 py-2.5 bg-white hover:bg-slate-50 text-[#0F172A] text-sm font-extrabold rounded-lg border border-[#CBD5E1] flex items-center gap-2 shadow-sm transition-all"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" /> Refresh Records
                  </button>
                </div>
              </div>

              <div className="bg-white border border-[#CBD5E1] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs font-semibold text-[#0F172A]">
                  <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-xs text-[#334155] uppercase tracking-wider font-extrabold">
                    <tr>
                      <th className="px-6 py-4">Phone Number</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Explainable AI Lead Score</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CBD5E1]">
                    {loadingContacts ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-[#475569] font-bold">Loading tenant records...</td>
                      </tr>
                    ) : contacts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-[#475569] font-bold">No contact records found for this organization.</td>
                      </tr>
                    ) : (
                      contacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-black text-[#0F172A]">{contact.phone_number}</td>
                          <td className="px-6 py-4 font-bold text-[#0F172A]">{contact.first_name || '-'} {contact.last_name || ''}</td>
                          <td className="px-6 py-4 text-[#475569] font-semibold">{contact.email || '-'}</td>
                          <td className="px-6 py-4">
                            <IntentBadge
                              contactId={contact.id}
                              score={contact.lead_score}
                              aiScoring={contact.custom_attributes?.ai_scoring}
                              onScoreUpdated={() => fetchContacts()}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                              {contact.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* CSV Import Modal (Lazy-Loaded) */}
              <Suspense fallback={null}>
                {showImportModal && (
                  <CsvImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onImportComplete={() => fetchContacts()}
                  />
                )}
              </Suspense>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Organization & RBAC Settings</h1>
                <p className="text-xs font-semibold text-[#475569]">Security & User Roles Configuration</p>
              </div>
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 max-w-xl shadow-sm space-y-4">
                <div>
                  <label className="text-xs text-[#475569] block mb-1 font-bold uppercase tracking-wider">Organization Name</label>
                  <div className="text-xl font-black text-[#0F172A]">{organization.name}</div>
                </div>
                <div>
                  <label className="text-xs text-[#475569] block mb-1 font-bold uppercase tracking-wider">Organization Slug</label>
                  <div className="text-base font-mono text-[#0F9F8F] font-extrabold">{organization.slug}</div>
                </div>
                <div>
                  <label className="text-xs text-[#475569] block mb-1 font-bold uppercase tracking-wider">Your Role</label>
                  <div className="text-base font-black text-[#0F172A] capitalize">{user.role}</div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="w-full py-2.5 px-4 bg-teal-50 hover:bg-teal-100 text-[#0F9F8F] font-bold text-xs rounded-xl transition-all flex items-center justify-between border border-teal-200"
                  >
                    <span>Manage SaaS Billing & Subscription</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <ErrorBoundary viewName="Billing & Subscription Center">
              <Suspense fallback={<ViewLoadingFallback label="Loading Billing Settings..." />}>
                <BillingSettingsView />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </main>
    </div>
  );
};
export default App;
