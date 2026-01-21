export interface BoxSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function parseBoxSpacing(style: CSSStyleDeclaration, property: 'padding' | 'margin'): BoxSpacing {
  return {
    top: parseFloat(style.getPropertyValue(`${property}-top`)) || 0,
    right: parseFloat(style.getPropertyValue(`${property}-right`)) || 0,
    bottom: parseFloat(style.getPropertyValue(`${property}-bottom`)) || 0,
    left: parseFloat(style.getPropertyValue(`${property}-left`)) || 0,
  };
}

const SKIP_CLASS_PREFIXES = [
  'flex', 'grid', 'block', 'inline', 'hidden',
  'relative', 'absolute', 'fixed', 'sticky',
  'p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-',
  'm-', 'mx-', 'my-', 'mt-', 'mr-', 'mb-', 'ml-',
  'w-', 'h-', 'min-', 'max-',
  'text-', 'bg-', 'border-',
  'rounded', 'shadow', 'transition', 'duration-',
  'opacity-', 'z-', 'overflow-',
  'gap-', 'space-', 'items-', 'justify-', 'self-',
  'col-', 'row-', 'order-',
  'font-', 'leading-', 'tracking-',
  'cursor-', 'select-', 'pointer-',
  'animate-', 'transform', 'scale-', 'rotate-', 'translate-',
  'inset-', 'top-', 'right-', 'bottom-', 'left-',
  'sr-', 'not-', 'group-', 'peer-',
  'hover:', 'focus:', 'active:', 'disabled:',
  'sm:', 'md:', 'lg:', 'xl:', '2xl:',
  'dark:', 'light:',
];

interface EasterEggMatcher {
  match: (el: Element) => boolean;
  label: string;
}

const EASTER_EGG_MATCHERS: EasterEggMatcher[] = [
  {
    match: (el) => el.tagName === 'H1',
    label: 'h1.definitely-not-ai-generated',
  },
  {
    match: (el) => el.tagName === 'H2' && el.closest('.hero-content') !== null,
    label: 'h2.the-part-nobody-reads',
  },
  {
    match: (el) => el.classList.contains('logo-marquee') || el.closest('.logo-marquee') !== null,
    label: 'section.social-proof-industrial-complex',
  },
  {
    match: (el) => {
      if (el.tagName !== 'UL') return false;
      if (!el.closest('.info-sections')) return false;
      const firstItem = el.querySelector('li');
      return firstItem?.textContent?.match(/\d/) !== null;
    },
    label: 'ul.numbers-we-can-actually-back-up',
  },
  {
    match: (el) => el.tagName === 'A' && el.getAttribute('href') === '/contact',
    label: 'a.please-clap',
  },
  {
    match: (el) => el.tagName === 'FORM',
    label: 'form.inbox-zero-destroyer',
  },
  {
    match: (el) => el.tagName === 'SELECT',
    label: 'select.the-real-question',
  },
];

function shouldSkipClass(className: string): boolean {
  return SKIP_CLASS_PREFIXES.some(
    (prefix) => className === prefix || className.startsWith(prefix)
  );
}

function generateSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';

  const classes = Array.from(el.classList)
    .filter((c) => !shouldSkipClass(c))
    .slice(0, 3)
    .map((c) => `.${c}`)
    .join('');

  return `${tag}${id}${classes}` || tag;
}

export function getSelectorLabel(el: Element): string {
  const easterEgg = EASTER_EGG_MATCHERS.find((matcher) => matcher.match(el));
  if (easterEgg) return easterEgg.label;
  return generateSelector(el);
}
