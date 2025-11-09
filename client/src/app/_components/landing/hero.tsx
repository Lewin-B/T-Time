"use client";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { ArrowRight, Brain, MessageSquare, Zap } from "lucide-react";

export default function Hero() {
  return (
    <main className="bg-background min-h-screen w-full">
      {/* Navigation */}
      <nav className="border-border flex items-center justify-between border-b px-6 py-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="glow-effect bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded p-2 text-lg font-bold">
            T
          </div>
          <span className="text-foreground hidden text-sm font-semibold sm:inline">
            Time
          </span>
        </div>
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-24 md:px-12 md:py-32">
        <div className="mx-auto max-w-3xl space-y-8 text-center">
          {/* Badge */}
          <div className="inline-block">
            <span className="text-primary flex items-center justify-center gap-2 text-xs font-semibold tracking-wider uppercase">
              <Zap className="h-4 w-4" />
              AI-Powered Insights
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-foreground text-5xl font-bold text-balance md:text-6xl">
            T-Time
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-lg text-balance">
            Bringing Natural Language to Customer Service
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-16">
            <div>
              <div className="text-primary text-2xl font-bold md:text-3xl">
                1000+ sources
              </div>
              <p className="text-muted-foreground mt-1 text-xs md:text-sm">
                across the web
              </p>
            </div>
            <div>
              <div className="text-accent text-2xl font-bold md:text-3xl">
                Real-Time
              </div>
              <p className="text-muted-foreground mt-1 text-xs md:text-sm">
                Analysis
              </p>
            </div>
            <div>
              <div className="text-primary text-2xl font-bold md:text-3xl">
                Stay up
              </div>
              <p className="text-muted-foreground mt-1 text-xs md:text-sm">
                to date
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-border border-t px-6 py-20 md:px-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-foreground mb-12 text-center text-3xl font-bold md:text-4xl">
            Intelligent Features
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Feature 1 */}
            <Card className="bg-secondary/30 border-border hover:border-primary/50 p-6 transition-colors">
              <div className="bg-primary/20 mb-4 flex h-10 w-10 items-center justify-center rounded">
                <Brain className="text-primary h-5 w-5" />
              </div>
              <h3 className="text-foreground mb-2 font-semibold">
                Contextual AI
              </h3>
              <p className="text-muted-foreground text-sm">
                Understands nuance, emotion, and intent beyond keywords
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="bg-secondary/30 border-border hover:border-accent/50 p-6 transition-colors">
              <div className="bg-accent/20 mb-4 flex h-10 w-10 items-center justify-center rounded">
                <MessageSquare className="text-accent h-5 w-5" />
              </div>
              <h3 className="text-foreground mb-2 font-semibold">
                Multi-Channel
              </h3>
              <p className="text-muted-foreground text-sm">
                Analyzes calls, chats, emails, and social media unified
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="bg-secondary/30 border-border hover:border-primary/50 p-6 transition-colors">
              <div className="bg-primary/20 mb-4 flex h-10 w-10 items-center justify-center rounded">
                <Zap className="text-primary h-5 w-5" />
              </div>
              <h3 className="text-foreground mb-2 font-semibold">Actionable</h3>
              <p className="text-muted-foreground text-sm">
                Get immediate alerts and recommendations to boost satisfaction
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-border border-t px-6 py-20 md:px-12">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <h2 className="text-foreground text-4xl font-bold text-balance">
            Ready to transform customer service?
          </h2>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Get Started Today
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </main>
  );
}
