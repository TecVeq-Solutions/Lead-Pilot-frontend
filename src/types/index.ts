export interface User {
  id: number;
  organization_id: number;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  permissions?: string[];
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
}

export interface ContactTag {
  id: number;
  name: string;
  color?: string;
}

export interface LeadDeal {
  id: number;
  title: string;
  deal_value: number;
  status: string;
  pipeline?: {
    id: number;
    name: string;
  };
  pipeline_stage?: {
    id: number;
    name: string;
  };
}

export interface Contact {
  id: number;
  organization_id: number;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  lead_score: number;
  status: string;
  custom_attributes?: Record<string, any>;
  tags?: ContactTag[];
  leads?: LeadDeal[];
}

export interface Message {
  id: number;
  organization_id: number;
  conversation_id: number;
  wamid: string;
  direction: 'inbound' | 'outbound';
  type: string;
  payload: any;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  failure_reason?: string | null;
  sent_at?: string | null;
  created_at: string;
  contact?: Contact | null;
  message_type?: string;
  metadata?: Record<string, any> | null;
}

export interface ConversationNote {
  id: number;
  conversation_id: number;
  user_id: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  content: string;
  created_at: string;
}

export interface QuickReply {
  id: number;
  organization_id: number;
  user_id?: number | null;
  title: string;
  shortcut?: string | null;
  content: string;
  category: string;
  created_at?: string;
}

export interface CustomerCareWindow {
  is_open: boolean;
  last_inbound_at: string | null;
  expires_at: string | null;
  remaining_seconds: number;
  formatted_remaining: string;
  remaining_formatted?: string;
}

export interface AgentPresence {
  id: number;
  user_id?: number;
  name: string;
  user_name?: string;
  email: string;
  action: 'viewing' | 'typing' | string;
  timestamp: number;
}

export interface WhatsAppTemplate {
  id: number;
  name: string;
  language: string;
  category: string;
  status: string;
  components?: Array<{
    type: string;
    text?: string;
    format?: string;
    buttons?: any[];
  }>;
}

export interface Task {
  id: number;
  organization_id: number;
  contact_id?: number | null;
  lead_id?: number | null;
  conversation_id?: number | null;
  assigned_user_id?: number | null;
  completed_by_user_id?: number | null;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'manual' | 'automation' | 'ai_recommendation' | string;
  status: 'pending' | 'completed' | 'cancelled' | 'overdue';
  due_at: string;
  completed_at?: string | null;
  snoozed_until?: string | null;
  created_at: string;
  updated_at: string;
  assigned_user?: User | null;
  completed_by?: User | null;
  contact?: Contact | null;
  lead?: LeadDeal | null;
  conversation?: Conversation | null;
}

export interface SalesRecommendation {
  id: string;
  contact_id: number;
  lead_id?: number | null;
  conversation_id?: number | null;
  action_type: 'reply_inquiry' | 'follow_up_interested' | 'review_proposal' | 'reengage_inactive' | 'prioritize_deal';
  title: string;
  reason: string;
  urgency: 'urgent' | 'high' | 'medium';
  is_ai_generated: boolean;
  suggested_draft_reply?: string | null;
  context: {
    contact_name: string;
    phone_number: string;
    lead_score: number;
    pipeline_stage?: string | null;
    deal_value?: number;
    last_contact_at?: string | null;
    has_pending_task?: boolean;
  };
}

export interface AutomationRule {
  id: number;
  organization_id: number;
  name: string;
  trigger_type: string;
  definition: Record<string, any>;
  visual_layout?: {
    nodes: any[];
    edges: any[];
    viewport?: any;
  } | null;
  status: 'active' | 'inactive' | 'draft';
  last_evaluated_at?: string | null;
  runs_count?: number;
  created_at: string;
}

export interface SalesIntelligenceMetrics {
  open_tasks_count: number;
  overdue_tasks_count: number;
  due_today_tasks_count: number;
  completed_tasks_count: number;
  completion_rate_percentage: number;
  high_priority_leads_count: number;
  pipeline_value_total: number;
  pipeline_value_at_risk: number;
}

