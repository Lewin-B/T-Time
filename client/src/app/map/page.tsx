"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { api } from "~/trpc/react";

const geoUrl =
  "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

export default function MapPage() {
  // Fetch markers from tRPC endpoint
  const { data: markers = [], isLoading } = api.post.getMapMarkers.useQuery({
    query: "Negative reviews relating to specific locations",
  });
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
          <div className="overflow-hidden rounded-lg border border-gray-800 bg-black">
            <ComposableMap
              projectionConfig={{
                scale: 147,
                center: [0, 20],
              }}
              className="w-full"
              style={{
                width: "100%",
                height: "auto",
              }}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#1a1a1a"
                      stroke="#2a2a2a"
                      strokeWidth={0.5}
                      style={{
                        default: {
                          fill: "#1a1a1a",
                          stroke: "#2a2a2a",
                          outline: "none",
                        },
                        hover: {
                          fill: "#2a2a2a",
                          stroke: "#e20074",
                          strokeWidth: 1,
                          outline: "none",
                        },
                        pressed: {
                          fill: "#2a2a2a",
                          stroke: "#e20074",
                          strokeWidth: 1,
                          outline: "none",
                        },
                      }}
                    />
                  ))
                }
              </Geographies>
              {isLoading ? (
                <Marker coordinates={[0, 0]}>
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    fill="#e20074"
                    fontSize={14}
                  >
                    Loading markers...
                  </text>
                </Marker>
              ) : (
                markers.map(({ name, coordinates }) => (
                  <Marker key={name} coordinates={coordinates}>
                    <circle
                      r={4}
                      fill="#e20074"
                      stroke="#ffffff"
                      strokeWidth={1}
                      className="animate-pulse"
                    />
                    <circle
                      r={8}
                      fill="#e20074"
                      opacity={0.3}
                      className="animate-ping"
                    />
                  </Marker>
                ))
              )}
            </ComposableMap>
          </div>
        </div>
      </section>
    </main>
  );
}
