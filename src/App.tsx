import { useState, useEffect, useRef } from "react";
import "./App.css";
import MarkdownRenderer from "./components/MarkdownRenderer";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  error?: boolean;
}

const SYSTEM_MESSAGE = {
  role: "system",
  content: "You are Kimi, a large language model trained by Moonshot AI. You are knowledgeable, helpful, and always provide accurate and detailed responses. Your capabilities include but are not limited to: answering questions, providing explanations, generating text, and assisting with a wide range of tasks. You should always be polite and professional in your interactions.",
} as const;

function App() {
  const CHUTES_API_TOKEN = import.meta.env.VITE_CHUTES_API_TOKEN;
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([SYSTEM_MESSAGE]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const newHistoryWithUserQuestion: ChatMessage[] = [...chatHistory.filter(msg => !msg.error), { role: "user", content: userQuestion }];
    setChatHistory(newHistoryWithUserQuestion);
    setQuestion("");

    const messagesToSend = [
      SYSTEM_MESSAGE,
      ...newHistoryWithUserQuestion.slice(-20),
    ]

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const response = await fetch(
        "https://llm.chutes.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CHUTES_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "moonshotai/Kimi-K2-Instruct",
            messages: messagesToSend,
            stream: true,
            max_tokens: 1024,
            temperature: 0.7,
          }),
          signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `HTTP error! status: ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("ReadableStream not supported");
      }

      const decoder = new TextDecoder();
      let streamedMessage = "";
      setChatHistory(prev => [...prev, { role: "assistant", content: "" } as ChatMessage]);

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
                setChatHistory(prev => {
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
        setChatHistory(prev => {
            const lastMessage = prev[prev.length -1]
            if(lastMessage.role === 'assistant' && lastMessage.content === ''){
                const updatedHistory = [...prev];
                updatedHistory[updatedHistory.length - 1] = {
                    ...updatedHistory[updatedHistory.length - 1],
                    content: (err as Error).message,
                    error: true,
                }
                return updatedHistory
            }
            return [...prev, { role: "assistant", content: (err as Error).message, error: true }]
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      invokeChute(question);
    }
  };

  const retryLastMessage = () => {
    const lastUserMessage = [...chatHistory].reverse().find((msg: ChatMessage) => msg.role === 'user');
    if(lastUserMessage){
        invokeChute(lastUserMessage.content)
    }
  }

  return (
    <div className="app">
      <form onSubmit={handleFormSubmit} className="input-form">
        <span>:</span>
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="input-field"
          disabled={isLoading}
          autoFocus
        />
      </form>
      <div className="chat-history" ref={chatHistoryRef}>
        {chatHistory.filter(msg => msg.role !== 'system').map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.role === 'assistant' ? (
              <>
                <MarkdownRenderer content={msg.content} />
                {msg.error && <button onClick={retryLastMessage} className="retry-button">Retry</button>}
              </>
            ) : (
              <span>{'>'} {msg.content}</span>
            )}
          </div>
        ))}
        {isLoading && chatHistory[chatHistory.length -1]?.role !== 'assistant' && (
            <div className="message assistant">
                <span>...</span>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
