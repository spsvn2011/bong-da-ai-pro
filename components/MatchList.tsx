import React from 'react';
import { Match } from '../types';
import { Calendar, Clock, Trophy, ChevronRight } from 'lucide-react';

interface MatchListProps {
  matches: Match[];
  selectedMatchIds: string[];
  onToggleMatch: (id: string) => void;
  isLoading: boolean;
}

export const MatchList: React.FC<MatchListProps> = ({ matches, selectedMatchIds, onToggleMatch, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3"></div>
        <p className="text-xs uppercase tracking-widest">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 flex flex-col items-center">
        <Trophy className="w-10 h-10 mb-3 opacity-20" />
        <p className="text-sm">Chưa có trận đấu nào.</p>
        <p className="text-xs opacity-60">Vui lòng cập nhật.</p>
      </div>
    );
  }

  // Group by date
  const todayMatches = matches.filter(m => m.date === 'Hôm nay');
  const tomorrowMatches = matches.filter(m => m.date === 'Ngày mai');

  const renderMatchItem = (match: Match) => {
    const isSelected = selectedMatchIds.includes(match.id);
    return (
      <div 
        key={match.id}
        onClick={() => onToggleMatch(match.id)}
        className={`
          relative p-3 rounded-lg border cursor-pointer transition-all duration-200 group
          ${isSelected 
            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
            : 'bg-slate-800/40 border-white/5 hover:border-emerald-500/30 hover:bg-slate-800/70'}
        `}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[70%]">
            {match.league}
          </span>
          <div className={`flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-950 text-slate-400'}`}>
            <Clock className="w-3 h-3" />
            <span>{match.time}</span>
          </div>
        </div>

        <div className="flex justify-between items-center px-1">
          <div className="font-bold text-slate-200 text-sm">{match.homeTeam}</div>
          <div className="text-[10px] text-slate-600 px-1 font-bold">VS</div>
          <div className="font-bold text-slate-200 text-sm text-right">{match.awayTeam}</div>
        </div>

        {isSelected && (
           <div className="absolute inset-y-0 right-0 w-1 bg-emerald-500 rounded-r-lg"></div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {todayMatches.length > 0 && (
        <div>
          <h3 className="flex items-center text-emerald-400 font-bold mb-2 text-[10px] uppercase tracking-widest pl-1">
            <Calendar className="w-3 h-3 mr-1.5" />
            Hôm nay
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {todayMatches.map(renderMatchItem)}
          </div>
        </div>
      )}

      {tomorrowMatches.length > 0 && (
        <div>
          <h3 className="flex items-center text-blue-400 font-bold mb-2 text-[10px] uppercase tracking-widest pl-1">
            <Calendar className="w-3 h-3 mr-1.5" />
            Ngày mai
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {tomorrowMatches.map(renderMatchItem)}
          </div>
        </div>
      )}
    </div>
  );
};