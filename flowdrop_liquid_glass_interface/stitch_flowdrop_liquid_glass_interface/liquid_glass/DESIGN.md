---
name: Liquid Glass
colors:
  surface: '#fcf8fb'
  surface-dim: '#dcd9dc'
  surface-bright: '#fcf8fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7ea'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#414753'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#727784'
  outline-variant: '#c1c6d5'
  surface-tint: '#005db8'
  primary: '#005db8'
  on-primary: '#ffffff'
  primary-container: '#4c95ff'
  on-primary-container: '#002d60'
  inverse-primary: '#aac7ff'
  secondary: '#3f5f91'
  on-secondary: '#ffffff'
  secondary-container: '#a5c5fd'
  on-secondary-container: '#305182'
  tertiary: '#5d5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#959696'
  on-tertiary-container: '#2d2f2f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00458d'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#a8c8ff'
  on-secondary-fixed: '#001b3c'
  on-secondary-fixed-variant: '#254777'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fcf8fb'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
typography:
  display-xl:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  body-md:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: -0.01em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.08em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 16px
  card-gap: 20px
  safe-margin: 32px
---

## Brand & Style

This design system embodies a premium, ethereal aesthetic inspired by the evolution of spatial computing and high-fidelity operating systems. It centers on the concept of "Liquid Glass"—a visual language where surfaces feel like suspended, translucent volumes rather than flat planes. 

The target audience values hyper-modernity, fluidity, and effortless precision. The UI evokes a sense of weightlessness and clarity, using depth to organize information naturally. The style is a sophisticated evolution of **Glassmorphism**, characterized by high-refraction blurs, multi-layered volumetric shadows, and ultra-smooth "liquid" transitions that mimic physical inertia. It feels futuristic yet organic, prioritizing breathing room and tactile responsiveness.

## Colors

The palette is anchored in a celestial light mode. The primary engine of the design system is transparency rather than solid fills.

- **Primary Blue Glass:** An energetic yet soft azure used for key actions. It should maintain enough saturation to be legible but enough transparency to allow background colors to bleed through.
- **Secondary Frosted:** A neutral, high-transparency white used for secondary containers and background panels.
- **Pure White Surfaces:** Reserved for highlight edges and internal component states to provide contrast against the softer glass layers.
- **Neutral Accents:** Deep charcoals are used sparingly for high-contrast text and glyphs to ensure WCAG accessibility against shifting backgrounds.

Every color application must account for the `backdrop-filter` to ensure the "liquid" feel is maintained as users scroll.

## Typography

The typography system mirrors the precision of high-end industrial design. **Hanken Grotesk** is used for headings to provide a clean, modern, and slightly tech-forward feel with wide tracking on display styles to enhance the "premium" breathability.

**Inter** handles functional body and label roles, ensuring maximum legibility across translucent surfaces. 
- Use **wide letter spacing** (tracking) for uppercase labels and display headlines to evoke a luxury, airy feel.
- Keep weights minimal; rely on size and color contrast rather than heavy bolding to maintain the system's lightness.
- All text should have a subtle `text-shadow` when appearing over high-blur glass to prevent edge bleed.

## Layout & Spacing

This design system uses a **Fluid Grid** with generous safe areas. Elements should feel like they are floating in a spatial environment rather than being locked to a rigid 2D grid.

- **Margins:** Desktop layouts utilize a 32px safe margin, while mobile defaults to 24px to maximize the surface area of glass panels.
- **Rhythm:** An 8px base unit drives all spacing. Component internal padding is usually large (24px+) to reinforce the sense of "liquid" volume.
- **Floating Windows:** Main content areas should be treated as "windows" that don't touch the edge of the viewport, maintaining at least a 16px gap to the screen boundary to emphasize the floating depth.

## Elevation & Depth

Hierarchy is established through **Backdrop Blurs** and **Multi-Layered Shadows**.

- **Surface Tiers:** 
  - Tier 1 (Background): Subtle gradient or environmental image.
  - Tier 2 (Panels): `backdrop-filter: blur(20px)` with a 1px soft white inner border.
  - Tier 3 (Modals/Buttons): High-saturation glass with intensive outer shadows.
- **Shadows:** Use "Ambient Occlusion" style shadows—large spread (40px-60px), low opacity (10-15%), and tinted with the primary color to simulate light passing through colored glass.
- **Highlights:** Apply a 0.5px "sheen" border (top and left edges) to glass components to catch the "light."

## Shapes

The shape language is dominated by **Extreme Roundedness**. 

- **Pills:** All primary buttons and high-level input containers must use a full pill radius (24px or higher depending on height).
- **Cards:** Main content cards use a 32px-40px corner radius to feel soft and approachable. 
- **Transitions:** When elements change state, the corner radius should feel fluid—never sharp. All containers follow a nested radius rule where inner elements have a smaller radius than their parent to maintain visual harmony.

## Components

### Buttons
- **Primary:** "Blue Glass" fill. White text. Pill-shaped. Apply a subtle internal glow on hover.
- **Secondary:** "Frosted Glass" fill with a 1px white border at 20% opacity. 

### Glass Cards
- Used for grouping content. Must feature `backdrop-filter: blur(24px)`.
- **States:** On "active" or "hover," the card should increase in scale slightly (1.02x) and the blur intensity should deepen.

### Input Fields
- Styled as translucent pills. The background should be slightly darker or more opaque than the surrounding card to indicate interactability.
- Use a 1.5px stroke for the focused state, ideally a soft gradient of the Primary Blue.

### Chips & Lists
- Chips are mini-pills with high-blur backgrounds.
- Lists should have no visible dividers. Instead, use vertical spacing and "hover-reveal" glass backgrounds to separate items.

### Icons
- Use thin-stroke (light or regular weight) line icons. Glyphs should be centered in circular glass housings when used for primary navigation.