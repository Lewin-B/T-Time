import { HydrateClient } from "~/trpc/server";
import Hero from "./_components/landing/hero";
import WorldMapSection from "./_components/landing/world-map-section";
import Tools from "./_components/landing/tools";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col bg-black">
        <Hero />
        <WorldMapSection />
        <Tools />
      </main>
    </HydrateClient>
  );
}
