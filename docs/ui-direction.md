# UI Direction

## Intent

The UI should feel like private transfer hardware, not a social app.

Keywords:

- dark
- quiet
- fast
- premium
- temporary

## Visual Direction

Use Apple-style glass as a selective layer, not the whole screen.

The base app should stay solid and dark. Glass belongs on elevated surfaces:

- OTP card
- connected session panel
- composer bar
- floating status chips

Not on:

- the entire page
- dense text areas
- every card

## Fluid Glass Rules

### 1. Three layers only

- solid background plane
- soft atmospheric middle plane
- a few glass surfaces on top

Too many glass layers turns into muddy blur.

### 2. Moderate blur

Backdrop blur should separate, not smear.

If the blur is the main visual effect, it is already too much.

### 3. Tinted translucency

In dark mode, use slightly tinted charcoal glass instead of pale neutral gray.

Good pattern:

- low-opacity dark fill
- thin bright edge
- faint inner highlight
- wide soft shadow

### 4. Readability beats purity

Text should mostly sit on near-solid inner surfaces inside the glass panel.

Do not put long text directly on transparent blur and call it premium.

### 5. Calm motion

Animate:

- opacity
- translateY
- scale very lightly
- blur only in small amounts

Avoid springy or gummy motion.

## Tailwind Implementation Notes

Create reusable tokens instead of freestyle classes everywhere.

Suggested token direction:

```txt
glass-panel
glass-panel-strong
glass-chip
glass-input
glass-border
glass-shadow
```

Suggested CSS ingredients:

- `bg-white/10` or darker tinted equivalent
- `border-white/15`
- `backdrop-blur-xl`
- large soft shadow
- subtle inset highlight

## What To Avoid

- full-screen blur soup
- glowing white borders everywhere
- glass text input with poor contrast
- stacked gradients plus stacked shadows plus stacked blurs
- fake Apple clone details that hurt usability

## MVP Screen Shape

### Home

- centered title
- one strong "Create session" action
- one OTP join card
- small privacy note

### Connected

- session timer
- paired status
- message list
- fixed composer

## Research References

- Apple Liquid Glass overview: [developer.apple.com/documentation/technologyoverviews/liquid-glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
- Apple adoption guidance: [developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- Apple materials guidance: [developer.apple.com/design/human-interface-guidelines/materials](https://developer.apple.com/design/human-interface-guidelines/materials)

Practical read:

- the glass effect is a functional control layer
- materials should help separation and hierarchy
- the web version should imitate the principle, not attempt pixel-perfect system mimicry
