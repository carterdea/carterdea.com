import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const site = defineCollection({
  loader: file('src/data/site.json', {
    parser: (text) => {
      const data = JSON.parse(text);
      return [{ id: 'config', ...data }];
    },
  }),
  schema: z.object({
    id: z.string(),
    hero: z.object({
      title: z.string(),
      subtitle: z.string(),
    }),
    clients: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        logoSrc: z.string(),
        logoHeight: z.number().optional(),
      })
    ),
  }),
});

export const collections = { site };
