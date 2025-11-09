"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import WorldMap from "~/components/ui/world-map";
import { Button } from "~/components/ui/button";

export default function WorldMapSection() {
  // Sample data showing connections across the globe
  // You can customize these coordinates to show your actual data
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
  ];

  return (
    <section className="w-full border-t border-gray-800 bg-black px-6 py-16 md:px-12 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl">
            Global Reach
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Connecting customers and insights across the world in real-time
          </p>
        </div>
        <Link href="/map" className="group block">
          <div className="hover:border-primary/50 cursor-pointer overflow-hidden rounded-lg border border-gray-800 transition-colors">
            <div className="relative h-[300px] overflow-hidden md:h-[400px]">
              <div className="absolute inset-0">
                <WorldMap
                  dots={mapDots}
                  lineColor="#e20074" // T-Mobile magenta color
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
            </div>
          </div>
        </Link>
        <div className="mt-6 text-center">
          <Link href="/map">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              View Regional Insights
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
