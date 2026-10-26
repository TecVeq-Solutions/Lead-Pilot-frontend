import React, { useState } from 'react';
import { Flame, Info, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export interface ScoringFactor {
  signal: string;
  points: number;
}

export interface AIScoringData {
  score: number;
  calculated_at: string;
  factors: ScoringFactor[];
}

interface IntentBadgeProps {
  contactId: number;
  score: number;
  aiScoring?: AIScoringData;
  onScoreUpdated?: (newScore: number, newScoringData?: AIScoringData) => void;
}

export const IntentBadge: React.FC<IntentBadgeProps> = ({
  contactId,
  score,
  aiScoring,
  onScoreUpdated,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [currentScore, setCurrentScore] = useState(score);
  const [currentScoring, setCurrentScoring] = useState<AIScoringData | undefined>(aiScoring);

  const getBadgeStyle = (val: number) => {
    if (val >= 80) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30 icon-fire';
    }
    if (val >= 50) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  };

  const getBadgeLabel = (val: number) => {
    if (val >= 80) return 'Hot';
    if (val >= 50) return 'Warm';
    return 'Cold';
  };

  const handleRecalculate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecalculating(true);
    try {
      const res = await api.post(`/contacts/${contactId}/recalculate-score`);
      if (res.data?.status === 'success') {
        const updatedScore = res.data.data.lead_score;
        const updatedAiScoring = res.data.data.ai_scoring;
        setCurrentScore(updatedScore);
        setCurrentScoring(updatedAiScoring);
        if (onScoreUpdated) {
          onScoreUpdated(updatedScore, updatedAiScoring);
        }
      }
    } catch (err) {
      console.error('Failed to recalculate lead score', err);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-1.5">
        <span
          onClick={() => setShowPopover(!showPopover)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full border cursor-pointer flex items-center gap-1 transition-all ${getBadgeStyle(currentScore)}`}
        >
          {currentScore >= 80 && <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
          {currentScore} ({getBadgeLabel(currentScore)})
          <Info className="w-3 h-3 opacity-70 hover:opacity-100" />
        </span>
      </div>

      {showPopover && (
        <div className="absolute z-50 mt-2 w-72 bg-darkSurface border border-darkBorder rounded-xl shadow-2xl p-4 text-xs left-0">
          <div className="flex items-center justify-between pb-2 border-b border-darkBorder mb-3">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" /> Explainable AI Lead Score
            </span>
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="p-1 hover:bg-darkBase rounded text-slate-400 hover:text-white transition-colors"
              title="Recalculate Score"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          <div className="mb-3">
            <div className="text-slate-400 mb-1">Score breakdown (0 &ndash; 100):</div>
            <div className="w-full bg-darkBase rounded-full h-2 overflow-hidden border border-darkBorder">
              <div
                className={`h-full transition-all duration-500 ${currentScore >= 80 ? 'bg-rose-500' : currentScore >= 50 ? 'bg-amber-500' : 'bg-slate-500'}`}
                style={{ width: `${currentScore}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {currentScoring?.factors && currentScoring.factors.length > 0 ? (
              currentScoring.factors.map((factor, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-300 py-1 border-b border-darkBorder/30">
                  <span className="text-slate-400">{factor.signal}</span>
                  <span className={`font-mono font-bold ${factor.points > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {factor.points > 0 ? `+${factor.points}` : factor.points}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic text-center py-2">No active scoring factors logged.</div>
            )}
          </div>

          {currentScoring?.calculated_at && (
            <div className="mt-3 pt-2 border-t border-darkBorder/40 text-[10px] text-slate-500 text-right">
              Updated: {new Date(currentScoring.calculated_at).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
