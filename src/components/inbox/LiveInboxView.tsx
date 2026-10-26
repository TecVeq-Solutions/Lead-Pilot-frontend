import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  MessageSquare,
  Check,
  CheckCheck,
  Clock,
  User,
  UserCheck,
  Lock,
  Zap,
  Send,
  RefreshCw,
  AlertCircle,
  Phone,
  Mail,
  TrendingUp,
  Tag,
  CheckCircle2,
  RotateCcw,
  Plus,
  Sparkles,
  Shield,
  X,
  SlidersHorizontal,
  Calendar,
  CheckSquare,
  Square,
  Bot,
  Paperclip,
  FileText,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { getEcho, leaveEchoChannel } from '../../services/echo';
import { notifications } from '../../services/notifications';
import type {
  Conversation,
  Message,
  ConversationNote,
  QuickReply,
  User as UserModel,
  Task,
  SalesRecommendation,
  AgentPresence,
} from '../../types';
import { AISmartRepliesTray } from '../ai/AISmartRepliesTray';
import { AIConversationSummaryCard } from '../ai/AIConversationSummaryCard';
import { AIIntentEvaluationCard } from '../ai/AIIntentEvaluationCard';

export const PRESET_TEMPLATES = [
  {
    name: 'lead_follow_up',
    label: 'Lead Follow-up Re-engagement',
    category: 'UTILITY',
    body: 'Hello {{1}}, we are following up on your inquiry with LeadPilot. Please reply to continue our conversation.',
    placeholders: ['Customer Name'],
  },
  {
    name: 'support_ticket_update',
    label: 'Support Ticket Resolution Update',
    category: 'UTILITY',
    body: 'Hello {{1}}, we have an update regarding your request #{{2}}. Please reply if you require further assistance.',
    placeholders: ['Customer Name', 'Ticket #'],
  },
  {
    name: 'appointment_reminder',
    label: 'Scheduled Consultation Reminder',
    category: 'UTILITY',
    body: 'Hi {{1}}, this is a reminder for your upcoming session scheduled for {{2}}. Please let us know if you need to reschedule.',
    placeholders: ['Customer Name', 'Date & Time'],
  },
  {
    name: 'general_reengagement',
    label: 'General Customer Care Check-in',
    category: 'MARKETING',
    body: 'Hi {{1}}, we wanted to check if you still have any questions. Our team is ready to assist you.',
    placeholders: ['Customer Name'],
  },
];

type TabStatus = 'open' | 'snoozed' | 'resolved' | 'all';
type AgentFilter = 'all' | 'me' | 'unassigned' | string;
type ComposerMode = 'reply' | 'note';

interface ConversationCounters {
  open: number;
  snoozed: number;
  resolved: number;
  unread_total: number;
  assigned_to_me: number;
}

