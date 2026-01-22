import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: vi.fn().mockResolvedValue({ error: null }),
    };
  },
}));

interface APIContext {
  request: Request;
}

function createRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:4321/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: 'localhost:4321',
      origin: 'http://localhost:4321',
      'x-forwarded-for': '192.168.1.1',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/contact', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { clearRateLimitForTesting } = await import('../contact');
    clearRateLimitForTesting();
  });

  it('sends email with valid data', async () => {
    const { POST } = await import('../contact');

    const request = createRequest({
      name: 'John Doe',
      email: 'john@example.com',
      budget: '25-50k',
      message: 'I need help with my project',
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it('handles optional budget field', async () => {
    const { POST } = await import('../contact');

    const request = createRequest({
      name: 'Jane Smith',
      email: 'jane@example.com',
      message: 'Test message',
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it('rejects missing name', async () => {
    const { POST } = await import('../contact');

    const request = createRequest({
      email: 'test@example.com',
      message: 'Test message',
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required');
  });

  it('rejects empty name', async () => {
    const { POST } = await import('../contact');

    const request = createRequest({
      name: '   ',
      email: 'test@example.com',
      message: 'Test message',
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required');
  });

  it('rejects missing email', async () => {
    const { POST } = await import('../contact');

    const request = createRequest({
      name: 'John Doe',
      message: 'Test message',
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid email is required');
  });

  it('rejects invalid email format', async () => {
    const { POST } = await import('../contact');

    const request = createRequest({
      name: 'John Doe',
      email: 'not-an-email',
      message: 'Test message',
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid email is required');
  });

  it('rejects email that exceeds length limit', async () => {
    const { POST } = await import('../contact');

    const longEmail = `${'a'.repeat(255)}@example.com`;
    const request = createRequest({
      name: 'John Doe',
      email: longEmail,
      message: 'Test message',
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid email is required');
  });

  it('rejects missing message', async () => {
    const { POST } = await import('../contact');

    const request = createRequest({
      name: 'John Doe',
      email: 'test@example.com',
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Message is required');
  });

  it('rejects empty message', async () => {
    const { POST } = await import('../contact');

    const request = createRequest({
      name: 'John Doe',
      email: 'test@example.com',
      message: '   ',
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Message is required');
  });

  it('truncates long inputs', async () => {
    const { POST } = await import('../contact');

    const longName = 'a'.repeat(200);
    const longMessage = 'b'.repeat(3000);

    const request = createRequest({
      name: longName,
      email: 'test@example.com',
      budget: 'a'.repeat(50),
      message: longMessage,
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it('rejects malformed JSON', async () => {
    const { POST } = await import('../contact');

    const request = new Request('http://localhost:4321/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: 'localhost:4321',
        origin: 'http://localhost:4321',
        'x-forwarded-for': '192.168.1.1',
      },
      body: 'not valid json',
    });

    const response = await POST({ request } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('allows up to 5 requests from same IP', async () => {
    const { POST } = await import('../contact');

    const validBody = {
      name: 'John Doe',
      email: 'test@example.com',
      message: 'Test message',
    };

    for (let i = 0; i < 5; i++) {
      const response = await POST({ request: createRequest(validBody) } as APIContext);
      expect(response.status).toBe(200);
    }
  });

  it('rate limits 6th request from same IP', async () => {
    const { POST } = await import('../contact');

    const validBody = {
      name: 'John Doe',
      email: 'test@example.com',
      message: 'Test message',
    };

    for (let i = 0; i < 5; i++) {
      await POST({ request: createRequest(validBody) } as APIContext);
    }

    const response = await POST({ request: createRequest(validBody) } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Too many requests');
  });
});
