"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

function GlassFilter() {
  return (
    <svg className="hidden">
      <defs>
        <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          {/* Generate subtle turbulent noise for glass distortion */}
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="2" seed="3" result="turbulence" />

          {/* Blur the turbulence pattern for smooth distortion */}
          <feGaussianBlur in="turbulence" stdDeviation="1.5" result="blurredNoise" />

          {/* Displace the source graphic with subtle noise */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="15"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />

          {/* Apply final blur for glass effect */}
          <feGaussianBlur in="displaced" stdDeviation="2" result="finalBlur" />

          {/* Output the result */}
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>

        <filter id="liquid-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency="0.01 0.02" numOctaves="3" seed="7" result="liquidNoise" />
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
  )
}

export default function GlassChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! How can I help you today?",
      isUser: false,
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: "2",
      text: "I need help with my project",
      isUser: true,
      timestamp: new Date(Date.now() - 240000),
    },
    {
      id: "3",
      text: "I'd be happy to assist you with your project. What specific area would you like help with?",
      isUser: false,
      timestamp: new Date(Date.now() - 180000),
    },
    {
      id: "4",
      text: "I'm working on a user interface design and need some creative input",
      isUser: true,
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: "5",
      text: "Great! UI design is exciting. Are you looking for layout suggestions, color schemes, or interaction patterns?",
      isUser: false,
      timestamp: new Date(Date.now() - 60000),
    },
  ])

  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "That's an interesting point. Let me think about that and provide you with a detailed response.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-32 h-32 bg-black rounded-full blur-xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-gray-800 rounded-full blur-lg"></div>
        <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-black rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-gray-700 rounded-full blur-xl"></div>
      </div>

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, black 1px, transparent 0)`,
          backgroundSize: "20px 20px",
        }}
      ></div>

      <div className="h-full overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6 pt-24">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-6 py-4 rounded-2xl ${
                  message.isUser
                    ? "bg-black/10 backdrop-blur-md border border-black/20 text-black ml-auto shadow-lg"
                    : "bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-800 shadow-md"
                }`}
              >
                <p className="text-sm md:text-base leading-relaxed">{message.text}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-800 px-6 py-4 rounded-2xl max-w-xs shadow-md">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div
        className="fixed top-0 left-0 right-0 h-32 pointer-events-none z-40"
        style={{
          filter: "url(#glass-distortion)",
          maskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
        }}
      >
        <div className="h-full w-full bg-transparent"></div>
      </div>

      <div className="fixed top-0 left-0 right-0 z-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative group">
            <div
              className="absolute inset-0 bg-white/3 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden"
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
              {/* Glass surface imperfections and highlights */}
              <div className="absolute inset-0 opacity-40">
                <div className="absolute top-2 left-8 w-0.5 h-12 bg-white/30 rounded-full blur-[0.3px] rotate-15"></div>
                <div className="absolute top-6 right-16 w-0.5 h-8 bg-white/25 rounded-full blur-[0.4px] -rotate-30"></div>
                <div className="absolute bottom-3 left-1/4 w-1 h-0.5 bg-white/20 rounded-full blur-[0.5px]"></div>
                <div className="absolute top-1/2 right-1/4 w-2 h-0.5 bg-white/15 rounded-full blur-[0.6px] rotate-45"></div>
              </div>

              {/* Glass surface light reflections */}
              <div className="absolute top-0 left-0 w-8 h-8 bg-white/20 rounded-full blur-2xl"></div>
              <div className="absolute top-0 right-0 w-6 h-6 bg-white/15 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 left-1/3 w-4 h-4 bg-white/10 rounded-full blur-lg"></div>

              {/* Glass edge highlights */}
              <div className="absolute top-0.5 left-6 right-6 h-[0.3px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
              <div className="absolute bottom-0.5 left-12 right-12 h-[0.3px] bg-gradient-to-r from-transparent via-white/25 to-transparent"></div>
              <div className="absolute left-0.5 top-6 bottom-6 w-[0.3px] bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
              <div className="absolute right-0.5 top-8 bottom-8 w-[0.3px] bg-gradient-to-b from-transparent via-white/15 to-transparent"></div>
            </div>

            <div className="relative z-10 flex items-center space-x-4 px-6 py-4">
              <span className="text-black/90 text-lg font-mono font-medium">:</span>

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-transparent text-black/90 placeholder-black/50 outline-none text-base font-medium selection:bg-black/10"
              />

              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="relative overflow-hidden backdrop-blur-2xl border border-white/20 rounded-full p-3 transition-all duration-300 group/btn shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.1) 100%)",
                  boxShadow: `
                    0 2px 8px rgba(0,0,0,0.05),
                    inset 1px 1px 1px rgba(255,255,255,0.3),
                    inset -1px -1px 1px rgba(255,255,255,0.2),
                    inset 0 0 4px rgba(255,255,255,0.1)
                  `,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-white/8 rounded-full -z-10"></div>
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-full -z-10"></div>

                <svg
                  className="relative w-5 h-5 text-black/80 group-hover/btn:translate-x-0.5 group-hover/btn:text-black/90 transition-all z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <GlassFilter />
    </div>
  )
}
