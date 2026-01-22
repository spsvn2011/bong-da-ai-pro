import React from 'react';
import { PredictionResult, Match, PredictionConfidence, BettingOdds } from '../types';
import { Brain, TrendingUp, Flag, CreditCard, ShieldAlert, Users, Scale, Save, CheckCircle, BarChart3, Calculator, Target, Zap, Activity, Gavel, GitPullRequest, Flame, LineChart, ChevronRight, ScanEye, AlertTriangle, Link2 } from 'lucide-react';

interface AnalysisResultProps {
  match: Match;
  result: PredictionResult;
  onSave?: (match: Match, result: PredictionResult) => void;
  isSaved?: boolean;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ match, result, onSave, isSaved = false }) => {
  const getConfidenceColor = (conf: PredictionConfidence) => {
    switch(conf) {
      case PredictionConfidence.HIGH: return 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]';
      case PredictionConfidence.MEDIUM: return 'bg-yellow-500 text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.4)]';
      case PredictionConfidence.LOW: return 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]';
    }
  };

  const scannedOdds = match.scannedOdds;
  const allOdds = match.allOdds || (scannedOdds ? [scannedOdds] : []);

  // Group odds by Type for display
  const groupedOdds = allOdds.reduce<Record<string, BettingOdds[]>>((acc, odd) => {
      const type = odd.type || "Khác";
      if (!acc[type]) acc[type] = [];
      acc[type].push(odd);
      return acc;
  }, {});

  return (
    <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-fade-in relative group transition-all duration-300 hover:shadow-emerald-900/20">
      
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50 blur-[2px]"></div>

      {/* Header: Scoreboard Style */}
      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-6 border-b border-white/5 relative overflow-hidden">
        {/* Abstract Pattern */}
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        
        <div className="relative z-10 flex flex-col items-center pointer-events-none">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-4 bg-slate-950/50 px-3 py-1 rounded-full border border-white/5">
                {match.league} • {match.time}
            </div>
            
            <div className="flex w-full justify-between items-center max-w-lg gap-4">
                <div className="text-center w-1/3 flex flex-col justify-center items-center">
                    <h2 className="text-lg md:text-xl font-bold text-white leading-tight break-words max-w-full">{match.homeTeam}</h2>
                </div>
                
                <div className="flex flex-col items-center w-1/3 flex-shrink-0">
                    <div className="bg-slate-950 border border-slate-700 px-4 py-2 rounded-lg shadow-inner mb-2 max-w-full text-center">
                        <span className="text-xl md:text-2xl font-mono font-bold text-emerald-400 tracking-wider break-words">{result.scorePrediction}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase">Dự đoán tỷ số</span>
                </div>

                <div className="text-center w-1/3 flex flex-col justify-center items-center">
                    <h2 className="text-lg md:text-xl font-bold text-white leading-tight break-words max-w-full">{match.awayTeam}</h2>
                </div>
            </div>
        </div>

        {/* Save Button */}
        {onSave && (
          <button 
            onClick={() => onSave(match, result)}
            disabled={isSaved}
            className={`absolute top-6 right-6 p-2 rounded-lg border transition-all z-20 ${
              isSaved 
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 cursor-default' 
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer active:scale-95'
            }`}
          >
            {isSaved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          </button>
        )}
      </div>

      <div className="p-6 lg:p-8">
        
        {/* SCANNED DATA SECTION (UPDATED) */}
        {allOdds.length > 0 && (
            <div className="mb-6 bg-slate-950/40 rounded-xl border border-white/5 p-4 relative overflow-hidden">
                <div className="flex items-center space-x-2 mb-3 border-b border-white/5 pb-2">
                    <ScanEye className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Dữ liệu từ ảnh (Tổng hợp)</span>
                </div>
                
                <div className="space-y-4">
                    {Object.entries(groupedOdds).map(([type, odds], idx) => (
                        <div key={idx} className="space-y-2">
                             <div className="text-[10px] font-bold text-emerald-500 uppercase">{type}</div>
                             <div className="grid grid-cols-1 gap-2">
                                {odds.map((odd, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-900/50 px-3 py-2 rounded border border-white/5 text-xs font-mono">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-slate-400 w-16">{odd.rawText.includes("1H") ? "Hiệp 1" : "Cả trận"}</span>
                                            <div>
                                                <span className="text-emerald-400 font-bold mr-2">HDP {odd.handicap}</span>
                                                <span className="text-slate-500 text-[10px] mr-3">({odd.homeOdds}/{odd.awayOdds})</span>
                                                <span className="text-blue-400 font-bold mr-2">TX {odd.overUnder}</span>
                                                <span className="text-slate-500 text-[10px]">({odd.overOdds}/{odd.underOdds})</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* HERO SECTION: MAIN PICK */}
        <div className="relative mb-8 group/pick">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/40 to-slate-900/40 rounded-2xl blur-xl opacity-0 group-hover/pick:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl overflow-hidden">
             
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
               <Brain size={120} />
             </div>

             <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
                <div className="flex-1">
                   <div className="flex items-center space-x-2 mb-3">
                     <div className="p-1.5 bg-emerald-500 rounded-md">
                        <TrendingUp className="w-4 h-4 text-white" />
                     </div>
                     <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">Kèo Sáng Nhất (Main Pick)</span>
                   </div>
                   
                   <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-3 leading-none tracking-tight">
                     {result.mainPick.pick}
                   </h3>
                   
                   <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-emerald-500/50 pl-4 py-1 italic">
                     "{result.mainPick.reasoning}"
                   </p>
                </div>

                <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${getConfidenceColor(result.mainPick.confidence)}`}>
                        <Zap className="w-3 h-3 mr-1.5 fill-current" />
                        Độ tin cậy: {result.mainPick.confidence}
                    </span>
                </div>
             </div>
          </div>
        </div>

        {/* METRICS & ANALYSIS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Data & Metrics (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
             
             {/* Pro Insights Cards */}
             {result.advancedMetrics && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Winger */}
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5 flex flex-col justify-between hover:bg-slate-800/60 transition-colors">
                     <div className="flex items-center text-xs text-orange-400 font-bold mb-2 uppercase">
                        <GitPullRequest className="w-3 h-3 mr-1.5" /> Lối Đá Cánh
                     </div>
                     <div className="text-xs font-medium text-slate-200 leading-tight">{result.advancedMetrics.wingerType || "Đang cập nhật..."}</div>
                  </div>
                  {/* Ref */}
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5 flex flex-col justify-between hover:bg-slate-800/60 transition-colors">
                     <div className="flex items-center text-xs text-blue-400 font-bold mb-2 uppercase">
                        <Gavel className="w-3 h-3 mr-1.5" /> Trọng Tài
                     </div>
                     <div className="text-xs font-medium text-slate-200 leading-tight">{result.advancedMetrics.refereeStyle || "Trung bình"}</div>
                  </div>
                  {/* Motivation */}
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5 flex flex-col justify-between hover:bg-slate-800/60 transition-colors">
                     <div className="flex items-center text-xs text-red-400 font-bold mb-2 uppercase">
                        <Flame className="w-3 h-3 mr-1.5" /> Động Lực
                     </div>
                     <div className="text-xs font-medium text-slate-200 leading-tight">{result.advancedMetrics.matchContext || "Quan trọng"}</div>
                  </div>
               </div>
             )}

             {/* Corner & Card Predictions */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Corner */}
               <div className="bg-slate-800/30 rounded-xl border border-white/5 p-4 flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                  <div className="flex items-center space-x-2 mb-3 text-slate-400">
                    <Flag className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs uppercase font-bold tracking-wider">Kèo Góc</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-2">{result.cornerPrediction.prediction}</div>
                  <div className="mt-auto text-xs text-slate-400 leading-relaxed bg-black/20 p-2 rounded border border-white/5">
                    {result.cornerPrediction.analysis}
                  </div>
               </div>

               {/* Card */}
               <div className="bg-slate-800/30 rounded-xl border border-white/5 p-4 flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                  <div className="flex items-center space-x-2 mb-3 text-slate-400">
                    <CreditCard className="w-4 h-4 text-red-500" />
                    <span className="text-xs uppercase font-bold tracking-wider">Kèo Thẻ</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-2">{result.cardPrediction.prediction}</div>
                  <div className="mt-auto text-xs text-slate-400 leading-relaxed bg-black/20 p-2 rounded border border-white/5">
                    {result.cardPrediction.analysis}
                  </div>
               </div>
             </div>
             
             {/* MARKET TREND & CORRELATION */}
             {result.advancedMetrics && (
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-black/30 rounded-xl p-3 border border-white/5 flex items-center space-x-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                       <Link2 className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="text-[10px] text-slate-500 uppercase font-bold">Logic Tương Quan</div>
                       {/* Use dominanceIndex as a placeholder for correlation logic to avoid breaking types */}
                       <div className="text-xs text-slate-200 font-semibold line-clamp-2">{result.advancedMetrics.dominanceIndex || "Không có dữ liệu"}</div>
                    </div>
                 </div>
                 <div className="bg-black/30 rounded-xl p-3 border border-white/5 flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                       <LineChart className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="text-[10px] text-slate-500 uppercase font-bold">Xu Hướng Odds</div>
                       <div className="text-xs text-slate-200 font-semibold line-clamp-2">{result.advancedMetrics.marketTrend || "Ổn định"}</div>
                    </div>
                 </div>
               </div>
             )}
          </div>

          {/* RIGHT: Detailed Analysis (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-800/20 rounded-2xl border border-white/5 p-5">
             <div className="flex items-center space-x-2 mb-4 text-white font-bold text-sm uppercase tracking-wide border-b border-white/5 pb-3">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span>Deep Dive Analysis</span>
             </div>

             <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
                {/* Trap Warning Section (If implicit in analysis) */}
                <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-500/30">
                    <div className="flex items-center mb-1">
                        <AlertTriangle className="w-3 h-3 text-yellow-500 mr-2" />
                        <span className="text-[10px] text-yellow-500 uppercase font-bold">Lưu ý Kèo Dụ (Trap Warning)</span>
                    </div>
                    <p className="text-slate-300 text-xs italic">
                        {/* We rely on AI incorporating this into the reasoning or dominance index */}
                        "Hãy cẩn trọng với các mức kèo chấp sâu nhưng ăn tiền quá cao (trên 0.95). Ưu tiên mức chấp nhẹ hơn để an toàn (Safety First)."
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-3">
                   <div className="flex items-center text-xs text-slate-500 font-bold uppercase">
                      <Users className="w-3 h-3 mr-2" /> Phong độ gần đây
                   </div>
                   <div className="pl-3 border-l border-emerald-500/30 space-y-3">
                      <div>
                         <span className="text-emerald-400 text-xs font-bold block mb-1">{match.homeTeam}</span>
                         <p className="text-slate-300 text-xs leading-relaxed">{result.detailedAnalysis.homeForm}</p>
                      </div>
                      <div>
                         <span className="text-blue-400 text-xs font-bold block mb-1">{match.awayTeam}</span>
                         <p className="text-slate-300 text-xs leading-relaxed">{result.detailedAnalysis.awayForm}</p>
                      </div>
                   </div>
                </div>

                {/* H2H */}
                <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5">
                   <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Đối đầu (Head to Head)</span>
                   <p className="text-slate-300 text-xs">{result.detailedAnalysis.headToHead}</p>
                </div>
                
                {/* Stadium/Ref Text */}
                <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5">
                   <div className="flex items-center mb-1">
                      <Scale className="w-3 h-3 text-slate-400 mr-2" />
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Yếu tố sân bãi</span>
                   </div>
                   <p className="text-slate-300 text-xs">{result.detailedAnalysis.stadiumInfluence}</p>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};