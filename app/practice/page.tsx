"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/Card";
import Link from "next/link";
import { FormattedText, renderInline } from "@/components/FormattedText";
import { getUsage, recordUsage, type UsageInfo } from "@/lib/aiUsageTracker";

type Difficulty = "easy" | "medium" | "hard";

const CATEGORIES = [
  "Any",
  "Fluid Mechanics I",
  "Fluid Mechanics II",
  "Dimensional Analysis",
  "Heat & Mass Transfer",
  "Compressible Flow",
  "Turbomachinery",
  "Pipe Networks",
  "Open Channel Flow",
];

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; color: string; desc: string }> = {
  easy:   { label: "Easy",   color: "green",  desc: "Single formula, straightforward substitution" },
  medium: { label: "Medium", color: "yellow", desc: "Multi-step, requires combining concepts" },
  hard:   { label: "Hard",   color: "red",    desc: "Complex system, real engineering context" },
};

// Per-category abbreviation badge styles for quick-start cards
const CAT_STYLE: Record<string, { abbr: string; bg: string; text: string }> = {
  "Fluid Mechanics I":    { abbr: "FM I",  bg: "bg-blue-100 dark:bg-blue-900/40",    text: "text-blue-700 dark:text-blue-300" },
  "Fluid Mechanics II":   { abbr: "FM II", bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300" },
  "Dimensional Analysis": { abbr: "DA",    bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300" },
  "Heat & Mass Transfer": { abbr: "HMT",   bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300" },
  "Compressible Flow":    { abbr: "CF",    bg: "bg-cyan-100 dark:bg-cyan-900/40",    text: "text-cyan-700 dark:text-cyan-300" },
  "Turbomachinery":       { abbr: "TM",    bg: "bg-green-100 dark:bg-green-900/40",  text: "text-green-700 dark:text-green-300" },
  "Pipe Networks":        { abbr: "PN",    bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300" },
  "Open Channel Flow":    { abbr: "OCF",   bg: "bg-teal-100 dark:bg-teal-900/40",   text: "text-teal-700 dark:text-teal-300" },
};

interface ProblemAnswer {
  label: string;
  value: string | number;
  type: "number" | "text";
}

interface Problem {
  title: string;
  question: string;
  given: string[];
  find: string[];
  hint: string;
  solution: string | null;
  category: string;
  difficulty: Difficulty;
  answers?: ProblemAnswer[];
}

function DifficultyBadge({ d }: { d: Difficulty }) {
  const cfg = DIFFICULTY_LABELS[d];
  const colors: Record<string, string> = {
    green:  "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    yellow: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
    red:    "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
  };
  return <span className={`text-xs px-2 py-1 rounded font-medium ${colors[cfg.color]}`}>{cfg.label}</span>;
}


export default function PracticePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [category, setCategory] = useState("Any");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revealingHint, setRevealingHint] = useState(false);
  const [revealingSolution, setRevealingSolution] = useState(false);
  const [hintText, setHintText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [showApproach, setShowApproach] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [history, setHistory] = useState<Problem[]>([]);
  const [error, setError] = useState("");
  const [sessionCount, setSessionCount] = useState(0);

  const [generatingVariant, setGeneratingVariant] = useState(false);

  // Tutor chat state
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatting, setChatting] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const [showAttempt, setShowAttempt] = useState(false);
  const [numericInputs, setNumericInputs] = useState<string[]>([]);
  const [numericResults, setNumericResults] = useState<(boolean | null)[]>([]);
  const [allCorrect, setAllCorrect] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});

  // Timer state
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [times, setTimes] = useState<Record<string, number[]>>({});

  // Attempt & feedback state
  const [attemptText, setAttemptText] = useState("");
  const [attemptImage, setAttemptImage] = useState<{ base64: string; type: string; preview: string } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 20, remaining: 20, canUse: true, pct: 0 });

  useEffect(() => {
    setUsage(getUsage("practice"));
    try {
      const rawH = localStorage.getItem("fm-practice-history");
      if (rawH) {
        const parsed = JSON.parse(rawH);
        if (Array.isArray(parsed) && parsed.length > 0) setHistory(parsed);
      }
      const rawP = localStorage.getItem("fm-practice-progress");
      if (rawP) {
        const parsed = JSON.parse(rawP);
        if (parsed && typeof parsed === "object") setProgress(parsed);
      }
      if (localStorage.getItem("fm-practice-timer-enabled") === "true") setTimerEnabled(true);
      const rawT = localStorage.getItem("fm-practice-times");
      if (rawT) {
        const parsed = JSON.parse(rawT);
        if (parsed && typeof parsed === "object") setTimes(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [timerRunning]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const avgTime = (arr: number[] | undefined) => arr && arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const recordTime = (diff: Difficulty) => {
    if (!timerEnabled || timerSeconds === 0) return;
    setTimes((prev) => {
      const updated = { ...prev, [diff]: [...(prev[diff] ?? []), timerSeconds].slice(-20) };
      try { localStorage.setItem("fm-practice-times", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const streamFromApi = async (
    message: string,
    onChunk: (text: string) => void
  ): Promise<void> => {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, mode: "practice" }),
    });
    if (!res.ok) throw new Error("API error");
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const p = JSON.parse(data);
          if (p.text) { onChunk(p.text); }
        } catch {}
      }
    }
  };

  // catOverride lets quick-start buttons pass the category directly,
  // avoiding the stale-closure issue with React state updates.
  const generateProblem = async (catOverride?: string, avoidContext?: string, difficultyOverride?: Difficulty) => {
    // Daily usage gate
    const currentUsage = getUsage("practice");
    if (!currentUsage.canUse) {
      setError(`Daily limit reached — you've used all ${currentUsage.limit} free AI practice questions for today. Your quota resets at midnight.`);
      return;
    }

    const usedCategory = catOverride ?? category;
    const usedDifficulty = difficultyOverride ?? difficulty;
    if (difficultyOverride) setDifficulty(difficultyOverride);
    setGenerating(true);
    setError("");

    // Record usage immediately (before API call to prevent race on double-click)
    recordUsage("practice");
    setUsage(getUsage("practice"));
    setProblem(null);
    setSolutionText("");
    setHintText("");
    setShowApproach(false);
    setShowHint(false);
    setShowSolution(false);
    setShowAttempt(false);
    setAttemptText("");
    setAttemptImage(null);
    setFeedbackText("");
    setShowFeedback(false);
    setAttemptCount(0);
    setNumericInputs([]);
    setNumericResults([]);
    setAllCorrect(false);
    setTimerRunning(false);
    setTimerSeconds(0);
    setChatMessages([]);
    setChatInput("");
    setShowChat(false);

    const prompt = `Generate a ${usedDifficulty} fluid mechanics practice problem${usedCategory !== "Any" ? ` from the category: ${usedCategory}` : ""}.${avoidContext ? `\n\nIMPORTANT: The following problem was flagged as incorrect or unrealistic. Do NOT generate a similar one:\n"${avoidContext}"` : ""}

The "question" field must read exactly like a university exam question — self-contained, narrative, with all values woven into the text. A student should be able to read only the question and have everything they need to solve it. End with a clear instruction ("Determine…", "Calculate…", "Find…"). Write 3–5 sentences.

The "answers" array MUST have exactly the same number of items as "find", in the same order. For each numerical quantity use type "number" and give the exact computed value as a number. For categorical answers (flow regime, type of flow, etc.) use type "text".

Return ONLY valid JSON (no markdown, no code fences) in this exact shape:
{
  "title": "short descriptive title (5–8 words)",
  "question": "Full self-contained exam-style question. Embed all given values naturally in the narrative, e.g. 'Water at 20°C (ρ = 998 kg/m³, μ = 1.002 × 10⁻³ Pa·s) flows at a mean velocity of 3 m/s through a horizontal commercial steel pipe of inner diameter D = 50 mm and absolute roughness ε = 0.046 mm. Determine the Reynolds number, classify the flow, and calculate the Darcy friction factor.'",
  "given": ["ρ = 998 kg/m³", "V = 3 m/s", "D = 0.05 m", "..."],
  "find": ["Reynolds number Re", "flow regime", "friction factor f"],
  "hint": "which calculator(s) to use and key formula",
  "category": "category name",
  "difficulty": "${usedDifficulty}",
  "answers": [
    { "label": "Reynolds number Re", "value": 149700, "type": "number" },
    { "label": "flow regime", "value": "turbulent", "type": "text" },
    { "label": "friction factor f", "value": 0.0182, "type": "number" }
  ]
}`;

    try {
      let raw = "";
      await streamFromApi(prompt, (chunk) => { raw += chunk; });
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("Bad response");
      const parsed: Omit<Problem, "solution"> = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      const newProblem: Problem = { ...parsed, solution: null };
      setProblem(newProblem);
      setNumericInputs(newProblem.answers?.map(() => "") ?? []);
      setNumericResults(newProblem.answers?.map((): null => null) ?? []);
      setHistory((prev) => {
        const updated = [newProblem, ...prev].slice(0, 10);
        try { localStorage.setItem("fm-practice-history", JSON.stringify(updated)); } catch {}
        return updated;
      });
      setProgress((prev) => {
        const updated = { ...prev, [newProblem.category]: (prev[newProblem.category] ?? 0) + 1 };
        try { localStorage.setItem("fm-practice-progress", JSON.stringify(updated)); } catch {}
        return updated;
      });
      if (timerEnabled) setTimerRunning(true);
      setSessionCount((n) => n + 1);
    } catch {
      setError("Could not generate a problem right now. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const generateVariant = async () => {
    if (!problem) return;
    setGeneratingVariant(true);
    setError("");
    // Keep the current problem visible while loading — don't setProblem(null) here
    setSolutionText(""); setHintText("");
    setShowApproach(false); setShowHint(false); setShowSolution(false);
    setShowAttempt(false);
    setAttemptText(""); setAttemptImage(null);
    setFeedbackText(""); setShowFeedback(false); setAttemptCount(0);
    setNumericInputs([]); setNumericResults([]); setAllCorrect(false);
    setTimerRunning(false); setTimerSeconds(0);
    setChatMessages([]); setChatInput(""); setShowChat(false);

    const prompt = `Generate a ${problem.difficulty} fluid mechanics practice problem that is a variation of this one.

Original problem: ${problem.question}
Category: ${problem.category}

The variation must:
- Test the same core concept(s) using similar calculation methods
- Change at least one meaningful aspect — different fluid, modified geometry, different operating conditions, or one added complication
- Remain fully self-contained and read like a real exam question (3–5 sentences)

The "answers" array MUST have exactly the same number of items as "find", in the same order. For each numerical quantity use type "number" and give the exact computed value. For categorical answers use type "text".

Return ONLY valid JSON (no markdown, no code fences) in this exact shape:
{
  "title": "short descriptive title (5–8 words)",
  "question": "Full self-contained exam-style question with all values woven into the narrative.",
  "given": ["ρ = 998 kg/m³", "V = 3 m/s", "D = 50 mm"],
  "find": ["quantity to find", "..."],
  "hint": "which calculator(s) to use and key formula",
  "category": "${problem.category}",
  "difficulty": "${problem.difficulty}",
  "answers": [
    { "label": "quantity to find", "value": 12345, "type": "number" }
  ]
}`;

    try {
      let raw = "";
      await streamFromApi(prompt, (chunk) => { raw += chunk; });
      const jsonStart = raw.indexOf("{");
      const jsonEnd   = raw.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("Bad response");
      const parsed: Omit<Problem, "solution"> = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      const newProblem: Problem = { ...parsed, solution: null };
      setProblem(newProblem);
      setNumericInputs(newProblem.answers?.map(() => "") ?? []);
      setNumericResults(newProblem.answers?.map((): null => null) ?? []);
      setHistory((prev) => {
        const updated = [newProblem, ...prev].slice(0, 10);
        try { localStorage.setItem("fm-practice-history", JSON.stringify(updated)); } catch {}
        return updated;
      });
      setProgress((prev) => {
        const updated = { ...prev, [newProblem.category]: (prev[newProblem.category] ?? 0) + 1 };
        try { localStorage.setItem("fm-practice-progress", JSON.stringify(updated)); } catch {}
        return updated;
      });
      if (timerEnabled) setTimerRunning(true);
      setSessionCount((n) => n + 1);
    } catch {
      setError("Could not generate a variant right now. Please try again.");
    } finally {
      setGeneratingVariant(false);
    }
  };

  const revealHint = async () => {
    if (!problem) return;
    setShowHint(true);
    if (hintText) return;
    setRevealingHint(true);
    setHintText("");
    try {
      let accumulated = "";
      await streamFromApi(
        `Provide a detailed hint for this fluid mechanics problem. Do NOT give the final numerical answer.\n\nProblem: ${problem.question}\n\nGiven: ${problem.given.join(", ")}\nFind: ${problem.find.join(", ")}\n\nExplain which formula(s) to apply, identify which calculator(s) to use, and note any unit conversions or intermediate steps needed.\n\nFormatting: plain text, Unicode symbols (ρ, μ, ν, Δ…), equations inline like "Re = ρVD/μ", numbered steps, bold headings. No LaTeX dollar signs.`,
        (chunk) => { accumulated += chunk; setHintText(accumulated); }
      );
    } catch {
      setHintText("Could not load hint.");
    } finally {
      setRevealingHint(false);
    }
  };

  const revealSolution = async () => {
    if (!problem) return;
    setShowSolution(true);
    setTimerRunning(false); // stop clock — student is checking the answer
    if (solutionText) return;
    setRevealingSolution(true);
    setSolutionText("");
    try {
      let accumulated = "";
      await streamFromApi(
        `Solve this ${problem.difficulty} fluid mechanics problem step by step.\n\nProblem: ${problem.question}\n\nGiven: ${problem.given.join("; ")}\nFind: ${problem.find.join("; ")}\n\nWork through every step: state the formula, substitute values with units, simplify, and state the result. Give the final answer clearly labelled.\n\nFormatting: plain text, Unicode symbols (ρ, μ, ν, Δ…), equations inline like "Re = ρVD/μ = (998)(3)(0.05)/0.001 = 149 700". No LaTeX dollar signs. Use numbered steps and bold headings.`,
        (chunk) => { accumulated += chunk; setSolutionText(accumulated); }
      );
    } catch {
      setSolutionText("Could not load solution.");
    } finally {
      setRevealingSolution(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:image/jpeg;base64,XXXX…"
      const [header, base64] = result.split(",");
      const type = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      setAttemptImage({ base64, type, preview: result });
    };
    reader.readAsDataURL(file);
    // reset the input so the same file can be re-selected if cleared
    e.target.value = "";
  };

  const evaluateAttempt = async () => {
    if (!problem || (!attemptText.trim() && !attemptImage)) return;

    // Daily usage gate for answer evaluation
    const currentUsage = getUsage("practice");
    if (!currentUsage.canUse) {
      setFeedbackText(`Daily limit reached — you've used all ${currentUsage.limit} free AI interactions for today. Your quota resets at midnight.`);
      setShowFeedback(true);
      return;
    }

    const thisAttempt = attemptCount + 1;
    setAttemptCount(thisAttempt);
    recordUsage("practice");
    setUsage(getUsage("practice"));
    setEvaluating(true);
    setFeedbackText("");
    setShowFeedback(true);

    const evalPrompt = `You are an expert fluid mechanics tutor evaluating a student's submission. Be specific, encouraging, and educational.

Problem: ${problem.question}
Given: ${problem.given.join(", ")}
Find: ${problem.find.join(", ")}
Difficulty: ${problem.difficulty}
This is the student's submission ${thisAttempt > 1 ? `(attempt ${thisAttempt})` : "(first try)"}${attemptImage ? " — handwritten working in the attached photo" : ""}${attemptText.trim() ? `:\n\n${attemptText.trim()}` : "."}

Evaluate in three parts:
1. **What's correct** — cite their specific values or steps that are right
2. **What needs fixing** — identify the exact error (wrong formula, unit mistake, calculation slip, conceptual misunderstanding). Be precise.
3. **Next step** — one clear actionable direction without giving away the final answer

If only a final answer is given (no working), still evaluate whether it is correct and comment on the approach implied.
If the answer is essentially correct, confirm it warmly and briefly.
Formatting: plain text, Unicode symbols (ρ, μ, ν…), equations inline. No LaTeX. Use **bold** for key points.`;

    try {
      let accumulated = "";
      if (attemptImage) {
        // Vision path — send image + text to the API
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: evalPrompt,
            mode: "practice",
            image: attemptImage.base64,
            imageType: attemptImage.type,
          }),
        });
        if (!res.ok) throw new Error("API error");
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const p = JSON.parse(data);
              if (p.text) { accumulated += p.text; setFeedbackText(accumulated); }
            } catch {}
          }
        }
      } else {
        await streamFromApi(evalPrompt, (chunk) => { accumulated += chunk; setFeedbackText(accumulated); });
      }
    } catch {
      setFeedbackText("Could not evaluate your submission. Please try again.");
    } finally {
      setEvaluating(false);
    }
  };

  const sendChatMessage = async () => {
    if (!problem || !chatInput.trim() || chatting) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user" as const, text: userMsg }];
    setChatMessages(newMessages);
    setChatting(true);

    const historyContext = newMessages.slice(-8).map((m) =>
      `${m.role === "user" ? "Student" : "Tutor"}: ${m.text}`
    ).join("\n");

    const solutionContext = showSolution && solutionText
      ? `\n\nThe student has already seen the full solution — you may reference it.`
      : `\n\nThe student has NOT yet seen the solution. Guide them without revealing the final numerical answer or complete working.`;

    const tutorPrompt = `You are a fluid mechanics tutor helping a student work through this specific problem.

Problem: ${problem.question}
Given: ${problem.given.join(", ")}
Find: ${problem.find.join(", ")}
Difficulty: ${problem.difficulty} | Category: ${problem.category}${solutionContext}

${historyContext}

Respond as a helpful, concise tutor. Use plain text with Unicode symbols (ρ, μ, ν, Δ, etc.). No LaTeX dollar signs. Keep responses focused and practical.`;

    try {
      let accumulated = "";
      setChatMessages((prev) => [...prev, { role: "assistant" as const, text: "" }]);
      await streamFromApi(tutorPrompt, (chunk) => {
        accumulated += chunk;
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", text: accumulated };
          return updated;
        });
      });
    } catch {
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", text: "Could not load response. Please try again." };
        return updated;
      });
    } finally {
      setChatting(false);
    }
  };

  const checkAnswers = () => {
    if (!problem?.answers || problem.answers.length === 0) return;
    const results: (boolean | null)[] = problem.answers.map((ans, i) => {
      const raw = (numericInputs[i] ?? "").trim();
      if (!raw) return null;
      if (ans.type === "number") {
        const cleaned = raw.replace(/,/g, "").replace(/[×x]\s*10\^?(-?\d+)/gi, "e$1");
        const userVal = parseFloat(cleaned);
        const correct = typeof ans.value === "number" ? ans.value : parseFloat(String(ans.value));
        if (isNaN(userVal) || isNaN(correct) || correct === 0) return null;
        return Math.abs((userVal - correct) / correct) <= 0.02;
      } else {
        const userStr = raw.toLowerCase();
        const expected = String(ans.value).toLowerCase();
        return userStr.includes(expected) || expected.includes(userStr);
      }
    });
    setNumericResults(results);
    const correct = results.length > 0 && results.every((r) => r === true);
    setAllCorrect(correct);
    if (correct) {
      setTimerRunning(false);
      recordTime(problem.difficulty);
    }
  };

  const flagAndRegenerate = () => {
    if (!problem) return;
    generateProblem(problem.category !== "Any" ? problem.category : undefined, problem.question);
  };

  const resetAttempt = () => {
    setAttemptText("");
    setAttemptImage(null);
    setFeedbackText("");
    setShowFeedback(false);
  };

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div>
        <Link href="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 inline-block">
          ← Back to Home
        </Link>
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Practice Problems</h1>
          {sessionCount > 0 && (
            <span className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
              {sessionCount} {sessionCount === 1 ? "problem" : "problems"} this session
            </span>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed mt-2">
          Real engineering scenarios at your chosen difficulty — with hints and full worked solutions on demand.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors capitalize ${
                    difficulty === d
                      ? d === "easy"   ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                      : d === "medium" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                                       : "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{DIFFICULTY_LABELS[difficulty].desc}</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Generate button */}
          <div className="flex items-end">
            <button
              onClick={() => generateProblem()}
              disabled={generating || !usage.canUse}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors"
            >
              {generating ? "Generating…" : !usage.canUse ? "Daily limit reached" : problem ? "New Problem" : "Generate Problem"}
            </button>
          </div>
        </div>

        {/* Usage bar */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usage.pct >= 80 ? "bg-amber-500" : "bg-blue-500"}`}
              style={{ width: `${usage.pct}%` }}
            />
          </div>
          <p className={`text-xs flex-shrink-0 ${usage.pct >= 80 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-gray-400"}`}>
            {usage.remaining}/{usage.limit} AI questions left today
          </p>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {/* Timer toggle */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100 dark:border-gray-700">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button
              role="switch"
              aria-checked={timerEnabled}
              onClick={() => {
                const next = !timerEnabled;
                setTimerEnabled(next);
                try { localStorage.setItem("fm-practice-timer-enabled", String(next)); } catch {}
                if (!next) { setTimerRunning(false); setTimerSeconds(0); }
              }}
              className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${timerEnabled ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${timerEnabled ? "translate-x-4" : "translate-x-0"}`} />
            </button>
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">Timer mode</span>
          </label>
          {timerEnabled && (["easy", "medium", "hard"] as Difficulty[]).some((d) => avgTime(times[d]) !== null) && (
            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span className="hidden sm:block">Avg:</span>
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                const avg = avgTime(times[d]);
                return avg !== null ? (
                  <span key={d} className="capitalize">{d[0].toUpperCase() + d.slice(1)} {formatTime(avg)}</span>
                ) : null;
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Progress tracking */}
      {Object.keys(progress).length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Progress</span>
          {Object.entries(progress)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => {
              const style = CAT_STYLE[cat];
              return (
                <span key={cat} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${style?.bg ?? "bg-gray-100 dark:bg-gray-800"} ${style?.text ?? "text-gray-600 dark:text-gray-400"}`}>
                  {style?.abbr ?? cat}
                  <span className="opacity-50">·</span>
                  {count}
                </span>
              );
            })}
        </div>
      )}

      {/* Generating skeleton */}
      {generating && !problem && (
        <Card>
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg">Generating your {difficulty} problem…</p>
          </div>
        </Card>
      )}

      {/* Problem card */}
      {problem && (
        <Card>
          {/* Title + badges */}
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{problem.title}</h2>
              {generatingVariant && (
                <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1 animate-pulse">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
                  </svg>
                  Generating variant…
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DifficultyBadge d={problem.difficulty} />
              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                {problem.category}
              </span>
              <button
                onClick={flagAndRegenerate}
                disabled={generating || generatingVariant}
                title="Problem seems incorrect or unrealistic — skip it and generate a new one"
                className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors"
              >
                Bad problem?
              </button>
            </div>
          </div>

          {/* Timer strip */}
          {timerEnabled && (
            <div className={`flex items-center justify-between mb-5 px-4 py-3 rounded-xl border ${
              allCorrect
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : showSolution
                ? "bg-gray-100 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700"
                : timerRunning
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  allCorrect     ? "bg-green-500" :
                  showSolution   ? "bg-gray-400 dark:bg-gray-500" :
                  timerRunning   ? "bg-blue-500 animate-pulse" :
                                   "bg-amber-400"
                }`} />
                <div>
                  <p className={`text-2xl font-mono font-bold tabular-nums leading-none ${
                    allCorrect     ? "text-green-700 dark:text-green-300" :
                    showSolution   ? "text-gray-500 dark:text-gray-400" :
                    timerRunning   ? "text-blue-700 dark:text-blue-300" :
                                     "text-amber-700 dark:text-amber-300"
                  }`}>
                    {formatTime(timerSeconds)}
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${
                    allCorrect     ? "text-green-600 dark:text-green-400" :
                    showSolution   ? "text-gray-400 dark:text-gray-500" :
                    timerRunning   ? "text-blue-500 dark:text-blue-400" :
                                     "text-amber-600 dark:text-amber-400"
                  }`}>
                    {allCorrect ? "Solved!" : showSolution ? "Stopped" : timerRunning ? "Running" : "Paused"}
                  </p>
                </div>
              </div>
              {!allCorrect && !showSolution && (
                <button
                  onClick={() => setTimerRunning((v) => !v)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    timerRunning
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/70"
                      : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/70"
                  }`}
                >
                  {timerRunning ? "Pause" : "Resume"}
                </button>
              )}
            </div>
          )}

          {/* Question */}
          <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border-l-4 border-blue-500">
            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Question</p>
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{problem.question}</p>
          </div>

          {/* Given / Find */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Given</p>
              <ul className="space-y-1">
                {problem.given.map((g, i) => (
                  <li key={i} className="text-sm text-gray-800 dark:text-gray-200 font-mono">{renderInline(g)}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Find</p>
              <ul className="space-y-1">
                {problem.find.map((f, i) => (
                  <li key={i} className="text-sm text-gray-800 dark:text-gray-200">{renderInline(f)}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Attempt & feedback ── */}
          <div className="mb-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
            <button
              onClick={() => setShowAttempt((v) => !v)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${showAttempt ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Check your answer
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-4">
                  Type your values, describe your approach, or upload a photo of your working.
                </p>
              </div>
              {attemptCount > 0 && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full font-medium flex-shrink-0">
                  Attempt {attemptCount}
                </span>
              )}
            </button>

            {showAttempt && (
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">

              {/* ── Numerical checker ── */}
              {problem.answers && problem.answers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">Your answers</p>
                  <div className="space-y-2">
                    {problem.answers.map((ans, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-36 flex-shrink-0 truncate">{ans.label}</span>
                        <input
                          value={numericInputs[i] ?? ""}
                          onChange={(e) => {
                            const u = [...numericInputs]; u[i] = e.target.value; setNumericInputs(u);
                            const r = [...numericResults]; r[i] = null; setNumericResults(r); setAllCorrect(false);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && checkAnswers()}
                          placeholder={ans.type === "number" ? "0.000" : "…"}
                          className={`flex-1 px-2.5 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors ${
                            numericResults[i] === true  ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10" :
                            numericResults[i] === false ? "border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/10" :
                            "border-gray-300 dark:border-gray-600"
                          }`}
                        />
                        {numericResults[i] === true  && <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                        {numericResults[i] === false && <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                        {numericResults[i] === null  && <div className="w-4 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={checkAnswers}
                      disabled={numericInputs.every((v) => !v?.trim())}
                      className="px-4 py-1.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-700 dark:hover:bg-white disabled:opacity-40 text-white dark:text-gray-900 font-medium rounded-lg text-sm transition-colors"
                    >
                      Check answers
                    </button>
                    {numericResults.some((r) => r !== null) && !allCorrect && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {numericResults.filter((r) => r === true).length} / {problem.answers.length} correct
                      </span>
                    )}
                  </div>

                  {allCorrect && (
                    <div className="mt-3 flex items-center justify-between gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-300">All correct!</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                          {problem.difficulty === "hard" ? "Excellent — that was a hard one." : `Nice work on this ${problem.difficulty} problem.`}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const nextD: Difficulty = problem.difficulty === "easy" ? "medium" : "hard";
                          setDifficulty(nextD);
                          generateProblem(problem.category !== "Any" ? problem.category : undefined, undefined, nextD);
                        }}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 flex-shrink-0"
                      >
                        {problem.difficulty === "hard" ? "Another hard one" : `Try ${problem.difficulty === "easy" ? "medium" : "hard"}`}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              {problem.answers && problem.answers.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-gray-400 dark:text-gray-500">or get AI feedback on your working</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>
              )}

              {/* ── AI feedback ── */}
              <div>
                <textarea
                  value={attemptText}
                  onChange={(e) => setAttemptText(e.target.value)}
                  placeholder={"Describe your approach or show your working for detailed AI feedback.\nOr upload a photo of your paper working below."}
                  rows={3}
                  maxLength={2000}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />

                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {attemptImage ? "Change photo" : "Upload photo of working"}
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {attemptImage && (
                    <div className="flex items-center gap-2">
                      <img src={attemptImage.preview} alt="Uploaded photo of your working for AI feedback" className="h-10 w-14 object-cover rounded border border-gray-300 dark:border-gray-600" />
                      <button onClick={() => setAttemptImage(null)} className="text-xs text-red-500 hover:text-red-700 transition-colors">Remove</button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={evaluateAttempt}
                    disabled={evaluating || (!attemptText.trim() && !attemptImage)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    {evaluating ? (
                      <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/></svg>Evaluating…</>
                    ) : "Get feedback"}
                  </button>
                  {showFeedback && (
                    <button onClick={resetAttempt} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 font-medium rounded-lg text-sm transition-colors">
                      Try again
                    </button>
                  )}
                </div>

                {showFeedback && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Feedback</p>
                    <div className="text-sm text-gray-800 dark:text-gray-200">
                      <FormattedText text={feedbackText} loading={evaluating} />
                    </div>
                  </div>
                )}
              </div>

            </div>
            )}
          </div>

          {/* Quick approach — from the problem JSON, no API call */}
          <div className="mb-5">
            <button
              onClick={() => setShowApproach((v) => !v)}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showApproach ? "rotate-90" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showApproach ? "Hide approach" : "Show approach"}
            </button>
            {showApproach && (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                {problem.hint}
              </p>
            )}
          </div>

          {/* Actions — two groups: help-me and next-problem */}
          <div className="flex items-center justify-between flex-wrap gap-y-2">
            {/* Left: help with the current problem */}
            <div className="flex gap-2 flex-wrap">
              {!showHint && (
                <button
                  onClick={revealHint}
                  disabled={revealingHint}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  {revealingHint ? "Loading…" : "Show Hint"}
                </button>
              )}
              {!showSolution && (
                <button
                  onClick={revealSolution}
                  disabled={revealingSolution}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  {revealingSolution ? "Solving…" : "Show Solution"}
                </button>
              )}
            </div>

            {/* Right: move to a different problem */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={generateVariant}
                disabled={generatingVariant || generating}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-60 font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5"
              >
                {generatingVariant ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Try a variant
              </button>
              <button
                onClick={() => generateProblem()}
                disabled={generatingVariant || generating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
              >
                New Problem
              </button>
            </div>
          </div>

          {/* Hint */}
          {showHint && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 uppercase tracking-wide">Hint</p>
                <button onClick={() => setShowHint(false)} className="text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors">Hide</button>
              </div>
              <div className="text-sm text-gray-800 dark:text-gray-200">
                <FormattedText text={hintText} loading={revealingHint} />
              </div>
            </div>
          )}

          {showSolution && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Full Solution</p>
                <button onClick={() => setShowSolution(false)} className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors">Hide</button>
              </div>
              <div className="text-sm text-gray-800 dark:text-gray-200">
                <FormattedText text={solutionText} loading={revealingSolution} />
              </div>
            </div>
          )}

          {/* ── Tutor chat ── */}
          <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-4">
            {!showChat ? (
              <button
                onClick={() => setShowChat(true)}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Ask about this problem
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Tutor</p>
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    Hide
                  </button>
                </div>

                {chatMessages.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                    Ask about the approach, a specific formula, or why a concept applies.
                    {!showSolution && " Answers stay guarded until you reveal the solution."}
                  </p>
                )}

                {chatMessages.length > 0 && (
                  <div className="space-y-3 mb-3 max-h-72 overflow-y-auto pr-1">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        }`}>
                          {msg.text || <span className="opacity-50 italic">Thinking…</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                    placeholder="Ask anything about this problem…"
                    maxLength={500}
                    disabled={chatting}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatting || !chatInput.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {chatting ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Recent history */}
      {history.length > 0 && !problem && !generating && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Recent problems
          </p>
          <div className="space-y-1.5">
            {history.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setProblem(p);
                  setShowApproach(false);
                  setShowHint(false); setShowSolution(false);
                  setHintText(""); setSolutionText("");
                  setShowAttempt(false);
                  setAttemptText(""); setAttemptImage(null);
                  setFeedbackText(""); setShowFeedback(false); setAttemptCount(0);
                  setNumericInputs(p.answers?.map(() => "") ?? []);
                  setNumericResults(p.answers?.map((): null => null) ?? []);
                  setAllCorrect(false);
                  setChatMessages([]); setChatInput(""); setShowChat(false);
                }}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all text-left group"
              >
                <DifficultyBadge d={p.difficulty} />
                <span className="text-gray-700 dark:text-gray-300 flex-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {p.title}
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-xs hidden sm:block flex-shrink-0">{p.category}</span>
                <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick-start grid — only shown before first problem */}
      {!problem && !generating && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Jump into a topic
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CATEGORIES.filter((c) => c !== "Any").map((cat) => {
              const style = CAT_STYLE[cat];
              return (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); generateProblem(cat); }}
                  className="p-3 text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all group"
                >
                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-2 ${style?.bg} ${style?.text}`}>
                    {style?.abbr}
                  </span>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {cat}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{difficulty}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
