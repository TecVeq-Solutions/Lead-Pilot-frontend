import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Bot,
  Play,
  Search,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  MessageSquare,
  X,
  Zap,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { Task, SalesRecommendation, AutomationRule, SalesIntelligenceMetrics, User as UserModel } from '../../types';
import { VisualWorkflowBuilder } from './VisualWorkflowBuilder';
import { AIIntentEvaluationCard } from '../ai/AIIntentEvaluationCard';

interface SalesIntelligenceViewProps {
  onNavigateToInbox?: () => void;
}

type ViewSubTab = 'tasks' | 'recommendations' | 'automations';
type TaskFilterStatus = 'all' | 'overdue' | 'due_today' | 'upcoming' | 'completed';
type TaskFilterPriority = 'all' | 'urgent' | 'high' | 'medium' | 'low';

export const SalesIntelligenceView: React.FC<SalesIntelligenceViewProps> = ({ onNavigateToInbox }) => {
  const { user } = useAuthStore();

  // Active Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<ViewSubTab>('tasks');

  // Metrics State
  const [metrics, setMetrics] = useState<SalesIntelligenceMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskFilterStatus>('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<TaskFilterPriority>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskCounters, setTaskCounters] = useState({
    all: 0,
    overdue: 0,
    due_today: 0,
    upcoming: 0,
    completed: 0,
  });

  // Recommendations State
  const [recommendations, setRecommendations] = useState<SalesRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [expandedIntentRecId, setExpandedIntentRecId] = useState<string | null>(null);

  // Automations State
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [loadingAutomations, setLoadingAutomations] = useState(false);
  const [evaluatingAutomations, setEvaluatingAutomations] = useState(false);
  const [evaluationFeedback, setEvaluationFeedback] = useState<string | null>(null);
  const [showVisualBuilder, setShowVisualBuilder] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationRule | null>(null);

  // Team members for task assignment
  const [teamUsers, setTeamUsers] = useState<UserModel[]>([]);

  // Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalForm, setTaskModalForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_at: '',
    assigned_user_id: '',
  });
  const [submittingTask, setSubmittingTask] = useState(false);
  const [taskModalError, setTaskModalError] = useState<string | null>(null);

  // Feedback notifications
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setBannerError(msg);
      setTimeout(() => setBannerError(null), 4000);
    } else {
      setBannerSuccess(msg);
      setTimeout(() => setBannerSuccess(null), 4000);
    }
  };

  // 1. Fetch Sales Intelligence Metrics
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await api.get('/sales-intelligence/metrics');
      if (res.data?.status === 'success') {
        setMetrics(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // 2. Fetch Tasks List
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const params: Record<string, string> = {
        per_page: '100',
      };
      if (taskStatusFilter !== 'all') {
        params.status = taskStatusFilter;
      }
      if (taskPriorityFilter !== 'all') {
        params.priority = taskPriorityFilter;
      }
      if (taskSearch.trim()) {
        params.q = taskSearch.trim();
      }

      const res = await api.get('/tasks', { params });
      if (res.data?.status === 'success') {
        setTasks(res.data.data?.data || res.data.data || []);
        if (res.data.counters) {
          setTaskCounters(res.data.counters);
        }
      }
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [taskStatusFilter, taskPriorityFilter, taskSearch]);

  // 3. Fetch Recommendations Feed
  const fetchRecommendations = useCallback(async () => {
    setLoadingRecommendations(true);
    try {
      const res = await api.get('/sales-intelligence/recommendations');
      if (res.data?.status === 'success') {
        setRecommendations(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoadingRecommendations(false);
    }
  }, []);

  // 4. Fetch Automations List
  const fetchAutomations = useCallback(async () => {
    setLoadingAutomations(true);
    try {
      const res = await api.get('/automations');
      if (res.data?.status === 'success') {
        setAutomations(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load automations:', err);
    } finally {
      setLoadingAutomations(false);
    }
  }, []);

  // 5. Fetch Team Members
  const fetchTeamUsers = useCallback(async () => {
    try {
      const res = await api.get('/conversations/users');
      if (res.data?.status === 'success') {
        setTeamUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load team users:', err);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchTeamUsers();
  }, [fetchMetrics, fetchTeamUsers]);

  useEffect(() => {
    if (activeSubTab === 'tasks') {
      fetchTasks();
    } else if (activeSubTab === 'recommendations') {
      fetchRecommendations();
    } else if (activeSubTab === 'automations') {
      fetchAutomations();
    }
  }, [activeSubTab, fetchTasks, fetchRecommendations, fetchAutomations]);

  // Task Actions
  const handleCompleteTask = async (taskId: number) => {
    try {
      const res = await api.post(`/tasks/${taskId}/complete`);
      if (res.data?.status === 'success') {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data.data : t)));
        showNotification('Task marked as completed.');
        fetchMetrics();
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to complete task.', true);
    }
  };

  const handleSnoozeTask = async (taskId: number, hours: number) => {
    try {
      const res = await api.post(`/tasks/${taskId}/snooze`, { hours });
      if (res.data?.status === 'success') {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data.data : t)));
        showNotification(`Task snoozed for ${hours} hours.`);
        fetchMetrics();
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to snooze task.', true);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to cancel and delete this task?')) return;
    try {
      const res = await api.delete(`/tasks/${taskId}`);
      if (res.data?.status === 'success') {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        showNotification('Task removed successfully.');
        fetchMetrics();
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to delete task.', true);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskModalForm.title.trim()) return;
    setSubmittingTask(true);
    setTaskModalError(null);

    try {
      const payload: Record<string, any> = {
        title: taskModalForm.title.trim(),
        description: taskModalForm.description?.trim() || null,
        priority: taskModalForm.priority,
        due_at: taskModalForm.due_at || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        source: 'manual',
      };
      if (taskModalForm.assigned_user_id) {
        payload.assigned_user_id = parseInt(taskModalForm.assigned_user_id);
      }

      const res = await api.post('/tasks', payload);
      if (res.data?.status === 'success') {
        setTasks((prev) => [res.data.data, ...prev]);
        setShowTaskModal(false);
        setTaskModalForm({
          title: '',
          description: '',
          priority: 'medium',
          due_at: '',
          assigned_user_id: '',
        });
        showNotification('New follow-up task scheduled.');
        fetchMetrics();
      }
    } catch (err: any) {
      setTaskModalError(err.response?.data?.message || 'Failed to schedule task.');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Convert Recommendation to Task
  const handleScheduleFromRecommendation = (rec: SalesRecommendation) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setTaskModalForm({
      title: rec.title,
      description: rec.reason + (rec.suggested_draft_reply ? `\n\nSuggested Draft:\n${rec.suggested_draft_reply}` : ''),
      priority: rec.urgency === 'urgent' ? 'urgent' : rec.urgency === 'high' ? 'high' : 'medium',
      due_at: localIso,
      assigned_user_id: '',
    });
    setShowTaskModal(true);
  };

  // Automations Toggle
  const handleToggleAutomation = async (automationId: number) => {
    try {
      const res = await api.post(`/automations/${automationId}/toggle`);
      if (res.data?.status === 'success') {
        setAutomations((prev) =>
          prev.map((a) => (a.id === automationId ? { ...a, status: res.data.data.status } : a))
        );
        showNotification(res.data.message);
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to toggle rule.', true);
    }
  };

  // Trigger Automations Evaluation
  const handleEvaluateAutomations = async () => {
    setEvaluatingAutomations(true);
    setEvaluationFeedback(null);
    try {
      const res = await api.post('/automations/evaluate');
      if (res.data?.status === 'success') {
        const result = res.data.data || res.data.result || {};
        const rulesCount = result.automations_evaluated ?? result.rules_evaluated ?? 0;
        const tasksCount = result.tasks_created ?? 0;
        const escalatedCount = result.tasks_escalated ?? result.overdue_reconciled ?? 0;
        setEvaluationFeedback(
          `Evaluated ${rulesCount} rules. Created ${tasksCount} tasks, updated ${escalatedCount} follow-ups.`
        );
        showNotification('Automation evaluation cycle complete.');
        fetchAutomations();
        fetchMetrics();
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || err.message || 'Failed to evaluate automations.', true);
    } finally {
      setEvaluatingAutomations(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notifications */}
      {bannerSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{bannerSuccess}</span>
          </div>
          <button onClick={() => setBannerSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {bannerError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{bannerError}</span>
          </div>
          <button onClick={() => setBannerError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#0F9F8F] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Phase 6 — AI Sales Operating System
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight mt-1">
            Sales Intelligence & Follow-up Automation
          </h1>
          <p className="text-xs md:text-sm font-semibold text-[#475569] mt-0.5">
            Identify which leads need attention, explain why, and automate follow-up workflows without unsolicited messaging.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchMetrics();
              if (activeSubTab === 'tasks') fetchTasks();
              if (activeSubTab === 'recommendations') fetchRecommendations();
              if (activeSubTab === 'automations') fetchAutomations();
            }}
            className="p-2.5 bg-white border border-[#CBD5E1] hover:border-[#0F9F8F] text-slate-600 hover:text-[#0F9F8F] rounded-xl transition-all shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(10, 0, 0, 0);
              const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
              setTaskModalForm({
                title: '',
                description: '',
                priority: 'medium',
                due_at: localIso,
                assigned_user_id: '',
              });
              setShowTaskModal(true);
            }}
            className="px-4 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Follow-up Task</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Open Tasks */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            <span>Open Tasks</span>
            <Calendar className="w-4 h-4 text-[#0F9F8F]" />
          </div>
          <div className="text-2xl font-black text-[#0F172A]">
            {loadingMetrics ? '...' : metrics?.open_tasks_count ?? 0}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            Requires agent action
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs space-y-1 bg-rose-50/20">
          <div className="flex items-center justify-between text-xs font-extrabold text-rose-700 uppercase tracking-wider">
            <span>Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">
            {loadingMetrics ? '...' : metrics?.overdue_tasks_count ?? 0}
          </div>
          <div className="text-[11px] font-bold text-rose-600">
            Slipping past due date
          </div>
        </div>

        {/* Due Today */}
        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs space-y-1 bg-amber-50/20">
          <div className="flex items-center justify-between text-xs font-extrabold text-amber-700 uppercase tracking-wider">
            <span>Due Today</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800">
            {loadingMetrics ? '...' : metrics?.due_today_tasks_count ?? 0}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            Targeted for today
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            <span>Completion Rate</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {loadingMetrics ? '...' : `${metrics?.completion_rate_percentage ?? 0}%`}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {metrics?.completed_tasks_count ?? 0} tasks resolved
          </div>
        </div>

        {/* High Priority Leads */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            <span>Hot Leads</span>
            <TrendingUp className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-black text-[#0F172A]">
            {loadingMetrics ? '...' : metrics?.high_priority_leads_count ?? 0}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            Score ≥ 75 or high deal
          </div>
        </div>

        {/* Pipeline Value at Risk */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            <span>Value at Risk</span>
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900">
            {loadingMetrics
              ? '...'
              : `$${Number(metrics?.pipeline_value_at_risk ?? 0).toLocaleString()}`}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            Of ${Number(metrics?.pipeline_value_total ?? 0).toLocaleString()} pipeline
          </div>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-3.5 bg-gradient-to-r from-[#EFF6FF] via-[#F0FDF4] to-[#F8FAFC] border border-[#BFDBFE] rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#2563EB] text-white rounded-lg shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-[#1E3A8A]">Messaging Safety Protocol Active:</span>
            <span className="text-[#334155] font-semibold ml-1.5">
              LeadPilot automations create internal tasks and prepare suggested draft replies only. Real customer WhatsApp messages always require deliberate human approval.
            </span>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Zero Unsolicited Sends
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeSubTab === 'tasks'
                ? 'bg-[#0D2038] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-[#CBD5E1]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Follow-up Task Center</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                activeSubTab === 'tasks' ? 'bg-[#103B52] text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {taskCounters.all}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('recommendations')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeSubTab === 'recommendations'
                ? 'bg-[#0D2038] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-[#CBD5E1]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Sales Recommendations</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                activeSubTab === 'recommendations' ? 'bg-[#103B52] text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {recommendations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('automations')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeSubTab === 'automations'
                ? 'bg-[#0D2038] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-[#CBD5E1]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Automation Rules & Workflows</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                activeSubTab === 'automations' ? 'bg-[#103B52] text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {automations.length}
            </span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TASKS CENTER */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Tasks', count: taskCounters.all },
                  { id: 'overdue', label: 'Overdue', count: taskCounters.overdue },
                  { id: 'due_today', label: 'Due Today', count: taskCounters.due_today },
                  { id: 'upcoming', label: 'Upcoming', count: taskCounters.upcoming },
                  { id: 'completed', label: 'Completed', count: taskCounters.completed },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTaskStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    taskStatusFilter === tab.id
                      ? 'bg-[#0F9F8F] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] opacity-80 font-black">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Right Controls: Priority & Search */}
            <div className="flex items-center gap-2">
              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0F9F8F]"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <div className="relative w-48 xl:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                />
              </div>
            </div>
          </div>

          {/* Tasks List Table / Cards */}
          {loadingTasks ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#CBD5E1]">
              <RefreshCw className="w-6 h-6 text-[#0F9F8F] animate-spin mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-600">Loading follow-up tasks...</div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-[#CBD5E1] space-y-3">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-base font-extrabold text-[#0F172A]">No tasks match this filter</div>
              <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto">
                No follow-up tasks are scheduled under this criteria. Create a new task or run automated evaluations to generate tasks.
              </p>
              <button
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(10, 0, 0, 0);
                  const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                  setTaskModalForm({
                    title: '',
                    description: '',
                    priority: 'medium',
                    due_at: localIso,
                    assigned_user_id: '',
                  });
                  setShowTaskModal(true);
                }}
                className="px-4 py-2 bg-[#0F9F8F] text-white rounded-xl text-xs font-extrabold hover:bg-[#0B897D] transition-colors"
              >
                + Schedule First Task
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-xs divide-y divide-[#CBD5E1]">
              {tasks.map((task) => {
                const isOverdue =
                  task.status === 'overdue' ||
                  (task.status === 'pending' && new Date(task.due_at) < new Date());
                return (
                  <div
                    key={task.id}
                    className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      task.status === 'completed'
                        ? 'bg-slate-50/70 opacity-60'
                        : isOverdue
                        ? 'bg-rose-50/30 hover:bg-rose-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Left: Checkbox + Title + Description */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={task.status === 'completed'}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 shrink-0 transition-colors"
                        title={task.status === 'completed' ? 'Completed' : 'Click to complete'}
                      >
                        {task.status === 'completed' ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-extrabold truncate ${
                              task.status === 'completed' ? 'line-through text-slate-500' : 'text-[#0F172A]'
                            }`}
                          >
                            {task.title}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              task.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : task.priority === 'high'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : task.priority === 'medium'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {task.priority}
                          </span>

                          {task.source === 'automation' && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                              Automated
                            </span>
                          )}

                          {task.source === 'ai_recommendation' && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                              AI Suggested
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs font-semibold text-slate-600 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Associated Contact / Lead context */}
                        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500 pt-0.5">
                          {task.contact && (
                            <span className="flex items-center gap-1 font-mono">
                              <MessageSquare className="w-3 h-3 text-[#0F9F8F]" />
                              {task.contact.phone_number}{' '}
                              {task.contact.first_name ? `(${task.contact.first_name})` : ''}
                            </span>
                          )}
                          {task.assigned_user && (
                            <span>
                              Assigned to:{' '}
                              <strong className="text-slate-700">{task.assigned_user.name}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Due Date + Snooze & Delete Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                      <div className="text-left md:text-right">
                        <div
                          className={`text-xs font-bold flex items-center gap-1 ${
                            isOverdue && task.status !== 'completed'
                              ? 'text-rose-600 font-extrabold'
                              : 'text-slate-700'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {new Date(task.due_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {isOverdue && task.status !== 'completed' && (
                          <span className="text-[10px] font-black text-rose-600 uppercase">
                            Overdue Reminder
                          </span>
                        )}
                      </div>

                      {task.status !== 'completed' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSnoozeTask(task.id, 24)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                            title="Snooze 1 day"
                          >
                            +1d
                          </button>
                          <button
                            onClick={() => handleSnoozeTask(task.id, 72)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                            title="Snooze 3 days"
                          >
                            +3d
                          </button>
                          <button
                            onClick={() => handleSnoozeTask(task.id, 168)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                            title="Snooze 1 week"
                          >
                            +1w
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: AI RECOMMENDATIONS FEED */}
      {activeSubTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[#0F172A]">AI & Rule-Based Sales Signals</h3>
              <p className="text-xs font-semibold text-slate-500">
                Actionable next steps generated from live customer interaction frequency, lead scores, and deal pipeline status.
              </p>
            </div>
            <button
              onClick={fetchRecommendations}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-scan
            </button>
          </div>

          {loadingRecommendations ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#CBD5E1]">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-600">Analyzing lead intelligence...</div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-[#CBD5E1] space-y-2">
              <Sparkles className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-base font-extrabold text-[#0F172A]">All conversations are on track!</div>
              <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto">
                No urgent follow-ups or cold leads requiring immediate intervention at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white border border-[#CBD5E1] hover:border-[#0F9F8F] rounded-2xl p-5 shadow-xs space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                        rec.urgency === 'urgent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : rec.urgency === 'high'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {rec.urgency} Priority
                    </span>

                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-slate-400" />
                      {rec.is_ai_generated ? 'AI-Generated' : 'Rule Logic'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-[#0F172A]">{rec.title}</h4>
                    <p className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">
                      {rec.reason}
                    </p>
                  </div>

                  {/* Context Pill Row */}
                  <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl flex items-center justify-between text-xs font-semibold">
                    <div>
                      <div className="text-[#0F172A] font-bold">{rec.context.contact_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{rec.context.phone_number}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-700 font-extrabold">
                        {rec.context.deal_value ? `$${rec.context.deal_value.toLocaleString()}` : 'CRM Lead'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Score: <strong>{rec.context.lead_score}/100</strong>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Reply Draft */}
                  {rec.suggested_draft_reply && (
                    <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                      <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                        Suggested Draft Reply
                      </div>
                      <p className="text-xs font-medium text-slate-700 italic">
                        "{rec.suggested_draft_reply}"
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => handleScheduleFromRecommendation(rec)}
                      className="flex-1 py-2 bg-[#0F9F8F] hover:bg-[#0B897D] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Schedule Task</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedIntentRecId(expandedIntentRecId === rec.id ? null : rec.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                        expandedIntentRecId === rec.id
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{expandedIntentRecId === rec.id ? 'Hide Intent' : 'AI Intent'}</span>
                    </button>

                    {onNavigateToInbox && (
                      <button
                        onClick={onNavigateToInbox}
                        className="px-3 py-2 bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] rounded-xl text-xs font-extrabold flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#0F9F8F]" />
                        <span>Open Inbox</span>
                      </button>
                    )}
                  </div>

                  {/* Expandable Phase 7 AI Intent & Sentiment Card */}
                  {expandedIntentRecId === rec.id && (
                    <div className="pt-2 animate-in fade-in duration-200">
                      <AIIntentEvaluationCard
                        contactId={rec.contact_id}
                        conversationId={rec.conversation_id || undefined}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: AUTOMATION RULES & WORKFLOWS */}
      {activeSubTab === 'automations' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0F172A]">Follow-up Automation Engine</h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Automatically monitors stalled conversations and leads to schedule follow-up reminders safely.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setEditingAutomation(null);
                  setShowVisualBuilder(true);
                }}
                className="px-4 py-2.5 bg-[#0F9F8F] hover:bg-[#0D877A] text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Visual Workflow Builder</span>
              </button>

              <button
                onClick={handleEvaluateAutomations}
                disabled={evaluatingAutomations}
                className="px-4 py-2.5 bg-[#0D2038] hover:bg-[#103B52] text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {evaluatingAutomations ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#14B8A6]" />
                    <span>Evaluating Rules...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-[#14B8A6] fill-current" />
                    <span>Evaluate Automations Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {evaluationFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{evaluationFeedback}</span>
            </div>
          )}

          {/* Automations List */}
          {loadingAutomations ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#CBD5E1]">
              <RefreshCw className="w-6 h-6 text-[#0F9F8F] animate-spin mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-600">Loading automation workflows...</div>
            </div>
          ) : (
            <div className="space-y-3">
              {automations.map((auto) => (
                <div
                  key={auto.id}
                  className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-400 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-extrabold text-[#0F172A]">{auto.name}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          auto.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {auto.status}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-[#0F9F8F] bg-[#ECFDF5] px-2 py-0.5 rounded">
                        {auto.trigger_type}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-600">
                      {auto.trigger_type === 'inactive_conversation'
                        ? `Triggers when an open conversation receives no reply for ${auto.definition?.inactivity_hours ?? 24} hours.`
                        : auto.trigger_type === 'lead_stage_entered'
                        ? 'Triggers when a CRM lead enters a pipeline stage without an active follow-up scheduled.'
                        : 'Monitors overdue tasks and reconciles reminders.'}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-400 pt-1">
                      <span>Action: <strong>Create Follow-up Task (Internal)</strong></span>
                      <span>Execution count: <strong>{auto.runs_count ?? 0} runs</strong></span>
                      {auto.last_evaluated_at && (
                        <span>
                          Last evaluated:{' '}
                          {new Date(auto.last_evaluated_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingAutomation(auto);
                        setShowVisualBuilder(true);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit Visual Canvas</span>
                    </button>
                    <button
                      onClick={() => handleToggleAutomation(auto.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                        auto.status === 'active'
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {auto.status === 'active' ? 'Disable Rule' : 'Enable Rule'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE FOLLOW-UP TASK                              */}
      {/* ========================================================= */}
      {showTaskModal && (
        <div className="fixed inset-0 z-60 bg-[#0D2038]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#CBD5E1] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0F9F8F]" />
                <h3 className="text-base font-extrabold text-[#0F172A]">Schedule Follow-up Task</h3>
              </div>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {taskModalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold">
                {taskModalError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs font-bold text-[#0F172A]">
              <div>
                <label className="block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call regarding quotation and payment terms"
                  value={taskModalForm.title}
                  onChange={(e) => setTaskModalForm({ ...taskModalForm, title: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                />
              </div>

              <div>
                <label className="block mb-1">Due Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={taskModalForm.due_at}
                  onChange={(e) => setTaskModalForm({ ...taskModalForm, due_at: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Priority</label>
                  <select
                    value={taskModalForm.priority}
                    onChange={(e) => setTaskModalForm({ ...taskModalForm, priority: e.target.value as any })}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Assigned Agent</label>
                  <select
                    value={taskModalForm.assigned_user_id}
                    onChange={(e) => setTaskModalForm({ ...taskModalForm, assigned_user_id: e.target.value })}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                  >
                    <option value="">(Assign to me / Unassigned)</option>
                    {teamUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.id === user?.id ? '(Me)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Context, previous messages, or next action items..."
                  value={taskModalForm.description}
                  onChange={(e) => setTaskModalForm({ ...taskModalForm, description: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border border-[#CBD5E1] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="px-5 py-2 bg-[#0F9F8F] hover:bg-[#0B897D] text-white rounded-lg text-xs font-extrabold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingTask ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <span>Schedule Task</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visual Workflow Builder Modal */}
      {showVisualBuilder && (
        <VisualWorkflowBuilder
          initialRule={editingAutomation || undefined}
          onClose={() => {
            setShowVisualBuilder(false);
            setEditingAutomation(null);
          }}
          onSaved={() => {
            fetchAutomations();
            showNotification('Automation workflow saved successfully');
          }}
        />
      )}
    </div>
  );
};
