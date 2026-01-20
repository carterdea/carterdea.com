import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from './ui/Button';

type TransitionState = 'form-visible' | 'form-hiding' | 'success-visible';

interface FormData {
  name: string;
  email: string;
  budget: string;
  message: string;
  website: string; // honeypot
}

const BUDGET_OPTIONS = [
  { value: '', label: 'Select budget' },
  { value: '15-25k', label: '$15-25k' },
  { value: '25-50k', label: '$25-50k' },
  { value: '50-99k', label: '$50-99k' },
  { value: '100k+', label: '$100k+' },
];

const INPUT_BASE =
  'w-full px-3 pt-3 pb-2.5 bg-white/5 border rounded text-white text-sm placeholder:text-white/50 focus:outline-none focus:bg-white/10 transition-colors';

function getInputClass(hasError: boolean): string {
  if (hasError) {
    return `${INPUT_BASE} border-red-900 focus:border-red-900`;
  }
  return `${INPUT_BASE} border-white/20 focus:border-white/80`;
}

const LABEL_CLASS = 'block text-sm text-white/70 tracking-[-0.14px] mb-2';

function handleAutoResize(e: React.ChangeEvent<HTMLTextAreaElement>): void {
  const textarea = e.target;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 800)}px`;
}

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [transitionState, setTransitionState] = useState<TransitionState>('form-visible');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onBlur',
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setServerError('');

    // Honeypot check (spam mitigation)
    if (data.website) {
      setTransitionState('form-hiding');
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          budget: data.budget,
          message: data.message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setTransitionState('form-hiding');
    } catch {
      setIsSubmitting(false);
      setServerError('Something went wrong. Please try again.');
    }
  }

  // Handle fade transition timing
  useEffect(() => {
    if (transitionState === 'form-hiding') {
      const timer = setTimeout(() => {
        setTransitionState('success-visible');
      }, 300);
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

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 mb-20" noValidate>
        {/* Honeypot field */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          className="absolute -left-[9999px]"
          aria-hidden="true"
          {...register('website')}
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
            placeholder="Lloyd Christmas"
            aria-invalid={errors.name ? 'true' : 'false'}
            className={getInputClass(!!errors.name)}
            {...register('name', {
              required: 'Name is required',
              maxLength: { value: 100, message: 'Name is too long' },
            })}
          />
          {errors.name && (
            <p role="alert" className="text-red-500 text-xs mt-2">
              {errors.name.message}
            </p>
          )}
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
            placeholder="lloydchristmas@gmail.com"
            aria-invalid={errors.email ? 'true' : 'false'}
            className={getInputClass(!!errors.email)}
            {...register('email', {
              required: 'Email is required',
              maxLength: { value: 254, message: 'Email is too long' },
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
          />
          {errors.email && (
            <p role="alert" className="text-red-500 text-xs mt-2">
              {errors.email.message}
            </p>
          )}
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
              aria-label="Budget selection"
              aria-invalid={errors.budget ? 'true' : 'false'}
              className={`${getInputClass(!!errors.budget)} text-white/50 appearance-none cursor-pointer`}
              {...register('budget', {
                required: 'Budget is required',
              })}
            >
              {BUDGET_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-neutral-900 text-white"
                >
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <img
                src="/assets/images/select-carets.svg"
                alt=""
                aria-hidden="true"
                className="w-2 h-4 opacity-50"
              />
            </div>
          </div>
          {errors.budget && (
            <p role="alert" className="text-red-500 text-xs mt-2">
              {errors.budget.message}
            </p>
          )}
        </div>

        <div className="animate-fade-in-up" style={{ '--delay': '300ms' } as React.CSSProperties}>
          <label htmlFor="message" className={LABEL_CLASS}>
            Message
          </label>
          <textarea
            id="message"
            rows={8}
            placeholder="Tell us what you're working on"
            aria-invalid={errors.message ? 'true' : 'false'}
            className={`${getInputClass(!!errors.message)} resize-none overflow-hidden`}
            {...register('message', {
              required: 'Message is required',
              maxLength: { value: 2000, message: 'Message is too long' },
              onChange: handleAutoResize,
            })}
          />
          {errors.message && (
            <p role="alert" className="text-red-500 text-xs mt-2">
              {errors.message.message}
            </p>
          )}
        </div>

        {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

        <div className="animate-fade-in-up" style={{ '--delay': '350ms' } as React.CSSProperties}>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}
