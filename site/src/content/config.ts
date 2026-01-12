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

export const collections = {
  modules,
};
