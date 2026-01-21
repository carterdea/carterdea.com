# Fire Mode Design Doc

## Problem Context

The carterdea.com portfolio site features a "modes" system—a creative showcase allowing visitors to experience different visual effects via a bottom-right popover. Current modes include:

- **Money Mode**: Three.js falling bills with stock chart
- **Matrix Mode**: Canvas-based character rain
- **Developer Mode**: Inspector overlay with grid/box-model visualization
- **Preview Mode**: Draggable vintage computer simulators
- **Vacation Mode**: CSS background swap

Fire Mode exists in the mode list but has no implementation. The opportunity: demonstrate mastery of complex front-end technologies (shaders, particle systems, performance optimization) while maintaining usability.

## Proposed Solution

A layered fire aesthetic system built on four pillars:

1. **Ember Glow System** (always-on baseline) — CSS + canvas particles
2. **Heat Distortion** — WebGL shader-based refractive warp
3. **Char/Ash Accumulation** — Stateful interaction memory
4. **Ignition Points** — Element-proximity-based intensity variation

Key differentiator: fire as **ambient heat**, not literal flames. Elegant, not chaotic.

## Goals and Non-Goals

### Goals

- Showcase shader/WebGL expertise to technical visitors
- Maintain site usability (text readable, interactions functional)
- Achieve smooth 60fps on modern desktop browsers
- Graceful degradation on mobile/low-power devices
- Add "memory" via ash accumulation (novel interaction pattern)

### Non-Goals

- Full-screen realistic fire simulation
- Audio effects
- Mobile-first optimization (acceptable to reduce/disable effects)
- Supporting IE/legacy browsers
- User-configurable intensity slider

## Design

```
┌─────────────────────────────────────────────────────────┐
│                    LAYER STACK                          │
├─────────────────────────────────────────────────────────┤
│  z:40  │ Ember Particles (canvas, pointer-events:none)  │
│  z:30  │ Settings Popover (unchanged)                   │
│  z:20  │ Heat Distortion (WebGL fullscreen quad)        │
│  z:10  │ Site Content (text glows via CSS)              │
│  z:0   │ Darkened Background                            │
└─────────────────────────────────────────────────────────┘
```

### Lazy Loading Strategy

Fire Mode will only load when activated, following the existing pattern:

```tsx
// In Layout.astro or parent component
import { lazy, Suspense } from 'react';

const FireModeSection = lazy(() =>
  import('../FireModeSection/FireModeSection').then((m) => ({ default: m.FireModeSection }))
);

// Only renders when mode === 'fire'
{mode === 'fire' && (
  <Suspense fallback={null}>
    <FireModeSection />
  </Suspense>
)}
```

### Mobile/Touch Device Handling

Features that depend on cursor position will be disabled on touch devices:

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Text glow (idle pulse) | ✓ | ✓ |
| Scroll-velocity glow boost | ✓ | ✓ |
| Cursor-proximity glow | ✓ | ✗ |
| Ember particles | ✓ | ✓ (reduced) |
| Heat distortion shader | ✓ | ✗ |
| Char/ash on hover | ✓ | ✗ |
| Ignition points (proximity) | ✓ | ✗ (static glow) |

Detection:
```typescript
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
```

---

## Key Components

### 1. Ember Glow System (CSS + Canvas)

#### Text Glow (CSS)

```css
body.mode-fire {
  background-color: #0a0605;
}

body.mode-fire h1,
body.mode-fire h2,
body.mode-fire p,
body.mode-fire a {
  text-shadow:
    0 0 4px rgba(255, 100, 30, var(--fire-glow-intensity, 0.3)),
    0 0 12px rgba(255, 60, 10, var(--fire-glow-intensity, 0.2));
  transition: text-shadow 0.15s ease-out;
}
```

#### Dynamic Intensity

- CSS custom property `--fire-glow-intensity` updated via JS
- Tied to scroll velocity (faster scroll = brighter glow)
- Subtle pulse when idle (sine wave, 4s period)

