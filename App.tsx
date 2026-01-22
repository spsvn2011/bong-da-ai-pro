
import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, PlayCircle, Loader2, AlertCircle, Brain, Image as ImageIcon, X, Sparkles, ScanEye, Save, Trash2, Zap, Users, History, Check, XCircle, BarChart, Percent, Flag, CreditCard, Edit3, Target, MoreHorizontal, Search, CheckCheck, Plus, MessageSquare } from 'lucide-react';
import { MatchList } from './components/MatchList';
import { AnalysisResult as AnalysisResultComponent } from './components/AnalysisResult';
import { fetchUpcomingMatches, analyzeMatchDetails, extractMatchInfoFromImages, extractMatchInfoFromText, verifyMatchResult } from './services/geminiService';
import { Match, PredictionResult, LoadingState, BettingOdds, SavedPick, PickStatus, PickOutcomes } from './types';

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<PredictionResult[]>([]);
  
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState<LoadingState>({ isLoading: false, message: '' });
  const [identifyingMatch, setIdentifyingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // UI Tabs
  const [activeTab, setActiveTab] = useState<'analysis' | 'history'>('analysis');

  // Custom Input States
  const [customInstruction, setCustomInstruction] = useState('');
  // Changed from single image to array of images
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  // Scanned Match State
  const [scannedMatch, setScannedMatch] = useState<Match | null>(null);
  const [scannedTacticalInfo, setScannedTacticalInfo] = useState<string | null>(null);

  // Saved Picks State
  const [savedPicks, setSavedPicks] = useState<SavedPick[]>([]);
  
  // Verification State
  const [verifyingPickIds, setVerifyingPickIds] = useState<string[]>([]);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);

  // Load from LocalStorage on Mount
  useEffect(() => {
    const saved = localStorage.getItem('football_ai_picks');
    if (saved) {
      try {
        setSavedPicks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved picks");
      }
    }
  }, []);

  // Save to LocalStorage whenever savedPicks changes
  useEffect(() => {
    localStorage.setItem('football_ai_picks', JSON.stringify(savedPicks));
  }, [savedPicks]);

  // Helper for confidence styling
  const getConfidenceStyle = (confidence: string) => {
    switch (confidence) {
      case 'Cao':
        return {
          bg: 'from-emerald-900/30 to-slate-900/30',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
          icon: 'text-emerald-500',
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
        };
      case 'Trung bình':
        return {
          bg: 'from-yellow-900/30 to-slate-900/30',
          border: 'border-yellow-500/40',
          text: 'text-yellow-400',
          icon: 'text-yellow-500',
          badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
        };
      case 'Thấp':
        return {
          bg: 'from-red-900/30 to-slate-900/30',
          border: 'border-red-500/40',
          text: 'text-red-400',
          icon: 'text-red-500',
          badge: 'bg-red-500/20 text-red-400 border-red-500/20'
        };
      default:
        return {
          bg: 'from-slate-800 to-slate-900',
          border: 'border-slate-700',
          text: 'text-slate-300',
          icon: 'text-slate-400',
          badge: 'bg-slate-700 text-slate-300'
        };
    }
  };

  // Load matches
  const loadMatches = async () => {
    setMatchesLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSelectedMatchIds([]);
    setAnalysisResults([]);
    try {
      const data = await fetchUpcomingMatches();
      setMatches(data);
    } catch (err) {
      setError("Không thể tải danh sách trận đấu. Vui lòng kiểm tra API Key hoặc thử lại sau.");
    } finally {
      setMatchesLoading(false);
    }
  };

  const toggleMatchSelection = (id: string) => {
    setSuccessMessage(null);
    setSelectedMatchIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  // Add image to the list without processing immediately
  const addImage = (base64Image: string) => {
    setSelectedImages(prev => [...prev, base64Image]);
    setSuccessMessage(null);
    setError(null);
  };

  const removeImage = (index: number) => {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleScanInput = async () => {
    // Priority: Images > Text
    if (selectedImages.length > 0) {
        await handleScanImages();
    } else if (customInstruction.trim().length > 0) {
        await handleTextScan();
    } else {
        setError("Vui lòng nhập văn bản hoặc tải ảnh để quét.");
    }
  };

  const handleTextScan = async () => {
      setIdentifyingMatch(true);
      setSuccessMessage(null);
      setError(null);
      setScannedMatch(null);
      setSelectedMatchIds([]);
      
      try {
          const match = await extractMatchInfoFromText(customInstruction);
          if (match) {
              setMatches([match]); // Replace list with this single text-derived match
              setScannedMatch(match);
              setSelectedMatchIds([match.id]);
              setSuccessMessage(`Đã nhận diện từ text: ${match.homeTeam} vs ${match.awayTeam}`);
          } else {
              setError("Không thể nhận diện trận đấu từ văn bản. Hãy ghi rõ tên đội.");
          }
      } catch (err) {
          setError("Lỗi xử lý văn bản.");
      } finally {
          setIdentifyingMatch(false);
      }
  };

  const handleScanImages = async () => {
    setIdentifyingMatch(true);
    setSuccessMessage(null);
    setError(null);
    setScannedMatch(null);
    setScannedTacticalInfo(null);
    setSelectedMatchIds([]);

    try {
      const result = await extractMatchInfoFromImages(selectedImages);
      
      if (result && result.matches.length > 0) {
        setMatches(result.matches);
        setScannedTacticalInfo(result.tacticalAnalysis);
        
        if (result.matches.length > 1) {
             setSuccessMessage(`Đã tìm thấy ${result.matches.length} trận đấu từ ${selectedImages.length} ảnh.`);
             setScannedMatch(null);
        } else {
             const singleMatch = result.matches[0];
             setScannedMatch(singleMatch);
             setSuccessMessage(`Đã đọc: ${singleMatch.homeTeam} vs ${singleMatch.awayTeam}`);
             setSelectedMatchIds([singleMatch.id]);
        }
      } else {
        setError("Không nhận diện được thông tin. Hãy thử ảnh rõ nét hơn.");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi khi xử lý ảnh.");
    } finally {
      setIdentifyingMatch(false);
    }
  };

  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let foundImage = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        foundImage = true;
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            addImage(event.target?.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
    if (foundImage) {
        setSuccessMessage("Đã thêm ảnh vào hàng đợi.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                addImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        });
    }
  };

  const runAnalysis = async () => {
    if (selectedMatchIds.length === 0) {
      setError("Vui lòng chọn ít nhất một trận đấu để phân tích.");
      return;
    }

    setAnalysisLoading({ isLoading: true, message: 'Bắt đầu phân tích...' });
    setAnalysisResults([]);
    setError(null);
    setSuccessMessage(null);
    setActiveTab('analysis'); 

    const results: PredictionResult[] = [];

    try {
      const matchesToAnalyze = matches.filter(m => selectedMatchIds.includes(m.id));
      
      for (let i = 0; i < matchesToAnalyze.length; i++) {
        const match = matchesToAnalyze[i];
        
        setAnalysisLoading({ 
          isLoading: true, 
          message: `Đang phân tích trận ${i + 1}/${matchesToAnalyze.length}: ${match.homeTeam} vs ${match.awayTeam}...` 
        });

        const result = await analyzeMatchDetails(
            match, 
            customInstruction, 
            selectedImages, // Pass all images
            match.scannedOdds || null, 
            scannedTacticalInfo
        );
        
        results.push(result);
      }

      setAnalysisResults(results);

    } catch (err) {
      setError("Có lỗi xảy ra trong quá trình phân tích.");
    } finally {
      setAnalysisLoading({ isLoading: false, message: '' });
    }
  };

  const savePick = (match: Match, result: PredictionResult) => {
    setSavedPicks(prev => {
      if (prev.some(p => p.match.id === match.id)) return prev;
      
      const newPick: SavedPick = {
        id: Date.now().toString() + Math.random(),
        match, 
        result, 
        timestamp: Date.now(),
        status: 'pending',
        outcomes: {
            main: 'pending',
            score: 'pending',
            corner: 'pending',
            card: 'pending'
        }
      };
      
      return [newPick, ...prev];
    });
    setSuccessMessage("Đã lưu vé cược.");
  };

  const handleSaveAll = () => {
    if (analysisResults.length === 0) return;
    
    let savedCount = 0;
    analysisResults.forEach(result => {
       const match = matches.find(m => m.id === result.matchId) || scannedMatch;
       if (match) {
          // Check if already saved manually to avoid duplicate logic running repeatedly inside setSavedPicks
          const isAlreadySaved = savedPicks.some(p => p.match.id === match.id);
          if (!isAlreadySaved) {
              savePick(match, result);
              savedCount++;
          }
       }
    });

    if (savedCount > 0) {
        setSuccessMessage(`Đã lưu ${savedCount} trận đấu vào lịch sử.`);
    } else {
        setSuccessMessage("Tất cả các trận đã được lưu trước đó.");
    }
  };

  const getNextStatus = (current: PickStatus): PickStatus => {
      if (current === 'pending') return 'won';
      if (current === 'won') return 'lost';
      return 'pending';
  };

  const toggleGranularOutcome = (pickId: string, type: keyof PickOutcomes) => {
    setSavedPicks(prev => prev.map(p => {
        if (p.id !== pickId) return p;
        
        const currentOutcomes = p.outcomes || { main: p.status, score: 'pending', corner: 'pending', card: 'pending' };
        const newStatus = getNextStatus(currentOutcomes[type]);
        
        const updatedOutcomes = { ...currentOutcomes, [type]: newStatus };
        
        let updatedOverallStatus = p.status;
        if (type === 'main') {
            updatedOverallStatus = newStatus;
        }

        return { ...p, outcomes: updatedOutcomes, status: updatedOverallStatus };
    }));
  };

  const updateOverallStatus = (pickId: string, status: PickStatus) => {
    setSavedPicks(prev => prev.map(p => {
      if (p.id !== pickId) return p;
      const currentOutcomes = p.outcomes || { main: 'pending', score: 'pending', corner: 'pending', card: 'pending' };
      return { 
          ...p, 
          status,
          outcomes: { ...currentOutcomes, main: status }
      };
    }));
  };

  const removeSavedPick = (e: React.MouseEvent, pickId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Bạn có chắc muốn xóa vé này khỏi lịch sử?")) {
        setSavedPicks(prev => prev.filter(p => p.id !== pickId));
        setSuccessMessage("Đã xóa vé khỏi lịch sử.");
    }
  };
  
  const handleVerifyResult = async (pick: SavedPick) => {
     if (verifyingPickIds.includes(pick.id)) return;
     
     setVerifyingPickIds(prev => [...prev, pick.id]);
     
     try {
         const result = await verifyMatchResult(pick.match, pick.result, pick.timestamp);
         
         setSavedPicks(prev => prev.map(p => {
            if (p.id !== pick.id) return p;
            
            return {
                ...p,
                status: result.outcomes.main,
                outcomes: result.outcomes,
                verification: {
                    checkedAt: Date.now(),
                    actualScore: result.actualScore,
                    actualCorners: result.actualCorners,
                    actualCards: result.actualCards
                },
                note: result.note || p.note
            };
         }));
     } catch (err) {
         console.error(err);
     } finally {
         setVerifyingPickIds(prev => prev.filter(id => id !== pick.id));
     }
  };

  const handleVerifyAll = async () => {
      setIsVerifyingAll(true);
      setSuccessMessage("Đang tra cứu tất cả các trận chưa có kết quả...");
      
      const pendingPicks = savedPicks.filter(p => p.status === 'pending');
      
      for (const pick of pendingPicks) {
          // Verify sequentially to be gentle on API
          await handleVerifyResult(pick);
      }
      
      setIsVerifyingAll(false);
      setSuccessMessage("Hoàn tất tra cứu.");
  };

  // Stats Calculation Helpers
  const calculateWinRate = (type: keyof PickOutcomes) => {
      const resolved = savedPicks.filter(p => {
          const status = p.outcomes?.[type] || 'pending';
          return status === 'won' || status === 'lost';
      });
      const won = resolved.filter(p => (p.outcomes?.[type]) === 'won');
      
      if (resolved.length === 0) return 0;
      return Math.round((won.length / resolved.length) * 100);
  };

  const countResolved = (type: keyof PickOutcomes) => {
      return savedPicks.filter(p => {
          const status = p.outcomes?.[type] || 'pending';
          return status === 'won' || status === 'lost';
      }).length;
  };

  const mainWinRate = calculateWinRate('main');
  const cornerWinRate = calculateWinRate('corner');
  const cardWinRate = calculateWinRate('card');

  const StatusToggle = ({ status, onClick, label }: { status: PickStatus, onClick: () => void, label?: string }) => {
     let colorClass = "bg-slate-700 text-slate-400 border-slate-600";
     let Icon = MoreHorizontal;

     if (status === 'won') {
         colorClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
         Icon = Check;
     } else if (status === 'lost') {
         colorClass = "bg-red-500/20 text-red-400 border-red-500/50";
         Icon = X;
     }

     return (
         <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase border transition-all hover:brightness-125 ${colorClass}`}
         >
             <Icon className="w-3 h-3" />
             {label && <span>{label}</span>}
         </button>
     );
  }

  // Helper to determine button label
  const getScanButtonLabel = () => {
      if (identifyingMatch) return 'Đang xử lý...';
      if (selectedImages.length > 0) return `Quét Kèo Từ ${selectedImages.length} Ảnh`;
      if (customInstruction.trim().length > 0) return 'Phân Tích Văn Bản';
      return 'Quét Ảnh / Text';
  };

  const getScanButtonIcon = () => {
      if (identifyingMatch) return <Loader2 className="w-4 h-4 animate-spin mr-2" />;
      if (customInstruction.trim().length > 0 && selectedImages.length === 0) return <MessageSquare className="w-4 h-4 mr-2" />;
      return <ScanEye className="w-4 h-4 mr-2" />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-x-hidden" onPaste={handleImagePaste}>
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-900/70 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3 cursor-pointer">
               <Trophy className="w-6 h-6 text-emerald-400" />
               <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-emerald-400">
                  Bóng Đá AI Pro
               </h1>
            </div>
            
            <button 
              onClick={loadMatches}
              disabled={matchesLoading}
              className="relative px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-emerald-500/50 transition-all flex items-center text-sm font-medium text-slate-300"
            >
               <RefreshCw className={`w-4 h-4 mr-2 ${matchesLoading ? 'animate-spin' : ''}`} />
               {matchesLoading ? 'Đang Tải...' : 'Cập Nhật Kèo'}
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {successMessage && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md p-4 rounded-xl flex items-center text-emerald-200 animate-fade-in shadow-lg">
            <CheckCheck className="w-5 h-5 mr-3" /> {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 backdrop-blur-md p-4 rounded-xl flex items-center text-red-200 animate-fade-in shadow-lg">
            <AlertCircle className="w-5 h-5 mr-3" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-xl">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-emerald-400 font-bold uppercase text-xs tracking-widest">
                      <Sparkles className="w-4 h-4 mr-2" /> AI Input Center
                  </div>
                  {selectedImages.length > 0 && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{selectedImages.length} ảnh</span>
                  )}
               </div>
               
               {/* Image Input Area */}
               <div className="mb-4">
                 {selectedImages.length === 0 ? (
                   <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer bg-slate-800/30 hover:bg-slate-800/50 hover:border-emerald-500/50 transition-all group">
                     <ImageIcon className="w-6 h-6 text-slate-400 mb-2 group-hover:text-emerald-400 transition-colors" />
                     <p className="text-xs text-slate-300">Dán hoặc tải nhiều ảnh kèo</p>
                     <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                   </label>
                 ) : (
                   <div className="space-y-3">
                       {/* Thumbnails Scroll */}
                       <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                           {selectedImages.map((img, idx) => (
                               <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 snap-start group">
                                   <img src={img} className="w-full h-full object-cover" />
                                   <button 
                                       onClick={() => removeImage(idx)}
                                       className="absolute top-0 right-0 p-1 bg-black/60 text-white hover:bg-red-500 transition-colors"
                                   >
                                       <X className="w-3 h-3" />
                                   </button>
                               </div>
                           ))}
                           {/* Add More Button */}
                           <label className="flex-shrink-0 w-20 h-20 rounded-lg border border-dashed border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 flex items-center justify-center cursor-pointer transition-all">
                               <Plus className="w-5 h-5 text-slate-500" />
                               <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                           </label>
                       </div>
                   </div>
                 )}
               </div>

               {/* Custom Instruction Area */}
               <textarea
                 value={customInstruction}
                 onChange={(e) => setCustomInstruction(e.target.value)}
                 placeholder="Nhập tên trận, kèo muốn soi (VD: Tài góc 9.5 trận Real vs Barca)..."
                 className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 outline-none h-20 focus:border-emerald-500/50 transition-colors mb-3"
               />

               {/* Combined Scan Button */}
               <button 
                   onClick={handleScanInput}
                   disabled={identifyingMatch || (selectedImages.length === 0 && customInstruction.trim().length === 0)}
                   className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-bold flex items-center justify-center transition-all disabled:opacity-50"
               >
                   {getScanButtonIcon()}
                   {getScanButtonLabel()}
               </button>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 p-1 flex flex-col h-[500px]">
              <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h2 className="font-bold text-white text-sm uppercase">Danh Sách Trận</h2>
                {selectedMatchIds.length > 0 && <span className="bg-emerald-500 text-slate-950 text-[10px] font-bold px-2 rounded">{selectedMatchIds.length}</span>}
              </div>
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                <MatchList matches={matches} selectedMatchIds={selectedMatchIds} onToggleMatch={toggleMatchSelection} isLoading={matchesLoading} />
              </div>
              <div className="p-3 border-t border-white/5">
                <button onClick={runAnalysis} disabled={analysisLoading.isLoading || selectedMatchIds.length === 0} className="w-full py-3 bg-emerald-600 rounded-xl font-bold text-white shadow-lg flex items-center justify-center disabled:opacity-50 hover:bg-emerald-500 transition-all">
                  {analysisLoading.isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PlayCircle className="w-5 h-5 mr-2" />}
                  {analysisLoading.isLoading ? 'Đang Phân Tích...' : 'PHÂN TÍCH NGAY'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-8">
            <div className="flex space-x-4 mb-6 border-b border-white/5 pb-1">
              <button onClick={() => setActiveTab('analysis')} className={`pb-3 px-2 text-sm font-bold uppercase ${activeTab === 'analysis' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500'}`}>Phân Tích (Live)</button>
              <button onClick={() => setActiveTab('history')} className={`pb-3 px-2 text-sm font-bold uppercase ${activeTab === 'history' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-500'}`}>Lịch Sử & Thống Kê</button>
            </div>

            {activeTab === 'analysis' && (
              <div className="space-y-6">
                 {analysisResults.length > 0 && (
                     <div className="flex justify-end mb-4">
                        <button 
                            onClick={handleSaveAll}
                            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold text-sm hover:bg-emerald-500/10 transition-all"
                        >
                            <Save className="w-4 h-4" />
                            <span>Lưu Tất Cả Kết Quả</span>
                        </button>
                     </div>
                 )}
                 {analysisResults.map(result => {
                    const match = matches.find(m => m.id === result.matchId) || scannedMatch;
                    if (!match) return null;
                    const isSaved = savedPicks.some(p => p.match.id === match.id);
                    return <AnalysisResultComponent key={result.matchId} match={match} result={result} onSave={savePick} isSaved={isSaved} />;
                 })}
                 {analysisResults.length === 0 && !analysisLoading.isLoading && (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-3xl">
                      <Brain className="w-16 h-16 text-slate-600 mb-4" />
                      <p>Sẵn sàng phân tích.</p>
                    </div>
                 )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                
                {/* Stats Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Main Pick Stats */}
                  <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-4 rounded-xl relative overflow-hidden">
                     <div className="flex justify-between items-start mb-2">
                        <div className="text-emerald-400 font-bold text-sm uppercase flex items-center"><Zap className="w-4 h-4 mr-1"/> Kèo Handicap</div>
                        <div className="text-xs text-emerald-300/50 bg-emerald-900/30 px-2 py-0.5 rounded">{countResolved('main')} trận</div>
                     </div>
                     <div className="text-3xl font-bold text-white">{mainWinRate}% <span className="text-xs font-normal text-slate-400">Win Rate</span></div>
                  </div>

                  {/* Corner Stats */}
                  <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/20 p-4 rounded-xl relative overflow-hidden">
                     <div className="flex justify-between items-start mb-2">
                        <div className="text-blue-400 font-bold text-sm uppercase flex items-center"><Flag className="w-4 h-4 mr-1"/> Kèo Góc</div>
                        <div className="text-xs text-blue-300/50 bg-blue-900/30 px-2 py-0.5 rounded">{countResolved('corner')} trận</div>
                     </div>
                     <div className="text-3xl font-bold text-white">{cornerWinRate}% <span className="text-xs font-normal text-slate-400">Win Rate</span></div>
                  </div>

                  {/* Card Stats */}
                  <div className="bg-gradient-to-br from-red-900/40 to-slate-900 border border-red-500/20 p-4 rounded-xl relative overflow-hidden">
                     <div className="flex justify-between items-start mb-2">
                        <div className="text-red-400 font-bold text-sm uppercase flex items-center"><CreditCard className="w-4 h-4 mr-1"/> Kèo Thẻ</div>
                        <div className="text-xs text-red-300/50 bg-red-900/30 px-2 py-0.5 rounded">{countResolved('card')} trận</div>
                     </div>
                     <div className="text-3xl font-bold text-white">{cardWinRate}% <span className="text-xs font-normal text-slate-400">Win Rate</span></div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                   <h3 className="text-white font-bold text-lg flex items-center">
                     <BarChart className="w-5 h-5 mr-2 text-slate-400" />
                     Lịch sử ({savedPicks.length})
                   </h3>
                   <button 
                      onClick={handleVerifyAll}
                      disabled={isVerifyingAll}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                   >
                      {isVerifyingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>Tra Cứu Tất Cả (Chưa Xử Lý)</span>
                   </button>
                </div>
                  
                  {savedPicks.length === 0 ? (
                     <div className="text-center py-10 text-slate-500 bg-slate-900/30 rounded-2xl border border-white/5">
                        <Save className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        Chưa có dữ liệu.
                     </div>
                  ) : (
                    savedPicks.map((item) => {
                      const confStyles = getConfidenceStyle(item.result.mainPick.confidence);
                      const outcomes = item.outcomes || { main: 'pending', score: 'pending', corner: 'pending', card: 'pending' };
                      const isVerifying = verifyingPickIds.includes(item.id);

                      return (
                        <div key={item.id} className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all group shadow-lg">
                          <div className="p-3 border-b border-white/5 flex justify-between items-center bg-slate-800/30">
                            <div className="flex items-center space-x-2 overflow-hidden">
                               <div className={`w-1.5 h-8 rounded-full ${item.status === 'won' ? 'bg-emerald-500' : item.status === 'lost' ? 'bg-red-500' : 'bg-slate-600'}`}></div>
                               <div>
                                  <div className="font-bold text-white text-sm truncate">{item.match.homeTeam} <span className="text-slate-500">vs</span> {item.match.awayTeam}</div>
                                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">{item.match.league} • {new Date(item.timestamp).toLocaleDateString('vi-VN')}</div>
                               </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 flex-shrink-0">
                               <button onClick={() => handleVerifyResult(item)} disabled={isVerifying} className="p-2 bg-blue-600/10 text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50">
                                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                               </button>
                               <button onClick={(e) => removeSavedPick(e, item.id)} className="p-2 bg-slate-800 text-slate-400 rounded hover:text-red-400 hover:bg-slate-700">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                          
                          {item.verification && (
                             <div className="bg-black/20 border-b border-white/5 px-4 py-2 flex items-center text-xs text-slate-300">
                                <span className="text-emerald-400 font-bold mr-3">{item.verification.actualScore}</span>
                                <span className="mr-3">• {item.verification.actualCorners} Góc</span>
                                <span>• {item.verification.actualCards} Thẻ</span>
                             </div>
                          )}
                          
                          <div className="p-4 space-y-4">
                            {/* Main Pick */}
                            <div className={`rounded-lg bg-gradient-to-r ${confStyles.bg} border ${confStyles.border} p-3 flex justify-between items-start gap-3`}>
                               <div className="flex-1">
                                    <div className="flex items-center mb-1 text-[10px] uppercase font-bold text-emerald-400"><Zap className="w-3 h-3 mr-1" /> Kèo Handicap</div>
                                    <div className="font-bold text-white text-lg leading-tight mb-1">{item.result.mainPick.pick}</div>
                                    <div className="text-xs text-slate-400 italic opacity-80 line-clamp-2">"{item.result.mainPick.reasoning}"</div>
                               </div>
                               <StatusToggle status={outcomes.main} onClick={() => toggleGranularOutcome(item.id, 'main')} />
                            </div>

                            {/* Sub Markets */}
                            <div className="grid grid-cols-3 gap-2">
                               {/* Score - Reference Only */}
                               <div className="flex flex-col items-center p-2 rounded-lg bg-slate-950/30 border border-white/5">
                                  <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Dự kiến</span>
                                  <span className="font-mono text-white font-bold">{item.result.scorePrediction}</span>
                               </div>
                               {/* Corners */}
                               <div className="flex flex-col items-center justify-between p-2 rounded-lg bg-slate-950/30 border border-white/5 h-full">
                                  <div className="text-center">
                                    <span className="text-[10px] text-blue-400 uppercase font-bold mb-1 block">Góc</span>
                                    <span className="text-xs text-white font-medium block mb-2">{item.result.cornerPrediction.prediction}</span>
                                  </div>
                                  <StatusToggle status={outcomes.corner} onClick={() => toggleGranularOutcome(item.id, 'corner')} />
                               </div>
                               {/* Cards */}
                               <div className="flex flex-col items-center justify-between p-2 rounded-lg bg-slate-950/30 border border-white/5 h-full">
                                  <div className="text-center">
                                    <span className="text-[10px] text-red-400 uppercase font-bold mb-1 block">Thẻ</span>
                                    <span className="text-xs text-white font-medium block mb-2">{item.result.cardPrediction.prediction}</span>
                                  </div>
                                  <StatusToggle status={outcomes.card} onClick={() => toggleGranularOutcome(item.id, 'card')} />
                               </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
