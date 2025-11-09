import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { env } from "~/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { pipeline, env as env2 } from "@huggingface/transformers";
import { TRPCError } from "@trpc/server";

env2.allowLocalModels = true;
env2.allowRemoteModels = true;

// Pinecone
const pc = new Pinecone({
  apiKey: env.PINECONE_API_KEY ?? "",
});
export const index = pc.index(env.PINECONE_INDEX_NAME ?? "");

// Gemini
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY ?? "");
export const gemini = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Initialize embedding model (e5-base-v2)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null;
const getEmbeddingModel = async () => {
  try {
    if (embeddingPipeline === null) {
      embeddingPipeline = await pipeline(
        "feature-extraction",
        "Xenova/e5-base-v2",
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return embeddingPipeline;
  } catch {
    throw new TRPCError({
      message: "Failed to initialize model",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
};

// Generate embedding using e5-base-v2 model
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const model = await getEmbeddingModel();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const output = (await model(text, {
      pooling: "mean",
      normalize: true,
    })) as { data: Float32Array | Float64Array | number[] };
    return Array.from(output.data);
  } catch (error) {
    throw new TRPCError({
      message: `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`,
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

interface PineconeMatch {
  id: string;
  score: number;
  metadata?: {
    timestamp?: number;
    text?: string;
    location_country?: string;
    location_region?: string;
    location_city?: string;
    lat?: number;
    lng?: number;
    name?: string;
    [key: string]: unknown;
  };
}

// Search Pinecone for relevant locations with date filtering
async function searchPinecone(
  queryEmbedding: number[],
  topK = 10,
  daysBack = 7,
): Promise<PineconeMatch[]> {
  const indexName = env.PINECONE_INDEX_NAME ?? "locations";

  // Calculate date range for the last N days
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysBack);

  // Convert to Unix timestamps (seconds since epoch)
  // Metadata uses Unix timestamp in seconds, not milliseconds
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(now.getTime() / 1000);

  try {
    const index = pc.index(indexName);

    // Try filtering by timestamp field in metadata
    // Metadata structure: { timestamp: Unix timestamp (seconds), ... }
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: {
        timestamp: {
          $gte: startTimestamp,
          $lte: endTimestamp,
        },
      },
    });

    const matches = (queryResponse.matches ?? []) as PineconeMatch[];

    // If filter returned results, use them
    if (matches.length > 0) {
      return matches;
    }

    // If filter returned 0 results, it might mean:
    // 1. No results in date range (legitimate)
    // 2. Filter field not indexed or filter syntax wrong (fallback needed)
    // Fall through to query without filter and filter client-side
  } catch {
    // Filter syntax error or field not available - fall back to client-side filtering
  }

  // Fallback: Query without filter and filter client-side
  try {
    const index = pc.index(indexName);
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: topK * 2, // Get more results since we'll filter client-side
      includeMetadata: true,
    });

    // Filter results client-side by date
    const filtered = (queryResponse.matches ?? []).filter((match) => {
      const metadata = match.metadata;
      if (!metadata?.timestamp) {
        return false;
      }

      // Metadata timestamp is already in Unix seconds format
      const timestamp = metadata.timestamp as number;
      const inRange = timestamp >= startTimestamp && timestamp <= endTimestamp;

      return inRange;
    }) as PineconeMatch[];

    return filtered;
  } catch {
    return [];
  }
}

// Use Gemini to analyze and extract location information
async function analyzeWithGemini(
  query: string,
  pineconeResults: PineconeMatch[],
): Promise<Array<{ name: string; coordinates: [number, number] }>> {
  // Build context from Pinecone results
  const context = pineconeResults
    .map((result, idx) => {
      const metadata = result.metadata ?? {};

      return `${idx + 1}. ${metadata.text ?? "Description not available"} (country: ${metadata.location_country ?? "Not available"}, region: ${metadata.location_region ?? "Not available"})`;
    })
    .join("\n");

  console.log("Context: ", context);

  const prompt = `You are analyzing location data from the last week. Based on the following context and the query "${query}", identify areas of possible interest.

  Context from search results:
  ${context || "No specific context available"}

  Please return a JSON array of locations that are relevant to the query. Each location should have:
  - name: The location name (city or region)
  - coordinates: [longitude, latitude] as an array of two numbers

  Focus on locations that:
  1. Are mentioned in the context
  2. Are relevant to the query about areas of interest from the last week
  3. Have valid geographic coordinates

  LOCATIONS MUST BE RELEVANT TO THE CONTEXT

  Return ONLY a valid JSON array, no other text. Example format:
  [
    {"name": "New York", "coordinates": [-74.006, 40.7128]},
    {"name": "London", "coordinates": [-0.1278, 51.5074]}
  ]`;

  try {
    const result = await gemini.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log("Text: ", text);
    // Extract JSON from response
    const jsonMatch = /\[[\s\S]*\]/.exec(text);
    if (jsonMatch) {
      const locations = JSON.parse(jsonMatch[0]) as Array<{
        name: string;
        coordinates: [number, number];
      }>;
      return locations;
    }

    // Fallback: return empty array
    return [];
  } catch {
    // Fallback: extract locations from Pinecone results
    return pineconeResults
      .filter((result) => result.metadata?.lat && result.metadata?.lng)
      .map((result) => {
        const metadata = result.metadata!;
        return {
          name: metadata.name ?? metadata.location_city ?? "Unknown Location",
          coordinates: [metadata.lng!, metadata.lat!] as [number, number],
        };
      });
  }
}

export const botRouter = createTRPCRouter({
  hello: publicProcedure.query(() => {
    return "hello world";
  }),

  getMapMarkers: publicProcedure
    .input(
      z.object({
        query: z
          .string()
          .optional()
          .default("areas of interest from the last week"),
      }),
    )
    .query(async ({ input }) => {
      try {
        // Step 1: Generate embedding for the query using e5-base-v2
        const queryEmbedding = await generateEmbedding(`query: ${input.query}`);

        // Step 2: Search Pinecone for relevant locations
        const pineconeResults = await searchPinecone(queryEmbedding, 50);

        // Step 3: Use Gemini to analyze results and extract location information
        const locations = await analyzeWithGemini(input.query, pineconeResults);

        // Step 4: Return markers in the format expected by the map
        return locations.map((location) => ({
          name: location.name,
          coordinates: location.coordinates,
        }));
      } catch {
        // Fallback: Return default locations if RAG fails
        return [
          { name: "New York", coordinates: [-74.006, 40.7128] },
          { name: "London", coordinates: [-0.1278, 51.5074] },
          { name: "Tokyo", coordinates: [139.6503, 35.6762] },
          { name: "San Francisco", coordinates: [-122.4194, 37.7749] },
          { name: "Sydney", coordinates: [151.2093, -33.8688] },
          { name: "Singapore", coordinates: [103.8198, 1.3521] },
          { name: "Moscow", coordinates: [37.6173, 55.7558] },
          { name: "Beijing", coordinates: [116.4074, 39.9042] },
          { name: "Rio de Janeiro", coordinates: [-43.1729, -22.9068] },
          { name: "New Delhi", coordinates: [77.209, 28.6139] },
        ];
      }
    }),
});
