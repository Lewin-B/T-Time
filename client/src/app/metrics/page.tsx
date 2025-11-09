"use client";

import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { Card } from "~/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  trend: "up" | "down" | "neutral";
  description?: string;
}

function MetricCard({ title, value, change, trend, description }: MetricCardProps) {
  const trendIcon =
    trend === "up" ? (
      <TrendingUp className="text-green-500 h-4 w-4" />
    ) : trend === "down" ? (
      <TrendingDown className="text-red-500 h-4 w-4" />
    ) : (
      <Minus className="text-gray-500 h-4 w-4" />
    );

  const trendColor =
    trend === "up"
      ? "text-green-500"
      : trend === "down"
        ? "text-red-500"
        : "text-gray-500";

  return (
    <Card className="bg-secondary/30 border-gray-800 p-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-muted-foreground text-sm font-semibold uppercase">
          {title}
        </h3>
        {trendIcon}
      </div>
      <p className="text-foreground mb-1 text-3xl font-bold">{value}</p>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${trendColor}`}>
          {change > 0 ? "+" : ""}
          {change}%
        </span>
        <span className="text-muted-foreground text-xs">vs last period</span>
      </div>
      {description && (
        <p className="text-muted-foreground mt-3 text-xs">{description}</p>
      )}
    </Card>
  );
}

export default function MetricsPage() {
  // Mock data - replace with actual API calls
  const metrics = {
    overallHappiness: { value: 72, change: 5.2, trend: "up" as const },
    positiveSentiment: { value: 68, change: 3.1, trend: "up" as const },
    negativeSentiment: { value: 15, change: -2.3, trend: "down" as const },
    neutralSentiment: { value: 17, change: -0.8, trend: "neutral" as const },
    responseTime: { value: "2.4h", change: -12.5, trend: "down" as const },
    resolutionRate: { value: 89, change: 4.7, trend: "up" as const },
  };

  return (
    <main className="flex min-h-[calc(100vh-73px)] w-full flex-col bg-black">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-6 py-12 md:px-12">
        <div className="mb-12 text-center">
          <div className="bg-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <BarChart3 className="text-primary h-8 w-8" />
          </div>
          <h1 className="text-foreground mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
            Happiness Index Metrics
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg md:text-xl">
            Track customer satisfaction trends and sentiment analysis in
            real-time
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Overall Happiness Index"
            value={metrics.overallHappiness.value}
            change={metrics.overallHappiness.change}
            trend={metrics.overallHappiness.trend}
            description="Composite score based on all customer interactions"
          />
          <MetricCard
            title="Positive Sentiment"
            value={`${metrics.positiveSentiment.value}%`}
            change={metrics.positiveSentiment.change}
            trend={metrics.positiveSentiment.trend}
            description="Percentage of interactions with positive sentiment"
          />
          <MetricCard
            title="Negative Sentiment"
            value={`${metrics.negativeSentiment.value}%`}
            change={metrics.negativeSentiment.change}
            trend={metrics.negativeSentiment.trend}
            description="Percentage of interactions with negative sentiment"
          />
          <MetricCard
            title="Neutral Sentiment"
            value={`${metrics.neutralSentiment.value}%`}
            change={metrics.neutralSentiment.change}
            trend={metrics.neutralSentiment.trend}
            description="Percentage of interactions with neutral sentiment"
          />
          <MetricCard
            title="Avg Response Time"
            value={metrics.responseTime.value}
            change={metrics.responseTime.change}
            trend={metrics.responseTime.trend}
            description="Average time to respond to customer inquiries"
          />
          <MetricCard
            title="Resolution Rate"
            value={`${metrics.resolutionRate.value}%`}
            change={metrics.resolutionRate.change}
            trend={metrics.resolutionRate.trend}
            description="Percentage of issues resolved on first contact"
          />
        </div>

        {/* Additional Info Card */}
        <Card className="bg-secondary/30 border-gray-800 p-6">
          <h2 className="text-foreground mb-4 text-xl font-semibold">
            About the Happiness Index
          </h2>
          <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
            The Happiness Index is calculated using advanced natural language
            processing to analyze customer feedback across all channels. It
            considers sentiment, emotion, context, and resolution outcomes to
            provide a comprehensive view of customer satisfaction.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <h4 className="text-foreground mb-2 text-sm font-semibold">
                Data Sources
              </h4>
              <p className="text-muted-foreground text-xs">
                Customer calls, chats, emails, and social media interactions
              </p>
            </div>
            <div>
              <h4 className="text-foreground mb-2 text-sm font-semibold">
                Update Frequency
              </h4>
              <p className="text-muted-foreground text-xs">
                Metrics are updated in real-time as new data is processed
              </p>
            </div>
            <div>
              <h4 className="text-foreground mb-2 text-sm font-semibold">
                AI-Powered Analysis
              </h4>
              <p className="text-muted-foreground text-xs">
                Powered by advanced AI models for accurate sentiment detection
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