```typescript
// Scroll velocity detection
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

function updateScrollVelocity() {
  const currentScrollY = window.scrollY;
  scrollVelocity = Math.abs(currentScrollY - lastScrollY);
  lastScrollY = currentScrollY;

  // Map velocity to glow intensity (0.3 base, up to 0.8)
  const intensity = Math.min(0.3 + scrollVelocity * 0.01, 0.8);
  document.documentElement.style.setProperty('--fire-glow-intensity', intensity.toString());

  requestAnimationFrame(updateScrollVelocity);
}
```

#### Ember Particles (Canvas)

- Sparse particles (15-25 active at once)
- Drift upward with slight horizontal wobble
- Size: 2-5px, lifespan: 3-6s
- Color gradient: orange → red → transparent
- Spawn rate increases near ignition points

```typescript
interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
}

function updateEmber(ember: Ember, delta: number): boolean {
  ember.life -= delta;
  if (ember.life <= 0) return false;

  // Upward drift with wobble
  ember.vy -= 0.5 * delta; // Float up
  ember.vx += Math.sin(ember.life * 2) * 0.1; // Wobble

  ember.x += ember.vx;
  ember.y += ember.vy;

  // Fade based on life
  ember.opacity = ember.life / ember.maxLife;

  return true;
}
```

---

### 2. Heat Distortion (WebGL Shader)

Using React Three Fiber with a custom shader material on a fullscreen quad.

#### Custom Shader Material Setup

Reference from drei's `shaderMaterial`:

```tsx
import { extend, useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const HeatDistortionMaterial = shaderMaterial(
  {
    tDiffuse: null,
    time: 0,
    intensity: 0.5,
    resolution: new THREE.Vector2(),
  },
  // Vertex shader
  /*glsl*/`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  /*glsl*/`
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    uniform vec2 resolution;
    varying vec2 vUv;

    // Simplex noise function (abbreviated)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                       + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                              dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = vUv;

      // Vertical wave distortion (heat shimmer)
      float wave = sin(uv.y * 40.0 + time * 2.0) * 0.002;
      wave *= intensity * (1.0 - uv.y); // Stronger at bottom

      // Noise-based turbulence
      float noise = snoise(vec2(uv.x * 10.0, uv.y * 10.0 + time * 0.5)) * 0.003;
      noise *= intensity;

      vec2 distortedUV = uv + vec2(wave + noise, 0.0);
      gl_FragColor = texture2D(tDiffuse, distortedUV);
    }
  `
);

extend({ HeatDistortionMaterial });
```

#### Animation Loop with useFrame

Reference from React Three Fiber docs:

```tsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

function HeatDistortion({ intensity = 0.5 }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state, delta) => {
    if (materialRef.current) {
      // Update time uniform for animation
      materialRef.current.uniforms.time.value += delta;

      // Could also update intensity based on cursor proximity here
      materialRef.current.uniforms.intensity.value = intensity;
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <heatDistortionMaterial ref={materialRef} />
    </mesh>
  );
}
```

---

### 3. Char/Ash Accumulation

#### Interaction Memory

Track hovered elements in a `Set<Element>`:

```typescript
const singedElements = new Set<Element>();
let singeLevel = new Map<Element, number>();

function handleElementHover(element: Element) {
  if (!singedElements.has(element)) {
    singedElements.add(element);
    singeLevel.set(element, 1);
  } else {
    const current = singeLevel.get(element) || 0;
    singeLevel.set(element, Math.min(current + 1, 3));
  }

  // Apply visual class
  element.classList.remove('singed-1', 'singed-2', 'singed-3');
  element.classList.add(`singed-${singeLevel.get(element)}`);
}
```

#### Visual Treatment

```css
body.mode-fire .singed-1 {
  filter: brightness(0.95);
}

body.mode-fire .singed-2 {
  filter: brightness(0.90);
  box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.3);
}

