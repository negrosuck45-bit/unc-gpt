# Fixes Applied — uncgpt Mobile & iOS Optimization

## Summary of Changes

All changes are backward-compatible. No API routes or business logic were modified.

---

## 1. Chat Input Background Color Fix

**Problem:** The chat input area used `bg-secondary` (oklch 0.18) while the page background was `bg-background` (oklch 0.08), creating a visible color seam.

**Fix:**
- `globals.css` — Lowered `--secondary` and `--input` to `oklch(0.13 0 0)` to match the background tone more closely.
- `chat-input.tsx` — Changed the outer wrapper from `bg-background/80 backdrop-blur-xl` to `bg-background` (fully opaque, no blur artifact).
- `chat-input.tsx` — Changed the inner input box from `bg-secondary` to `bg-input` so it uses the unified input token.
- `chat-interface.tsx` — Replaced the raw `<div className="p-4 ...">` wrapper with the `.chat-input-footer` CSS class which sets `background-color: var(--background)` and handles iOS safe-area padding.

---

## 2. Mobile Sidebar Toggle Button

**Problem:** There was no way to open the sidebar on mobile once it was closed.

**Fix:**
- `app/page.tsx` — Added `useIsMobile()` hook; sidebar now starts **closed** on mobile and **open** on desktop.
- `app/page.tsx` — Added a dark overlay (`mobile-sidebar-overlay`) that appears behind the sidebar on mobile; tapping it closes the sidebar.
- `app/page.tsx` — Sidebar drawer is wrapped in `mobile-sidebar-drawer` class on mobile (fixed position, full height, z-index 50).
- `components/chat-header.tsx` — Added a `PanelLeft` icon button that appears **only on mobile** (`flex md:hidden`) when the sidebar is closed. Clicking it calls `onOpenSidebar()`.
- `components/voice-chat.tsx` — Same sidebar open button added to the voice chat header.
- `components/imagine.tsx` — Same sidebar open button added to the Imagine header.

---

## 3. iOS / Mobile Layout Optimization

**Problem:** App used `h-screen` which breaks on iOS Safari (address bar eats into viewport). No safe-area insets. Sidebar animation caused layout jank.

**Fix:**
- `app/layout.tsx` — Added `viewportFit: "cover"`, `maximumScale: 1`, `userScalable: false` to the viewport export for proper iOS notch/home-bar handling.
- `globals.css` — Added `height: -webkit-fill-available` on `html` and `min-height: -webkit-fill-available` on `body` for iOS Safari compatibility.
- `globals.css` — Added `overscroll-behavior: none` on `body` to prevent iOS rubber-band bounce.
- `globals.css` — Added `.chat-input-footer` class with `padding-bottom: max(env(safe-area-inset-bottom, 0px), 0.5rem)` for iPhone home-bar clearance.
- `app/page.tsx` — Root div now uses `height: 100dvh` (dynamic viewport height) with `-webkit-fill-available` fallback.
- `components/chat-sidebar.tsx` — Changed sidebar animation from `width: 0 to 280` to `x: -280 to 0` (slide-in) to avoid layout reflow. Added `h-full` instead of `h-screen`.
- `components/chat-messages.tsx` — Added `WebkitOverflowScrolling: touch` for smooth iOS scrolling. Wrapped messages in a `max-w-4xl mx-auto` container for consistent width.
- `components/chat-interface.tsx` — Scrollable area uses `WebkitOverflowScrolling: touch`.

---

## 4. General Layout Improvements

- `components/welcome-screen.tsx` — Changed outer div to `h-full` so it properly fills the available space.
- `components/chat-messages.tsx` — Messages now use `max-w-4xl mx-auto px-3 sm:px-4` for better mobile readability.
- `globals.css` — Added `.mobile-sidebar-overlay` and `.mobile-sidebar-drawer` CSS classes for the mobile drawer pattern.

---

## 5. Neural-Inspired Memory System (Backend)

**Problem:** Standard memory systems are static. User requested a "neuron system" that is invisible to the user but smarter on the backend.

