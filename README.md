# intent-link

**A target prediction library for React/Next.js.**

`intent-link` watches real user behavior using kinetic and potential energy and calls `onIntent` when the user is predicted to interact with a target.

[Website](https://intentlink.dev/en) · [Support Intent Link on Patreon](https://www.patreon.com/c/IntentLink)

## Consumer architecture

The primary library experience consists of two components:

1. `IntentProvider` runs one prediction engine for the application. Add it once to your root layout.
2. `IntentLink` is the prebuilt Next.js link. Use it anywhere below the provider when you want to react to predicted intent.

The quick start below shows each component in its natural location: `IntentProvider` in `layout.tsx`, followed by an `IntentLink` inside an application component.

For non-link elements and third-party components, the advanced `useIntentTarget` hook returns a ref that connects one HTML element to the same prediction engine.

What you do with that signal is up to you. Prefetching a route is one obvious use case, but predicting user intent has plenty of others:

- **Prefetching / preloading** — warm a route, an image, or an API call before the click happens.
- **Progressive disclosure** — reveal a tooltip, preview card, or "quick view" panel just before the user commits to a click.
- **Analytics** — log near-misses and predicted-but-abandoned targets, not just actual clicks, to understand hesitation and drop-off.
- **Adaptive UI** — subtly highlight, enlarge, or emphasize the element the user is most likely heading toward.
- **Expensive-action warmup** — spin up a checkout session, open a websocket, or start an expensive computation slightly ahead of an explicit user action.
- **A/B and UX research** — measure "intent-to-click" as a softer signal than clicks alone.

It ships with `IntentLink`, a drop-in replacement for `next/link`.

## Install

```bash
npm install intent-link
```

```bash
yarn add intent-link
```

```bash
pnpm add intent-link
```

## Compatibility

| Dependency | Supported range | Continuously tested |
|---|---|---|
| React | `18.x` and `19.x` | React 19 |
| React DOM | `18.x` and `19.x` | React DOM 19 |
| Next.js | `13.x` through `16.x` | Next.js 16 |
| Node.js | Current Next.js requirement | Node.js 20 and 22 in CI |

The package is a client-side integration and supports both the Next.js App Router and Pages Router wherever `next/link` and client components are available.

## Quick start

Wrap your app once with `IntentProvider`. It runs the shared prediction engine for all registered targets below it:

```jsx
// app/layout.js
import { IntentProvider } from "intent-link";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <IntentProvider>
          {children}
        </IntentProvider>
      </body>
    </html>
  );
}
```

### Use case: prefetching (the built-in component)

```jsx
import { IntentLink } from "intent-link";
import { useRouter } from "next/navigation";

function ProductCard({ href }) {
  const router = useRouter();

  return (
    <IntentLink href={href} onIntent={() => router.prefetch(href)}>
      View product
    </IntentLink>
  );
}
```

`onIntent` fires once when the model's action criterion is met—not on every mouse move.

### Use case: something other than prefetching

`onIntent` is just a callback — nothing about it is prefetch-specific. For example, warming up a preview panel instead:

```jsx
<IntentLink
  href="/pricing"
  onIntent={() => setShowPricingPreview(true)}
>
  Pricing
</IntentLink>
```

Or logging predicted-but-unclicked targets for analytics:

```jsx
<IntentLink
  href="/upgrade"
  onIntent={() => track("predicted_intent", { href: "/upgrade" })}
>
  Upgrade
</IntentLink>
```

If you want target prediction without `next/link`'s routing behavior at all—such as a preview on a button or card—use `useIntentTarget`.

## API

### `<IntentProvider>`

Context provider that runs the prediction engine. Mount it once, near the root of your app (typically in `layout.js`/`layout.tsx`). Everything inside it can use `IntentLink` or `useIntentTarget`.

```jsx
<IntentProvider>{children}</IntentProvider>
```

No props.

### `<IntentLink>`

A target-prediction-aware drop-in replacement for `next/link`. Accepts everything `next/link` accepts (`href`, `replace`, `scroll`, `prefetch`, etc.), plus every native `<a>` attribute (`className`, `style`, `target`, `aria-*`, and so on) — anything not listed below is passed straight through to the rendered anchor. `ref` is forwarded too, just like `next/link`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `href` | `string \| UrlObject` | — | Same as `next/link`. Required. |
| `importance` | `"high" \| "medium" \| "low"` | `"medium"` | How readily predicted intent alone should trigger `onIntent` for this target. Higher importance triggers sooner. |
| `cost` | `"high" \| "medium" \| "low"` | `"low"` | The cost of acting on a false positive. Raise this if whatever `onIntent` does is expensive (an API call, a websocket) rather than cheap (a `router.prefetch`). |
| `onIntent` | `() => void` | — | Called once when the model decides that acting on predicted intent is worthwhile. Resets after the user moves away and can fire again on a later approach. |
| `...rest` | — | — | Any other `next/link` or anchor prop — `className`, `style`, `target`, `ref`, etc. |

```jsx
<IntentLink
  href="/checkout"
  importance="high"
  cost="high"
  className="btn btn-primary"
  onIntent={() => router.prefetch("/checkout")}
>
  Checkout
</IntentLink>
```

## How `importance` and `cost` interact

Raise `importance` when the target deserves earlier action, such as a prominent call to action. Raise `cost` when an incorrect trigger would be expensive or disruptive. The library keeps the underlying decision calculation private and calls `onIntent` only when its action criterion is met.

Suggested starting points:

| Action | Importance | Cost |
|---|---|---|
| Route or image prefetch | `medium` | `low` |
| Passive preview or highlight | `medium` | `low` |
| API request | `medium` | `medium` |
| Expensive session or connection warmup | `high` | `high` |

These are product-level controls, not confidence scores. Start with the defaults and raise `cost` when a false trigger would consume meaningful resources.

## Custom targets

`IntentLink` is the recommended prebuilt component for navigation. When the target is not a Next.js link, use `useIntentTarget`. It returns a ref; attach that ref to the HTML element whose intent you want to observe.

### Basic ref example

```tsx
"use client";

import { useIntentTarget } from "intent-link";

export function PreviewButton() {
  const intentRef = useIntentTarget<HTMLButtonElement>({
    onIntent: () => preloadProductPreview(),
  });

  return (
    <button ref={intentRef}>
      Preview product
    </button>
  );
}
```

Registration, model state, decision-making, one-shot triggering, resetting, and cleanup remain internal.

### Building a reusable `IntentButton`

If an application contains many predictive buttons, wrap the hook once and reuse the resulting component:

```tsx
"use client";

import type { ButtonHTMLAttributes } from "react";
import {
  useIntentTarget,
  type UseIntentTargetOptions,
} from "intent-link";

type IntentButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> &
  UseIntentTargetOptions;

export function IntentButton({
  onIntent,
  importance,
  cost,
  children,
  ...buttonProps
}: IntentButtonProps) {
  const intentRef = useIntentTarget<HTMLButtonElement>({
    onIntent,
    importance,
    cost,
  });

  return (
    <button ref={intentRef} {...buttonProps}>
      {children}
    </button>
  );
}
```

Usage:

```tsx
<IntentButton
  className="preview-button"
  onIntent={preloadPreview}
>
  Preview
</IntentButton>
```

### Building a reusable `IntentArticle`

The same pattern works for cards and other semantic containers:

```tsx
"use client";

import type { HTMLAttributes } from "react";
import {
  useIntentTarget,
  type UseIntentTargetOptions,
} from "intent-link";

type IntentArticleProps =
  HTMLAttributes<HTMLElement> &
  UseIntentTargetOptions;

export function IntentArticle({
  onIntent,
  importance,
  cost,
  children,
  ...articleProps
}: IntentArticleProps) {
  const intentRef = useIntentTarget<HTMLElement>({
    onIntent,
    importance,
    cost,
  });

  return (
    <article ref={intentRef} {...articleProps}>
      {children}
    </article>
  );
}
```

Usage:

```tsx
<IntentArticle
  className="product-card"
  onIntent={() => preloadProduct(productId)}
>
  <ProductImage />
  <ProductDetails />
</IntentArticle>
```

### Third-party components

If a third-party component forwards its ref to a real HTML element, attach the intent ref directly:

```tsx
const intentRef = useIntentTarget<HTMLDivElement>({
  onIntent: prepareCarousel,
});

return (
  <ThirdPartyCarousel ref={intentRef}>
    {slides}
  </ThirdPartyCarousel>
);
```

If the third-party component does not forward its ref, wrap it in a native element and observe that wrapper:

```tsx
const intentRef = useIntentTarget<HTMLDivElement>({
  onIntent: prepareCarousel,
});

return (
  <div ref={intentRef}>
    <ThirdPartyCarousel>{slides}</ThirdPartyCarousel>
  </div>
);
```

## Mobile behavior

On touch devices there's no cursor to track, so `intent-link` falls back to tracking scroll velocity and deceleration instead — a user slowing their scroll near a target is treated as a signal of intent, feeding the same probability model.

## TypeScript

Fully typed. Import types directly:

```ts
import type { IntentLinkProps, UseIntentTargetOptions } from "intent-link";
```

## License

MIT

## Support the project

`intent-link` is free and open source. If it is useful to you, you can support its continued development on [Patreon](https://www.patreon.com/c/IntentLink).

## Contributors

- Uzafir Ahmad Rafaq
- Muaz Hassan
- Ali Muzaffar
