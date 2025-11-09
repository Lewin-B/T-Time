"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import WorldMap from "~/components/ui/world-map";

export default function MapPage() {
  // Sample data showing connections across the globe
  const mapDots = [
    {
      start: { lat: 40.7128, lng: -74.006 }, // New York
      end: { lat: 51.5074, lng: -0.1278 }, // London
    },
    {
      start: { lat: 37.7749, lng: -122.4194 }, // San Francisco
      end: { lat: 35.6762, lng: 139.6503 }, // Tokyo
    },
    {
      start: { lat: -33.8688, lng: 151.2093 }, // Sydney
      end: { lat: 1.3521, lng: 103.8198 }, // Singapore
    },
    {
      start: { lat: 55.7558, lng: 37.6173 }, // Moscow
      end: { lat: 39.9042, lng: 116.4074 }, // Beijing
    },
    {
      start: { lat: -22.9068, lng: -43.1729 }, // Rio de Janeiro
      end: { lat: 28.6139, lng: 77.209 }, // New Delhi
    },
    {
      start: { lat: 48.8566, lng: 2.3522 }, // Paris
      end: { lat: 52.52, lng: 13.405 }, // Berlin
    },
    {
      start: { lat: 25.2048, lng: 55.2708 }, // Dubai
      end: { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
    },
  ];

  return (
    <main className="min-h-screen w-full bg-black">
      {/* Navigation */}
      <nav className="flex items-center justify-between border-b border-gray-800 px-6 py-4 md:px-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="glow-effect bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded p-2 text-lg font-bold">
            T
          </div>
          <span className="text-foreground hidden text-sm font-semibold sm:inline">
            Time
          </span>
        </div>
      </nav>

      {/* Map Section */}
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <h1 className="text-foreground mb-4 text-4xl font-bold md:text-5xl lg:text-6xl">
              Global Network Map
            </h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg md:text-xl">
              Explore our worldwide connections and real-time data flow
            </p>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-800">
            <WorldMap
              dots={mapDots}
              lineColor="#e20074" // T-Mobile magenta color
            />
          </div>
        </div>
      </section>
    </main>
  );
}


