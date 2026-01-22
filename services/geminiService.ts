
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Match, PredictionResult, PredictionConfidence, BettingOdds, MatchVerificationResult, PickStatus } from "../types";

// Helper to initialize Gemini
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// HELPER: Clean score string to ensure it's just "X - Y"
const cleanScore = (rawScore: string): string => {
  if (!rawScore) return "N/A";
  const match = rawScore.match(/(\d+)\s*[-–:]\s*(\d+)/);
  if (match) {
    return `${match[1]} - ${match[2]}`;
  }
  return rawScore.length > 10 ? "N/A" : rawScore;
};

// HELPER: Clean team name
const cleanTeamName = (rawName: string): string => {
  if (!rawName) return "Unknown Team";
  let name = rawName;

  // Aggressive cleaning for Vietnamese betting screenshots
  const noisePatterns = [
    /\s*[-–—]?\s*Tổng\s*số\s*phạt\s*góc/gi,
    /\s*[-–—]?\s*Total\s*Corners/gi,
    /\s*[-–—]?\s*Phạt\s*góc/gi,
    /\s*[-–—]?\s*Corners/gi,
    /\s*\(n\)/gi, // Neutral ground
    /\s*[-–—]?\s*Thẻ\s*phạt/gi,
    /\s*[-–—]?\s*Bookings/gi,
    /\s*W\s*$/i, // Women
    /\s*U\d+\s*$/i // Youth
  ];

  noisePatterns.forEach(pattern => {
    name = name.replace(pattern, '');
  });

  name = name.replace(/[-–—]\s*$/, '');
  return name.trim();
};

export const fetchUpcomingMatches = async (): Promise<Match[]> => {
  const ai = getAiClient();
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `
    Tìm danh sách các trận đấu bóng đá quan trọng diễn ra vào hôm nay (${today}) và ngày mai. 
    Ưu tiên các giải đấu lớn: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Europa League.
    
    Yêu cầu:
    - Lọc bỏ các giải giao hữu.
    - Đảm bảo tên đội bóng chính xác.
  `;

  const matchSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        homeTeam: { type: Type.STRING },
        awayTeam: { type: Type.STRING },
        league: { type: Type.STRING },
        time: { type: Type.STRING },
        date: { type: Type.STRING },
      },
      required: ["id", "homeTeam", "awayTeam", "league", "time", "date"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: matchSchema,
      },
    });

    let jsonString = response.text || "[]";
    jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }
};

