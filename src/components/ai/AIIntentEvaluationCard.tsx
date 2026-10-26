import React, { useState, useEffect, useCallback } from 'react';
import { Target, RefreshCw, AlertCircle, Shield } from 'lucide-react';
import { api } from '../../services/api';
import type { AIEvaluateIntentData } from '../../types';

interface AIIntentEvaluationCardProps {
  contactId?: number;
  conversationId?: number;
  compact?: boolean;
}

export const AIIntentEvaluationCard: React.FC<AIIntentEvaluationCardProps> = ({
  contactId,
  conversationId,
  compact: _compact = false,
}) => {
  const [data, setData] = useState<AIEvaluateIntentData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluation = useCallback(async () => {
    if (!contactId && !conversationId) return;

    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, any> = {};
      if (conversationId) payload.conversation_id = conversationId;
      if (contactId) payload.contact_id = contactId;

      const res = await api.post('/ai/evaluate-intent', payload);
      if (res.data?.status === 'success') {
        setData(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to evaluate lead intent.');
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('You lack sales intelligence permission (intelligence.view) to evaluate intent.');
      } else if (status === 429) {
        setError('AI quota or rate limit exceeded. Please wait a moment before retrying.');
      } else if (status === 504) {
        setError('AI provider timed out. Please retry shortly.');
      } else {
        setError(err.response?.data?.message || 'Could not evaluate lead intent.');
      }
    } finally {
      setLoading(false);
    }
  }, [contactId, conversationId]);

  useEffect(() => {
    setData(null);
    setError(null);
    if (contactId || conversationId) {
      fetchEvaluation();
    }
  }, [contactId, conversationId, fetchEvaluation]);

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return { label: 'Positive', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'hesitant':
        return { label: 'Hesitant', className: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'churn_risk':
        return { label: 'Churn Risk', className: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'neutral':
      default:
        return { label: 'Neutral', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getReadinessBadge = (readiness: string) => {
    switch (readiness.toLowerCase()) {
      case 'hot':
        return { label: 'Hot Lead', className: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'warm':
        return { label: 'Warm Lead', className: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'qualified':
        return { label: 'Qualified', className: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'cold':
      default:
        return { label: 'Cold Lead', className: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 tracking-tight">AI Intent & Sentiment</span>
              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[9px] font-bold rounded">
                Advisory
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Readiness assessment without CRM mutation</p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchEvaluation}
          disabled={loading}
          className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50"
          title="Re-evaluate intent"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-2 py-2 animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          <div className="h-3 bg-slate-100 rounded w-3/4"></div>
          <div className="h-2 bg-slate-100 rounded w-full"></div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-bold text-[11px] leading-tight">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchEvaluation}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-md transition-colors"
          >
            Retry Evaluation
          </button>
        </div>
      )}

      {/* Content View */}
      {!loading && !error && data && (
        <div className="space-y-2.5 text-xs">
          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sentiment */}
            {(() => {
              const b = getSentimentBadge(data.sentiment);
              return (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${b.className}`}>
                  {b.label}
                </span>
              );
            })()}

            {/* Readiness */}
            {(() => {
              const b = getReadinessBadge(data.buyer_readiness);
              return (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${b.className}`}>
                  {b.label}
                </span>
              );
            })()}

            {/* Intent Category */}
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
              {data.intent.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Confidence Meter */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
              <span>Confidence Score</span>
              <span className="font-mono text-purple-700 font-extrabold">{data.confidence_score}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${data.confidence_score}%` }}
              ></div>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-700 font-medium leading-relaxed">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Rationale
            </span>
            <p>{data.explanation}</p>
          </div>

          {/* Non-destructive guarantee notice */}
          <div className="pt-1.5 flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
            <Shield className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Advisory AI insight. Does not alter contact lead score or CRM records.</span>
          </div>
        </div>
      )}
    </div>
  );
};
