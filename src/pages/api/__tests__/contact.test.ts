import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Resend before importing the module
vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: vi.fn().mockResolvedValue({ error: null }),
    };
  },
}));

// Helper to create mock request with unique IPs
let ipCounter = 0;
function createRequest(
  body: unknown,
  headers: Record<string, string> = {},
  useUniqueIp = false,
): Request {
  const ip = useUniqueIp ? `192.168.1.${ipCounter++}` : '192.168.1.1';
  return new Request('http://localhost:4321/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: 'localhost:4321',
      origin: 'http://localhost:4321',
      'x-forwarded-for': ip,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/contact', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    ipCounter = 0;
    // Reset the module to clear rate limit map
    await vi.resetModules();
  });

  describe('Happy Path', () => {
    it('should successfully send email with valid data', async () => {
      const { POST } = await import('../contact');

      const request = createRequest({
        name: 'John Doe',
        email: 'john@example.com',
        budget: '25-50k',
        message: 'I need help with my project',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it('should handle optional budget field', async () => {
      const { POST } = await import('../contact');

      const request = createRequest({
        name: 'Jane Smith',
        email: 'jane@example.com',
        message: 'Test message',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });
  });

  describe('Validation', () => {
    it('should reject missing name', async () => {
      const { POST } = await import('../contact');

      const request = createRequest({
        email: 'test@example.com',
        message: 'Test message',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('should reject empty name', async () => {
      const { POST } = await import('../contact');

      const request = createRequest({
        name: '   ',
        email: 'test@example.com',
        message: 'Test message',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('should reject missing email', async () => {
      const { POST } = await import('../contact');

      const request = createRequest({
        name: 'John Doe',
        message: 'Test message',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valid email is required');
    });

    it('should reject invalid email format', async () => {
      const { POST } = await import('../contact');

      const request = createRequest({
        name: 'John Doe',
        email: 'not-an-email',
        message: 'Test message',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valid email is required');
    });

    it('should reject email that is too long', async () => {
      const { POST } = await import('../contact');

      const longEmail = 'a'.repeat(255) + '@example.com';
      const request = createRequest({
        name: 'John Doe',
        email: longEmail,
        message: 'Test message',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valid email is required');
    });

    it('should reject missing message', async () => {
      const { POST } = await import('../contact');

      const request = createRequest({
        name: 'John Doe',
        email: 'test@example.com',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required');
    });

    it('should reject empty message', async () => {
      const { POST } = await import('../contact');

      const request = createRequest({
        name: 'John Doe',
        email: 'test@example.com',
        message: '   ',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required');
    });
  });

  describe('Security', () => {
    it.skip('should reject cross-origin requests', async () => {
      const { POST } = await import('../contact');

      // Create a request with evil.com origin and carterdea.com host
      const request = new Request('http://localhost:4321/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://evil.com',
          host: 'carterdea.com',
          'x-forwarded-for': '192.168.1.50',
        },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'test@example.com',
          message: 'Test message',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid origin');
    });

    it('should sanitize long inputs', async () => {
      const { POST } = await import('../contact');

      const longName = 'a'.repeat(200);
      const longMessage = 'b'.repeat(3000);

      const request = createRequest({
        name: longName,
        email: 'test@example.com',
        budget: 'a'.repeat(50),
        message: longMessage,
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it('should reject malformed JSON', async () => {
      const { POST } = await import('../contact');

      const request = new Request('http://localhost:4321/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          host: 'localhost:4321',
          origin: 'http://localhost:4321',
          'x-forwarded-for': '192.168.1.99',
        },
        body: 'not valid json',
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow up to 5 requests', async () => {
      const { POST } = await import('../contact');

      const makeRequest = () =>
        createRequest(
          {
            name: 'John Doe',
            email: 'test@example.com',
            message: 'Test message',
          },
          {},
          false, // Same IP
        );

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const response = await POST({ request: makeRequest() } as any);
        expect(response.status).toBe(200);
      }
    });

    it('should rate limit 6th request within time window', async () => {
      const { POST } = await import('../contact');

      const makeRequest = () =>
        createRequest(
          {
            name: 'John Doe',
            email: 'test@example.com',
            message: 'Test message',
          },
          {},
          false, // Same IP
        );

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await POST({ request: makeRequest() } as any);
      }

      // 6th request should be rate limited
      const response = await POST({ request: makeRequest() } as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });
  });
});
