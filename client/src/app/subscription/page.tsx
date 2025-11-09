"use client";

import { useState } from "react";
import { Check, Mail } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

type SubscriptionType = "daily" | "weekly" | null;

export default function SubscriptionPage() {
  const [selectedType, setSelectedType] = useState<SubscriptionType>(null);
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = () => {
    if (!selectedType || !email.trim()) return;
    // TODO: Implement actual subscription logic
    setIsSubscribed(true);
    setTimeout(() => setIsSubscribed(false), 3000);
  };

  return (
    <main className="flex min-h-[calc(100vh-73px)] w-full flex-col bg-black">
      <div className="mx-auto flex w-full max-w-4xl flex-col px-6 py-12 md:px-12">
        <div className="mb-12 text-center">
          <h1 className="text-foreground mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
            Stay Informed
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg md:text-xl">
            Get regular insights about customer sentiment, trends, and happiness
            metrics delivered to your inbox
          </p>
        </div>

        {isSubscribed ? (
          <Card className="bg-primary/20 border-primary/50 mx-auto max-w-md p-8 text-center">
            <div className="bg-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Check className="text-primary h-8 w-8" />
            </div>
            <h2 className="text-foreground mb-2 text-2xl font-bold">
              Successfully Subscribed!
            </h2>
            <p className="text-muted-foreground">
              You&apos;ll receive {selectedType} digests at {email}
            </p>
          </Card>
        ) : (
          <>
            {/* Subscription Options */}
            <div className="mb-8 flex justify-center">
              <Card
                className={`cursor-pointer border-2 p-6 transition-all ${
                  selectedType === "weekly"
                    ? "border-primary bg-primary/10"
                    : "bg-secondary/30 hover:border-primary/50 border-gray-800"
                }`}
                onClick={() => setSelectedType("weekly")}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-accent/20 flex h-12 w-12 items-center justify-center rounded-lg">
                    <Mail className="text-accent h-6 w-6" />
                  </div>
                  <h3 className="text-foreground text-xl font-semibold">
                    Weekly Digest
                  </h3>
                </div>
                <p className="text-muted-foreground mb-4 text-sm">
                  Receive a weekly comprehensive report with deeper analysis and
                  long-term trends
                </p>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="text-accent h-4 w-4" />
                    Weekly happiness index summary
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="text-accent h-4 w-4" />
                    Trend analysis and patterns
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="text-accent h-4 w-4" />
                    Actionable recommendations
                  </li>
                </ul>
              </Card>
            </div>

            {/* Email Input */}
            <Card className="bg-secondary/30 border-gray-800 p-6">
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="text-foreground mb-2 block text-sm font-semibold"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="text-foreground bg-secondary/50 focus:border-primary w-full rounded-lg border border-gray-800 px-4 py-3 focus:outline-none"
                />
              </div>
              <Button
                onClick={handleSubscribe}
                disabled={!selectedType || !email.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full py-6 text-base"
              >
                Subscribe to{" "}
                {selectedType === "daily"
                  ? "Daily"
                  : selectedType === "weekly"
                    ? "Weekly"
                    : ""}{" "}
                Digest
              </Button>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
