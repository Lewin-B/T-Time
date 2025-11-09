"use client";

import { useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your T-Time AI assistant. I can help you analyze customer feedback, understand sentiment trends, and answer questions about your happiness metrics. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I understand you're asking about "${userMessage.content}". This is a placeholder response. Connect me to your AI backend to get real answers!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="flex h-[calc(100vh-73px)] w-full flex-col bg-black">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-6 py-6 md:px-12">
        <div className="mb-6 text-center">
          <h1 className="text-foreground mb-2 text-2xl font-bold md:text-3xl lg:text-4xl">
            AI Chat Assistant
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Ask questions about customer sentiment, trends, and insights
          </p>
        </div>

        {/* Messages Container */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-lg border border-gray-800 bg-secondary/20 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="bg-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Bot className="text-primary h-4 w-4" />
                </div>
              )}
              <Card
                className={`max-w-[80%] p-4 ${
                  message.role === "user"
                    ? "bg-primary/20 text-primary-foreground"
                    : "bg-secondary/50"
                }`}
              >
                <p className="text-sm md:text-base">{message.content}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </Card>
              {message.role === "user" && (
                <div className="bg-accent/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <User className="text-accent h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <Bot className="text-primary h-4 w-4" />
              </div>
              <Card className="bg-secondary/50 p-4">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary"></div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about customer sentiment, trends, or insights..."
            className="text-foreground bg-secondary/30 border-gray-800 flex-1 rounded-lg border px-4 py-3 focus:border-primary focus:outline-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}

