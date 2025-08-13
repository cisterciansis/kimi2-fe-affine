import { useState, useEffect, useRef } from "react";
import "./App.css";
import MarkdownRenderer from "./components/MarkdownRenderer";
import ModelSelector, { ModelOption } from "./components/ModelSelector";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  error?: boolean;
}

const SYSTEM_MESSAGE = {
  role: "system",
  content:
    "You are Kimi, a large language model trained by Moonshot AI. You are knowledgeable, helpful, and always provide accurate and detailed responses. Your capabilities include but are not limited to: answering questions, providing explanations, generating text, and assisting with a wide range of tasks. You should always be polite and professional in your interactions.",
} as const;

/**
 * SVG filter defs for glass distortion and liquid-glass backdrop effects.
 * - glass-distortion: distorts background content beneath the top band
 * - liquid-glass: subtle displacement for the glass panel's backdrop
 */
function GlassFilter() {
  return (
    <svg className="hidden">
      <defs>
        <filter
          id="glass-distortion"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.03"
            numOctaves="2"
            seed="3"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="1.7" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="15"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="2.5" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>

        <filter
          id="liquid-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="turbulence"
            baseFrequency="0.01 0.02"
            numOctaves="3"
            seed="7"
            result="liquidNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="liquidNoise"
            scale="8"
            xChannelSelector="R"
            yChannelSelector="B"
            result="liquidDisplaced"
          />
          <feGaussianBlur in="liquidDisplaced" stdDeviation="1" result="liquidBlur" />
        </filter>
      </defs>
    </svg>
  );
}

