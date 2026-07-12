# Changelog

All notable changes to this project are documented here.

## 1.0.9 - 2026-07-12

### Changed

- Replaced frame-by-frame React context updates with a stable internal engine.
- Added `IntersectionObserver` tracking so calculations inspect visible targets only.
- Changed `onIntent` to a parameterless callback and kept model internals private.
- Changed `useIntentTarget` to return only a callback ref.
- Made `IntentLink` use `useIntentTarget` as its single intent implementation.
- Stopped tracking targets that do not provide an `onIntent` action.
- Preserved the latest inline callback without requiring consumer memoization.

### Fixed

- Stopped the prediction loop while the page is idle.
- Prevented off-screen drawers and CSS-hidden targets from triggering intent.
- Corrected the mobile anchor position and velocity-deviation calculation.
- Fixed an input/observer timing race for newly visible targets.

### Added

- Unit, lifecycle, visibility, and 1,000-target performance regression tests.
- Real-browser Next.js tests for desktop, mobile, hidden targets, and dense pages.
- Advanced custom-target and third-party integration documentation.
