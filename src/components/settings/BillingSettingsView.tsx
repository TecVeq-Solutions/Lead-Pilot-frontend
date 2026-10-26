import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type {
  BillingPlan,
  SubscriptionOverviewData,
} from '../../types';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Users,
  MessageSquare,
  Megaphone,
  Bot,
  Zap,
  Shield,
  ArrowRight,
  XCircle,
  Calendar,
  Info,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export const BillingSettingsView: React.FC = () => {
  const { user, organization } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [overview, setOverview] = useState<SubscriptionOverviewData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal States
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<BillingPlan | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingImmediate, setCancellingImmediate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [testDeclineCard, setTestDeclineCard] = useState(false);

  // RBAC owner check
  const isOwner =
    user?.role === 'org_owner' ||
    user?.role === 'owner' ||
    user?.role === 'super_admin' ||
    Boolean(user?.permissions?.includes('billing.manage'));

  const fetchBillingData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get('/plans'),
        api.get('/subscription'),
      ]);

      if (plansRes.data?.data) {
        setPlans(plansRes.data.data);
      }
      if (subRes.data?.data) {
        setOverview(subRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load billing data:', err);
      if (err.response?.status === 403) {
        setErrorMsg('You do not have permission to view billing information for this organization.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to connect to billing service. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isStripeActive = overview?.is_simulated === false || overview?.gateway === 'stripe';

  useEffect(() => {
    // Check for Stripe Checkout return parameters
    const searchParams = new URLSearchParams(window.location.search);
    const checkoutStatus = searchParams.get('status');

    if (checkoutStatus === 'success') {
      setSuccessMsg('Stripe Checkout session completed. Your subscription status is being confirmed via secure webhook synchronization.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (checkoutStatus === 'cancelled') {
      setErrorMsg('Stripe Checkout was cancelled. No charges were made.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchBillingData();
  }, []);

  const handleInitiateUpgrade = async (plan: BillingPlan) => {
    if (isStripeActive) {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg('Initializing Stripe Secure Checkout...');

      try {
        const res = await api.post('/billing/checkout-session', {
          plan_slug: plan.slug,
        });

        const checkoutUrl = res.data?.data?.checkout_url || res.data?.checkout_url;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }

        setErrorMsg('Unable to retrieve Stripe Checkout URL. Please try again.');
      } catch (err: any) {
        console.error('Checkout error:', err);
        setErrorMsg(err.response?.data?.message || 'Failed to initiate Stripe Checkout.');
      } finally {
        setActionLoading(false);
      }
    } else {
      setSelectedPlanForCheckout(plan);
    }
  };

  const handleSubscribe = async (plan: BillingPlan, simulateFailure = false) => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        plan_slug: plan.slug,
        payment_method: 'simulated_card',
      };

      if (simulateFailure) {
        payload.simulate_failure = true;
        payload.card_number = '4000000000000002'; // Known simulation decline trigger
      }

      const res = await api.post('/subscribe', payload);

      setSuccessMsg(res.data?.message || `Successfully subscribed to ${plan.name} plan!`);
      setSelectedPlanForCheckout(null);
      await fetchBillingData();
    } catch (err: any) {
      console.error('Subscription error:', err);
      const backendError =
        err.response?.data?.errors?.payment?.[0] ||
        err.response?.data?.message ||
        'Failed to complete simulated subscription.';
      setErrorMsg(backendError);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (immediate: boolean) => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/cancel', { immediate });
      setSuccessMsg(res.data?.message || 'Subscription cancelled successfully.');
      setShowCancelModal(false);
      await fetchBillingData();
    } catch (err: any) {
      console.error('Cancellation error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to process cancellation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/resume');
      setSuccessMsg(res.data?.message || 'Subscription cancellation revoked. Auto-renew active.');
      await fetchBillingData();
    } catch (err: any) {
      console.error('Resume error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to revoke cancellation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Status badge styling
  const renderStatusBadge = (sub: SubscriptionOverviewData['subscription']) => {
    if (sub.on_grace_period || sub.cancel_at_period_end) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-300">
          <Clock className="w-3.5 h-3.5" />
          Cancelling at Period End
        </span>
      );
    }

    switch (sub.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Subscription
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            14-Day Free Trial
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Payment Past Due
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300">
            {sub.status}
          </span>
        );
    }
  };

  // Helper for progress bar percentage
  const calcPercent = (used: number, limit: number, isUnlimited: boolean) => {
    if (isUnlimited || limit <= 0) return 0;
    const p = Math.round((used / limit) * 100);
    return Math.min(100, Math.max(0, p));
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-rose-500';
    if (percent >= 80) return 'bg-amber-500';
    return 'bg-[#0F9F8F]';
  };

  const currentPlan = overview?.plan;
  const currentSub = overview?.subscription;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-10 h-10 text-[#0F9F8F] animate-spin" />
        <div className="text-base font-extrabold text-[#0F172A]">Loading SaaS Billing & Quotas...</div>
        <div className="text-xs text-[#475569] font-medium">[Test Mode: Simulated Billing]</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header & Test Mode Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              SaaS Billing & Subscription Management
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-teal-50 text-[#0F9F8F] border border-teal-200">
              Phase 8 Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#475569] mt-1">
            Manage your LeadPilot organization license, multi-tenant quotas, and subscription tier.
          </p>
        </div>

        <button
          onClick={fetchBillingData}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white text-[#0F172A] border border-[#CBD5E1] rounded-xl hover:bg-slate-50 transition-all shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Quotas
        </button>
      </div>

      {/* Gateway Mode Disclaimer */}
      <div className="bg-gradient-to-r from-blue-50 via-teal-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-start gap-3.5">
        <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 shadow-xs mt-0.5">
          <Shield className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-blue-600 text-white">
              {isStripeActive ? '[Stripe Test Mode: Hosted Checkout]' : '[Test Mode: Simulated Billing]'}
            </span>
            <span className="text-xs font-extrabold text-[#0F172A]">
              {isStripeActive ? 'Stripe Test Checkout Active' : 'Checkout Simulation Active'}
            </span>
          </div>
          <p className="text-xs font-semibold text-[#334155] leading-relaxed">
            {isStripeActive
              ? 'Checkout is powered by Stripe Hosted Checkout. In this environment, payments use Stripe Test Mode cards. Live payment charging remains disabled until authorized.'
              : 'All plans, upgrades, downgrades, and cancellations are fully simulated. No real credit cards or bank accounts will ever be charged. Live Stripe/payment gateways remain disabled during this testing phase.'}
          </p>
        </div>
      </div>

      {/* RBAC Notice for non-owners */}
      {!isOwner && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs font-bold">
            Read-Only Billing Access: You are logged in with the <span className="underline font-black capitalize">{user?.role?.replace('_', ' ') || 'member'}</span> role. Only the organization owner has authorization to upgrade, downgrade, or cancel the subscription.
          </div>
        </div>
      )}

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-800 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-800 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Current Subscription Overview Hero Card */}
      {currentSub && currentPlan && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#CBD5E1]">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-[#475569] uppercase tracking-wider">
                  Organization: {organization?.name}
                </span>
                {renderStatusBadge(currentSub)}
              </div>
              <div className="flex items-baseline gap-3">
                <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">
                  {currentPlan.name} Plan
                </h2>
                <span className="text-xl font-black text-[#0F9F8F]">
                  ${currentPlan.monthly_price_usd}
                  <span className="text-xs text-[#475569] font-medium"> / month</span>
                </span>
              </div>
              <p className="text-xs text-[#475569] font-medium">
                {currentPlan.tier === 0
                  ? 'Introductory trial tier with essential CRM, inbox, and AI testing quotas.'
                  : currentPlan.tier === 1
                    ? 'Standard starter tier for growing sales teams with increased WhatsApp campaigns.'
                    : currentPlan.tier === 2
                      ? 'High-velocity sales intelligence, multi-agent workflows, and high AI capacity.'
                      : 'Unlimited scale for high-volume enterprise broadcasting and intelligence.'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {currentSub.on_grace_period && isOwner && (
                <button
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#0F9F8F] text-white hover:bg-[#0D8A7C] transition-all shadow-xs flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resume Subscription
                </button>
              )}

              {currentSub.status === 'active' && !currentSub.cancel_at_period_end && isOwner && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-2"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>

          {/* Dates & Method Meta Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1">
              <div className="text-[#475569] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0F9F8F]" />
                Billing Cycle
              </div>
              <div className="text-sm font-extrabold text-[#0F172A]">
                {currentSub.current_period_start
                  ? new Date(currentSub.current_period_start).toLocaleDateString()
                  : 'N/A'}
                {' – '}
                {currentSub.current_period_end
                  ? new Date(currentSub.current_period_end).toLocaleDateString()
                  : 'Ongoing'}
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1">
              <div className="text-[#475569] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                {currentSub.status === 'trialing' ? 'Trial Expiration' : 'Next Renewal'}
              </div>
              <div className="text-sm font-extrabold text-[#0F172A]">
                {currentSub.trial_ends_at
                  ? new Date(currentSub.trial_ends_at).toLocaleDateString()
                  : currentSub.current_period_end
                    ? new Date(currentSub.current_period_end).toLocaleDateString()
                    : 'N/A'}
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1">
              <div className="text-[#475569] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                Payment Method
              </div>
              <div className="text-sm font-extrabold text-[#0F172A] flex items-center gap-1.5">
                <span>Simulated Test Card</span>
                <span className="font-mono text-xs text-[#0F9F8F] font-black">(•••• 4242)</span>
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1">
              <div className="text-[#475569] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Payment Status
              </div>
              <div className="text-sm font-extrabold text-[#0F172A] capitalize">
                {currentSub.last_payment_status || 'succeeded'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Live Quota Usage Meters */}
      {overview?.usage && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                Live Plan Resource Quotas
              </h2>
              <p className="text-xs font-semibold text-[#475569]">
                Pessimistic tenant-scoped counters tracking capacity consumption for this billing period.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Contacts Usage Meter */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-50 text-[#0F9F8F]">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#475569]">Contacts Directory</div>
                    <div className="text-sm font-black text-[#0F172A]">
                      {overview.usage.contacts.used.toLocaleString()}
                      {' / '}
                      {overview.usage.contacts.is_unlimited ? 'Unlimited' : overview.usage.contacts.limit.toLocaleString()}
                    </div>
                  </div>
                </div>
                {!overview.usage.contacts.is_unlimited && (
                  <span className="text-xs font-extrabold text-[#475569]">
                    {calcPercent(overview.usage.contacts.used, overview.usage.contacts.limit, false)}%
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProgressColor(calcPercent(overview.usage.contacts.used, overview.usage.contacts.limit, overview.usage.contacts.is_unlimited))}`}
                  style={{
                    width: overview.usage.contacts.is_unlimited
                      ? '10%'
                      : `${calcPercent(overview.usage.contacts.used, overview.usage.contacts.limit, false)}%`,
                  }}
                />
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#475569]">Team Member Seats</div>
                    <div className="text-sm font-black text-[#0F172A]">
                      {overview.usage.users.used.toLocaleString()}
                      {' / '}
                      {overview.usage.users.is_unlimited ? 'Unlimited' : overview.usage.users.limit.toLocaleString()}
                    </div>
                  </div>
                </div>
                {!overview.usage.users.is_unlimited && (
                  <span className="text-xs font-extrabold text-[#475569]">
                    {calcPercent(overview.usage.users.used, overview.usage.users.limit, false)}%
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProgressColor(calcPercent(overview.usage.users.used, overview.usage.users.limit, overview.usage.users.is_unlimited))}`}
                  style={{
                    width: overview.usage.users.is_unlimited
                      ? '10%'
                      : `${calcPercent(overview.usage.users.used, overview.usage.users.limit, false)}%`,
                  }}
                />
              </div>
            </div>

            {/* WABA Accounts */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#475569]">WhatsApp WABA Accounts</div>
                    <div className="text-sm font-black text-[#0F172A]">
                      {overview.usage.waba_accounts.used.toLocaleString()}
                      {' / '}
                      {overview.usage.waba_accounts.is_unlimited ? 'Unlimited' : overview.usage.waba_accounts.limit.toLocaleString()}
                    </div>
                  </div>
                </div>
                {!overview.usage.waba_accounts.is_unlimited && (
                  <span className="text-xs font-extrabold text-[#475569]">
                    {calcPercent(overview.usage.waba_accounts.used, overview.usage.waba_accounts.limit, false)}%
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProgressColor(calcPercent(overview.usage.waba_accounts.used, overview.usage.waba_accounts.limit, overview.usage.waba_accounts.is_unlimited))}`}
                  style={{
                    width: overview.usage.waba_accounts.is_unlimited
                      ? '10%'
                      : `${calcPercent(overview.usage.waba_accounts.used, overview.usage.waba_accounts.limit, false)}%`,
                  }}
                />
              </div>
            </div>

            {/* Campaigns Monthly */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#475569]">Monthly Broadcast Campaigns</div>
                    <div className="text-sm font-black text-[#0F172A]">
                      {overview.usage.campaigns_monthly.used.toLocaleString()}
                      {' / '}
                      {overview.usage.campaigns_monthly.is_unlimited ? 'Unlimited' : overview.usage.campaigns_monthly.limit.toLocaleString()}
                    </div>
                  </div>
                </div>
                {!overview.usage.campaigns_monthly.is_unlimited && (
                  <span className="text-xs font-extrabold text-[#475569]">
                    {calcPercent(overview.usage.campaigns_monthly.used, overview.usage.campaigns_monthly.limit, false)}%
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProgressColor(calcPercent(overview.usage.campaigns_monthly.used, overview.usage.campaigns_monthly.limit, overview.usage.campaigns_monthly.is_unlimited))}`}
                  style={{
                    width: overview.usage.campaigns_monthly.is_unlimited
                      ? '10%'
                      : `${calcPercent(overview.usage.campaigns_monthly.used, overview.usage.campaigns_monthly.limit, false)}%`,
                  }}
                />
              </div>
            </div>

            {/* AI Requests Monthly */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#475569]">Monthly AI Requests</div>
                    <div className="text-sm font-black text-[#0F172A]">
                      {overview.usage.ai_requests_monthly.used.toLocaleString()}
                      {' / '}
                      {overview.usage.ai_requests_monthly.is_unlimited ? 'Unlimited' : overview.usage.ai_requests_monthly.limit.toLocaleString()}
                    </div>
                  </div>
                </div>
                {!overview.usage.ai_requests_monthly.is_unlimited && (
                  <span className="text-xs font-extrabold text-[#475569]">
                    {calcPercent(overview.usage.ai_requests_monthly.used, overview.usage.ai_requests_monthly.limit, false)}%
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProgressColor(calcPercent(overview.usage.ai_requests_monthly.used, overview.usage.ai_requests_monthly.limit, overview.usage.ai_requests_monthly.is_unlimited))}`}
                  style={{
                    width: overview.usage.ai_requests_monthly.is_unlimited
                      ? '10%'
                      : `${calcPercent(overview.usage.ai_requests_monthly.used, overview.usage.ai_requests_monthly.limit, false)}%`,
                  }}
                />
              </div>
            </div>

            {/* AI Tokens Monthly */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#475569]">Monthly AI Tokens</div>
                    <div className="text-sm font-black text-[#0F172A]">
                      {overview.usage.ai_tokens_monthly.used.toLocaleString()}
                      {' / '}
                      {overview.usage.ai_tokens_monthly.is_unlimited ? 'Unlimited' : overview.usage.ai_tokens_monthly.limit.toLocaleString()}
                    </div>
                  </div>
                </div>
                {!overview.usage.ai_tokens_monthly.is_unlimited && (
                  <span className="text-xs font-extrabold text-[#475569]">
                    {calcPercent(overview.usage.ai_tokens_monthly.used, overview.usage.ai_tokens_monthly.limit, false)}%
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProgressColor(calcPercent(overview.usage.ai_tokens_monthly.used, overview.usage.ai_tokens_monthly.limit, overview.usage.ai_tokens_monthly.is_unlimited))}`}
                  style={{
                    width: overview.usage.ai_tokens_monthly.is_unlimited
                      ? '10%'
                      : `${calcPercent(overview.usage.ai_tokens_monthly.used, overview.usage.ai_tokens_monthly.limit, false)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Plan Selection Grid (All 4 Tiers) */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
            Available SaaS Subscription Tiers
          </h2>
          <p className="text-xs font-semibold text-[#475569]">
            Select an approved tier to upgrade or adjust your organization's resource capacity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.id === plan.id;
            const isUpgrade = currentPlan ? plan.tier > currentPlan.tier : false;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl flex flex-col justify-between transition-all duration-200 border relative ${
                  isCurrent
                    ? 'border-[#0F9F8F] ring-2 ring-[#0F9F8F]/20 shadow-md'
                    : 'border-[#CBD5E1] hover:border-slate-400 shadow-xs'
                }`}
              >
                {/* Popular / Tier Badges */}
                {plan.slug === 'business' && (
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-[#0D2038] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    Most Popular
                  </div>
                )}
                {plan.slug === 'enterprise' && (
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    Unlimited Scale
                  </div>
                )}

                <div className="p-6 space-y-6">
                  {/* Plan Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-[#0F172A] tracking-tight">{plan.name}</h3>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-teal-100 text-[#0F9F8F] px-2.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#0F172A]">
                        ${plan.monthly_price_usd}
                      </span>
                      <span className="text-xs text-[#475569] font-semibold">/ month</span>
                    </div>
                  </div>

                  {/* Limits Summary */}
                  <div className="space-y-2.5 text-xs text-[#334155] border-t border-b border-[#F1F5F9] py-4 font-semibold">
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Contacts</span>
                      <span className="font-extrabold text-[#0F172A]">
                        {plan.quotas.max_contacts === -1 ? 'Unlimited' : plan.quotas.max_contacts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Team Seats</span>
                      <span className="font-extrabold text-[#0F172A]">
                        {plan.quotas.max_users === -1 ? 'Unlimited' : plan.quotas.max_users.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">WABA Accounts</span>
                      <span className="font-extrabold text-[#0F172A]">
                        {plan.quotas.max_waba_accounts === -1 ? 'Unlimited' : plan.quotas.max_waba_accounts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Monthly Campaigns</span>
                      <span className="font-extrabold text-[#0F172A]">
                        {plan.quotas.max_campaigns_per_month === -1 ? 'Unlimited' : plan.quotas.max_campaigns_per_month.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">AI Requests/mo</span>
                      <span className="font-extrabold text-[#0F172A]">
                        {plan.quotas.max_ai_requests_per_month === -1 ? 'Unlimited' : plan.quotas.max_ai_requests_per_month.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">AI Tokens/mo</span>
                      <span className="font-extrabold text-[#0F172A]">
                        {plan.quotas.max_ai_tokens_per_month === -1 ? 'Unlimited' : plan.quotas.max_ai_tokens_per_month.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2 text-xs">
                    <div className="text-[11px] font-black uppercase text-[#475569] tracking-wider">Included Features:</div>
                    <ul className="space-y-1.5 text-[#334155] font-medium">
                      {plan.features?.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0F9F8F] shrink-0" />
                          <span className="capitalize">{f.replace(/_/g, ' ')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Plan Card Action Button */}
                <div className="p-6 pt-0">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInitiateUpgrade(plan)}
                      disabled={!isOwner || actionLoading}
                      title={!isOwner ? 'Only organization owners can modify subscription' : ''}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                        !isOwner
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : isUpgrade
                            ? 'bg-[#0F9F8F] hover:bg-[#0D8A7C] text-white'
                            : 'border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A]'
                      }`}
                    >
                      {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      {isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Simulated Checkout Confirmation Modal */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 bg-[#0D2038]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  [Test Mode: Simulated Checkout]
                </span>
                <h3 className="text-xl font-black text-[#0F172A] mt-1.5">
                  Confirm Subscription Change
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlanForCheckout(null)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Plan Switch Summary */}
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#475569] font-bold">New Plan:</span>
                <span className="font-extrabold text-[#0F172A]">{selectedPlanForCheckout.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#475569] font-bold">Billing Frequency:</span>
                <span className="font-extrabold text-[#0F172A]">Monthly</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-[#E2E8F0] pt-2">
                <span className="text-[#0F172A] font-extrabold">Simulated Total Due:</span>
                <span className="text-base font-black text-[#0F9F8F]">
                  ${selectedPlanForCheckout.monthly_price_usd} / mo
                </span>
              </div>
            </div>

            {/* Simulated Card Details */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#475569] uppercase tracking-wider block">
                Simulated Payment Method
              </label>
              <div className="border border-[#CBD5E1] rounded-xl p-3.5 flex items-center justify-between bg-white shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#0F172A]">
                      {testDeclineCard ? 'Simulated Decline Card (•••• 0002)' : 'Simulated Test Card (•••• 4242)'}
                    </div>
                    <div className="text-[11px] text-[#475569] font-medium">Expires 12/28 • Test Mode</div>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
            </div>

            {/* Test Decline Toggle */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-900">Simulate Payment Failure / Card Decline:</span>
              <button
                type="button"
                onClick={() => setTestDeclineCard(!testDeclineCard)}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                  testDeclineCard
                    ? 'bg-rose-600 text-white'
                    : 'bg-white border border-amber-300 text-amber-900'
                }`}
              >
                {testDeclineCard ? 'Declining Enabled' : 'Simulate Success'}
              </button>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed">
              By confirming, this organization's subscription will update to the <strong>{selectedPlanForCheckout.name}</strong> tier immediately. Existing data will be preserved in full.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanForCheckout(null)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubscribe(selectedPlanForCheckout, testDeclineCard)}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#0F9F8F] hover:bg-[#0D8A7C] text-white shadow-xs flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Simulated Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Cancellation Confirmation Modal */}
      {showCancelModal && currentSub && (
        <div className="fixed inset-0 z-50 bg-[#0D2038]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  Cancel Subscription
                </span>
                <h3 className="text-xl font-black text-[#0F172A] mt-1.5">
                  Confirm Subscription Cancellation
                </h3>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-2 text-amber-900 leading-relaxed">
              <div className="font-black flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                Zero Data Loss Guarantee:
              </div>
              <p>
                Cancelling will <strong>never delete</strong> your contacts, WhatsApp conversations, campaigns, or configurations. They remain safely stored in your account.
              </p>
            </div>

            {/* Cancellation Options */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#475569] uppercase tracking-wider block">
                Choose Cancellation Strategy:
              </label>

              <div
                onClick={() => setCancellingImmediate(false)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  !cancellingImmediate
                    ? 'border-[#0F9F8F] bg-teal-50/40 ring-1 ring-[#0F9F8F]'
                    : 'border-[#CBD5E1] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#0F172A]">
                    Cancel at End of Billing Period (Recommended)
                  </span>
                  <input
                    type="radio"
                    checked={!cancellingImmediate}
                    onChange={() => setCancellingImmediate(false)}
                    className="text-[#0F9F8F]"
                  />
                </div>
                <p className="text-[11px] text-[#475569] mt-1 font-medium">
                  Retain full plan features and quotas until{' '}
                  {currentSub.current_period_end
                    ? new Date(currentSub.current_period_end).toLocaleDateString()
                    : 'the billing period ends'}
                  . No unexpected access interruptions.
                </p>
              </div>

              <div
                onClick={() => setCancellingImmediate(true)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  cancellingImmediate
                    ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                    : 'border-[#CBD5E1] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-rose-700">
                    Cancel Immediately
                  </span>
                  <input
                    type="radio"
                    checked={cancellingImmediate}
                    onChange={() => setCancellingImmediate(true)}
                    className="text-rose-600"
                  />
                </div>
                <p className="text-[11px] text-[#475569] mt-1 font-medium">
                  Revoke paid features and pause new resource creation immediately.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A]"
              >
                Keep My Plan
              </button>
              <button
                type="button"
                onClick={() => handleCancel(cancellingImmediate)}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
