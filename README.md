# intent-link

**A target prediction library for React/Next.js.**

`intent-link` watches real user behavior using kinetic and potential energy — and estimates, in real time, the *probability* that the user is about to interact with a given element. It exposes that probability through a simple `onIntent` callback that fires once a link crosses a configurable confidence threshold.

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

**Peer dependencies:** `react >= 18`, `react-dom >= 18`, `next >= 13`.

## Quick start

Wrap your app once with `IntentProvider` — this runs the prediction engine and computes intent probabilities for every registered target:

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

`onIntent` fires once, the first time predicted intent for that link crosses its utility threshold — not on every mouse move.

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
  onIntent={({ href, utility }) => track("predicted_intent", { href, utility })}
>
  Upgrade
</IntentLink>
```

If you want target prediction without `next/link`'s routing behavior at all — e.g. to drive a hover-preview on a non-navigational element — use `IntentContext` directly (see [Building your own target-aware components](#building-your-own-target-aware-components) below).

## Why not just prefetch/observe everything?

Naively prefetching (or reacting to) every visible link is wasteful on link-heavy pages — nav bars, product grids, footers — and doesn't distinguish "the user glanced past this" from "the user is moving toward this." `intent-link` runs a Kalman filter over cursor position (desktop) or scroll position (mobile) to estimate velocity and trajectory in real time, then combines that with each target's on-screen position and size to compute a probability that it's what the user is actually heading toward. You decide what to do with that probability once it crosses your threshold.

`IntentLink` sets `prefetch={false}` on the underlying `next/link` by default, since prefetching is treated as just one possible consumer of the signal, not something forced on you.

## API

### `<IntentProvider>`

Context provider that runs the prediction engine. Mount it once, near the root of your app (typically in `layout.js`/`layout.tsx`). Everything inside it can use `IntentLink` or read from `IntentContext` directly.

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
| `onIntent` | `(data: { href: string; utility: number }) => void` | — | Called once when predicted intent crosses the utility threshold for this target. What it does is entirely up to you — prefetch, preview, log, animate, anything. Resets and can fire again if probability drops and rises again. |
| `...rest` | — | — | Any other `next/link` or anchor prop — `className`, `style`, `target`, `ref`, etc. |

```jsx
<IntentLink
  href="/checkout"
  importance="high"
  cost="high"
  className="btn btn-primary"
  onIntent={({ href, utility }) => {
    console.log(`High confidence (${utility.toFixed(2)}) user wants ${href}`);
    router.prefetch(href);
  }}
>
  Checkout
</IntentLink>
```

## How `importance` and `cost` interact

Internally, each target's "should I fire `onIntent`" decision is:

```
utility = (probability × importanceWeight) − costWeight
```

`onIntent` fires the first time `utility` exceeds `0`. Raise `importance` for targets you're confident about acting on early (a prominent Call to Action). Raise `cost` for targets where firing `onIntent` unnecessarily is expensive or disruptive, regardless of what that callback actually does.

## Building your own target-aware components

If `IntentLink`'s `next/link` behavior doesn't fit your use case — say, you want target prediction on a `<button>`, a card, or any arbitrary element — you can consume `IntentContext` directly and register elements yourself:

```jsx
import { useContext, useRef, useEffect, useId } from "react";
import { IntentContext } from "intent-link";

function PredictiveButton({ onIntent, children }) {
  const { probabilities, registerLink, unregisterLink } = useContext(IntentContext);
  const ref = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!ref.current) return;
    registerLink(id, ref.current);
    return () => unregisterLink(id);
  }, [id, registerLink, unregisterLink]);

  const probability = probabilities[id]?.probability ?? 0;

  useEffect(() => {
    if (probability > 0.5) onIntent?.();
  }, [probability, onIntent]);

  return <button ref={ref}>{children}</button>;
}
```

`probabilities[id]` gives you the raw `PhysicsState` for that element (`probability`, `weight`, `kineticAgent`, `kineticTarget`, `potential`) if you want finer control than `IntentLink`'s built-in `importance`/`cost` model.

## Mobile behavior

On touch devices there's no cursor to track, so `intent-link` falls back to tracking scroll velocity and deceleration instead — a user slowing their scroll near a target is treated as a signal of intent, feeding the same probability model.

## TypeScript

Fully typed. Import types directly:

```ts
import type { IntentLinkProps, PhysicsState, IntentContextType } from "intent-link";
```

## License

MIT