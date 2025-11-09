import { HydrateClient } from "~/trpc/server";
import Hero from "./_components/landing/hero";
import WorldMapSection from "./_components/landing/world-map-section";
import Tools from "./_components/landing/tools";
import Features from "./_components/landing/features";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col bg-black">
        <Hero />
        <Features />
        <WorldMapSection />
        <Tools />
      </main>
    </HydrateClient>
  );
}
