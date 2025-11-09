"use client";

import { useState } from "react";
import WorldMap from "~/components/ui/world-map";
import { api } from "~/trpc/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function MapPage() {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Fetch markers from tRPC endpoint
  const { data: markers = [], isLoading } = api.post.getMapMarkers.useQuery({
    query: "Negative and unhappy reviews",
  });

  // Fetch sentiment data for selected location
  const { data: locationSentiment, isLoading: isLoadingSentiment } =
    api.post.getLocationSentiment.useQuery(
      {
        label: selectedLabel ?? "",
      },
      {
        enabled: !!selectedLabel,
      },
    );

  // Convert markers to dots format for WorldMap component
  // Each marker becomes a dot with start and end at the same location
  const dots = markers.map(({ name, coordinates }) => ({
    start: {
      lat: (coordinates[1] ?? 50) - 13, // latitude (second element)
      lng: coordinates[0] ?? 50, // longitude (first element)
      label: name,
    },
    end: {
      lat: (coordinates[1] ?? 50) - 13, // same location
      lng: coordinates[0] ?? 50, // same location
      label: name,
    },
  }));

  const handleDotClick = (coordinates: [number, number], name?: string) => {
    if (name) {
      setSelectedLabel(name);
      setIsSheetOpen(true);
    }
  };


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
                <WorldMap
                  dots={dots}
                  lineColor="#e20074"
                  theme="dark"
                  onDotClick={handleDotClick}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sidebar for sentiment scores */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>{selectedLabel ?? "Location"}</SheetTitle>
            <SheetDescription>
              Sentiment analysis and feedback for this location
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {isLoadingSentiment ? (
              <div className="text-muted-foreground py-8 text-center">
                Loading sentiment data...
              </div>
            ) : locationSentiment ? (
              <>
                {/* Positive Sentiment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Positive Sentiment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-green-500">
                        {locationSentiment.positiveSentiment}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Negative Sentiment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Negative Sentiment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-red-500">
                        {locationSentiment.negativeSentiment}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Text Feedback */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {locationSentiment.textFeedback.length > 0 ? (
                        locationSentiment.textFeedback.map((feedback, index) => (
                          <p
                            key={index}
                            className="text-sm text-muted-foreground border-l-2 border-primary pl-3 py-2"
                          >
                            {feedback}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No feedback available for this location.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                No sentiment data available for this location.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
