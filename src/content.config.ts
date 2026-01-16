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
    technologies: z.array(z.string()).optional(),
    services: z.array(z.string()).optional(),
    results: z.array(z.string()).optional(),
    testimonials: z
      .array(
        z.object({
          quote: z.string(),
          author: z.string(),
          role: z.string(),
          company: z.string(),
          logoSrc: z.string().optional(),
        })
      )
      .optional(),
    cta: z
      .object({
        title: z.string(),
        subtitle: z.string(),
      })
      .optional(),
  }),
});

export const collections = { site };
