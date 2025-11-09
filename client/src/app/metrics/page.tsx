"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, X } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

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
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch metrics from the API
  const { data: metricsData, isLoading, error } = api.post.getMetrics.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Use API data or fallback to default values
  const metrics = metricsData ?? {
    overallHappiness: { value: 0, change: 0, trend: "neutral" as const },
    positiveSentiment: { value: 0, change: 0, trend: "neutral" as const },
    negativeSentiment: { value: 0, change: 0, trend: "neutral" as const },
    neutralSentiment: { value: 0, change: 0, trend: "neutral" as const },
    responseTime: { value: "0h", change: 0, trend: "neutral" as const },
    resolutionRate: { value: 0, change: 0, trend: "neutral" as const },
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

        {/* Date Filter Section */}
        <div className="mb-8">
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
                    ? `Showing metrics from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
                    : startDate
                      ? `Showing metrics from ${new Date(startDate).toLocaleDateString()} onwards`
                      : `Showing metrics up to ${new Date(endDate).toLocaleDateString()}`}
                </p>
              )}
            </Card>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-center">
            <div className="text-red-500 text-lg">
              Error loading metrics: {error.message}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-8 text-center">
            <div className="text-primary text-lg">Analyzing customer feedback...</div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Overall Happiness Index"
            value={metrics.overallHappiness?.value ?? 0}
            change={metrics.overallHappiness?.change ?? 0}
            trend={metrics.overallHappiness?.trend ?? "neutral"}
            description="Composite score based on all customer interactions"
          />
          <MetricCard
            title="Positive Sentiment"
            value={`${metrics.positiveSentiment?.value ?? 0}%`}
            change={metrics.positiveSentiment?.change ?? 0}
            trend={metrics.positiveSentiment?.trend ?? "neutral"}
            description="Percentage of interactions with positive sentiment"
          />
          <MetricCard
            title="Negative Sentiment"
            value={`${metrics.negativeSentiment?.value ?? 0}%`}
            change={metrics.negativeSentiment?.change ?? 0}
            trend={metrics.negativeSentiment?.trend ?? "neutral"}
            description="Percentage of interactions with negative sentiment"
          />
          <MetricCard
            title="Neutral Sentiment"
            value={`${metrics.neutralSentiment?.value ?? 0}%`}
            change={metrics.neutralSentiment?.change ?? 0}
            trend={metrics.neutralSentiment?.trend ?? "neutral"}
            description="Percentage of interactions with neutral sentiment"
          />
          <MetricCard
            title="Avg Response Time"
            value={metrics.responseTime?.value ?? "0h"}
            change={metrics.responseTime?.change ?? 0}
            trend={metrics.responseTime?.trend ?? "neutral"}
            description="Average time to respond to customer inquiries"
          />
          <MetricCard
            title="Resolution Rate"
            value={`${metrics.resolutionRate?.value ?? 0}%`}
            change={metrics.resolutionRate?.change ?? 0}
            trend={metrics.resolutionRate?.trend ?? "neutral"}
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

