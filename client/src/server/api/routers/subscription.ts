import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { emailList } from "~/server/db/schema";

export const subscriptionRouter = createTRPCRouter({
  subscribe: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { email } = input;

      try {
        // Check if email already exists
        const existingEmail = await ctx.db
          .select()
          .from(emailList)
          .where(eq(emailList.emails, email))
          .limit(1);

        if (existingEmail.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This email is already subscribed",
          });
        }

        // Insert the email if it doesn't exist
        await ctx.db.insert(emailList).values({
          emails: email,
        });

        return {
          success: true,
          message: "Successfully subscribed",
        };
      } catch (error) {
        // If it's already a TRPCError, re-throw it
        if (error instanceof TRPCError) {
          throw error;
        }

        // Handle database errors (e.g., table doesn't exist, unique constraint violation)
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Check if it's a unique constraint violation
        if (errorMessage.includes("unique") || errorMessage.includes("duplicate")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This email is already subscribed",
          });
        }

        // Check if table doesn't exist
        if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database table not found. Please run database migrations.",
          });
        }

        // Generic error
        console.error("Subscription error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to subscribe: ${errorMessage}`,
        });
      }
    }),
});

