"use client";

import { useState } from "react";
import { Send, Bot, User, Calendar, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { api } from "~/trpc/react";

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
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const chatMutation = api.post.chat.useMutation({
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input;
    setInput("");

    // Build conversation history (exclude the initial greeting and the current message)
    // Include the most recent messages (last 10 messages) except the first assistant greeting
    // This keeps the context manageable while maintaining recent conversation flow
    const conversationHistory = messages
      .slice(1) // Skip the initial greeting message
      .slice(-10) // Keep only the last 10 messages to avoid token limits
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    // Call the RAG-enhanced chat endpoint with conversation history and date filters
    chatMutation.mutate({
      message: messageToSend,
      conversationHistory,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
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

        {/* Date Filter Section */}
        <div className="mb-4">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="bg-secondary/30 border-gray-800 text-foreground hover:bg-secondary/50"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {showFilters ? "Hide" : "Show"} Date Filters
            {(startDate || endDate) && (
              <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                Active
              </span>
            )}
          </Button>

          {showFilters && (
            <Card className="bg-secondary/30 border-gray-800 mt-2 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <label
                    htmlFor="startDate"
                    className="text-foreground mb-2 block text-sm font-semibold"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-foreground bg-secondary/50 border-gray-800 w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="endDate"
                    className="text-foreground mb-2 block text-sm font-semibold"
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-foreground bg-secondary/50 border-gray-800 w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    variant="outline"
                    className="bg-secondary/30 border-gray-800 text-foreground hover:bg-secondary/50"
                    disabled={!startDate && !endDate}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
              {(startDate || endDate) && (
                <p className="text-muted-foreground mt-2 text-xs">
                  {startDate && endDate
                    ? `Filtering results from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
                    : startDate
                      ? `Filtering results from ${new Date(startDate).toLocaleDateString()} onwards`
                      : `Filtering results up to ${new Date(endDate).toLocaleDateString()}`}
                </p>
              )}
            </Card>
          )}
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
                <div
                  className="text-sm md:text-base whitespace-pre-wrap"
                  style={{
                    lineHeight: "1.6",
                  }}
                >
                  {message.content.split("\n").map((line, idx) => {
                    // Check if line starts with bullet point indicators
                    if (
                      line.trim().startsWith("•") ||
                      line.trim().startsWith("-") ||
                      line.trim().startsWith("*")
                    ) {
                      return (
                        <div key={idx} className="ml-4 mb-1">
                          {line}
                        </div>
                      );
                    }
                    // Check for example references like [Example 1]
                    if (line.includes("[Example")) {
                      return (
                        <div
                          key={idx}
                          className="mb-1 font-semibold text-primary"
                        >
                          {line}
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="mb-2">
                        {line}
                      </div>
                    );
                  })}
                </div>
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
          {chatMutation.isPending && (
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
            disabled={chatMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}

