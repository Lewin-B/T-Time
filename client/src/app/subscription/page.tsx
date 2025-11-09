"use client";

import { useState } from "react";
import { Check, Mail } from "lucide-react";

type SubscriptionType = "daily" | "weekly" | null;

export default function SubscriptionPage() {
  const [selectedType, setSelectedType] = useState<SubscriptionType>(null);
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    console.log("Subscribe button clicked", { selectedType, email });

    if (!selectedType || !email.trim()) {
      setError("Please select a subscription type and enter your email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Simulate API call - replace with actual API call
      console.log("Subscribing with:", {
        email: email.trim(),
        type: selectedType,
      });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate success
      setIsSubscribed(true);
      setTimeout(() => {
        setIsSubscribed(false);
        setEmail("");
        setSelectedType(null);
      }, 3000);
    } catch (err) {
      console.error("Subscription error:", err);
      setError("Failed to subscribe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col bg-black">
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
          <div className="bg-primary/20 border-primary/50 mx-auto max-w-md rounded-lg border p-8 text-center">
            <div className="bg-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Check className="text-primary h-8 w-8" />
            </div>
            <h2 className="text-foreground mb-2 text-2xl font-bold">
              Successfully Subscribed!
            </h2>
            <p className="text-muted-foreground">
              You&apos;ll receive {selectedType} digests at {email}
            </p>
          </div>
        ) : (
          <>
            {/* Subscription Options */}
            <div className="mb-8 flex justify-center">
              <div
                className={`cursor-pointer rounded-lg border-2 p-6 transition-all ${
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
              </div>
            </div>

            {/* Email Input */}
            <div className="bg-secondary/30 rounded-lg border border-gray-800 p-6">
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="your.email@example.com"
                  className="text-foreground bg-secondary/50 focus:border-primary w-full rounded-lg border border-gray-800 px-4 py-3 focus:outline-none"
                />
                {error && (
                  <p className="text-destructive mt-2 text-sm">{error}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={!selectedType || !email.trim() || isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full rounded-lg py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? "Subscribing..."
                  : `Subscribe to ${
                      selectedType === "daily"
                        ? "Daily"
                        : selectedType === "weekly"
                          ? "Weekly"
                          : ""
                    } Digest`}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
