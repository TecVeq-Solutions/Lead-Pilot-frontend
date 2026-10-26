import React, { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, AlertCircle, ChevronRight, Copy, Check } from 'lucide-react';
import { api } from '../../services/api';
import type { AIConversationSummaryData } from '../../types';

interface AIConversationSummaryCardProps {
  conversationId: number;
  onApplyDraft?: (draft: string) => void;
}

export const AIConversationSummaryCard: React.FC<AIConversationSummaryCardProps> = ({
  conversationId,
  onApplyDraft,
}) => {
  const [summaryData, setSummaryData] = useState<AIConversationSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchSummary = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/summarize-conversation', {
        conversation_id: conversationId,
      });

      if (res.data?.status === 'success') {
        setSummaryData(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to generate conversation summary.');
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('You lack inbox chat permission (inbox.chat) to view conversation summaries.');
      } else if (status === 429) {
        setError('AI quota or rate limit exceeded. Please wait a moment before retrying.');
      } else if (status === 504) {
        setError('AI provider connection timed out. Please retry in a few moments.');
      } else {
        setError(err.response?.data?.message || 'Could not summarize conversation history.');
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setSummaryData(null);
    setError(null);
    if (conversationId) {
      fetchSummary();
    }
  }, [conversationId, fetchSummary]);

  const handleCopySummary = () => {
    if (!summaryData) return;
    const text = `Customer Need:\n${summaryData.customer_need}\n\nKey Objections:\n${
      summaryData.key_objections.map((o) => `• ${o}`).join('\n') || 'None recorded'
    }\n\nRecommended Next Action:\n${summaryData.recommended_next_action}\n\nSummary:\n${summaryData.summary}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 tracking-tight">AI Executive Summary</span>
              {summaryData?.is_fallback && (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                  Rule Fallback
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Multi-turn conversation synthesis</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {summaryData && (
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title="Copy structured summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={fetchSummary}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
            title="Refresh summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-2 py-2 animate-pulse">
          <div className="h-3 bg-slate-100 rounded w-1/3"></div>
          <div className="h-4 bg-slate-100 rounded w-full"></div>
          <div className="h-3 bg-slate-100 rounded w-1/4 mt-2"></div>
          <div className="h-4 bg-slate-100 rounded w-5/6"></div>
        </div>
      )}

      {/* Error View */}
      {!loading && error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-bold text-[11px] leading-tight">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchSummary}
            className="mt-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-md transition-colors"
          >
            Retry Summary
          </button>
        </div>
      )}

      {/* Content View */}
      {!loading && !error && summaryData && (
        <div className="space-y-3 text-xs">
          {/* Customer Need */}
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
              Customer Need
            </span>
            <p className="font-bold text-slate-800 leading-snug bg-slate-50 p-2 rounded-lg border border-slate-100">
              {summaryData.customer_need}
            </p>
          </div>

          {/* Key Objections */}
          {summaryData.key_objections && summaryData.key_objections.length > 0 && (
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Key Objections / Concerns
              </span>
              <ul className="space-y-1">
                {summaryData.key_objections.map((obj, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-slate-700 font-medium text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Next Action */}
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 block mb-0.5">
              Recommended Next Action
            </span>
            <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
              <p className="font-extrabold text-teal-950 text-[11px] leading-snug">
                {summaryData.recommended_next_action}
              </p>
              {onApplyDraft && (
                <button
                  type="button"
                  onClick={() => onApplyDraft(summaryData.recommended_next_action)}
                  className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline flex items-center gap-1"
                >
                  <span>Insert into message composer as draft</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Overview text */}
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 leading-relaxed font-medium">
            <span className="text-slate-400 font-bold block text-[10px] mb-0.5 uppercase tracking-wider">
              Thread State
            </span>
            <p className="italic">{summaryData.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
};
