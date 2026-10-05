# Zoom controls and progressive haptics

October 4, 2026 follow-up to `3f1dc16`. Same draft PR; preview only.

## Findings and changes

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | `src/components/MapZoom.tsx` | Native wheel zoom fed a fractional resting value to a spring. Reproduced `3.22`, visibly between dots. | Six integer stops; the control reports the nearest stop while native camera values remain continuous. Semantic value and interaction geometry stay discrete. The visual thumb/fill use an interruptible 280ms Motion spring with 0.12 bounce toward integer targets, followed by an exact final assignment. New pointer/key input cancels the old visual animation. Keyboard/reduced-motion updates jump immediately. | State must remain clear after motion ends. Keyboard and repeated input stay responsive. |
| HIGH | `src/components/MapZoom.tsx`, `src/app/globals.css` | The interactive Base UI thumb measured 12px: its utility overrode a 36px component-layer rule. Pointer mapping differed from the visible dots/32px thumb. | An explicit 36px thumb utility matches the 18px endpoint inset. Dots, thumb and fill derive positions from track width. | One geometry for visible state and pointer interaction. The same native drag formerly landed on Region and now correctly lands on Area. |
| MEDIUM | `src/components/PlacesExplorer.tsx` | Previous and Next bookended Shuffle, with a separator between every action. | Previous/Next adjacent; separators distinguish Shuffle and Zoom. | Proximity groups the inverse navigation pair; all targets remain 44px. |
| LOW | `src/lib/haptics.ts` and explicit selection handlers | No optional tactile feedback. | One 8ms pulse per supported deliberate selection, rate-limited to one per 100ms. Unsupported devices retain visual/accessibility feedback. | Restrained enhancement, independent of the primary action. |

## Rendered alignment

Measured `getBoundingClientRect()` of the command bar, popover, track, visible thumb, interactive thumb and selected dot through supported read-only browser inspection. The popup was already centered at default browser zoom (zero measured offset at 320/390/1200px); no arbitrary horizontal nudge was introduced. It explicitly anchors to the whole command bar with center alignment.

At 110% browser zoom, with the compact photo drawer open:

| CSS viewport | Command bar center | Popover center | Difference |
| --- | ---: | ---: | ---: |
| 320px | 160.000 | 159.815 | −0.185px |
| 390px | 194.996 | 195.270 | +0.274px |
| 1200px | 402.994 | 402.543 | −0.451px |

All are within half a CSS pixel of floating-positioner pixel rounding. Track/popover centers match. At Area, visible thumb, interactive thumb and selected dot centers all measured 248.125px (difference below 0.001px). No horizontal overflow at these sizes.

## Haptic support and limits

Sources checked live: [MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json), [MDN vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate), [W3C Vibration API](https://w3c.github.io/vibration/), [WebKit HTML switch](https://webkit.org/blog/15054/an-html-switch-control/).

- Android Chromium supports `navigator.vibrate` after user activation, subject to hardware, browser/system settings and context restrictions.
- Safari on iOS/macOS and iOS WebViews do not support this API. No iPhone hardware haptics are promised.
- Firefox Android can expose the method and return true while vibration remains disabled. Desktop API presence also does not establish vibration hardware.
- The API cannot confirm that hardware actually vibrated. The helper returns API acceptance only. No hidden switch, simulated API, native bridge, permission prompt or dependency is used.

The enhancement checks API availability, prior user activation, visible document, coarse pointer and reduced-motion preference. It runs only for user-driven slider stop changes, place navigation/selection, panel/photo opening and actual cart mutations. There are no pulses for camera render frames, native wheel/pinch synchronization, hydration, no-op cart updates or repeated samples within a stop. Reduced motion suppresses pulses. Browser refusal/exceptions leave the action intact.

## Verification

- Native Mac Chrome: all six dot taps, between-dot tap, pointer drag/release, rapid Home→End→ArrowLeft interruption, Escape/reopen and keyboard navigation. Every resting value is integer and matches its label/dot.
- Native wheel camera remained fractional (`10.284335936354136`) before and after reopening the slider; the control displayed Local without changing the camera. Existing camera/projection tests remain unchanged.
- Compact photo drawer remains open through Next→Previous; 320/390px phones and 1200px desktop centering measured against rendered bounds. Existing 25/75/100 drawer dismissal and catalog/cart flow checked again before delivery.
- 136 tests pass, including all-stop round trips, native nearest-stop boundaries, high zoom clamping, unavailable haptics, pulse duration/rate limiting and browser rejection.
- Physical iPhone/Android haptic output, Safari, hardware pinch and DevTools 10%-speed animation playback: **Not verified**. The restored visual spring was checked with native pointer interactions and rapid interruption, but not at 10% playback speed. Native pointer drag and wheel verification do not imply physical touch coverage.

Approve for the inspected web behavior; hardware/device checks above remain unverified. See the PR for exact-head CI, production HTTP and hosted smoke results.

## Spring preservation

The earlier requested playful slider feedback is preserved independently of camera easing. Motion animates only the displayed thumb/fill toward the current integer stop; it never supplies the slider value or sends intermediate zoom requests to MapLibre. A new target cancels the previous animation, new pointer/key input synchronizes the visual thumb before interaction, and completion assigns the exact target. Native map camera easing and continuous wheel/pinch behavior are unchanged.
