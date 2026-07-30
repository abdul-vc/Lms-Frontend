import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Sparkles, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { chatAi } from "@/lib/courses-api";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Assistant" }] }),
  component: AIPage,
});

interface Msg { role: "user" | "ai"; content: string }

function AIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", content: `Hi ${user?.first_name || "there"} — I'm your Learning Assistant. I can summarize lessons, generate flashcards, or answer your questions. Try asking something below.` },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setDraft("");
    setLoading(true);
    
    try {
      const response = await chatAi(text);
      setMessages((m) => [...m, { role: "ai", content: response.reply || "No response received." }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "ai", content: "Sorry, I am having trouble connecting to the server right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell maxWidth="max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-6 text-emerald-400" />
        <h1 className="text-3xl font-black tracking-tight text-foreground">Learning Assistant</h1>
      </div>
      <p className="text-sm text-foreground font-medium mb-8">AI Assistant to help you with your learning journey.</p>

      <div className="rounded-2xl ring-1 ring-border bg-card p-6 mb-4 space-y-4 min-h-[300px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "ai" && (
              <div className="size-8 rounded-full bg-brand/15 text-brand grid place-items-center shrink-0">
                <Sparkles className="size-4" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
              m.role === "user" ? "bg-brand text-brand-foreground" : "bg-ui-bg text-foreground"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>



      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-2 ring-1 ring-input rounded-xl px-3 bg-card"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything about your courses…"
          className="flex-1 py-3 bg-transparent text-sm outline-none"
        />
        <button type="submit" disabled={loading} className="size-9 rounded-lg bg-brand text-brand-foreground grid place-items-center disabled:opacity-50">
          <Send className="size-4" />
        </button>
      </form>
    </AppShell>
  );
}
