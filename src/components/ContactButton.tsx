import { useEffect, useState } from 'react';
import ContactModal from './ContactModal';

export default function ContactButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Listen for clicks on the static contact button
    const contactBtn = document.getElementById('contact-btn');

    function handleClick() {
      setIsOpen(true);
    }

    contactBtn?.addEventListener('click', handleClick);

    return () => {
      contactBtn?.removeEventListener('click', handleClick);
    };
  }, []);

  return <ContactModal isOpen={isOpen} onClose={() => setIsOpen(false)} />;
}