body.mode-fire .singed-3 {
  filter: brightness(0.85);
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.5);
}
```

#### Ash Speckles

After hovering 10+ unique elements, spawn static ash particles:

```typescript
function spawnAshParticles(count: number) {
  for (let i = 0; i < count; i++) {
    const ash = {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 1 + Math.random(),
      opacity: 0.3 + Math.random() * 0.3,
    };
    ashParticles.push(ash);
  }
}
```

#### Cleanup on Mode Toggle

```typescript
function cleanupFireMode() {
  // Fade out ash
  ashParticles.forEach((ash) => {
    ash.opacity = 0; // Trigger fade animation
  });

  // Reset singed elements
  singedElements.forEach((el) => {
    el.classList.remove('singed-1', 'singed-2', 'singed-3');
  });
  singedElements.clear();
  singeLevel.clear();
}
```

---

### 4. Ignition Points

#### Curated Element List

```typescript
const IGNITION_SELECTORS = [
  'a',                    // Links
  'button',               // Buttons
  'h1', 'h2', 'h3',       // Section headers
  '.settings-orb',        // Settings button
  '.company-logo',        // Company logos (SVGs)
  '[data-ignition]',      // Explicit opt-in
];

interface IgnitionPoint {
  element: Element;
  rect: DOMRect;
  radius: number;
  intensity: number;
}

