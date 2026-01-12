import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const modules = defineCollection({
  loader: glob({
    pattern: '**/README.md',
    base: './src/content/modules',
    // Use directory name as ID (strip /README.md suffix)
    generateId: ({ entry }) => entry.replace(/\/README\.md$/i, ''),
  }),
  schema: z.object({
    title: z.string(),
    version: z.string(),
    last_updated: z.string(),
    maintainers: z.array(z.string()).optional(),
    summary: z.string(),
    mvp_time_per_day: z.string().optional(),
    tags: z.array(z.string()),
    license: z.string(),
  }),
});

// Supplemental content (worksheets, etc) - no required frontmatter
const supplements = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/modules',
    // Exclude README files (handled by modules collection)
    // and generate clean IDs like "attention-as-lever/worksheet"
    generateId: ({ entry }) => entry.replace(/\.md$/i, ''),
  }),
  schema: z.object({
    title: z.string().optional(),
  }).passthrough(), // Allow any additional frontmatter
});

export const collections = {
  modules,
  supplements,
};
