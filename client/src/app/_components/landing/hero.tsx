"use client";

import { Button } from "~/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";

export default function Hero() {
  return (
    <main className="min-h-screen w-full bg-black">
      {/* Navigation */}
      <nav className="flex items-center justify-between border-b border-gray-800 px-6 py-4 md:px-12">
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
      <section className="px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-4xl space-y-6 text-center">
          {/* Badge */}
          <div className="inline-block">
            <span className="text-primary flex items-center justify-center gap-2 text-xs font-semibold tracking-wider uppercase">
              <Zap className="h-4 w-4" />
              AI-Powered Insights
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-glow-tmobile text-6xl font-bold text-balance md:text-7xl lg:text-8xl">
            T-Time
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-xl text-balance md:text-2xl">
            Bringing Natural Language to Customer Service
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col justify-center gap-4 pt-6 sm:flex-row">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-12 md:pt-16">
            <div>
              <div className="text-primary text-3xl font-bold md:text-4xl">
                1000+ sources
              </div>
              <p className="text-muted-foreground mt-2 text-sm md:text-base">
                across the web
              </p>
            </div>
            <div>
              <div className="text-accent text-3xl font-bold md:text-4xl">
                Real-Time
              </div>
              <p className="text-muted-foreground mt-2 text-sm md:text-base">
                Analysis
              </p>
            </div>
            <div>
              <div className="text-primary text-3xl font-bold md:text-4xl">
                Stay up
              </div>
              <p className="text-muted-foreground mt-2 text-sm md:text-base">
                to date
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