function App() {
  const CHUTES_API_TOKEN = import.meta.env.VITE_CHUTES_API_TOKEN;
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([SYSTEM_MESSAGE]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Model selection foundation (persisted)
  const DEFAULT_MODELS: ModelOption[] = [
    { id: "moonshotai/Kimi-K2-Instruct", label: "Kimi 2", provider: "Moonshot" },
    { id: "affine/top-1", label: "Top 1", provider: "Affine", comingSoon: true },
    { id: "affine/top-2", label: "Top 2", provider: "Affine", comingSoon: true },
    { id: "affine/top-3", label: "Top 3", provider: "Affine", comingSoon: true },
  ];
  const [modelOptions] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(() => {
    try {
      const id = localStorage.getItem("selectedModelId");
      const found = DEFAULT_MODELS.find((m) => m.id === id);
      return found || DEFAULT_MODELS[0];
    } catch {
      return DEFAULT_MODELS[0];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("selectedModelId", selectedModel.id);
    } catch {}
  }, [selectedModel]);

  useEffect(() => {
    // Scroll to the bottom of the chat history when it updates
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const invokeChute = async (userQuestion: string) => {
    if (!userQuestion.trim()) {
      return;
    }

    setIsLoading(true);
    const newHistoryWithUserQuestion: ChatMessage[] = [
      ...chatHistory.filter((msg) => !msg.error),
      { role: "user", content: userQuestion },
    ];
    setChatHistory(newHistoryWithUserQuestion);
    setQuestion("");

    const messagesToSend = [SYSTEM_MESSAGE, ...newHistoryWithUserQuestion.slice(-20)];

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CHUTES_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel.id,
          messages: messagesToSend,
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("ReadableStream not supported");
      }

      const decoder = new TextDecoder();
      let streamedMessage = "";
      setChatHistory((prev) => [...prev, { role: "assistant", content: "" } as ChatMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk
          .split("\n")
          .filter((line) => line.trim() !== "" && line.startsWith("data: "));

        for (const line of lines) {
          const data = line.substring(6);

          if (data === "[DONE]") {
            continue;
          }

          try {
            const parsedData = JSON.parse(data);
            if (parsedData.choices && parsedData.choices[0]) {
              const delta = parsedData.choices[0].delta?.content || "";
              if (delta) {
                streamedMessage += delta;
                setChatHistory((prev) => {
                  const updatedHistory = [...prev];
                  updatedHistory[updatedHistory.length - 1].content = streamedMessage;
                  return updatedHistory;
                });
              }
            }
          } catch (e) {
            console.error("Error parsing SSE data:", e);
          }
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("Error:", err);
        setChatHistory((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.role === "assistant" && lastMessage.content === "") {
            const updatedHistory = [...prev];
            updatedHistory[updatedHistory.length - 1] = {
              ...updatedHistory[updatedHistory.length - 1],
              content: (err as Error).message,
              error: true,
            };
            return updatedHistory;
          }
          return [...prev, { role: "assistant", content: (err as Error).message, error: true }];
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {}
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setChatHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last.content === "") {
        return prev.slice(0, -1);
      }
      return prev;
    });
  };

  // While streaming, pressing Enter stops the stream
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isLoading && e.key === "Enter") {
        e.preventDefault();
        stopStreaming();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLoading]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) {
      stopStreaming();
      return;
    }
    if (!isLoading) {
      invokeChute(question);
    }
  };

  const retryLastMessage = () => {
    const lastUserMessage = [...chatHistory]
      .reverse()
      .find((msg: ChatMessage) => msg.role === "user");
    if (lastUserMessage) {
      invokeChute(lastUserMessage.content);
    }
  };

  return (
    <div className="app relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Soft, blurred background shapes to give the glass something to refract */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-black rounded-full blur-xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-gray-800 rounded-full blur-lg"></div>
        <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-black rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-gray-700 rounded-full blur-xl"></div>
      </div>

      {/* Subtle dot grid for texture */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, black 1px, transparent 0)`,
          backgroundSize: "20px 20px",
        }}
      ></div>

      {/* Distortion layer that only affects what's behind it, not the input UI above */}
      <div
        className="fixed top-0 left-0 right-0 h-32 pointer-events-none z-40"
        style={{
          filter: "url(#glass-distortion)",
          maskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
        }}
      >
        <div className="h-full w-full bg-transparent"></div>
      </div>

      {/* Glass input bar (always above the distortion) */}
      <form onSubmit={handleFormSubmit} className="fixed top-0 left-0 right-0 z-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative group">
            {/* Glass panel */}
            <div
              className="absolute inset-0 bg-white/[0.6] backdrop-blur-[36px] border border-white/10 rounded-3xl overflow-hidden"
              style={{
                backdropFilter: 'url("#liquid-glass")',
                boxShadow: `
                  0 0 8px rgba(0,0,0,0.03),
                  0 2px 6px rgba(0,0,0,0.08),
                  inset 3px 3px 0.5px -3px rgba(255,255,255,0.2),
                  inset -3px -3px 0.5px -3px rgba(255,255,255,0.15),
                  inset 1px 1px 1px -0.5px rgba(255,255,255,0.3),
                  inset -1px -1px 1px -0.5px rgba(255,255,255,0.25),
                  inset 0 0 6px 6px rgba(255,255,255,0.08),
                  inset 0 0 2px 2px rgba(255,255,255,0.04),
                  0 0 12px rgba(0,0,0,0.05)
                `,
              }}
            >
              {/* Subtle imperfections and highlights on the glass surface */}
              <div className="absolute inset-0 opacity-40">
                <div className="absolute top-2 left-8 w-0.5 h-12 bg-white/30 rounded-full blur-[0.3px] rotate-[15deg]"></div>
                <div className="absolute top-6 right-16 w-0.5 h-8 bg-white/25 rounded-full blur-[0.4px] -rotate-[30deg]"></div>
                <div className="absolute bottom-3 left-1/4 w-1 h-0.5 bg-white/20 rounded-full blur-[0.5px]"></div>
                <div className="absolute top-1/2 right-1/4 w-2 h-0.5 bg-white/15 rounded-full blur-[0.6px] rotate-45"></div>
              </div>

              {/* Light reflections */}
              <div className="absolute top-0 left-0 w-8 h-8 bg-white/20 rounded-full blur-2xl"></div>
              <div className="absolute top-0 right-0 w-6 h-6 bg-white/15 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 left-1/3 w-4 h-4 bg-white/10 rounded-full blur-lg"></div>

              {/* Edge highlights */}
              <div className="absolute top-0.5 left-6 right-6 h-[0.3px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
              <div className="absolute bottom-0.5 left-12 right-12 h-[0.3px] bg-gradient-to-r from-transparent via-white/25 to-transparent"></div>
              <div className="absolute left-0.5 top-6 bottom-6 w-[0.3px] bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
              <div className="absolute right-0.5 top-8 bottom-8 w-[0.3px] bg-gradient-to-b from-transparent via-white/15 to-transparent"></div>
            </div>

            {/* Input content lives above the glass and is unaffected by distortion */}
            <div className="relative z-10 flex items-center space-x-4 px-6 py-4">
              <span className="text-black/90 text-lg font-mono font-medium">:</span>

              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-black/90 placeholder-black/50 outline-none text-base font-medium selection:bg-black/10"
                autoFocus
              />

              <ModelSelector selected={selectedModel} onSelect={setSelectedModel} disabled={isLoading} options={modelOptions} />
              {isLoading ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  aria-label="Stop"
                  className="relative overflow-hidden backdrop-blur-2xl border border-white/20 rounded-full p-3 transition-transform duration-300 group hover:scale-105 shadow-lg hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.1) 100%)",
                    boxShadow:
                      "0 2px 8px rgba(0,0,0,0.05), inset 1px 1px 1px rgba(255,255,255,0.3), inset -1px -1px 1px rgba(255,255,255,0.2), inset 0 0 4px rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="absolute inset-0 rounded-full bg-black/10 -z-10"></div>
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-full -z-10"></div>
                  <svg className="relative w-5 h-5 text-black/80 transition-colors duration-300 z-10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="7" y="7" width="10" height="10" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!question.trim()}
                  aria-label="Send"
                  className="relative overflow-hidden backdrop-blur-2xl border border-white/20 rounded-full p-3 transition-transform duration-300 group hover:scale-105 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.1) 100%)",
                    boxShadow:
                      "0 2px 8px rgba(0,0,0,0.05), inset 1px 1px 1px rgba(255,255,255,0.3), inset -1px -1px 1px rgba(255,255,255,0.2), inset 0 0 4px rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-white/10 rounded-full -z-10"></div>
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-full -z-10"></div>
                  <svg
                    className="relative w-5 h-5 text-black/80 group-hover:text-black/90 transition-colors duration-300 z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Chat history; add top padding so content isn’t hidden behind the fixed input bar */}
      <div className="chat-history pt-32 px-6" ref={chatHistoryRef}>
        {chatHistory
          .filter((msg) => msg.role !== "system")
          .map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              {msg.role === "assistant" ? (
                <>
                  <MarkdownRenderer content={msg.content} />
                  {msg.error && (
                    <button onClick={retryLastMessage} className="retry-button">
                      Retry
                    </button>
                  )}
                </>
              ) : (
                <span>{">"} {msg.content}</span>
              )}
            </div>
          ))}

        {isLoading && chatHistory[chatHistory.length - 1]?.role !== "assistant" && (
          <div className="message assistant">
            <span>...</span>
          </div>
        )}
      </div>

      {/* Mount SVG filters once */}
      <GlassFilter />
    </div>
  );
}

export default App;
