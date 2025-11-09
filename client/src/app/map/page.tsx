"use client";

import WorldMap from "~/components/ui/world-map";
import { api } from "~/trpc/react";

export default function MapPage() {
  // Fetch markers from tRPC endpoint
  const { data: markers = [], isLoading } = api.post.getMapMarkers.useQuery({
    query: "Negative and unhappy reviews",
  });

  // Convert markers to dots format for WorldMap component
  // Each marker becomes a dot with start and end at the same location
  const dots = markers.map(({ name, coordinates }) => ({
    start: {
      lat: coordinates[1] - 13, // latitude (second element)
      lng: coordinates[0], // longitude (first element)
      label: name,
    },
    end: {
      lat: coordinates[1] - 13, // same location
      lng: coordinates[0], // same location
      label: name,
    },
  }));

  console.log("dots: ", dots);

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-black">
      {/* Map Section */}
      <section className="flex flex-1 flex-col overflow-hidden px-6 py-4 md:px-12">
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
          <div className="mb-4 shrink-0 text-center">
            <h1 className="text-foreground mb-2 text-2xl font-bold md:text-3xl lg:text-4xl">
              Global Unhappiness Map
            </h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-sm md:text-base">
              Analyze real time data around the world
            </p>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {isLoading ? (
              <div className="text-primary text-lg">
                Analzying user feedback...
              </div>
            ) : (
              <div className="h-full w-full">
                <WorldMap dots={dots} lineColor="#e20074" theme="dark" />
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
