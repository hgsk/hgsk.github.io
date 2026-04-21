import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional()
  })
});

const keywords = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().default(""),
    status: z.enum(["published", "draft"]).default("draft")
  })
});

export const collections = { blog, keywords };
