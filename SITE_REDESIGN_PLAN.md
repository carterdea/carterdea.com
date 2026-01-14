# Site Redesign Plan

Personal site rebuild using Astro + Bun.

## Tech Stack

- **Runtime/Package Manager**: Bun
- **Framework**: Astro (uses Vite internally for dev server + builds)
- **UI Components**: React (via `@astrojs/react`) — only where interactivity needed
- **Styling**: Tailwind CSS v4 (mobile-first, CSS-first config via `@import "tailwindcss"` + `@theme {}`)
- **Accessible Components**: Headless UI — add only if needed for modals, menus, etc.
- **Typography**: Univers 55 Roman (`font-family: UniversPro55Roman`) — files: `font.woff`, `font.woff2`
  - Fallback: system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`)
- **Logo**: SVG (custom kerning baked in)
- **Deployment**: Vercel (`@astrojs/vercel` adapter, `output: 'hybrid'` for API routes)
  - Env vars: `RESEND_API_KEY` (set in Vercel dashboard)
- **Form Handler**: Resend (via Astro API route)

## Layout (Mobile-First)

```
┌─────────────────────────────────┐
│ [Logo]              [Contact]   │  ← Header
├─────────────────────────────────┤
│                                 │
│            H1 Title             │
│           H2 Subtitle           │
│                                 │
│  ◀─ [logo] [logo] [logo] ─▶    │  ← Client logo marquee
│     (gradient fade edges)       │
│                                 │
├─────────────────────────────────┤
│ © 2025               [BG Toggle]│  ← Footer
└─────────────────────────────────┘
```

### Component Details

**Header**

- Logo: top left
- Contact button: top right → opens contact modal

**Hero**
- H1: main headline (centered)
- H2: subheadline (centered, below H1)

**Client Logo Marquee**
- Desktop: auto-scrolling marquee animation (CSS `@keyframes`)
- Mobile: manual swipe carousel using CSS `scroll-snap` for native iOS feel
- Edges: gradient mask (`mask-image: linear-gradient(...)`) to fade logos to black
- GPU-accelerated: `transform: translateX()` for smooth animation
- Respects `prefers-reduced-motion` (pause animation when enabled)

**Footer**

- Left: copyright
- Right: background toggle button (toggle for now, extensible later)

## Pages

1. **Home** (`/`) — layout above (single page site)

## Contact Modal

- Triggered by "Contact" button in header
- Using Headless UI `Dialog` for accessibility
- Style: decide during implementation

### Form Fields

| Field   | Type     | Options                                                                 |
| ------- | -------- | ----------------------------------------------------------------------- |
| Name    | text     | required                                                                |
| Email   | email    | required                                                                |
| Budget  | dropdown | $15-25k, $25-50k, $50-99k, $100k+                                       |
| Message | textarea | required                                                                |

### Form Submission

**Handler**: Resend via Astro API route (`src/pages/api/contact.ts`)

- POST to `/api/contact`
- From: `hello@carterdea.com`
- `replyTo`: submitter's email
- To: `hello@carterdea.com` (or wherever you want leads)
- Returns JSON success/error for client-side handling

### Form States

- **Idle**: Default form display
- **Submitting**: Button disabled, shows spinner or "Sending..."
- **Success**: Form fades out, success message fades in
- **Error**: Inline error message (generic, don't leak provider errors), form remains editable

### Form Security

- Server-side validation (types + length limits)
- Honeypot field for spam mitigation
- Rate limiting (consider Vercel's edge config or simple in-memory)
- Check `Origin` header for same-origin POSTs
- Keep `from` address fixed, use `replyTo` for user email

## Tasks

### Setup

- [ ] Initialize Astro project with Bun
- [ ] Add React integration
- [ ] Add Tailwind CSS
- [ ] Configure custom font (`UniversPro55Roman`)
- [ ] Configure for Vercel (hybrid output for API routes)

### Components

- [ ] Header (logo + contact button placeholder)
- [ ] Hero (H1 + H2)
- [ ] Logo marquee (desktop: auto-scroll, mobile: swipe carousel)
- [ ] Footer (copyright + toggle placeholder)
- [ ] Contact modal (Headless UI Dialog + form + Resend)

### Polish

- [ ] Background toggle functionality (default: `bg-black`, toggle: `santa-monica-north.jpg`)
- [ ] Favicon/meta tags/OG images
- [ ] Responsive breakpoints review
- [ ] Font preloading optimization
- [ ] Lighthouse audit (aim for 100s)
- [ ] Test deployment

## Technical Notes

### Gradient Mask for Marquee Edges
```css
.marquee {
  mask-image: linear-gradient(
    to right,
    transparent,
    black 10%,
    black 90%,
    transparent
  );
  -webkit-mask-image: /* same */;
}
```

### Mobile Carousel (Native Feel)
```css
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-snap-stop: always; /* prevents skipping cards */
  overscroll-behavior-x: contain; /* prevents page scroll at edges */
  -webkit-overflow-scrolling: touch; /* iOS momentum/inertia */
}

.carousel-item {
  scroll-snap-align: center;
  scroll-snap-stop: always;
  flex-shrink: 0;
}
```

### GPU-Accelerated Marquee Animation
```css
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.marquee-track {
  animation: marquee 20s linear infinite;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .marquee-track {
    animation: none;
  }
}
```

## Open Questions

1. **Client logos?** SVGs exported — need to verify correct versions
