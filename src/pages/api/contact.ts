import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

// Lazy initialization to avoid build-time errors
let resend: Resend | null = null;
function getResend(): Resend {
  if (!resend) {
    resend = new Resend(import.meta.env.RESEND_API_KEY);
  }
  return resend;
}

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }

  record.count++;
  return false;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function clearRateLimitForTesting(): void {
  rateLimitMap.clear();
}

export const POST: APIRoute = async ({ request }) => {
  // Check origin header for same-origin requests
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (origin && host && !origin.includes(host)) {
    return new Response(JSON.stringify({ error: 'Invalid origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting
  const clientIP =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (isRateLimited(clientIP)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { name?: string; email?: string; budget?: string; message?: string };
  try {
    body = await request.json();
  } catch (err) {
    console.error('Contact form error: Failed to parse request body', err);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { name, email, budget, message } = body;

    if (!name || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!email || !validateEmail(email)) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!message || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sanitizedName = name.trim().slice(0, 100);
    const sanitizedEmail = email.trim().slice(0, 254);
    const sanitizedBudget = budget ? String(budget).trim().slice(0, 20) : 'Not specified';
    const sanitizedMessage = message.trim().slice(0, 2000);

    // Send email via Resend
    console.log('Attempting to send email with config:', {
      from: 'hello@form.carterdea.com',
      to: import.meta.env.CONTACT_EMAIL,
      apiKey: import.meta.env.RESEND_API_KEY ? '✓ API key present' : '✗ API key missing',
    });

    const result = await getResend().emails.send({
      from: 'hello@form.carterdea.com',
      to: import.meta.env.CONTACT_EMAIL,
      replyTo: sanitizedEmail,
      subject: `New inquiry from ${sanitizedName}`,
      text: `Name: ${sanitizedName}
Email: ${sanitizedEmail}
Budget: ${sanitizedBudget}

Message:
${sanitizedMessage}`,
      html: `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${sanitizedName}</p>
<p><strong>Email:</strong> ${sanitizedEmail}</p>
<p><strong>Budget:</strong> ${sanitizedBudget}</p>
<h3>Message</h3>
<p>${sanitizedMessage.replace(/\n/g, '<br>')}</p>
      `.trim(),
    });

    console.log('Resend API result:', result);

    if (result.error) {
      console.error('Resend error:', result.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send message', details: result.error }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Email sent successfully, ID:', result.data?.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Contact form error:', err);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
