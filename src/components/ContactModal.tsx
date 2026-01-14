import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { type FormEvent, useState } from 'react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BUDGET_OPTIONS = [
  { value: '', label: 'Select a budget range' },
  { value: '15-25k', label: '$15-25k' },
  { value: '25-50k', label: '$25-50k' },
  { value: '50-99k', label: '$50-99k' },
  { value: '100k+', label: '$100k+' },
];

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
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

  function handleClose() {
    if (formState !== 'submitting') {
      setFormState('idle');
      setErrorMessage('');
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/80 backdrop-blur-sm duration-300 ease-out data-closed:opacity-0"
      />

      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-6 duration-300 ease-out data-closed:scale-95 data-closed:opacity-0"
        >
          {formState === 'success' ? (
            <div className="text-center py-8">
              <h3 className="text-xl text-white mb-2">Message sent</h3>
              <p className="text-neutral-500 text-sm mb-6">We'll get back to you soon.</p>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-white text-black text-sm rounded hover:bg-neutral-200 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <DialogTitle className="text-lg text-white mb-6">Get in touch</DialogTitle>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot field */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  className="absolute -left-[9999px]"
                  aria-hidden="true"
                />

                <div>
                  <label htmlFor="name" className="block text-sm text-neutral-400 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    maxLength={100}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm text-neutral-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    maxLength={254}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="budget" className="block text-sm text-neutral-400 mb-2">
                    Budget
                  </label>
                  <select
                    id="budget"
                    name="budget"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-neutral-500 transition-colors appearance-none cursor-pointer"
                  >
                    {BUDGET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-neutral-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm text-neutral-400 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    maxLength={2000}
                    rows={4}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors resize-none"
                    placeholder="Tell us about your project"
                  />
                </div>

                {formState === 'error' && errorMessage && (
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={formState === 'submitting'}
                    className="flex-1 px-4 py-2 bg-neutral-800 text-white text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formState === 'submitting'}
                    className="flex-1 px-4 py-2 bg-white text-black text-sm rounded hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    {formState === 'submitting' ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