export const extractMatchInfoFromText = async (text: string): Promise<Match | null> => {
  const ai = getAiClient();
  const prompt = `
      Extract match details and betting odds from this user text: "${text}".
      
      Instructions:
      1. Identify Home Team and Away Team.
      2. Identify the League if mentioned (or guess based on teams).
      3. **CRITICAL**: Extract specific odds/lines mentioned.
         - "tài góc 9.5" -> betType: "Kèo Góc", overUnderLine: "9.5"
         - "Galatasaray chấp 0.5" -> betType: "Kèo Handicap", handicap: "0.5"
         - "Thẻ phạt tài 4.5" -> betType: "Kèo Thẻ", overUnderLine: "4.5"
      
      Return JSON:
      {
        "homeTeam": "string",
        "awayTeam": "string",
        "league": "string",
        "betInfo": {
           "betType": "string",
           "handicap": "string",
           "overUnderLine": "string"
        }
      }
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let jsonString = response.text || "{}";
    jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
    const res = JSON.parse(jsonString);

    if (!res.homeTeam || !res.awayTeam) return null;

    const odds: BettingOdds | undefined = res.betInfo ? {
      type: res.betInfo.betType || "Kèo Tự Nhập",
      handicap: res.betInfo.handicap || "N/A",
      homeOdds: "N/A",
      awayOdds: "N/A",
      overUnder: res.betInfo.overUnderLine || "N/A",
      overOdds: "N/A",
      underOdds: "N/A",
      rawText: text
    } : undefined;

    return {
      id: `text-scan-${Date.now()}`,
      homeTeam: res.homeTeam,
      awayTeam: res.awayTeam,
      league: res.league || "Giải Đấu",
      time: "Hôm nay",
      date: "Hôm nay",
      scannedOdds: odds,
      allOdds: odds ? [odds] : []
    };

  } catch (error) {
    console.error("Error parsing text input:", error);
    return null;
  }
};

export const extractMatchInfoFromImages = async (imagesBase64: string[]): Promise<{ matches: Match[]; isList: boolean; tacticalAnalysis: string } | null> => {
  const ai = getAiClient();

  if (imagesBase64.length === 0) return null;

  const prompt = `
    Analyze these sports betting screenshots (Asian View). 
    
    OBJECTIVE: Extract ALL matches and ALL betting lines available in the images.

    INSTRUCTIONS:
    1. **IDENTIFY MATCHES**: Look for team names (e.g. Feyenoord vs Sturm Graz).
    2. **GROUP BY MATCH**: If multiple images show the same match (even if one shows Corners and one shows Handicap), group them under the SAME match entry.
    3. **EXTRACT ALL LINES**:
       - A single match often has multiple rows (e.g. HDP -3.0, HDP -2.5, HDP -3.5).
       - **EXTRACT THEM ALL**. Do not just pick one.
       - Extract the "Bet Type" (Kèo Chấp, Kèo Góc/Corners, Kèo Thẻ/Cards).
       - If a row is for "1st Half" (1H), mark it in the rawText or type, but prioritize Full Time (FT).

    Return JSON structure:
    {
      "tacticalAnalysis": "Brief observation of visible form/standings.",
      "matches": [
        {
          "homeTeam": "string",
          "awayTeam": "string",
          "league": "string",
          "time": "string",
          "oddsList": [
             {
               "betType": "Kèo Chấp | Kèo Góc | Kèo Thẻ",
               "handicap": "string",
               "handicapHomeOdds": "string",
               "handicapAwayOdds": "string",
               "overUnderLine": "string",
               "overOdds": "string",
               "underOdds": "string",
               "scope": "FT or 1H" 
             }
          ]
        }
      ]
    }
  `;

  const parts = imagesBase64.map(img => {
    const cleanData = img.split(',')[1] || img;
    return { inlineData: { mimeType: 'image/png', data: cleanData } };
  });

  // Add prompt as the last part
  parts.push({ text: prompt } as any);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });

    let jsonString = response.text || "{}";
    jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
    if (jsonString.startsWith("```")) jsonString = jsonString.slice(3);
    if (jsonString.endsWith("```")) jsonString = jsonString.slice(0, -3);

    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (e) {
      console.warn("Raw JSON parse failed, trying partial extraction");
      const start = jsonString.indexOf('{');
      const end = jsonString.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        result = JSON.parse(jsonString.substring(start, end + 1));
      } else {
        return null;
      }
    }

    // --- DEDUPLICATION & MERGING LOGIC ---
    const uniqueMatchesMap = new Map<string, Match>();

    (result.matches || []).forEach((m: any) => {
      const home = cleanTeamName(m.homeTeam);
      const away = cleanTeamName(m.awayTeam);
      // STRICT KEY: Only Team vs Team. Ignore Type here to allow merging.
      const key = `${home.toLowerCase()}_vs_${away.toLowerCase()}`;

      // Prepare Odds List for this specific entry
      const entryOdds: BettingOdds[] = (m.oddsList || []).map((o: any) => ({
        type: o.betType || "Kèo Chấp",
        handicap: o.handicap || "0",
        homeOdds: o.handicapHomeOdds || "N/A",
        awayOdds: o.handicapAwayOdds || "N/A",
        overUnder: o.overUnderLine || "N/A",
        overOdds: o.overOdds || "N/A",
        underOdds: o.underOdds || "N/A",
        rawText: `${o.scope || 'FT'} | HDP ${o.handicap} | TX ${o.overUnderLine}`
      }));

      if (uniqueMatchesMap.has(key)) {
        // MERGE: Match exists, append new odds to it
        const existingMatch = uniqueMatchesMap.get(key)!;
        const combinedOdds = [...(existingMatch.allOdds || []), ...entryOdds];

        // Remove exact duplicates from combinedOdds if any
        const uniqueOdds = combinedOdds.filter((v, i, a) =>
          a.findIndex(t => t.rawText === v.rawText && t.type === v.type && t.handicap === v.handicap) === i
        );

        existingMatch.allOdds = uniqueOdds;

        // Update scannedOdds to be the "Main" line (prefer Handicap FT)
        existingMatch.scannedOdds = uniqueOdds.find(o => o.type === "Kèo Chấp" && !o.rawText.includes("1H")) || uniqueOdds[0];

      } else {
        // NEW: Create new match
        const matchObj: Match = {
          id: `${home}-${away}-${Date.now()}`,
          homeTeam: home,
          awayTeam: away,
          league: m.league || "Giải Đấu",
          time: m.time || "Sắp đá",
          date: "Hôm nay",
          allOdds: entryOdds,
          scannedOdds: entryOdds[0] // Default to first found
        };
        uniqueMatchesMap.set(key, matchObj);
      }
    });

    const matches = Array.from(uniqueMatchesMap.values());

    if (matches.length > 0) {
      return {
        isList: matches.length > 1,
        matches,
        tacticalAnalysis: result.tacticalAnalysis || ""
      };
    }
    return null;

  } catch (error) {
    console.error("Image extraction error", error);
    return null;
  }
};

