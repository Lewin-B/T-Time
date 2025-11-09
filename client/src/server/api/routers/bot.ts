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
  daysBack?: number,
  startDate?: Date,
  endDate?: Date,
): Promise<PineconeMatch[]> {
  const indexName = env.PINECONE_INDEX_NAME ?? "locations";

  // Calculate date range
  let startTimestamp: number;
  let endTimestamp: number;

  if (startDate && endDate) {
    // Use provided date range
    startTimestamp = Math.floor(startDate.getTime() / 1000);
    endTimestamp = Math.floor(endDate.getTime() / 1000);
  } else {
    // Calculate date range for the last N days (default to 7 if not specified)
    const now = new Date();
    const days = daysBack ?? 7;
    const calculatedStartDate = new Date(now);
    calculatedStartDate.setDate(calculatedStartDate.getDate() - days);
    startTimestamp = Math.floor(calculatedStartDate.getTime() / 1000);
    endTimestamp = Math.floor(now.getTime() / 1000);
  }

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

// Use Gemini to extract metrics from Pinecone data
async function extractMetricsFromData(
  pineconeResults: PineconeMatch[],
): Promise<{
  overallHappiness: {
    value: number;
    change: number;
    trend: "up" | "down" | "neutral";
  };
  positiveSentiment: {
    value: number;
    change: number;
    trend: "up" | "down" | "neutral";
  };
  negativeSentiment: {
    value: number;
    change: number;
    trend: "up" | "down" | "neutral";
  };
  neutralSentiment: {
    value: number;
    change: number;
    trend: "up" | "down" | "neutral";
  };
  responseTime: {
    value: string;
    change: number;
    trend: "up" | "down" | "neutral";
  };
  resolutionRate: {
    value: number;
    change: number;
    trend: "up" | "down" | "neutral";
  };
}> {
  // Build context from Pinecone results
  const context = pineconeResults
    .map((result, idx) => {
      const metadata = result.metadata ?? {};
      const locationInfo =
        metadata.location_city && metadata.location_country
          ? `${metadata.location_city}, ${metadata.location_country}`
          : (metadata.location_city ??
            metadata.location_country ??
            "Unknown location");
      const timestamp = metadata.timestamp
        ? new Date(metadata.timestamp * 1000).toLocaleDateString()
        : "Unknown date";

      return `[Feedback ${idx + 1}]
ID: ${result.id}
Text: ${metadata.text ?? "Description not available"}
Location: ${locationInfo}
Date: ${timestamp}
Score: ${result.score.toFixed(3)}`;
    })
    .join("\n\n");

  console.log("Metrics Context: ", context);
  console.log("Total feedback entries: ", pineconeResults.length);

  const prompt = `You are analyzing customer feedback data to extract happiness metrics. Based on the following customer feedback data, calculate and return metrics in JSON format.

CUSTOMER FEEDBACK DATA:
${context || "No feedback data available"}

Analyze the feedback and calculate:
1. Overall Happiness Index (0-100): A composite score based on sentiment analysis
2. Positive Sentiment (%): Percentage of feedback with positive sentiment
3. Negative Sentiment (%): Percentage of feedback with negative sentiment
4. Neutral Sentiment (%): Percentage of feedback with neutral sentiment
5. Avg Response Time: Average response time (format as "X.Xh" for hours or "X.Xm" for minutes)
6. Resolution Rate (%): Estimated resolution rate based on feedback patterns

For change percentages, compare against a baseline (assume previous period had similar distribution but slightly different values - calculate a reasonable change).

Return ONLY a valid JSON object in this exact format (no other text):
{
  "overallHappiness": { "value": 72, "change": 5.2, "trend": "up" },
  "positiveSentiment": { "value": 68, "change": 3.1, "trend": "up" },
  "negativeSentiment": { "value": 15, "change": -2.3, "trend": "down" },
  "neutralSentiment": { "value": 17, "change": -0.8, "trend": "neutral" },
  "responseTime": { "value": "2.4h", "change": -12.5, "trend": "down" },
  "resolutionRate": { "value": 89, "change": 4.7, "trend": "up" }
}

Trend values must be: "up", "down", or "neutral"
Change values should be percentages (can be negative)
If data is insufficient, use reasonable estimates based on the available feedback.`;

  try {
    const result = await gemini.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log("Metrics Response: ", text);

    // Extract JSON from response
    const jsonMatch = /\{[\s\S]*\}/.exec(text);
    if (jsonMatch) {
      const metrics = JSON.parse(jsonMatch[0]) as {
        overallHappiness: {
          value: number;
          change: number;
          trend: "up" | "down" | "neutral";
        };
        positiveSentiment: {
          value: number;
          change: number;
          trend: "up" | "down" | "neutral";
        };
        negativeSentiment: {
          value: number;
          change: number;
          trend: "up" | "down" | "neutral";
        };
        neutralSentiment: {
          value: number;
          change: number;
          trend: "up" | "down" | "neutral";
        };
        responseTime: {
          value: string;
          change: number;
          trend: "up" | "down" | "neutral";
        };
        resolutionRate: {
          value: number;
          change: number;
          trend: "up" | "down" | "neutral";
        };
      };
      return metrics;
    }

    // Fallback: Calculate basic metrics from data
    return calculateBasicMetrics(pineconeResults);
  } catch (error) {
    console.error("Error extracting metrics:", error);
    // Fallback: Calculate basic metrics from data
    return calculateBasicMetrics(pineconeResults);
  }
}

// Fallback function to calculate basic metrics from data
function calculateBasicMetrics(pineconeResults: PineconeMatch[]): {
  overallHappiness: {
    value: number;
    change: number;
    trend: "up" | "down" | "neutral";
  };
  positiveSentiment: {
    value: number;
    change: number;
    trend: "up" | "down" | "neutral";
  };
  negativeSentiment: {
    value: number;
    change: number;
    trend: "up" | "down" | "neutral";
  };
  neutralSentiment: {
    value: number;
    change: number;
    trend: "up" | "down" | "neutral";
  };
  responseTime: {
    value: string;
    change: number;
    trend: "up" | "down" | "neutral";
  };
  resolutionRate: {
    value: number;
    change: number;
    trend: "up" | "down" | "neutral";
  };
} {
  if (pineconeResults.length === 0) {
    return {
      overallHappiness: { value: 0, change: 0, trend: "neutral" },
      positiveSentiment: { value: 0, change: 0, trend: "neutral" },
      negativeSentiment: { value: 0, change: 0, trend: "neutral" },
      neutralSentiment: { value: 0, change: 0, trend: "neutral" },
      responseTime: { value: "0h", change: 0, trend: "neutral" },
      resolutionRate: { value: 0, change: 0, trend: "neutral" },
    };
  }

  // Simple sentiment analysis based on text content
  const positiveKeywords = [
    "good",
    "great",
    "excellent",
    "happy",
    "satisfied",
    "love",
    "amazing",
    "perfect",
    "wonderful",
  ];
  const negativeKeywords = [
    "bad",
    "terrible",
    "awful",
    "hate",
    "disappointed",
    "frustrated",
    "poor",
    "worst",
    "horrible",
  ];

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  pineconeResults.forEach((result) => {
    const text = (result.metadata?.text ?? "").toLowerCase();
    const hasPositive = positiveKeywords.some((keyword) =>
      text.includes(keyword),
    );
    const hasNegative = negativeKeywords.some((keyword) =>
      text.includes(keyword),
    );

    if (hasPositive && !hasNegative) {
      positiveCount++;
    } else if (hasNegative && !hasPositive) {
      negativeCount++;
    } else {
      neutralCount++;
    }
  });

  const total = pineconeResults.length;
  const positiveSentiment = Math.round((positiveCount / total) * 100);
  const negativeSentiment = Math.round((negativeCount / total) * 100);
  const neutralSentiment = Math.round((neutralCount / total) * 100);
  const overallHappiness = Math.round(
    positiveSentiment * 0.7 + neutralSentiment * 0.3 - negativeSentiment * 0.5,
  );

  return {
    overallHappiness: {
      value: Math.max(0, Math.min(100, overallHappiness)),
      change: 0,
      trend: "neutral",
    },
    positiveSentiment: {
      value: positiveSentiment,
      change: 0,
      trend: "neutral",
    },
    negativeSentiment: {
      value: negativeSentiment,
      change: 0,
      trend: "neutral",
    },
    neutralSentiment: {
      value: neutralSentiment,
      change: 0,
      trend: "neutral",
    },
    responseTime: {
      value: "2.4h",
      change: 0,
      trend: "neutral",
    },
    resolutionRate: {
      value: 85,
      change: 0,
      trend: "neutral",
    },
  };
}

// Use Gemini to generate chat response with RAG context and conversation history
async function generateChatResponse(
  query: string,
  pineconeResults: PineconeMatch[],
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [],
): Promise<string> {
  // Build context from Pinecone results with structured metadata
  const context = pineconeResults
    .map((result, idx) => {
      const metadata = result.metadata ?? {};
      const locationInfo =
        metadata.location_city && metadata.location_country
          ? `${metadata.location_city}, ${metadata.location_country}`
          : (metadata.location_city ??
            metadata.location_country ??
            "Unknown location");
      const timestamp = metadata.timestamp
        ? new Date(metadata.timestamp * 1000).toLocaleDateString()
        : "Unknown date";

      return `[Example ${idx + 1}]
ID: ${result.id}
Text: ${metadata.text ?? "Description not available"}
Location: ${locationInfo}
Date: ${timestamp}
Score: ${result.score.toFixed(3)}`;
    })
    .join("\n\n");

  // Build conversation history string
  const conversationHistoryText =
    conversationHistory.length > 0
      ? conversationHistory
          .map((msg) => {
            const roleLabel = msg.role === "user" ? "User" : "Assistant";
            return `${roleLabel}: ${msg.content}`;
          })
          .join("\n\n")
      : "No previous conversation history.";

  console.log("Chat Context: ", context);
  console.log("User Query: ", query);
  console.log("Conversation History Length: ", conversationHistory.length);

  const prompt = `You are a helpful AI assistant for T-Time, a customer sentiment and happiness metrics analysis platform. Your role is to help users understand customer feedback, sentiment trends, and happiness metrics.

CONVERSATION HISTORY:
${conversationHistoryText}

CURRENT USER QUERY:
${query}

CONTEXT FROM RECENT CUSTOMER FEEDBACK DATA:
${context || "No specific context available from recent data"}

RESPONSE FORMAT REQUIREMENTS:
- Keep responses SHORT and CONCISE (2-4 sentences maximum for introduction, then use bullet points)
- Use bullet points (•) to organize information and list metadata
- Structure responses with clear sections using bullet points
- When referencing examples from the context, include the example number like "[Example 1]" or "[Example 2]"
- Group related information together using bullet points
- List key metadata points (locations, dates, sentiment indicators) as bullet points
- Be direct and avoid unnecessary verbosity

INSTRUCTIONS:
1. Use the conversation history to understand the context of the current question
2. If the user is referring to something from earlier in the conversation, use that context
3. Use the customer feedback data context to answer the user's question accurately
4. Structure your response with:
   - A brief 1-2 sentence answer
   - Bullet points listing key findings, metadata, or examples
   - Reference specific examples using "[Example X]" format from the context above
5. If the context is relevant, reference specific details from it using example numbers
6. If the context doesn't contain relevant information, provide a brief general response with bullet points about customer sentiment analysis, happiness metrics, or trends
7. Maintain continuity with the conversation history - reference previous topics if relevant
8. Focus on actionable insights when possible
9. When listing locations, sentiment, or trends, use bullet points and reference example numbers
10. Keep the entire response concise - aim for 50-150 words total

Provide your response:`;

  try {
    const result = await gemini.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    return text.trim();
  } catch (error) {
    console.error("Error generating chat response:", error);
    // Fallback response
    return `I understand you're asking about "${query}". While I'm having trouble accessing the latest data right now, I can help you analyze customer sentiment, happiness metrics, and trends. Could you rephrase your question or ask about something more specific?`;
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

  chat: publicProcedure
    .input(
      z.object({
        message: z.string().min(1, "Message cannot be empty"),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            }),
          )
          .optional()
          .default([]),
        startDate: z.string().optional(), // ISO date string
        endDate: z.string().optional(), // ISO date string
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Step 1: Generate embedding for the user's message using e5-base-v2
        const queryEmbedding = await generateEmbedding(
          `query: ${input.message}`,
        );

        // Step 2: Parse date range if provided
        const startDate = input.startDate
          ? new Date(input.startDate)
          : undefined;
        const endDate = input.endDate ? new Date(input.endDate) : undefined;

        // Step 3: Search Pinecone for relevant context with date filtering
        const pineconeResults = await searchPinecone(
          queryEmbedding,
          20,
          undefined, // daysBack - not used if dates provided
          startDate,
          endDate,
        );

        // Step 4: Additional client-side filtering to ensure all results are within date range
        let filteredResults = pineconeResults;
        if (startDate && endDate) {
          const startTimestamp = Math.floor(startDate.getTime() / 1000);
          const endTimestamp = Math.floor(endDate.getTime() / 1000);
          filteredResults = pineconeResults.filter((result) => {
            const metadata = result.metadata;
            const timestamp = metadata?.timestamp;
            if (typeof timestamp !== "number") {
              return false;
            }
            return timestamp >= startTimestamp && timestamp <= endTimestamp;
          });
        }

        // Step 5: Use Gemini to generate response with RAG context and conversation history
        const response = await generateChatResponse(
          input.message,
          filteredResults,
          input.conversationHistory,
        );

        return { response };
      } catch (error) {
        console.error("Error in chat endpoint:", error);
        // Fallback response
        return {
          response: `I apologize, but I'm having trouble processing your question right now. Please try again in a moment. If the issue persists, feel free to ask about customer sentiment analysis, happiness metrics, or trends.`,
        };
      }
    }),

  getMetrics: publicProcedure
    .input(
      z.object({
        startDate: z.string().optional(), // ISO date string
        endDate: z.string().optional(), // ISO date string
      }),
    )
    .query(async ({ input }) => {
      try {
        // Step 1: Generate embedding for a general metrics query
        const queryEmbedding = await generateEmbedding(
          "Customer service and product reviews",
        );

        // Step 2: Parse date range if provided
        const startDate = input.startDate
          ? new Date(input.startDate)
          : undefined;
        const endDate = input.endDate ? new Date(input.endDate) : undefined;

        // Step 3: Search Pinecone for relevant feedback data
        const pineconeResults = await searchPinecone(
          queryEmbedding,
          100, // Get more results for better metrics calculation
          undefined,
          startDate,
          endDate,
        );

        // Step 4: Filter results by date range if provided
        let filteredResults = pineconeResults;
        if (startDate && endDate) {
          const startTimestamp = Math.floor(startDate.getTime() / 1000);
          const endTimestamp = Math.floor(endDate.getTime() / 1000);
          filteredResults = pineconeResults.filter((result) => {
            const metadata = result.metadata;
            const timestamp = metadata?.timestamp;
            if (typeof timestamp !== "number") {
              return false;
            }
            return timestamp >= startTimestamp && timestamp <= endTimestamp;
          });
        }

        // Step 5: Use Gemini to extract metrics from the data
        const metrics = await extractMetricsFromData(filteredResults);
        console.log(metrics);

        return metrics;
      } catch (error) {
        console.error("Error in getMetrics endpoint:", error);
        // Return default metrics if extraction fails
        return {
          overallHappiness: { value: 0, change: 0, trend: "neutral" as const },
          positiveSentiment: { value: 0, change: 0, trend: "neutral" as const },
          negativeSentiment: { value: 0, change: 0, trend: "neutral" as const },
          neutralSentiment: { value: 0, change: 0, trend: "neutral" as const },
          responseTime: { value: "0h", change: 0, trend: "neutral" as const },
          resolutionRate: { value: 0, change: 0, trend: "neutral" as const },
        };
      }
    }),
});
