import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, Check, ArrowRight, AlertCircle, X, Shield } from 'lucide-react';
import { api } from '../../services/api';
import type { AISmartReplyData } from '../../types';

interface AISmartRepliesTrayProps {
  conversationId: number;
  isOpen: boolean;
  onClose: () => void;
  onApplyDraft: (draft: string) => void;
}

const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'persuasive', label: 'Persuasive' },
  { id: 'casual', label: 'Casual' },
  { id: 'urgent', label: 'Urgent' },
];

export const AISmartRepliesTray: React.FC<AISmartRepliesTrayProps> = ({
  conversationId,
  isOpen,
  onClose,
  onApplyDraft,
}) => {
  const [selectedTone, setSelectedTone] = useState<string>('professional');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [replyData, setReplyData] = useState<AISmartReplyData | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchSmartReplies = useCallback(async (toneToUse?: string) => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/smart-reply', {
        conversation_id: conversationId,
        tone: toneToUse || selectedTone,
      });

      if (res.data?.status === 'success') {
        setReplyData(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to generate smart replies.');
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('You lack inbox chat permission (inbox.chat) to request AI smart replies.');
      } else if (status === 429) {
        setError('AI quota or rate limit exceeded. Please wait a moment before retrying.');
      } else if (status === 504) {
        setError('AI provider timed out. Try again with a different tone or check back shortly.');
      } else if (status === 503) {
        setError('AI intelligence provider is temporarily unavailable or misconfigured.');
      } else {
        setError(err.response?.data?.message || 'Could not fetch reply suggestions.');
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, selectedTone]);

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchSmartReplies();
    }
  }, [isOpen, conversationId, fetchSmartReplies]);

  const handleToneChange = (newTone: string) => {
    setSelectedTone(newTone);
    fetchSmartReplies(newTone);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="mb-3 p-4 bg-gradient-to-r from-purple-50/90 via-indigo-50/80 to-slate-50 border border-purple-200/80 rounded-2xl shadow-xs transition-all animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 tracking-tight">AI Smart Reply Assistant</span>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider rounded-full">
                Drafts Only
              </span>
              {replyData?.is_fallback && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                  Rule Fallback
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Review and insert a drafted suggestion into the composer. Never dispatched automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchSmartReplies()}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-100/60 rounded-lg transition-colors disabled:opacity-50"
            title="Regenerate suggestions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            title="Close tray"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tone Selection Pills */}
      <div className="flex items-center gap-1.5 my-3 flex-wrap">
        <span className="text-[11px] font-bold text-slate-500 mr-1">Tone:</span>
        {TONES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleToneChange(t.id)}
            disabled={loading}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              selectedTone === t.id
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-purple-50 border border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-2 py-2">
          <div className="p-3 bg-white/80 rounded-xl border border-purple-100 space-y-2 animate-pulse">
            <div className="h-3 bg-purple-200/60 rounded w-3/4"></div>
            <div className="h-3 bg-purple-100/60 rounded w-1/2"></div>
          </div>
          <div className="p-3 bg-white/80 rounded-xl border border-purple-100 space-y-2 animate-pulse">
            <div className="h-3 bg-purple-200/60 rounded w-2/3"></div>
            <div className="h-3 bg-purple-100/60 rounded w-1/3"></div>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {!loading && error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start justify-between gap-3 my-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{error}</p>
              <p className="text-[11px] text-rose-600 mt-0.5">Check network status or try another tone.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchSmartReplies()}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Suggestions List */}
      {!loading && !error && replyData && replyData.suggestions && (
        <div className="space-y-2.5 my-2">
          {replyData.suggestions.length === 0 ? (
            <div className="p-4 bg-white/80 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 font-medium">
              No reply suggestions available for this conversation history.
            </div>
          ) : (
            replyData.suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="group p-3 bg-white rounded-xl border border-purple-100/90 hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between gap-2"
              >
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed select-text">
                    {suggestion}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleCopy(suggestion, idx)}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-extrabold">Copied</span>
                      </>
                    ) : (
                      <span>Copy</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onApplyDraft(suggestion);
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-extrabold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Insert into Composer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Safety Micro-Banner */}
      <div className="mt-2.5 pt-2 border-t border-purple-100/70 flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-purple-500" />
          PII Redaction & Prompt Guard Active
        </span>
        <span>Model: {replyData?.model || 'leadpilot-ai'}</span>
      </div>
    </div>
  );
};