export const LiveInboxView: React.FC = () => {
  const { user } = useAuthStore();

  // Conversations State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<TabStatus>('open');
  const [agentFilter, setAgentFilter] = useState<AgentFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counters, setCounters] = useState<ConversationCounters>({
    open: 0,
    snoozed: 0,
    resolved: 0,
    unread_total: 0,
    assigned_to_me: 0,
  });

  // Active Thread State
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<ConversationNote[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  // Composer State
  const [composerMode, setComposerMode] = useState<ComposerMode>('reply');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Quick Replies State
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickRepliesModal, setShowQuickRepliesModal] = useState(false);
  const [showNewQuickReplyModal, setShowNewQuickReplyModal] = useState(false);
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const [newQuickReply, setNewQuickReply] = useState({ title: '', shortcut: '', content: '', category: 'general' });

  // Team Users (for assignment)
  const [teamUsers, setTeamUsers] = useState<UserModel[]>([]);

  // Snooze Dropdown / Modal
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  // Lead Score Recalculating
  const [recalculatingScore, setRecalculatingScore] = useState(false);

  // Phase 7: AI Intelligence State
  const [showAiSmartReplies, setShowAiSmartReplies] = useState(false);

  // Phase 6: AI Sales Intelligence & Follow-up Tasks State
  const [recommendation, setRecommendation] = useState<SalesRecommendation | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_at: '',
    assigned_user_id: '',
  });
  const [submittingTask, setSubmittingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskSuccess, setTaskSuccess] = useState<string | null>(null);

  // Phase 5: Presence, Media & 24h Customer Care Window State
  const [activePresences, setActivePresences] = useState<AgentPresence[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState('lead_follow_up');
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({ 1: '', 2: '' });
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dynamic 24-Hour Meta Customer Care Window Calculation
  const careWindow = React.useMemo(() => {
    if (!selectedConversation) {
      return { is_open: true, remaining_seconds: 86400, remaining_formatted: '24h 00m' };
    }
    if (selectedConversation.customer_window) {
      return {
        ...selectedConversation.customer_window,
        remaining_formatted:
          selectedConversation.customer_window.remaining_formatted ||
          selectedConversation.customer_window.formatted_remaining ||
          '24h 00m',
      };
    }
    if (!selectedConversation.last_inbound_at) {
      return { is_open: true, remaining_seconds: 86400, remaining_formatted: '24h 00m' };
    }
    const lastInbound = new Date(selectedConversation.last_inbound_at).getTime();
    const expiresAt = lastInbound + 24 * 60 * 60 * 1000;
    const diffSec = Math.floor((expiresAt - Date.now()) / 1000);
    if (diffSec <= 0) {
      return { is_open: false, remaining_seconds: 0, remaining_formatted: 'Window Expired' };
    }
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    return {
      is_open: true,
      remaining_seconds: diffSec,
      remaining_formatted: `${hours}h ${minutes}m remaining`,
    };
  }, [selectedConversation?.id, selectedConversation?.last_inbound_at, selectedConversation?.customer_window]);

  // 1. Fetch Organization Team Members
  const fetchTeamUsers = useCallback(async () => {
    try {
      const res = await api.get('/conversations/users');
      if (res.data?.status === 'success') {
        setTeamUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch team users:', err);
    }
  }, []);

  // 2. Fetch Quick Replies
  const fetchQuickReplies = useCallback(async () => {
    try {
      const res = await api.get('/quick-replies');
      if (res.data?.status === 'success') {
        setQuickReplies(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch quick replies:', err);
    }
  }, []);

  // 3. Fetch Conversations List
  const fetchConversations = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setIsRefreshing(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        status: activeTab,
        per_page: '50',
      };

      if (agentFilter !== 'all') {
        params.assigned_to = agentFilter;
      }

      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }

      const res = await api.get('/conversations', { params });

      if (res.data?.status === 'success') {
        setConversations(res.data.data);
        if (res.data.counters) {
          setCounters(res.data.counters);
        }

        // Update selectedConversation if it is in the list
        if (selectedConversation) {
          const updated = res.data.data.find((c: Conversation) => c.id === selectedConversation.id);
          if (updated) {
            setSelectedConversation((prev) => ({ ...prev, ...updated }));
          }
        }
      }
    } catch (err: any) {
      if (!isBackground) {
        setError(err.response?.data?.message || 'Failed to load conversations.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, agentFilter, searchQuery, selectedConversation]);

  // 4. Fetch Full Conversation Details, Messages & Notes
  const fetchThreadData = useCallback(async (conversationId: number) => {
    setLoadingThread(true);
    try {
      const [convRes, msgRes, notesRes] = await Promise.all([
        api.get(`/conversations/${conversationId}`),
        api.get(`/conversations/${conversationId}/messages`),
        api.get(`/conversations/${conversationId}/notes`),
      ]);

      if (convRes.data?.status === 'success') {
        setSelectedConversation(convRes.data.data);
      }

      if (msgRes.data?.status === 'success') {
        setMessages(msgRes.data.data);
      }

      if (notesRes.data?.status === 'success') {
        setNotes(notesRes.data.data);
      }

      // Automatically mark as read if conversation has unread messages
      if (convRes.data?.data?.unread_count > 0) {
        await api.post(`/conversations/${conversationId}/read`);
        setSelectedConversation((prev) => (prev ? { ...prev, unread_count: 0 } : null));
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
        );
        setCounters((prev) => ({ ...prev, unread_total: Math.max(0, prev.unread_total - 1) }));
      }
    } catch (err: any) {
      console.error('Failed to load thread details:', err);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  // Initial Data Load
  useEffect(() => {
    fetchTeamUsers();
    fetchQuickReplies();
    fetchConversations();
  }, [fetchTeamUsers, fetchQuickReplies, activeTab, agentFilter]);

  // Real-time Polling Fallback (every 4 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedConversation) {
        // Poll messages and notes for active conversation
        api.get(`/conversations/${selectedConversation.id}/messages`).then((res) => {
          if (res.data?.status === 'success') {
            setMessages(res.data.data);
          }
        }).catch(() => {});

        api.get(`/conversations/${selectedConversation.id}/notes`).then((res) => {
          if (res.data?.status === 'success') {
            setNotes(res.data.data);
          }
        }).catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchConversations, selectedConversation]);

  // Phase 5: Agent Presence Heartbeat & Collision Monitoring
  useEffect(() => {
    if (!selectedConversation) {
      setActivePresences([]);
      return;
    }

    const sendHeartbeat = () => {
      api.post(`/conversations/${selectedConversation.id}/presence`, { status: 'viewing' }).catch(() => {});
    };

    const fetchPresence = async () => {
      try {
        const res = await api.get(`/conversations/${selectedConversation.id}/presence`);
        if (res.data?.status === 'success') {
          const others = (res.data.data as AgentPresence[]).filter((p) => (p.user_id ?? p.id) !== user?.id);
          setActivePresences(others);
        }
      } catch {}
    };

    sendHeartbeat();
    fetchPresence();
    const presenceInterval = setInterval(() => {
      sendHeartbeat();
      fetchPresence();
    }, 8000);

    return () => clearInterval(presenceInterval);
  }, [selectedConversation?.id, user?.id]);

  // Phase 5: Laravel Echo Real-time WebSocket Listeners
  useEffect(() => {
    if (!user?.organization_id) return;

    notifications.requestPermission();

    const echo = getEcho();
    if (!echo) return;

    const channelName = `organization.${user.organization_id}`;
    const channel = echo.private(channelName);

    channel.listen('.message.received', (event: any) => {
      const incoming: Message = event.message;
      if (!incoming) return;

      // Inbound sound chime and native desktop notification
      if (incoming.direction === 'inbound') {
        const senderName =
          incoming.contact?.first_name ||
          (selectedConversation?.id === incoming.conversation_id ? selectedConversation.contact?.first_name : null) ||
          'WhatsApp Contact';
        const snippet = incoming.payload?.body || incoming.payload?.text?.body || 'New WhatsApp message';
        notifications.notifyInboundMessage(senderName, snippet);
      }

      // If viewing this thread, append message without manual refresh
      if (selectedConversation && incoming.conversation_id === selectedConversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      }

      // Update conversation list & counters
      fetchConversations(true);
    });

    channel.listen('.conversation.assigned', (event: any) => {
      fetchConversations(true);
      const convId = event.conversationId ?? event.conversation_id;
      const assignedId = event.assignedUserId ?? event.assigned_user_id;
      if (selectedConversation && selectedConversation.id === convId) {
        setSelectedConversation((prev) => (prev ? { ...prev, assigned_user_id: assignedId } : null));
      }
    });

    channel.listen('.conversation.note.added', (event: any) => {
      const convId = event.conversationId ?? event.conversation_id ?? event.note?.conversation_id;
      if (selectedConversation && event.note && convId === selectedConversation.id) {
        setNotes((prev) => {
          if (prev.some((n) => n.id === event.note.id)) return prev;
          return [...prev, event.note];
        });
      }
    });

    channel.listen('.message.status.updated', (event: any) => {
      const msgId = event.messageId ?? event.message_id;
      if (selectedConversation) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: event.status } : m))
        );
      }
    });

    return () => {
      leaveEchoChannel(channelName);
    };
  }, [user?.organization_id, selectedConversation?.id, fetchConversations]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, notes, selectedConversation]);

  // Phase 6: Fetch Recommendation & Follow-up Tasks for active conversation
  const fetchRecommendationAndTasks = useCallback(async (conv: Conversation) => {
    if (!conv?.contact_id) return;
    setLoadingRecommendation(true);
    setLoadingTasks(true);

    try {
      const [recRes, tasksRes] = await Promise.allSettled([
        api.get(`/sales-intelligence/contacts/${conv.contact_id}/recommendation`),
        api.get('/tasks', { params: { contact_id: conv.contact_id } }),
      ]);

      if (recRes.status === 'fulfilled' && recRes.value.data?.status === 'success') {
        setRecommendation(recRes.value.data.data);
      } else {
        setRecommendation(null);
      }

      if (tasksRes.status === 'fulfilled' && tasksRes.value.data?.status === 'success') {
        setTasks(tasksRes.value.data.data?.data || tasksRes.value.data.data || []);
      } else {
        setTasks([]);
      }
    } finally {
      setLoadingRecommendation(false);
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchRecommendationAndTasks(selectedConversation);
    } else {
      setRecommendation(null);
      setTasks([]);
    }
  }, [selectedConversation?.id, fetchRecommendationAndTasks]);

  const handleCompleteTask = async (taskId: number) => {
    try {
      const res = await api.post(`/tasks/${taskId}/complete`);
      if (res.data?.status === 'success') {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data.data : t)));
      }
    } catch (err: any) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleSnoozeTask = async (taskId: number, hours: number) => {
    try {
      const res = await api.post(`/tasks/${taskId}/snooze`, { hours });
      if (res.data?.status === 'success') {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data.data : t)));
      }
    } catch (err: any) {
      console.error('Failed to snooze task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !taskForm.title.trim()) return;
    setSubmittingTask(true);
    setTaskError(null);

    try {
      const payload: Record<string, any> = {
        title: taskForm.title.trim(),
        description: taskForm.description?.trim() || null,
        priority: taskForm.priority,
        due_at: taskForm.due_at || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        conversation_id: selectedConversation.id,
        contact_id: selectedConversation.contact_id,
        source: 'manual',
      };
      if (taskForm.assigned_user_id) {
        payload.assigned_user_id = parseInt(taskForm.assigned_user_id);
      }
      if (selectedConversation.contact?.leads && selectedConversation.contact.leads.length > 0) {
        payload.lead_id = selectedConversation.contact.leads[0].id;
      }

      const res = await api.post('/tasks', payload);
      if (res.data?.status === 'success') {
        setTasks((prev) => [res.data.data, ...prev]);
        setShowNewTaskModal(false);
        setTaskForm({
          title: '',
          description: '',
          priority: 'medium',
          due_at: '',
          assigned_user_id: '',
        });
        setTaskSuccess('Follow-up task scheduled successfully.');
        setTimeout(() => setTaskSuccess(null), 3000);
      }
    } catch (err: any) {
      setTaskError(err.response?.data?.message || 'Failed to schedule task.');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleApplyDraft = (draft: string) => {
    setMessageInput(draft);
    setComposerMode('reply');
  };

  const handleOpenTaskFromRecommendation = () => {
    if (!recommendation) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setTaskForm({
      title: recommendation.title,
      description: recommendation.reason + (recommendation.suggested_draft_reply ? `\n\nSuggested Draft:\n${recommendation.suggested_draft_reply}` : ''),
      priority: recommendation.urgency === 'urgent' ? 'urgent' : recommendation.urgency === 'high' ? 'high' : 'medium',
      due_at: localIso,
      assigned_user_id: selectedConversation?.assigned_user_id ? String(selectedConversation.assigned_user_id) : '',
    });
    setShowNewTaskModal(true);
  };

  // Handle Conversation Selection
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchThreadData(conv.id);
  };

  // Outbound Media File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        setComposerError('File size exceeds Meta WhatsApp limit of 25MB.');
        return;
      }
      setSelectedFile(file);
      setComposerError(null);
    }
  };

  // Agent Typing Heartbeat Dispatch
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    if (!selectedConversation) return;

    if (!typingTimeoutRef.current) {
      api.post(`/conversations/${selectedConversation.id}/typing`, { is_typing: true }).catch(() => {});
    } else {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 3000);
  };

  // Send Approved WhatsApp Template (Care Window Fallback)
  const handleSendTemplate = async () => {
    if (!selectedConversation) return;
    setSendingTemplate(true);
    setComposerError(null);
    try {
      const activeTpl = PRESET_TEMPLATES.find((t) => t.name === selectedTemplateName);
      let renderedBody = activeTpl ? activeTpl.body : selectedTemplateName;
      activeTpl?.placeholders.forEach((_, idx) => {
        const val = templateParams[idx + 1] || (idx === 0 ? selectedConversation.contact?.first_name || 'Customer' : '');
        renderedBody = renderedBody.replace(`{{${idx + 1}}}`, val);
      });

      const components =
        activeTpl?.placeholders && activeTpl.placeholders.length > 0
          ? [
              {
                type: 'body',
                parameters: activeTpl.placeholders.map((_, idx) => ({
                  type: 'text',
                  text:
                    templateParams[idx + 1] ||
                    (idx === 0 ? selectedConversation.contact?.first_name || 'Customer' : 'Val'),
                })),
              },
            ]
          : [];

      const res = await api.post(`/conversations/${selectedConversation.id}/messages`, {
        message: renderedBody,
        type: 'template',
        message_type: 'template',
        template_name: selectedTemplateName,
        language: 'en_US',
        components: components,
        metadata: {
          template_name: selectedTemplateName,
          language: 'en_US',
          template_params: templateParams,
          components: components,
        },
      });

      if (res.data?.status === 'success') {
        setMessages((prev) => [...prev, res.data.data]);
        setShowTemplateModal(false);
        fetchConversations(true);
      }
    } catch (err: any) {
      setComposerError(err.response?.data?.message || 'Failed to dispatch template message.');
    } finally {
      setSendingTemplate(false);
    }
  };

  // Send WhatsApp Reply, Outbound Media, or Save Note
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConversation || sending) return;

    // Check 24-hour Meta Customer Care Window
    if (composerMode === 'reply' && !careWindow.is_open) {
      setShowTemplateModal(true);
      return;
    }

    // Handle Outbound Media Upload
    if (composerMode === 'reply' && selectedFile) {
      setSending(true);
      setComposerError(null);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (messageInput.trim()) {
          formData.append('caption', messageInput.trim());
        }
        const res = await api.post(`/conversations/${selectedConversation.id}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data?.status === 'success') {
          setMessages((prev) => [...prev, res.data.data]);
          setMessageInput('');
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          fetchConversations(true);
        }
      } catch (err: any) {
        setComposerError(err.response?.data?.message || 'Failed to upload media message.');
      } finally {
        setSending(false);
      }
      return;
    }

    if (!messageInput.trim()) return;

    setSending(true);
    setComposerError(null);

    try {
      if (composerMode === 'reply') {
        const res = await api.post(`/conversations/${selectedConversation.id}/messages`, {
          message: messageInput.trim(),
        });

        if (res.data?.status === 'success') {
          setMessages((prev) => [...prev, res.data.data]);
          setMessageInput('');
          // Reopen conversation locally if was resolved or snoozed
          setSelectedConversation((prev) => prev ? { ...prev, status: 'open', snoozed_until: null } : null);
          fetchConversations(true);
        }
      } else {
        const res = await api.post(`/conversations/${selectedConversation.id}/notes`, {
          content: messageInput.trim(),
        });

        if (res.data?.status === 'success') {
          setNotes((prev) => [...prev, res.data.data]);
          setMessageInput('');
        }
      }
    } catch (err: any) {
      if (err.response?.data?.error === 'CUSTOMER_WINDOW_EXPIRED') {
        setComposerError('Meta 24-hour customer care window has expired. You must use an approved template.');
        setShowTemplateModal(true);
      } else {
        setComposerError(err.response?.data?.message || 'Failed to dispatch message.');
      }
    } finally {
      setSending(false);
    }
  };

  // Status Change (Resolve, Reopen, Snooze)
  const handleUpdateStatus = async (status: 'open' | 'resolved' | 'snoozed', snoozeHours?: number) => {
    if (!selectedConversation) return;

    try {
      const payload: any = { status };
      if (status === 'snoozed' && snoozeHours) {
        payload.snooze_hours = snoozeHours;
      }

      const res = await api.patch(`/conversations/${selectedConversation.id}/status`, payload);
      if (res.data?.status === 'success') {
        setSelectedConversation(res.data.data);
        setShowSnoozeMenu(false);
        fetchConversations(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update conversation status.');
    }
  };

  // Assign Agent with Concurrency Safeguard & Collision Prevention
  const handleAssignAgent = async (assignedUserId: number | null) => {
    if (!selectedConversation) return;

    try {
      const res = await api.patch(`/conversations/${selectedConversation.id}/assign`, {
        assigned_user_id: assignedUserId,
        current_assigned_user_id: selectedConversation.assigned_user_id ?? null,
        reason: 'Assigned via shared live inbox interface',
      });

      if (res.data?.status === 'success') {
        setSelectedConversation(res.data.data);
        fetchConversations(true);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert('⚠️ Collision detected: This conversation assignment was just updated by another agent. Refreshing latest state.');
        fetchConversations(true);
        fetchThreadData(selectedConversation.id);
      } else {
        alert(err.response?.data?.message || 'Failed to reassign agent.');
      }
    }
  };

  // Recalculate AI Lead Score
  const handleRecalculateScore = async () => {
    if (!selectedConversation?.contact_id) return;
    setRecalculatingScore(true);
    try {
      const res = await api.post(`/contacts/${selectedConversation.contact_id}/recalculate-score`);
      if (res.data?.status === 'success') {
        setSelectedConversation((prev) =>
          prev && prev.contact
            ? { ...prev, contact: { ...prev.contact, lead_score: res.data.data.lead_score } }
            : prev
        );
      }
    } catch (err) {
      console.error('Failed to recalculate score:', err);
    } finally {
      setRecalculatingScore(false);
    }
  };

  // Create Quick Reply
  const handleCreateQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuickReply.title || !newQuickReply.content) return;

    try {
      const res = await api.post('/quick-replies', newQuickReply);
      if (res.data?.status === 'success') {
        setQuickReplies((prev) => [...prev, res.data.data]);
        setNewQuickReply({ title: '', shortcut: '', content: '', category: 'general' });
        setShowNewQuickReplyModal(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create quick reply.');
    }
  };

  // Insert Quick Reply into Composer
  const handleInsertQuickReply = (qr: QuickReply) => {
    setMessageInput((prev) => (prev ? `${prev} ${qr.content}` : qr.content));
    setShowQuickRepliesModal(false);
  };

  // Combine & Sort Messages and Notes chronologically
  const timelineItems = React.useMemo(() => {
    const list: Array<{ type: 'message' | 'note'; data: any; timestamp: string }> = [];

    messages.forEach((m) => {
      list.push({
        type: 'message',
        data: m,
        timestamp: m.created_at || (m.sent_at ?? ''),
      });
    });

    notes.forEach((n) => {
      list.push({
        type: 'note',
        data: n,
        timestamp: n.created_at,
      });
    });

    return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, notes]);

  // Lead score badge color helper
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 45) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#F8FAFC]">

      {/* ========================================================= */}
      {/* COLUMN 1: CONVERSATIONS LIST & FILTERS (~360px)           */}
      {/* ========================================================= */}
      <div className="w-88 xl:w-96 bg-white border-r border-[#CBD5E1] flex flex-col shrink-0 z-10 shadow-xs">

        {/* Top Header & Live Sync Status */}
        <div className="p-4 border-b border-[#CBD5E1] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0F9F8F]/15 text-[#0F9F8F] flex items-center justify-center font-bold">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#0F172A] leading-tight">Live Inbox</h2>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-time Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchConversations()}
                title="Refresh Conversations"
                className={`p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all ${isRefreshing ? 'animate-spin text-[#0F9F8F]' : ''}`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by contact or phone..."
              className="w-full pl-9 pr-8 py-2 bg-[#F1F5F9] border border-transparent focus:border-[#0F9F8F] focus:bg-white rounded-lg text-xs font-semibold text-[#0F172A] placeholder:text-slate-400 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs (Open, Snoozed, Resolved, All) */}
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => setActiveTab('open')}
              className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'open'
                  ? 'bg-white text-[#0F172A] shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Open</span>
              {counters.open > 0 && (
                <span className="px-1.5 py-0.2 bg-[#0F9F8F] text-white rounded-full text-[10px] font-extrabold">
                  {counters.open}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('snoozed')}
              className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'snoozed'
                  ? 'bg-white text-[#0F172A] shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Snoozed</span>
              {counters.snoozed > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-extrabold">
                  {counters.snoozed}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('resolved')}
              className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'resolved'
                  ? 'bg-white text-[#0F172A] shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Resolved</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-[#0F172A] shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All</span>
            </button>
          </div>

          {/* Sub-Filters: Agent Assignment Selector */}
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-0.5">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Assigned:</span>
            </div>
            <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] p-0.5 rounded-md">
              <button
                onClick={() => setAgentFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  agentFilter === 'all' ? 'bg-[#103B52] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setAgentFilter('me')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  agentFilter === 'me' ? 'bg-[#103B52] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mine ({counters.assigned_to_me})
              </button>
              <button
                onClick={() => setAgentFilter('unassigned')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  agentFilter === 'unassigned' ? 'bg-[#103B52] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unassigned
              </button>
            </div>
          </div>
        </div>

        {/* Conversation List Scrollable */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0]">
          {loading && (
            <div className="p-8 text-center text-xs font-bold text-slate-500 space-y-2">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#0F9F8F]" />
              <p>Loading live conversations...</p>
            </div>
          )}

          {!loading && error && (
            <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p>{error}</p>
                <button onClick={() => fetchConversations()} className="underline font-bold mt-1 text-xs">
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && conversations.length === 0 && (
            <div className="p-10 text-center text-xs font-semibold text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="font-extrabold text-slate-700 text-sm">No conversations found</p>
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery ? `No results matching "${searchQuery}"` : `No ${activeTab} conversations right now.`}
                </p>
              </div>
            </div>
          )}

          {!loading &&
            conversations.map((conv) => {
              const isSelected = selectedConversation?.id === conv.id;
              const contactName =
                conv.contact?.first_name || conv.contact?.last_name
                  ? `${conv.contact?.first_name || ''} ${conv.contact?.last_name || ''}`.trim()
                  : conv.contact?.phone_number || 'Unknown Lead';

              const lastMsgBody =
                conv.latest_message?.payload?.body ||
                conv.latest_message?.payload?.text?.body ||
                'No messages yet';

              const timeDisplay = conv.last_message_at
                ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                    isSelected
                      ? 'bg-[#F0FDFA] border-l-4 border-[#0F9F8F]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Contact Avatar with Lead Score indicator */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#0D2038] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                      {contactName.substring(0, 2)}
                    </div>
                    {conv.contact?.lead_score !== undefined && (
                      <span
                        title={`Lead Score: ${conv.contact.lead_score}`}
                        className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black border ${getScoreColor(
                          conv.contact.lead_score
                        )}`}
                      >
                        {conv.contact.lead_score}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate font-extrabold ${
                          conv.unread_count > 0 ? 'text-[#0F172A]' : 'text-slate-800'
                        }`}
                      >
                        {contactName}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        {timeDisplay}
                      </span>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-500 truncate mt-0.5 flex items-center gap-1">
                      {conv.latest_message?.direction === 'outbound' && (
                        <Check className="w-3 h-3 text-[#0F9F8F] shrink-0" />
                      )}
                      <span className="truncate">{lastMsgBody}</span>
                    </div>

                    {/* Meta Tags: Status + Assigned Agent + Unread Badge */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {conv.status === 'snoozed' && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Snoozed
                          </span>
                        )}
                        {conv.status === 'resolved' && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
                          </span>
                        )}

                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[80px]">
                            {conv.assigned_user?.name || 'Unassigned'}
                          </span>
                        </span>
                      </div>

                      {conv.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#0F9F8F] text-white text-[10px] font-black rounded-full shadow-xs">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* COLUMN 2: LIVE MESSAGE THREAD & COMPOSER (FLEX-1)         */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-[#0F172A]">No Conversation Selected</h3>
            <p className="text-xs font-semibold text-slate-500 max-w-sm mt-1">
              Select a WhatsApp conversation from the left to read customer messages, dispatch verified Meta replies, or record team notes.
            </p>
          </div>
        ) : (
          <>
            {/* Thread Header Bar */}
            <div className="h-16 px-6 bg-white border-b border-[#CBD5E1] flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#0D2038] text-white flex items-center justify-center font-bold text-sm uppercase">
                  {(selectedConversation.contact?.first_name || selectedConversation.contact?.phone_number || 'U').substring(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#0F172A] truncate">
                      {selectedConversation.contact?.first_name || selectedConversation.contact?.last_name
                        ? `${selectedConversation.contact?.first_name || ''} ${selectedConversation.contact?.last_name || ''}`.trim()
                        : selectedConversation.contact?.phone_number}
                    </h3>
                    {selectedConversation.status === 'snoozed' && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">
                        Snoozed
                      </span>
                    )}
                    {selectedConversation.status === 'resolved' && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                        Resolved
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                    <span>{selectedConversation.contact?.phone_number}</span>
                    <span>•</span>
                    <span className="text-[#0F9F8F] font-bold">
                      {selectedConversation.phone_number?.display_phone_number || 'WhatsApp Connected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment & Status Controls */}
              <div className="flex items-center gap-2.5">
                {/* 24-Hour Customer Care Window Badge */}
                {careWindow.is_open ? (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold"
                    title="Meta 24-Hour Customer Care Window active. Free-form WhatsApp messages allowed."
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{careWindow.remaining_formatted}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    title="24-Hour Care Window Expired. Click to send an approved WhatsApp Template."
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Window Expired (Use Template)</span>
                  </button>
                )}

                {/* Agent Assignment Dropdown */}
                <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={selectedConversation.assigned_user_id || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      handleAssignAgent(val);
                    }}
                    className="bg-transparent text-xs font-bold text-[#0F172A] focus:outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {teamUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.id === user?.id ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Snooze Presets Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                    className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Snooze</span>
                  </button>

                  {showSnoozeMenu && (
                    <div className="absolute right-0 mt-1 w-44 bg-white border border-[#CBD5E1] rounded-xl shadow-lg z-30 py-1 text-xs font-semibold">
                      <button
                        onClick={() => handleUpdateStatus('snoozed', 1)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>For 1 hour</span>
                        <span className="text-slate-400 text-[10px]">Quick</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('snoozed', 4)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>For 4 hours</span>
                        <span className="text-slate-400 text-[10px]">Afternoon</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('snoozed', 24)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>For 24 hours</span>
                        <span className="text-slate-400 text-[10px]">Tomorrow</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('snoozed', 72)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>For 3 days</span>
                        <span className="text-slate-400 text-[10px]">Follow up</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Toggle (Resolve / Reopen) */}
                {selectedConversation.status === 'resolved' ? (
                  <button
                    onClick={() => handleUpdateStatus('open')}
                    className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#0F9F8F]" />
                    <span>Reopen</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus('resolved')}
                    className="px-3.5 py-1.5 bg-[#ECFDF5] border border-[#A7F3D0] hover:bg-[#D1FAE5] text-[#059669] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                )}
              </div>
            </div>

            {/* Real-time Agent Presence & Collision Shield Bar */}
            {activePresences.length > 0 && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs font-bold text-amber-900 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-700 animate-pulse" />
                  <span>
                    Agent {activePresences.map((p) => p.user_name || p.name).join(', ')}{' '}
                    {activePresences.length > 1 ? 'are' : 'is'} viewing this conversation right now.
                  </span>
                </div>
                <span className="text-[10px] text-amber-700 font-medium bg-amber-100 px-2 py-0.5 rounded">
                  Collision Prevention Active
                </span>
              </div>
            )}

            {/* Scrollable Messages & Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F8FAFC]">
              {loadingThread ? (
                <div className="p-8 text-center text-xs font-bold text-slate-500 space-y-2">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#0F9F8F]" />
                  <p>Loading message history...</p>
                </div>
              ) : timelineItems.length === 0 ? (
                <div className="p-12 text-center text-xs font-semibold text-slate-400">
                  <p className="font-extrabold text-slate-700">No messages in this conversation yet.</p>
                  <p className="mt-1">Send a WhatsApp reply or create an internal team note below.</p>
                </div>
              ) : (
                timelineItems.map((item, idx) => {
                  if (item.type === 'note') {
                    const note: ConversationNote = item.data;
                    return (
                      <div
                        key={`note-${note.id}-${idx}`}
                        className="my-3 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl shadow-2xs max-w-xl mx-auto"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 border-b border-amber-200/60 pb-1.5 mb-2">
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Private Internal Team Note</span>
                          </div>
                          <span className="text-amber-700 font-semibold">
                            {note.user?.name || 'Agent'} • {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-amber-950 whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                    );
                  }

                  const msg: Message = item.data;
                  const isOutbound = msg.direction === 'outbound';
                  const body = msg.payload?.body || msg.payload?.text?.body || '[Rich WhatsApp Content]';
                  const msgTime = msg.sent_at || msg.created_at
                    ? new Date(msg.sent_at || msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={`msg-${msg.id}-${idx}`}
                      className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3.5 rounded-2xl shadow-xs text-xs font-semibold leading-relaxed ${
                          isOutbound
                            ? 'bg-[#0D2038] text-white rounded-tr-xs'
                            : 'bg-white text-[#0F172A] border border-[#CBD5E1] rounded-tl-xs'
                        }`}
                      >
                        {/* Outbound/Inbound Image */}
                        {(msg.message_type === 'image' || msg.metadata?.media_type === 'image' || msg.payload?.image) && (
                          <div className="mb-2 rounded-xl overflow-hidden max-w-sm border border-slate-200/50">
                            <img
                              src={
                                msg.metadata?.media_url ||
                                msg.payload?.image?.url ||
                                msg.payload?.image?.link ||
                                ''
                              }
                              alt="WhatsApp Media"
                              className="w-full max-h-60 object-cover rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                              onClick={() => {
                                const url = msg.metadata?.media_url || msg.payload?.image?.url || msg.payload?.image?.link;
                                if (url) window.open(url, '_blank');
                              }}
                            />
                          </div>
                        )}

                        {/* Outbound/Inbound Document/PDF */}
                        {(msg.message_type === 'document' || msg.metadata?.media_type === 'document' || msg.payload?.document) && (
                          <div
                            className={`mb-2 p-2.5 rounded-xl flex items-center justify-between gap-3 text-xs ${
                              isOutbound ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                              <span className="truncate font-semibold">
                                {msg.metadata?.filename || msg.payload?.document?.filename || 'Document.pdf'}
                              </span>
                            </div>
                            {(msg.metadata?.media_url || msg.payload?.document?.link || msg.payload?.document?.url) && (
                              <a
                                href={msg.metadata?.media_url || msg.payload?.document?.link || msg.payload?.document?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-[11px] font-bold underline shrink-0 ${
                                  isOutbound ? 'text-teal-300' : 'text-blue-600'
                                }`}
                              >
                                View
                              </a>
                            )}
                          </div>
                        )}

                        {/* Outbound/Inbound Audio */}
                        {(msg.message_type === 'audio' || msg.metadata?.media_type === 'audio' || msg.payload?.audio) && (
                          <div className="mb-2">
                            <audio
                              controls
                              className="w-full max-w-xs"
                              src={msg.metadata?.media_url || msg.payload?.audio?.link || msg.payload?.audio?.url || ''}
                            />
                          </div>
                        )}

                        {/* Template Tag if template message */}
                        {msg.message_type === 'template' && (
                          <div className="mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300">
                            <Sparkles className="w-3 h-3 text-teal-300" />
                            <span>Meta Template</span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap">{body}</p>

                        <div
                          className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] ${
                            isOutbound ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          <span>{msgTime}</span>
                          {isOutbound && (
                            <>
                              {msg.status === 'failed' ? (
                                <span title={msg.failure_reason || 'Send failed'} className="text-rose-400 flex items-center gap-0.5">
                                  <AlertCircle className="w-3 h-3 text-rose-400" />
                                  <span>Failed</span>
                                </span>
                              ) : msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#14B8A6]" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-300" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer Footer Box */}
            <div className="p-4 bg-white border-t border-[#CBD5E1] space-y-3">
              {composerError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{composerError}</span>
                  </div>
                  <button onClick={() => setComposerError(null)} className="text-rose-500 hover:text-rose-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Composer Controls: Toggle Reply vs Note & Quick Replies Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setComposerMode('reply')}
                    className={`py-1 px-3 rounded-md flex items-center gap-1.5 transition-all ${
                      composerMode === 'reply'
                        ? 'bg-white text-[#0F172A] shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#0F9F8F]" />
                    <span>WhatsApp Reply</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposerMode('note')}
                    className={`py-1 px-3 rounded-md flex items-center gap-1.5 transition-all ${
                      composerMode === 'note'
                        ? 'bg-amber-100 text-amber-900 shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Internal Note</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,application/pdf,audio/*,video/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!careWindow.is_open && composerMode === 'reply'}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                    <span>Attach Media</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQuickRepliesModal(true)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick Replies</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAiSmartReplies((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                      showAiSmartReplies
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60'
                    }`}
                    title="Toggle AI Smart Reply Assistant"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Smart Reply</span>
                  </button>
                </div>
              </div>

              {/* Selected Outbound Media Chip */}
              {selectedFile && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs font-bold text-blue-900">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    <span className="truncate max-w-xs">{selectedFile.name}</span>
                    <span className="text-[10px] text-blue-600 font-mono">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-blue-500 hover:text-blue-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Phase 7: AI Smart Replies Tray */}
              {selectedConversation && (
                <AISmartRepliesTray
                  conversationId={selectedConversation.id}
                  isOpen={showAiSmartReplies}
                  onClose={() => setShowAiSmartReplies(false)}
                  onApplyDraft={(draft) => {
                    handleApplyDraft(draft);
                  }}
                />
              )}

              {/* 24h Customer Care Window Expired Notice & Action */}
              {composerMode === 'reply' && !careWindow.is_open && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Meta 24-Hour Customer Care Window Expired</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    Meta WhatsApp Cloud API policy restricts free-form customer replies once 24 hours have elapsed without inbound contact. You must re-engage using an approved WhatsApp template.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="px-4 py-2 bg-[#0D2038] hover:bg-[#103B52] text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>Choose & Send Approved WhatsApp Template</span>
                  </button>
                </div>
              )}

              {/* Input Text Area Form */}
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="relative">
                  <textarea
                    value={messageInput}
                    onChange={handleTextareaChange}
                    disabled={composerMode === 'reply' && !careWindow.is_open}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      composerMode === 'reply'
                        ? !careWindow.is_open
                          ? 'Customer care window expired. Use "Send Approved WhatsApp Template" above.'
                          : selectedFile
                          ? 'Add optional caption for attachment... (Press Enter to send)'
                          : 'Type a verified WhatsApp reply... (Press Enter to send)'
                        : 'Write a private note for your team... (Never sent to WhatsApp)'
                    }
                    rows={3}
                    maxLength={4096}
                    className={`w-full p-3 rounded-xl border text-xs font-semibold placeholder:text-slate-400 focus:outline-none transition-all resize-none disabled:bg-slate-100 disabled:text-slate-400 ${
                      composerMode === 'note'
                        ? 'bg-amber-50/50 border-amber-200 focus:border-amber-500 text-amber-950'
                        : 'bg-[#F8FAFC] border-[#CBD5E1] focus:border-[#0F9F8F] focus:bg-white text-[#0F172A]'
                    }`}
                  />

                  <div className="absolute right-3 bottom-3 flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-400">
                      {messageInput.length}/4096
                    </span>

                    <button
                      type="submit"
                      disabled={
                        (!messageInput.trim() && !selectedFile) ||
                        sending ||
                        (composerMode === 'reply' && !careWindow.is_open)
                      }
                      className={`px-4 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all ${
                        composerMode === 'note'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white disabled:bg-amber-300'
                          : 'bg-[#0F9F8F] hover:bg-[#0B897D] text-white disabled:bg-slate-300'
                      }`}
                    >
                      {sending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : composerMode === 'note' ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Save Note</span>
                        </>
                      ) : selectedFile ? (
                        <>
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Send Media</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* COLUMN 3: CUSTOMER CRM CONTEXT SIDEBAR (~320px)           */}
      {/* ========================================================= */}
      {selectedConversation && (
        <div className="w-80 xl:w-88 bg-white border-l border-[#CBD5E1] overflow-y-auto p-5 space-y-5 shrink-0 shadow-xs">
          {/* Customer Profile Card */}
          <div className="text-center pb-4 border-b border-[#E2E8F0] space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#0D2038] text-white text-lg font-black flex items-center justify-center mx-auto shadow-sm">
              {(selectedConversation.contact?.first_name || selectedConversation.contact?.phone_number || 'C').substring(0, 2)}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#0F172A]">
                {selectedConversation.contact?.first_name || selectedConversation.contact?.last_name
                  ? `${selectedConversation.contact?.first_name || ''} ${selectedConversation.contact?.last_name || ''}`.trim()
                  : 'WhatsApp Contact'}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {selectedConversation.contact?.phone_number}
              </p>
            </div>
          </div>

          {/* Explainable AI Lead Score Card */}
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#0F172A] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#0F9F8F]" /> AI Lead Score
              </span>
              <button
                onClick={handleRecalculateScore}
                disabled={recalculatingScore}
                className="text-[11px] font-bold text-[#0F9F8F] hover:underline disabled:opacity-50"
              >
                {recalculatingScore ? 'Calculating...' : 'Recalculate'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl border flex items-center justify-center font-black text-lg ${getScoreColor(
                  selectedConversation.contact?.lead_score ?? 50
                )}`}
              >
                {selectedConversation.contact?.lead_score ?? 50}
              </div>
              <div>
                <div className="text-xs font-extrabold text-[#0F172A]">
                  {(selectedConversation.contact?.lead_score ?? 50) >= 75
                    ? 'High Intent Lead'
                    : (selectedConversation.contact?.lead_score ?? 50) >= 45
                    ? 'Warm Pipeline Lead'
                    : 'Cold / Unqualified'}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  Calculated from inbound WhatsApp interactions & engagement.
                </div>
              </div>
            </div>
          </div>

          {/* Phase 6: Explainable AI Sales Recommendation */}
          <div className="bg-gradient-to-br from-[#F0FDF4] via-[#F8FAFC] to-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#0F172A] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Sales Intelligence
              </span>
              {recommendation && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                  recommendation.urgency === 'urgent'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : recommendation.urgency === 'high'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {recommendation.urgency.toUpperCase()}
                </span>
              )}
            </div>

            {loadingRecommendation ? (
              <div className="py-4 text-center">
                <RefreshCw className="w-4 h-4 text-slate-400 animate-spin mx-auto mb-1" />
                <span className="text-[11px] font-semibold text-slate-400">Analyzing conversation signals...</span>
              </div>
            ) : recommendation ? (
              <div className="space-y-2.5">
                <div>
                  <div className="text-xs font-black text-[#0F172A]">{recommendation.title}</div>
                  <p className="text-[11px] font-semibold text-slate-600 mt-1 leading-relaxed">
                    {recommendation.reason}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <Bot className="w-3.5 h-3.5 text-slate-400" />
                  <span>{recommendation.is_ai_generated ? 'AI-Generated Action' : 'Deterministic Rule Engine'}</span>
                </div>

                {recommendation.suggested_draft_reply && (
                  <div className="p-2.5 bg-white border border-[#CBD5E1] rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <span>Suggested Reply</span>
                      <button
                        type="button"
                        onClick={() => handleApplyDraft(recommendation.suggested_draft_reply!)}
                        className="text-[#0F9F8F] hover:underline flex items-center gap-0.5 font-bold"
                      >
                        <Send className="w-2.5 h-2.5" /> Use Draft
                      </button>
                    </div>
                    <p className="text-xs font-medium text-slate-700 italic">
                      "{recommendation.suggested_draft_reply}"
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleOpenTaskFromRecommendation}
                  className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 border border-[#CBD5E1] hover:border-[#0F9F8F] text-[#0F172A] rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#0F9F8F]" />
                  <span>Schedule Follow-up Task</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-semibold italic py-1">
                No immediate action required for this contact.
              </div>
            )}
          </div>

          {/* Phase 7: AI Intent & Sentiment Evaluation */}
          <AIIntentEvaluationCard
            conversationId={selectedConversation.id}
            contactId={selectedConversation.contact_id}
          />

          {/* Phase 7: AI Multi-turn Conversation Summary */}
          <AIConversationSummaryCard
            conversationId={selectedConversation.id}
            onApplyDraft={handleApplyDraft}
          />

          {/* Phase 6: Follow-up Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0F9F8F]" /> Follow-up Tasks ({tasks.filter(t => t.status !== 'completed').length})
              </h4>
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(10, 0, 0, 0);
                  const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                  setTaskForm({
                    title: '',
                    description: '',
                    priority: 'medium',
                    due_at: localIso,
                    assigned_user_id: selectedConversation.assigned_user_id ? String(selectedConversation.assigned_user_id) : '',
                  });
                  setShowNewTaskModal(true);
                }}
                className="text-[11px] font-extrabold text-[#0F9F8F] hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add Task
              </button>
            </div>

            {taskSuccess && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold">
                {taskSuccess}
              </div>
            )}

            {loadingTasks ? (
              <div className="py-3 text-center">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin mx-auto mb-1" />
                <span className="text-[11px] font-semibold text-slate-400">Loading tasks...</span>
              </div>
            ) : tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task) => {
                  const isOverdue = task.status === 'overdue' || (task.status === 'pending' && new Date(task.due_at) < new Date());
                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                        task.status === 'completed'
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : isOverdue
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-[#F8FAFC] border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleCompleteTask(task.id)}
                            disabled={task.status === 'completed'}
                            className="mt-0.5 text-slate-400 hover:text-emerald-600 shrink-0"
                            title={task.status === 'completed' ? 'Completed' : 'Mark completed'}
                          >
                            {task.status === 'completed' ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`font-extrabold truncate ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-[#0F172A]'}`}>
                              {task.title}
                            </div>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                          task.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : task.priority === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-1 border-t border-slate-200/60">
                        <span className={`flex items-center gap-1 ${isOverdue && task.status !== 'completed' ? 'text-rose-600 font-extrabold' : ''}`}>
                          <Clock className="w-3 h-3" />
                          {new Date(task.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {isOverdue && task.status !== 'completed' && ' (Overdue)'}
                        </span>

                        {task.status !== 'completed' && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSnoozeTask(task.id, 24)}
                              className="text-[10px] font-bold text-slate-500 hover:text-[#0F9F8F] px-1.5 py-0.5 rounded hover:bg-slate-200/60 transition-colors"
                              title="Snooze 1 day"
                            >
                              +1d
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSnoozeTask(task.id, 72)}
                              className="text-[10px] font-bold text-slate-500 hover:text-[#0F9F8F] px-1.5 py-0.5 rounded hover:bg-slate-200/60 transition-colors"
                              title="Snooze 3 days"
                            >
                              +3d
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSnoozeTask(task.id, 168)}
                              className="text-[10px] font-bold text-slate-500 hover:text-[#0F9F8F] px-1.5 py-0.5 rounded hover:bg-slate-200/60 transition-colors"
                              title="Snooze 1 week"
                            >
                              +1w
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-xl text-center text-xs text-slate-500 font-semibold">
                No follow-up tasks scheduled yet.
              </div>
            )}
          </div>

          {/* CRM Pipeline & Deals */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#0F9F8F]" /> Active Deals & Pipeline
            </h4>

            {selectedConversation.contact?.leads && selectedConversation.contact.leads.length > 0 ? (
              <div className="space-y-2">
                {selectedConversation.contact.leads.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-1.5 text-xs"
                  >
                    <div className="font-extrabold text-[#0F172A]">{deal.title}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span>{deal.pipeline?.name || 'Sales Funnel'}</span>
                      <span className="font-bold text-emerald-700">
                        ${Number(deal.deal_value || 0).toLocaleString()}
                      </span>
                    </div>
                    {deal.pipeline_stage && (
                      <div className="inline-block px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded text-[10px] font-bold">
                        Stage: {deal.pipeline_stage.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-xl text-center text-xs text-slate-500 font-semibold">
                No active CRM deals linked yet.
              </div>
            )}
          </div>

          {/* Contact Details List */}
          <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0]">
            <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
              Contact Attributes
            </h4>

            <div className="space-y-2 text-xs font-semibold">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone:
                </span>
                <span className="text-[#0F172A] font-mono">
                  {selectedConversation.contact?.phone_number}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email:
                </span>
                <span className="text-[#0F172A] truncate max-w-[140px]">
                  {selectedConversation.contact?.email || 'None'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold capitalize text-slate-700">
                  {selectedConversation.contact?.status || 'subscribed'}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#0F9F8F]" /> Tags
            </h4>

            <div className="flex flex-wrap gap-1.5">
              {selectedConversation.contact?.tags && selectedConversation.contact.tags.length > 0 ? (
                selectedConversation.contact.tags.map((t) => (
                  <span
                    key={t.id}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold"
                  >
                    #{t.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 font-semibold italic">No tags assigned</span>
              )}
            </div>
          </div>

          {/* Security & Isolation Pill */}
          <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-center gap-2.5 text-xs text-[#059669] font-bold">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Strict Tenant Isolated Inbox</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: QUICK REPLIES SELECTOR                             */}
      {/* ========================================================= */}
      {showQuickRepliesModal && (
        <div className="fixed inset-0 z-50 bg-[#0D2038]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#CBD5E1] shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-[#CBD5E1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-[#0F172A]">Canned Quick Replies</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewQuickReplyModal(true)}
                  className="px-3 py-1 bg-[#0F9F8F] hover:bg-[#0B897D] text-white rounded-lg text-xs font-extrabold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Template</span>
                </button>
                <button
                  onClick={() => setShowQuickRepliesModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="p-3 bg-slate-50 border-b border-[#CBD5E1]">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quickReplySearch}
                  onChange={(e) => setQuickReplySearch(e.target.value)}
                  placeholder="Filter by title or shortcut..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                />
              </div>
            </div>

            {/* Quick Replies List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {quickReplies
                .filter(
                  (qr) =>
                    qr.title.toLowerCase().includes(quickReplySearch.toLowerCase()) ||
                    (qr.shortcut && qr.shortcut.toLowerCase().includes(quickReplySearch.toLowerCase()))
                )
                .map((qr) => (
                  <div
                    key={qr.id}
                    onClick={() => handleInsertQuickReply(qr)}
                    className="p-3 bg-[#F8FAFC] hover:bg-[#F0FDFA] border border-[#CBD5E1] hover:border-[#0F9F8F] rounded-xl cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-[#0F172A]">{qr.title}</h4>
                      {qr.shortcut && (
                        <span className="font-mono text-[10px] font-bold text-[#0F9F8F] bg-[#ECFDF5] px-2 py-0.5 rounded">
                          /{qr.shortcut}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600 line-clamp-2">{qr.content}</p>
                  </div>
                ))}

              {quickReplies.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 font-semibold">
                  No quick replies configured yet. Click "New Template" above to create one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE NEW QUICK REPLY                             */}
      {/* ========================================================= */}
      {showNewQuickReplyModal && (
        <div className="fixed inset-0 z-60 bg-[#0D2038]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#CBD5E1] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-[#0F172A]">New Quick Reply Template</h3>
              <button onClick={() => setShowNewQuickReplyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickReply} className="space-y-3.5 text-xs font-bold text-[#0F172A]">
              <div>
                <label className="block mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Greeting & Welcome"
                  value={newQuickReply.title}
                  onChange={(e) => setNewQuickReply({ ...newQuickReply, title: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                />
              </div>

              <div>
                <label className="block mb-1">Shortcut (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. welcome"
                  value={newQuickReply.shortcut}
                  onChange={(e) => setNewQuickReply({ ...newQuickReply, shortcut: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                />
              </div>

              <div>
                <label className="block mb-1">Canned Message Content *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter the template text to insert into conversation..."
                  value={newQuickReply.content}
                  onChange={(e) => setNewQuickReply({ ...newQuickReply, content: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewQuickReplyModal(false)}
                  className="px-4 py-2 border border-[#CBD5E1] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F9F8F] hover:bg-[#0B897D] text-white rounded-lg text-xs font-extrabold shadow-sm"
                >
                  Save Quick Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SCHEDULE FOLLOW-UP TASK                            */}
      {/* ========================================================= */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-60 bg-[#0D2038]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#CBD5E1] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0F9F8F]" />
                <h3 className="text-base font-extrabold text-[#0F172A]">Schedule Follow-up Task</h3>
              </div>
              <button onClick={() => setShowNewTaskModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {taskError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold">
                {taskError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs font-bold text-[#0F172A]">
              <div>
                <label className="block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up regarding demo quotation"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                />
              </div>

              <div>
                <label className="block mb-1">Due Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={taskForm.due_at}
                  onChange={(e) => setTaskForm({ ...taskForm, due_at: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
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
                    value={taskForm.assigned_user_id}
                    onChange={(e) => setTaskForm({ ...taskForm, assigned_user_id: e.target.value })}
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
                  placeholder="Add context, previous discussion points, or next steps..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
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

      {/* ========================================================= */}
      {/* MODAL: APPROVED WHATSAPP TEMPLATE PICKER                  */}
      {/* ========================================================= */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-60 bg-[#0D2038]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#CBD5E1] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">Send Meta Approved Template</h3>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Required when the 24-hour customer service window has expired
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Approved WhatsApp Template
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {PRESET_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.name}
                      onClick={() => setSelectedTemplateName(tpl.name)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedTemplateName === tpl.name
                          ? 'border-[#0F9F8F] bg-[#ECFDF5]/60 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[#0F172A]">{tpl.label}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] italic">{tpl.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Template Parameters Input */}
              {(() => {
                const activeTpl = PRESET_TEMPLATES.find((t) => t.name === selectedTemplateName);
                if (!activeTpl || activeTpl.placeholders.length === 0) return null;

                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Template Variables
                    </span>
                    {activeTpl.placeholders.map((ph, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500 w-28 shrink-0">
                          {`{{${idx + 1}}}`} ({ph}):
                        </span>
                        <input
                          type="text"
                          value={templateParams[idx + 1] || ''}
                          onChange={(e) =>
                            setTemplateParams((prev) => ({ ...prev, [idx + 1]: e.target.value }))
                          }
                          placeholder={
                            idx === 0
                              ? selectedConversation?.contact?.first_name || 'Customer Name'
                              : 'Enter value'
                          }
                          className="flex-1 p-2 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F9F8F]"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 border border-[#CBD5E1] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTemplate}
                disabled={sendingTemplate}
                className="px-5 py-2 bg-[#0F9F8F] hover:bg-[#0B897D] text-white rounded-lg text-xs font-extrabold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {sendingTemplate ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Template...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Approved Template</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
