import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Panel } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { Bot, Send, User } from "lucide-react";

const SUGGESTED = [
  "Why is Central Corridor congested?",
  "Show busiest corridors in the last 30 minutes.",
  "Which roads have abnormal speed reductions?",
  "Show the trajectory of MH12AB1234.",
  "Predict congestion for the next 30 minutes.",
  "Which cameras have degraded OCR performance?",
];

interface Msg {
  role: "user" | "assistant";
  text: string;
}

export default function AIAnalyst() {
  const [params] = useSearchParams();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "I'm NETRA AI, your city traffic analyst. Ask me about congestion, trajectories, forecasts, or camera health — I answer from live NETRA-X data." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.aiQuery(q);
      setMessages((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "I couldn't reach the analytics engine.";
      setMessages((m) => [...m, { role: "assistant", text: `Connection issue: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const auto = params.get("q");
    if (auto) send(auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <TopBar title="NETRA AI" subtitle="City Traffic Analyst" />
      <div className="p-5 lg:p-8 max-w-3xl mx-auto flex flex-col h-[calc(100vh-100px)]">
        <Panel className="flex-1 flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "assistant" ? "bg-primary/15 text-primary" : "bg-white/10 text-ink"}`}>
                  {m.role === "assistant" ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div
                  className={`rounded-xl px-4 py-2.5 text-sm whitespace-pre-line max-w-[85%] ${
                    m.role === "assistant" ? "bg-panel2 border border-border" : "bg-primary/15 border border-primary/30"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center"><Bot size={14} /></div>
                <div className="rounded-xl px-4 py-2.5 text-sm bg-panel2 border border-border text-muted">Analyzing live data…</div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 py-3 border-t border-border/60 mt-3">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 border border-border text-muted hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-border/60 mt-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask about congestion, trajectories, forecasts…"
              className="flex-1 bg-panel2 border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <button
              onClick={() => send(input)}
              className="px-4 py-2.5 rounded-lg bg-primary/15 text-primary border border-primary/30"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
