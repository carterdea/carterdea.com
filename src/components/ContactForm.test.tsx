import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContactForm from './ContactForm';

// Mock fetch globally
global.fetch = vi.fn();

describe('ContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<ContactForm />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should have honeypot field hidden', () => {
      render(<ContactForm />);

      const honeypots = screen.getAllByRole('textbox', { hidden: true });
      const honeypot = honeypots.find((el) => el.getAttribute('name') === 'website');

      expect(honeypot).toBeDefined();
      expect(honeypot).toHaveClass('absolute');
      expect(honeypot).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Validation', () => {
    it('should show error when name is missing', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.click(nameInput);
      await user.tab(); // Blur the field

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error when budget is not selected', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const budgetSelect = screen.getByLabelText(/budget/i);
      await user.click(budgetSelect);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/budget is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when message is missing', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const messageInput = screen.getByLabelText(/message/i);
      await user.click(messageInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/message is required/i)).toBeInTheDocument();
      });
    });

    it('should accept valid form data', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.selectOptions(screen.getByLabelText(/budget/i), '25-50k');
      await user.type(screen.getByLabelText(/message/i), 'Test message');

      // Should not show any errors
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
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
          }),
        );
      });
    });

    it('should disable submit button during submission', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.selectOptions(screen.getByLabelText(/budget/i), '25-50k');
      await user.type(screen.getByLabelText(/message/i), 'Test message');

      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);

      // Button should be disabled and show "Sending..."
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/sending/i);
    });

    it('should show success message after successful submission', async () => {
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

    it('should show error message on failed submission', async () => {
      (global.fetch as any).mockResolvedValueOnce({
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
  });

  describe('Honeypot Protection', () => {
    it('should not submit if honeypot is filled', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.selectOptions(screen.getByLabelText(/budget/i), '25-50k');
      await user.type(screen.getByLabelText(/message/i), 'Test message');

      // Fill honeypot (simulate bot)
      const honeypots = screen.getAllByRole('textbox', { hidden: true });
      const honeypot = honeypots.find((el) => el.getAttribute('name') === 'website');
      if (honeypot) {
        await user.type(honeypot, 'bot-text');
      }

      await user.click(screen.getByRole('button', { name: /send/i }));

      // Should not call fetch
      expect(global.fetch).not.toHaveBeenCalled();

      // Should still transition to success (to fool bots)
      await waitFor(() => {
        expect(screen.getByText(/thank you for your message/i)).toBeInTheDocument();
      });
    });
  });
});
