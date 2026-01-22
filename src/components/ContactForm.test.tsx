import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContactForm from './ContactForm';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('ContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('renders all form fields', () => {
    render(<ContactForm />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('has honeypot field with correct attributes', () => {
    render(<ContactForm />);

    const honeypot = screen.getByRole('textbox', { hidden: true, name: '' });

    expect(honeypot).toHaveAttribute('name', 'website');
    expect(honeypot).toHaveClass('absolute');
    expect(honeypot).toHaveAttribute('tabIndex', '-1');
  });

  it('shows error when name is missing', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByLabelText(/name/i));
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('shows error for invalid email', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('shows error when budget is not selected', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByLabelText(/budget/i));
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/budget is required/i)).toBeInTheDocument();
    });
  });

  it('shows error when message is missing', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByLabelText(/message/i));
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/message is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.selectOptions(screen.getByLabelText(/budget/i), '25-50k');
    await user.type(screen.getByLabelText(/message/i), 'Test message');

    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/contact',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com',
            budget: '25-50k',
            message: 'Test message',
          }),
        })
      );
    });
  });

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.selectOptions(screen.getByLabelText(/budget/i), '25-50k');
    await user.type(screen.getByLabelText(/message/i), 'Test message');

    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/thank you for your message/i)).toBeInTheDocument();
    });
  });

  it('shows error message on failed submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to send' }),
    });

    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.selectOptions(screen.getByLabelText(/budget/i), '25-50k');
    await user.type(screen.getByLabelText(/message/i), 'Test message');

    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('does not submit when honeypot is filled', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.selectOptions(screen.getByLabelText(/budget/i), '25-50k');
    await user.type(screen.getByLabelText(/message/i), 'Test message');

    const honeypot = screen.getByRole('textbox', { hidden: true, name: '' });
    await user.type(honeypot, 'bot-text');

    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(global.fetch).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/thank you for your message/i)).toBeInTheDocument();
    });
  });
});