function buildIgnitionPoints(): IgnitionPoint[] {
  const points: IgnitionPoint[] = [];

  IGNITION_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      points.push({
        element: el,
        rect: el.getBoundingClientRect(),
        radius: 150,
        intensity: selector.includes('h1') ? 1.0 : 0.7,
      });
    });
  });

  return points;
}
```

#### Distance Calculations

```typescript
function getIgnitionInfluence(x: number, y: number, points: IgnitionPoint[]): number {
  let maxInfluence = 0;

  points.forEach((point) => {
    const centerX = point.rect.left + point.rect.width / 2;
    const centerY = point.rect.top + point.rect.height / 2;
    const distance = Math.hypot(x - centerX, y - centerY);

    if (distance < point.radius) {
      const influence = (1 - distance / point.radius) * point.intensity;
      maxInfluence = Math.max(maxInfluence, influence);
    }
  });

  return maxInfluence;
}
```

#### Update on Scroll/Resize

```typescript
useEffect(() => {
  let ignitionPoints = buildIgnitionPoints();

  const observer = new IntersectionObserver(() => {
    ignitionPoints = buildIgnitionPoints();
  });

  // Observe all ignition elements
  IGNITION_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => observer.observe(el));
  });

  const handleResize = () => {
    ignitionPoints = buildIgnitionPoints();
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', handleResize);

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('scroll', handleResize);
  };
}, []);
```

---

## Performance Strategy

| Device Tier | Detection | Features Enabled |
|-------------|-----------|------------------|
| High | `hardwareConcurrency >= 8` | All effects |
| Medium | `hardwareConcurrency >= 4` | Glow + particles, reduced distortion |
| Low | `< 4` or touch device | CSS glow only, no canvas/WebGL |

```typescript
function getDeviceTier(): 'high' | 'medium' | 'low' {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const cores = navigator.hardwareConcurrency || 4;

  if (isTouchDevice) return 'low';
  if (cores >= 8) return 'high';
  if (cores >= 4) return 'medium';
  return 'low';
}
```

Additional optimizations:

- Ember canvas: `willReadFrequently: false`, batch draws
- Distortion shader: half-resolution render target on medium tier
- RequestAnimationFrame with frame skipping if deltaTime > 20ms
- Visibility API: pause all when tab hidden

---

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| CSS-only fire (gradients + animations) | Simple, performant | Looks cheap, no interactivity | Doesn't showcase technical skill |
| Full Three.js particle fire | Impressive visuals | Heavy, distracting, overused | Violates "elegant not chaotic" goal |
| Video background | Easy to implement | Large file size, no interactivity | Static, doesn't respond to user |
| SVG filter turbulence | Native, no WebGL | Limited control, poor mobile perf | Can't do proximity-based effects |

---

## Implementation Plan

### Phase 1: Foundation

- [x] Create `src/components/FireModeSection/` directory structure
- [x] Create `FireModeSection.tsx` main component
- [x] Add lazy loading in `Layout.astro` (following MoneyModeSection pattern)
- [x] Implement device tier detection utility
- [x] Add CSS baseline styles in `global.css` (`body.mode-fire`)
- [x] Wire up to existing mode system (verify toggle works)

### Phase 2: Ember Glow System

- [x] Implement idle glow pulse animation (CSS custom property)
- [x] Add scroll velocity detection hook
- [x] Connect scroll velocity to `--fire-glow-intensity`
- [x] Create `EmberCanvas.tsx` component
- [x] Implement ember particle class with physics
- [x] Add particle spawn/update/render loop
- [x] Connect ember spawn rate to scroll velocity

### Phase 3: Heat Distortion Shader

- [x] Create `HeatDistortion.tsx` component
- [x] Set up React Three Fiber Canvas (fullscreen, transparent)
- [x] Implement custom `HeatDistortionMaterial` with shaderMaterial
- [x] Add simplex noise to fragment shader
- [x] Implement vertical wave distortion
- [x] Connect intensity to cursor position
- [x] Add device tier check (disable on low/medium)

### Phase 4: Ignition Points

- [x] Define ignition point selectors (links, buttons, headers, logos, orb)
- [x] Create `useIgnitionPoints` hook
- [x] Implement `buildIgnitionPoints()` function
- [x] Add `getIgnitionInfluence()` distance calculation
- [x] Connect ignition influence to glow intensity
- [x] Connect ignition influence to ember spawn rate
- [x] Add IntersectionObserver for dynamic updates
- [x] Test with company logo SVGs

### Phase 5: Char/Ash System

- [x] Create `useCharAccumulation` hook
- [x] Implement hover tracking with `singedElements` Set
- [x] Add singe level progression (1 → 2 → 3)
- [x] Implement singed element CSS classes
- [ ] Create ash particle spawning (after 10+ hovers)
- [ ] Add ash particle canvas layer
- [x] Implement cleanup animation on mode toggle off

### Phase 6: Performance & Polish

- [x] Implement frame skipping when deltaTime > 100ms
- [x] Add Visibility API pause (tab hidden)
- [ ] Profile with Chrome DevTools (target 60fps)
- [ ] Test on medium-tier device (reduce effects if needed)
- [ ] Test on mobile (verify graceful degradation)
- [ ] Add half-resolution render target option for medium tier

### Phase 7: Testing

- [ ] Test mode switching (fire → other modes → fire)
- [ ] Test cleanup (no lingering effects after toggle off)
- [ ] Test with Settings popover open
- [ ] Test scroll behavior
- [ ] Test ignition point updates on resize
- [ ] Test localStorage persistence (mode should persist across refresh)

---

## File Structure

```
src/
├── components/
│   └── FireModeSection/
│       ├── FireModeSection.tsx      # Main orchestrator
│       ├── EmberCanvas.tsx          # Canvas particle system
│       ├── HeatDistortion.tsx       # R3F shader effect
│       ├── useIgnitionPoints.ts     # Ignition point registry
│       ├── useCharAccumulation.ts   # Hover tracking + ash
│       ├── useScrollVelocity.ts     # Scroll-based intensity
│       └── utils.ts                 # Device tier, helpers
├── styles/
│   └── global.css                   # Add body.mode-fire styles
└── layouts/
    └── Layout.astro                 # Add FireModeSection lazy import
```

---

## Relevant Existing Files

- [useSiteMode.ts](src/hooks/useSiteMode.ts) — mode state management
- [siteModeEvents.ts](src/lib/siteModeEvents.ts) — event pub/sub
- [SettingsPanel.tsx](src/components/SettingsPanel/SettingsPanel.tsx) — UI (already has fire icon)
- [MoneyFall.tsx](src/components/MoneyFall/MoneyFall.tsx) — Three.js reference implementation
- [MatrixRain.tsx](src/components/MatrixRain/MatrixRain.tsx) — Canvas reference implementation
- [global.css](src/styles/global.css) — mode-specific CSS patterns

---

## Resources

- [React Three Fiber docs](https://docs.pmnd.rs/react-three-fiber)
- [drei shaderMaterial](https://github.com/pmndrs/drei#shadermaterial)
- [Simplex noise GLSL](https://github.com/stegu/webgl-noise)
- [Shadertoy heat haze reference](https://www.shadertoy.com/view/XssSzN)
