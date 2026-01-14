import { type FormEvent, useState } from 'react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

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

const BUTTON_CLASS =
  'px-3 pt-2 pb-1.5 bg-white/10 border border-white/5 rounded text-white text-xs tracking-[-0.24px] hover:bg-white/15 transition-colors';

export default function ContactForm(): JSX.Element {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
    } catch {
      setFormState('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  }

  if (formState === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <h3 className="text-xl text-white mb-2">Message sent</h3>
        <p className="text-white/50 text-sm mb-6">We'll get back to you soon.</p>
        <a href="/" className={BUTTON_CLASS}>
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-white text-lg pt-32 mb-16">Contact Us</h1>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        {/* Honeypot field */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="absolute -left-[9999px]"
          aria-hidden="true"
        />

        <div className="space-y-6">
          <div>
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

          <div>
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

          <div>
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
                  src="/assets/efb22407ec7f0fe4413b586a604392693ce407b0.svg"
                  alt=""
                  aria-hidden="true"
                  className="w-2 h-4 opacity-50"
                />
              </div>
            </div>
          </div>

          <div>
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
        </div>

        {formState === 'error' && errorMessage && (
          <p className="text-red-400 text-sm mt-4">{errorMessage}</p>
        )}

        <div className="mt-auto pt-6">
          <button
            type="submit"
            disabled={formState === 'submitting'}
            className={`${BUTTON_CLASS} disabled:opacity-50`}
          >
            {formState === 'submitting' ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </>
  );
}