export interface Conversation {
  id: number;
  organization_id: number;
  contact_id: number;
  whatsapp_phone_number_id: number;
  assigned_user_id: number | null;
  status: 'open' | 'resolved' | 'snoozed' | 'closed';
  unread_count: number;
  last_message_at: string | null;
  last_inbound_at?: string | null;
  customer_window?: CustomerCareWindow;
  snoozed_until?: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  assigned_user?: User | null;
  phone_number?: {
    id: number;
    phone_number_id: string;
    display_phone_number: string;
    verified_name?: string;
  };
  latest_message?: Message | null;
  notes?: ConversationNote[];
  tasks?: Task[];
}

export interface AuthResponse {
  status: string;
  token: string;
  user: User;
  organization: Organization;
}

// Phase 7: AI Sales Intelligence Types
export interface AISmartReplyData {
  conversation_id: number;
  suggestions: string[];
  tone?: string;
  provider: string;
  model: string;
  is_fallback: boolean;
  is_ai_generated: boolean;
}

export interface AIConversationSummaryData {
  conversation_id: number;
  customer_need: string;
  key_objections: string[];
  recommended_next_action: string;
  summary: string;
  provider: string;
  model: string;
  is_fallback: boolean;
  is_ai_generated: boolean;
}

export interface AIEvaluateIntentData {
  contact_id: number;
  conversation_id?: number | null;
  intent: string;
  sentiment: 'positive' | 'neutral' | 'hesitant' | 'churn_risk' | string;
  buyer_readiness: 'hot' | 'warm' | 'cold' | 'qualified' | string;
  confidence_score: number;
  explanation: string;
  provider: string;
  model: string;
  is_fallback: boolean;
  is_ai_generated: boolean;
}

export interface AICampaignCopyVariation {
  id: number;
  title: string;
  body: string;
  call_to_action: string;
}

export interface AICampaignCopyData {
  industry: string;
  goal: string;
  audience: string;
  tone?: string;
  variations: AICampaignCopyVariation[];
  provider: string;
  model: string;
  is_fallback: boolean;
  is_ai_generated: boolean;
}

// Phase 8: SaaS Billing & Subscription Management Types
export interface BillingPlanQuotas {
  max_contacts: number;
  max_users: number;
  max_waba_accounts: number;
  max_campaigns_per_month: number;
  max_ai_requests_per_month: number;
  max_ai_tokens_per_month: number;
}

export interface BillingPlan {
  id: number;
  name: string;
  slug: string;
  tier: number;
  monthly_price_usd: number;
  quotas: BillingPlanQuotas;
  features?: string[];
  is_active?: boolean;
}

export interface SubscriptionResourceUsage {
  used: number;
  limit: number;
  is_unlimited: boolean;
}

export interface SubscriptionOverviewData {
  mode?: string;
  is_simulated?: boolean;
  gateway?: string;
  subscription: {
    id: number;
    organization_id: number;
    status: 'active' | 'trialing' | 'past_due' | 'cancelled' | string;
    gateway?: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    is_active: boolean;
    is_trialing: boolean;
    is_cancelled: boolean;
    is_past_due: boolean;
    is_expired: boolean;
    on_grace_period: boolean;
    cancel_at_period_end: boolean;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_ends_at: string | null;
    cancellation_requested_at: string | null;
    cancelled_at: string | null;
    payment_method: string | null;
    last_payment_status: string | null;
  };
  plan: BillingPlan | null;
  usage: {
    contacts: SubscriptionResourceUsage;
    users: SubscriptionResourceUsage;
    waba_accounts: SubscriptionResourceUsage;
    campaigns_monthly: SubscriptionResourceUsage;
    ai_requests_monthly: SubscriptionResourceUsage;
    ai_tokens_monthly: SubscriptionResourceUsage;
  };
  period: {
    start: string;
    end: string;
  } | null;
}
