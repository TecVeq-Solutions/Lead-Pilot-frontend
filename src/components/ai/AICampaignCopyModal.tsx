import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import type { AICampaignCopyData, AICampaignCopyVariation } from '../../types';

interface AICampaignCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseVariationInNewCampaign?: (variation: AICampaignCopyVariation, goal: string) => void;
}

export const AICampaignCopyModal: React.FC<AICampaignCopyModalProps> = ({
  isOpen,
  onClose,
  onUseVariationInNewCampaign,
}) => {
  const [industry, setIndustry] = useState('');
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('persuasive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AICampaignCopyData | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!industry.trim() || !goal.trim() || !audience.trim()) {
      setError('Please fill in industry, campaign goal, and target audience.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/campaign-copy', {
        industry: industry.trim(),
        goal: goal.trim(),
        audience: audience.trim(),
        tone: tone.trim() || 'persuasive',
      });

      if (res.data?.status === 'success') {
        setResult(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to generate campaign copy variations.');
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('You lack campaigns permission (campaigns.create) to generate copy.');
      } else if (status === 429) {
        setError('AI quota or rate limit exceeded. Please wait a moment before trying again.');
      } else if (status === 504) {
        setError('AI provider connection timed out. Please try with shorter inputs.');
      } else {
        setError(err.response?.data?.message || 'An error occurred during copy generation.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (varItem: AICampaignCopyVariation) => {
    const textToCopy = `${varItem.body}\n\nCall-to-Action: ${varItem.call_to_action}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(varItem.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-[#0D2038] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-400/30">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>AI WhatsApp Campaign Copy Generator</span>
                <span className="px-2 py-0.5 bg-purple-400/20 text-purple-200 text-[10px] font-bold rounded-full">
                  Draft Generator
                </span>
              </h2>
              <p className="text-xs text-purple-200/80 font-medium">
                Generate high-converting direct-response WhatsApp broadcast copy with personalization hooks.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-purple-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Compliance & Safety Notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-extrabold">Meta Official WhatsApp Template Policy Reminder</p>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                Outbound marketing broadcasts sent to WhatsApp users require pre-approved message templates inside Meta Business Manager. Generated copy serves as editable drafts for your approval submission or CRM re-engagement. This tool will never dispatch campaigns automatically.
              </p>
            </div>
          </div>

          {/* Generator Input Form */}
          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                Industry / Business Vertical <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                maxLength={100}
                placeholder="e.g., Automotive, B2B SaaS, Real Estate, Dental Clinic"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-purple-600 focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">{industry.length}/100</span>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                Tone of Voice
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-purple-600 focus:outline-none transition-colors bg-white"
              >
                <option value="persuasive">Persuasive (High Conversion)</option>
                <option value="professional">Professional & Direct</option>
                <option value="friendly">Friendly & Warm</option>
                <option value="urgent">Urgent & Time-Sensitive</option>
                <option value="casual">Casual & Conversational</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                Campaign Goal / Offer <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                maxLength={200}
                placeholder="e.g., Book 15-minute product demos with a 20% discount on annual plan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-purple-600 focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">{goal.length}/200</span>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                Target Audience Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                maxLength={255}
                placeholder="e.g., Sales Directors and Operations Managers at mid-sized e-commerce firms"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-purple-600 focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">{audience.length}/255</span>
            </div>

            {error && (
              <div className="md:col-span-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !industry.trim() || !goal.trim() || !audience.trim()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:bg-purple-300"
              >
                <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Synthesizing Copy Variations...' : 'Generate Copy Variations'}</span>
              </button>
            </div>
          </form>

          {/* Results Section */}
          {result && result.variations && result.variations.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    Generated Copy Variations ({result.variations.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Review and copy draft variations into your templates or campaign drafts.
                  </p>
                </div>
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded-md">
                  Model: {result.model}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.variations.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 bg-slate-50/80 border border-slate-200 hover:border-purple-300 rounded-2xl flex flex-col justify-between gap-3 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-bold">
                            {v.id}
                          </span>
                          {v.title}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopy(v)}
                          className="px-2.5 py-1 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                        >
                          {copiedId === v.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* WhatsApp Message Preview Bubble */}
                      <div className="p-3.5 bg-[#E7F8F5] border border-teal-200 rounded-2xl text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {v.body}
                      </div>

                      {/* Call-to-action button preview */}
                      <div className="mt-2.5">
                        <div className="w-full py-1.5 px-3 bg-white border border-teal-300 rounded-xl text-center text-xs font-bold text-teal-800 shadow-2xs">
                          🔘 {v.call_to_action}
                        </div>
                      </div>
                    </div>

                    {onUseVariationInNewCampaign && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            onUseVariationInNewCampaign(v, goal);
                            onClose();
                          }}
                          className="text-[11px] font-extrabold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors"
                        >
                          <span>Use in New Campaign</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
