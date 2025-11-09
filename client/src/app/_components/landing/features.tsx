"use client";

import Link from "next/link";
import { Brain, Zap, MessageSquare } from "lucide-react";
import { Card } from "~/components/ui/card";

export default function Features() {
  return (
    <div>
      {/* Features Section */}
      <section className="border-t border-gray-800 px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-foreground mb-10 text-center text-3xl font-bold md:text-4xl lg:text-5xl">
            Intelligent Features
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Feature 1 - Chatbot Interface */}
            <Link href="/chat" className="block">
              <Card className="bg-secondary/30 hover:border-primary/50 border-gray-800 p-8 transition-all hover:scale-105 cursor-pointer">
                <div className="bg-primary/20 mb-5 flex h-12 w-12 items-center justify-center rounded">
                  <Brain className="text-primary h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-3 text-lg font-semibold">
                  Contextual AI
                </h3>
                <p className="text-muted-foreground text-base">
                  Understands nuance, emotion, and intent beyond keywords
                </p>
              </Card>
            </Link>

            {/* Feature 2 - Subscription/Digest */}
            <Link href="/subscription" className="block">
              <Card className="bg-secondary/30 hover:border-accent/50 border-gray-800 p-8 transition-all hover:scale-105 cursor-pointer">
                <div className="bg-accent/20 mb-5 flex h-12 w-12 items-center justify-center rounded">
                  <MessageSquare className="text-accent h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-3 text-lg font-semibold">
                  Multi-Channel
                </h3>
                <p className="text-muted-foreground text-base">
                  Subscribe to daily and weekly digests of customer insights
                </p>
              </Card>
            </Link>

            {/* Feature 3 - Happiness Index Metrics */}
            <Link href="/metrics" className="block">
              <Card className="bg-secondary/30 hover:border-primary/50 border-gray-800 p-8 transition-all hover:scale-105 cursor-pointer">
                <div className="bg-primary/20 mb-5 flex h-12 w-12 items-center justify-center rounded">
                  <Zap className="text-primary h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-3 text-lg font-semibold">
                  Actionable
                </h3>
                <p className="text-muted-foreground text-base">
                  View happiness index metrics and track satisfaction trends
                </p>
              </Card>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