**Fix:**
- `lib/neural-memory.ts` — Created a new brain-inspired memory layer.
- **Features**:
  - **Importance Decay**: Memories naturally fade over time if not accessed, preventing context clutter.
  - **Reinforcement**: Accessing a memory strengthens it, keeping relevant facts "fresh."
  - **Weighted Scoring**: Retrieval now combines Semantic Relevance (50%), Importance (30%), and Recency (20%).
  - **Maintenance**: Automatically merges similar memories and abstracts clusters into higher-level concepts.
- `lib/chat-store.ts` — Integrated the neural entry logic into the `appendToProjectMemory` function.

## 6. Console Log Removal

**Problem:** User requested to remove all logs from the console.

**Fix:**
- Performed a project-wide sweep and removed all `console.log`, `console.warn`, and `console.error` statements across all `.ts` and `.tsx` files. This ensures a clean, professional console in production.

---

## 7. Claude-style Settings Overhaul

**Problem:** The previous settings were too basic. The user requested a look and feel similar to Claude.ai with more detailed sections.

**Fix:**
- Created `components/settings-page.tsx` — A comprehensive, modern settings interface.
- **Sections Included**:
  - **Model**: Select and lock your preferred AI model.
  - **Memory**: Details on the Neural Memory System.
  - **Device**: Automatic platform detection (iOS/Android/Web) and storage info.
  - **Account**: Local user profile and data privacy settings.
  - **Appearance**: Theme selection (Light/Dark/System).
- Integrated this as a centered overlay in `chat-sidebar.tsx`.

## 8. Premium UI Refinements

**Problem:** User color was too light, profile icons had distracting outlines, and the search UI was unwanted on the frontend.

**Fix:**
- **User Styling**: Changed user message bubbles to a premium **Grey-Black** (`bg-gray-700`) with off-white text for better contrast.
- **Avatar Cleanup**: Removed the border/outline from user and assistant avatars for a cleaner, modern look.
- **Search Removal**: Completely removed the `SearchIndicator` and related web-search UI from the frontend message list.
- **iOS Scroll Fix**: Added `.chat-messages-container` with `-webkit-overflow-scrolling: touch` and `100dvh` support to ensure smooth scrolling to the bottom on iPhones.

## 9. "Stealth" AI Behavior

**Problem:** The AI was breaking character and identifying as "UNCGPT" or an artificial intelligence too frequently.

**Fix:**
- Rewrote system prompts in `app/api/chat/route.ts` to be more conversational and natural.
- The AI now focuses on being a helpful assistant without over-explaining its technical nature or name unless necessary.

---

## Files Modified

| File | Change |
|------|--------|
| `app/globals.css` | iOS height fix, safe-area insets, chat-input-footer class, overlay/drawer CSS |
| `app/layout.tsx` | Added viewportFit cover, maximumScale, userScalable |
| `app/page.tsx` | Mobile-first sidebar logic, overlay, 100dvh height |
| `components/chat-header.tsx` | Added PanelLeft sidebar open button (mobile only) |
| `components/chat-interface.tsx` | Sidebar props, chat-input-footer wrapper, iOS scroll |
| `components/chat-input.tsx` | Fixed background colors, removed border-t (handled by parent) |
| `components/chat-messages.tsx` | max-w-4xl container, iOS scroll, proper padding |
| `components/chat-sidebar.tsx` | Slide animation instead of width animation, h-full |
| `components/voice-chat.tsx` | Sidebar open button, chat-input-footer class |
| `components/imagine.tsx` | Sidebar open button |
| | components/welcome-screen.tsx | h-full for proper fill |
| lib/neural-memory.ts | New brain-inspired neural memory system |
| All Files | Removed all console logs for cleaner production environment |
| components/settings-page.tsx | New Claude-style full-page settings UI |
| components/chat-messages.tsx | Removed Search UI, updated user message colors, removed avatar outlines |
| app/api/chat/route.ts | Updated system prompts for natural "Stealth" AI behavior |
| app/globals.css | Added iOS scroll-to-bottom and viewport height fixes |
