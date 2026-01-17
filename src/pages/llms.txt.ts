import { getEntry } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const siteData = await getEntry('site', 'config');
  const { technologies, services, results, clients } = siteData?.data ?? {};

  const content = `# Carterdea

> Product design, AI engineering, and Shopify development focused on business outcomes.

## About

Carterdea is a US-based product design and development agency located in Scottsdale, Arizona. We work with clients across Los Angeles, San Francisco, New York, and other major US cities.

## Services

${services?.map((s: string) => `- ${s}`).join('\n') ?? ''}

## Technologies

${technologies?.map((t: string) => `- ${t}`).join('\n') ?? ''}

## Results

${results?.map((r: string) => `- ${r}`).join('\n') ?? ''}

## Notable Clients

${clients?.map((c: { name: string; description: string }) => `- **${c.name}**: ${c.description}`).join('\n') ?? ''}

## Contact

Website: https://carterdea.com
Contact: https://carterdea.com/contact
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
