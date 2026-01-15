import { type FormEvent, useEffect, useState } from 'react';
import Button from './ui/Button';

type FormState = 'idle' | 'submitting' | 'success' | 'error';
type TransitionState = 'form-visible' | 'form-hiding' | 'success-visible';

const BUDGET_OPTIONS = [
  { value: '', label: 'Select budget' },
  { value: '15-25k', label: '$15-25k' },
  { value: '25-50k', label: '$25-50k' },
  { value: '50-99k', label: '$50-99k' },
  { value: '100k+', label: '$100k+' },
];

const INPUT_CLASS =
  'w-full px-3 pt-3 pb-2.5 bg-white/5 border border-white/20 rounded text-white text-sm placeholder:text-white/50 focus:outline-none focus:bg-white/10 focus:border-white/80 transition-colors';

const LABEL_CLASS = 'block text-sm text-white/70 tracking-[-0.14px] mb-2';

export default function ContactForm() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [transitionState, setTransitionState] = useState<TransitionState>('form-visible');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState('submitting');
    setErrorMessage('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Honeypot check (spam mitigation)
    if (formData.get('website')) {
      setFormState('success');
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          budget: formData.get('budget'),
          message: formData.get('message'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setFormState('success');
      setTransitionState('form-hiding');
    } catch {
      setFormState('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  }

  // Handle fade transition timing
  useEffect(() => {
    if (transitionState === 'form-hiding') {
      const timer = setTimeout(() => {
        setTransitionState('success-visible');
      }, 300); // Match CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [transitionState]);

  // Show success view after form fades out
  if (transitionState === 'success-visible') {
    return (
      <div className="flex-1 flex flex-col pt-32 w-full md:max-w-1/2 md:mx-auto">
        <h3
          className="animate-fade-in-up text-lg text-white mb-2"
          style={{ '--delay': '0ms' } as React.CSSProperties}
        >
          Thank you for your message
        </h3>
        <p
          className="animate-fade-in-up text-neutral-400 text-sm tracking-[-0.28px]"
          style={{ '--delay': '80ms' } as React.CSSProperties}
        >
          We look forward to speaking with you. We will be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col transition-opacity duration-300 w-full md:max-w-1/2 md:mx-auto ${
        transitionState === 'form-hiding' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <h1
        className="animate-fade-in-up text-white text-lg pt-32 mb-12"
        style={{ '--delay': '100ms' } as React.CSSProperties}
      >
        Contact Us
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Honeypot field */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="absolute -left-[9999px]"
          aria-hidden="true"
        />

        <div
          className="animate-fade-in-up md:w-1/2"
          style={{ '--delay': '150ms' } as React.CSSProperties}
        >
          <label htmlFor="name" className={LABEL_CLASS}>
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            maxLength={100}
            placeholder="Lloyd Christmas"
            className={INPUT_CLASS}
          />
        </div>

        <div
          className="animate-fade-in-up md:w-1/2"
          style={{ '--delay': '200ms' } as React.CSSProperties}
        >
          <label htmlFor="email" className={LABEL_CLASS}>
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            maxLength={254}
            placeholder="lloydchristmas@gmail.com"
            className={INPUT_CLASS}
          />
        </div>

        <div
          className="animate-fade-in-up md:w-1/2"
          style={{ '--delay': '250ms' } as React.CSSProperties}
        >
          <label htmlFor="budget" className={LABEL_CLASS}>
            Your budget
          </label>
          <div className="relative">
            <select
              id="budget"
              name="budget"
              className={`${INPUT_CLASS} text-white/50 appearance-none cursor-pointer`}
            >
              {BUDGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-neutral-900 text-white">
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <img
                src="/assets/icon-chevron.svg"
                alt=""
                aria-hidden="true"
                className="w-2 h-4 opacity-50"
              />
            </div>
          </div>
        </div>

        <div
          className="animate-fade-in-up"
          style={{ '--delay': '300ms' } as React.CSSProperties}
        >
          <label htmlFor="message" className={LABEL_CLASS}>
            Message
          </label>
          <textarea
            id="message"
            name="message"
            required
            maxLength={2000}
            rows={5}
            placeholder="Tell us what you're working on"
            className={`${INPUT_CLASS} resize-none`}
          />
        </div>

        {errorMessage && (
          <p className="text-red-400 text-sm">{errorMessage}</p>
        )}

        <div
          className="animate-fade-in-up"
          style={{ '--delay': '350ms' } as React.CSSProperties}
        >
          <Button type="submit" disabled={formState === 'submitting'}>
            {formState === 'submitting' ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}
