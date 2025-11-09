import { createTRPCRouter, publicProcedure } from "../trpc";

export const botRouter = createTRPCRouter({
  hello: publicProcedure.query(() => {
    return "hello world";
  }),
});
