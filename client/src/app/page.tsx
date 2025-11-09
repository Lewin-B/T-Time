import { HydrateClient } from "~/trpc/server";
import Hero from "./_components/landing/hero";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-black">
        <Hero />
      </main>
    </HydrateClient>
  );
}