export const analyzeMatchDetails = async (
  match: Match,
  customInstruction: string = "",
  imagesBase64: string[] | null = null,
  scannedOdds: BettingOdds | null = null,
  scannedTacticalAnalysis: string | null = null
): Promise<PredictionResult> => {
  const ai = getAiClient();

  // Prepare ALL odds for the prompt
  const allOddsText = match.allOdds && match.allOdds.length > 0
    ? match.allOdds.map(o =>
      `- [${o.type}] HDP: ${o.handicap} (H:${o.homeOdds}/A:${o.awayOdds}) | O/U: ${o.overUnder} (O:${o.overOdds}/U:${o.underOdds}) [${o.rawText}]`
    ).join('\n')
    : (scannedOdds ? `- [${scannedOdds.type}] HDP: ${scannedOdds.handicap} | O/U: ${scannedOdds.overUnder}` : "No specific odds scanned.");

  const analysisSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      scorePrediction: { type: Type.STRING },
      cornerPrediction: {
        type: Type.OBJECT,
        properties: {
          prediction: { type: Type.STRING },
          analysis: { type: Type.STRING }
        },
        required: ["prediction", "analysis"]
      },
      cardPrediction: {
        type: Type.OBJECT,
        properties: {
          prediction: { type: Type.STRING },
          analysis: { type: Type.STRING }
        },
        required: ["prediction", "analysis"]
      },
      mainPick: {
        type: Type.OBJECT,
        properties: {
          pick: { type: Type.STRING, description: "Must select one specific line from the provided odds list." },
          confidence: { type: Type.STRING, enum: ["Cao", "Trung bình", "Thấp"] },
          reasoning: { type: Type.STRING, description: "Explain why this specific odds line (from the list) is the best value. Compare it with others if necessary." }
        },
        required: ["pick", "confidence", "reasoning"]
      },
      detailedAnalysis: {
        type: Type.OBJECT,
        properties: {
          homeForm: { type: Type.STRING },
          awayForm: { type: Type.STRING },
          headToHead: { type: Type.STRING },
          referee: { type: Type.STRING },
          stadiumInfluence: { type: Type.STRING }
        },
        required: ["homeForm", "awayForm", "headToHead", "referee", "stadiumInfluence"]
      },
      advancedMetrics: {
        type: Type.OBJECT,
        properties: {
          impliedProbability: { type: Type.STRING },
          dominanceIndex: { type: Type.STRING, description: "Use this field to explain CORRELATION between Cards and Corners." },
          poissonXG: { type: Type.STRING },
          motivation: { type: Type.STRING },
          wingerType: { type: Type.STRING },
          refereeStyle: { type: Type.STRING },
          matchContext: { type: Type.STRING },
          marketTrend: { type: Type.STRING }
        },
        required: ["poissonXG", "marketTrend"]
      }
    },
    required: ["scorePrediction", "cornerPrediction", "cardPrediction", "mainPick", "detailedAnalysis", "advancedMetrics"]
  };

  let basePrompt = `
    Đóng vai một Chuyên gia Betting (Pro Trader).
    Phân tích trận: ${match.homeTeam} vs ${match.awayTeam}.

    ---------------------------------------------------
    ** DANH SÁCH TOÀN BỘ KÈO (SCANNED ODDS LIST): **
    ${allOddsText}
    
    (Lưu ý: Danh sách trên có thể chứa nhiều mức kèo khác nhau cho cùng một loại cược. Hãy so sánh để tìm ra kèo thơm nhất.)
    ---------------------------------------------------
    
    Instruction: "${customInstruction}"

    YÊU CẦU PHÂN TÍCH:
    1. **SO SÁNH KÈO (Line Shopping)**: 
       - Bạn có danh sách nhiều kèo (VD: Góc 9.5, Góc 10.0). Hãy chọn kèo nào có lợi nhất cho người chơi (VD: Nếu đánh Tài Góc, chọn 9.5 lợi hơn 10.0).
       - Nếu kèo chính (Main Line) là kèo "Bẫy" (Trap), hãy khuyên người chơi chọn kèo phụ (Alternative Line) an toàn hơn.

    2. **TRAP WARNING**:
       - Cảnh báo nếu Odds ăn quá cao (>0.98) ở cửa trên.

    3. **TƯƠNG QUAN (Correlation)**:
       - Phân tích mối liên hệ giữa thế trận, phạt góc và thẻ phạt.

    OUTPUT:
    - Main Pick: Phải ghi rõ chọn kèo nào (VD: "Tài Góc 9.5" thay vì chỉ nói "Tài Góc").
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: basePrompt }] },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: analysisSchema
      },
    });

    let jsonString = response.text || "{}";
    jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();

    let rawResult;
    try {
      rawResult = JSON.parse(jsonString);
    } catch (e) {
      console.warn("Analysis: Raw JSON parse failed, trying partial extraction");
      // Try to find the JSON object within the text
      const start = jsonString.indexOf('{');
      const end = jsonString.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        try {
          rawResult = JSON.parse(jsonString.substring(start, end + 1));
        } catch (innerE) {
          console.error("Analysis: Partial extraction failed", innerE);
          console.log("Failed Text:", jsonString);
          throw new Error("Không thể đọc dữ liệu từ AI (JSON Error).");
        }
      } else {
        console.error("Analysis: No JSON found in response");
        console.log("Failed Text:", jsonString);
        throw new Error("AI không trả về dữ liệu phân tích hợp lệ.");
      }
    }

    const safeResult: PredictionResult = {
      matchId: match.id,
      scorePrediction: cleanScore(rawResult.scorePrediction) || "Dự đoán...",
      cornerPrediction: {
        prediction: rawResult.cornerPrediction?.prediction || "Tài/Xỉu Góc",
        analysis: rawResult.cornerPrediction?.analysis || "Dựa trên phong cách đá cánh."
      },
      cardPrediction: {
        prediction: rawResult.cardPrediction?.prediction || "Tài/Xỉu Thẻ",
        analysis: rawResult.cardPrediction?.analysis || "Dựa trên tính chất trận đấu."
      },
      mainPick: {
        pick: rawResult.mainPick?.pick || "Kèo Sáng",
        confidence: (rawResult.mainPick?.confidence as PredictionConfidence) || PredictionConfidence.MEDIUM,
        reasoning: rawResult.mainPick?.reasoning || "Dựa trên phân tích chuyên sâu."
      },
      detailedAnalysis: {
        homeForm: rawResult.detailedAnalysis?.homeForm || "Phong độ ổn định",
        awayForm: rawResult.detailedAnalysis?.awayForm || "Phong độ ổn định",
        headToHead: rawResult.detailedAnalysis?.headToHead || "Cân bằng",
        referee: rawResult.detailedAnalysis?.referee || "Trung bình",
        stadiumInfluence: rawResult.detailedAnalysis?.stadiumInfluence || "Bình thường"
      },
      advancedMetrics: {
        impliedProbability: rawResult.advancedMetrics?.impliedProbability || "50/50",
        dominanceIndex: rawResult.advancedMetrics?.dominanceIndex || "Tương quan Thẻ/Góc: Bình thường",
        poissonXG: rawResult.advancedMetrics?.poissonXG || "1.2 - 1.1",
        motivation: rawResult.advancedMetrics?.motivation || "Cao",
        wingerType: rawResult.advancedMetrics?.wingerType || "Đa dạng",
        refereeStyle: rawResult.advancedMetrics?.refereeStyle || "Tiêu chuẩn",
        matchContext: rawResult.advancedMetrics?.matchContext || "Quan trọng",
        marketTrend: rawResult.advancedMetrics?.marketTrend || "Ổn định"
      }
    };

    return safeResult;
  } catch (error) {
    console.error("Error analyzing match:", error);
    throw error;
  }
};

export const verifyMatchResult = async (
  match: Match,
  prediction: PredictionResult,
  savedTimestamp: number
): Promise<MatchVerificationResult> => {
  const ai = getAiClient();
  const dateStr = new Date(savedTimestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `
        Find the final result for: ${match.homeTeam} vs ${match.awayTeam} (${match.league}) around ${dateStr}.
        Return JSON with actual scores and corner/card stats.
    `;

  const resultSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      actualScore: { type: Type.STRING },
      actualCorners: { type: Type.STRING },
      actualCards: { type: Type.STRING },
      outcomes: {
        type: Type.OBJECT,
        properties: {
          main: { type: Type.STRING, enum: ["won", "lost", "pending"] },
          score: { type: Type.STRING, enum: ["pending"] },
          corner: { type: Type.STRING, enum: ["won", "lost", "pending"] },
          card: { type: Type.STRING, enum: ["won", "lost", "pending"] },
        },
        required: ["main", "score", "corner", "card"]
      },
      note: { type: Type.STRING }
    },
    required: ["actualScore", "outcomes"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: resultSchema,
      },
    });

    let jsonString = response.text || "{}";
    jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonString) as MatchVerificationResult;

  } catch (error) {
    console.error("Error verifying match:", error);
    throw new Error("Không thể tra cứu kết quả lúc này.");
  }
};
