---
name: Obsidian Wave
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#c7c4d8'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#918fa1'
  outline-variant: '#464555'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1d00a5'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#4d44e3'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.011em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 21px
    letterSpacing: -0.006em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system defines an ultra-focused, precision-engineered communication ecosystem tailored for high-output teams, asynchronous power users, and modern knowledge workers. It rejects conversational clutter, playful cartoonish affordances, and ubiquitous chat tropes in favor of an elite, productivity-centric environment reminiscent of high-end developer tooling and focused executive workflows.

### Aesthetic Paradigm: Hyper-Refined SaaS Minimal
The design fuses the structural discipline of keyboard-first utility tools with an ethereal, optical lightness. It leverages:
- **Disciplined Restraint:** Chrome recedes entirely into the background; conversation topology and code/text content take visual primacy.
- **Micro-Precision Engineering:** 1px hairline structural dividers, hairline focus states, and mono-spaced micro-metadata replace heavy backgrounds and playful drop-shadows.
- **Flow State Atmosphere:** Low cognitive load, high density without visual chaos, and deliberate visual dampening to sustain hours of uninterrupted interaction.

## Colors

The palette establishes an immediate departure from legacy consumer chat tools. Grounded in a nocturnal deep-slate canvas, the core identity radiates from a surgical Electric Indigo paired with crystalline structural neutrals and precise semantic telemetry.

### Palette Architecture
- **Primary (`#4F46E5` Electric Indigo):** Reserved strictly for high-value interactive focal points: active message sends, primary system commands, selected channel highlights, and interactive toggles. Never used as large background fills.
- **Secondary (`#06B6D4` Cyan Pulse):** Dedicated to ephemeral digital artifacts: thread indicators, unread mentions, deep links, and audio stream visualizations.
- **Tertiary (`#10B981` Kinetic Emerald):** Real-time status indicators (active presence, connection stability, voice connection confirmation). Contrasted with Semantic Rose (`#F43F5E`) for destructive actions, audio mute states, and call terminations.
- **Neutral Core (`#090D16` Void Slate):** A custom blue-shifted carbon foundation layered through precision surface steps:
  - `Base / App Canvas`: `#090D16`
  - `Sidebar / Navigation Surface`: `#0D121F`
  - `Active Message Pane / Focus Tier`: `#121826`
  - `Subtle Hairline Borders`: `rgba(255, 255, 255, 0.07)`
  - `Structural Dividers (Muted)`: `rgba(255, 255, 255, 0.04)`

### Application Rules
1. Never apply pure black (`#000000`) or standard neutral gray; all darks carry a calibrated cool slate-violet undertone.
2. Maintain rigorous contrast for all text tiers against surface layers (minimum 7:1 for body copy).
3. Foreground accents are deployed in micro-doses: badges, 2px indicator pills, and focus rings.

## Typography

The typographic hierarchy implements a tripartite structure engineered for speed of parsing, scanability, and spatial harmony:
- **Headings (Plus Jakarta Sans):** Crafted with deliberate negative tracking and geometric precision to anchor conversation headers, modal titles, and panel contexts.
- **Reading Engine (Inter):** Highly legible, neutral sans-serif delivering uninterrupted flow for long-form messaging, markdown documentation, code commentary, and collaborative inputs.
- **Telemetry & Metadata (JetBrains Mono):** Reserved for timestamps, keyboard shortcuts, unread count pills, file metadata, and protocol indicators. This technical monospaced rhythm gives the interface its command-line-caliber exactitude.

### Typographic Discipline
- Standard conversation streams render at `body-md` (14px) with a 21px line height, providing optimal data density without optical crowding.
- All timestamps and keyboard shortcuts must render strictly in `label-sm` or `label-xs` using uppercase or tabular lining numerals.

## Layout & Spacing

The system utilizes an architectural three-tier multi-pane layout calibrated around an 8px baseline rhythm (with a strict 4px sub-grid for internal component micro-alignment).

### Layout Geometry
1. **Utility Navigation Rail (Collapsed):** Fixed 64px width. Hosts global workspaces, direct notification pings, and user identity anchors.
2. **Context Pane (Channels / Direct Messages):** Fixed 280px width (expandable to 340px via drag affordance). High-density list with strictly managed gaps (`space-xs` between channel rows).
3. **Primary Canvas (Message Workspace):** Dynamic fluid width. Flanked on demand by an inspectable contextual utility drawer (Thread, Member List, or Canvas Files) fixed at 380px.

### Breakpoint Strategy
- **Desktop (>= 1280px):** Full three-column view with active right contextual inspector visible simultaneously.
- **Tablet / Compact Desktop (768px - 1279px):** Utility rail retained; channel context drawer slides into an overlay panel or tabbed drawer; conversation canvas fills primary viewport.
- **Mobile (< 768px):** Single-pane hierarchy with horizontal sliding transitions. Gutter drops to `gutter-mobile` (12px), and margin reduces to `margin-mobile` (12px). Quick-action bars pin to safe bottoms with native thumb-reach clearance.

## Elevation & Depth

Visual plane differentiation avoids cartoonish, high-spread shadows. Instead, it employs structural tonal layering paired with razor-thin hairline borders and localized frosted refractions.

### Layer Hierarchy
- **Canvas Base (`#090D16`):** The lowest bedrock layer. Completely flat, framing the workspace.
- **Panel Insets (`#0D121F`):** Subtle tonal shift elevated with a 1px border `rgba(255, 255, 255, 0.05)`.
- **Active Focus Surface (`#121826`):** The current message stream or focused active input block.
- **Floating Modals & Command Palettes (`#161D2E` with `backdrop-filter: blur(16px)`):** 
  - Rim Highlight: 1px border `rgba(255, 255, 255, 0.12)`.
  - Ambient Drop Shadow: `0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(79, 70, 229, 0.15)`. The subtle indigo-tinted shadow anchors modals as active, high-priority planes.
- **Ephemeral Tooltips & Popovers:** Elevated using 1px `rgba(255, 255, 255, 0.14)` border with zero blur spread: `0 8px 16px -4px rgba(0, 0, 0, 0.8)`.

## Shapes

The geometric signature uses a disciplined **Soft** (`roundedness: 1`) profile. Rounded corners are intentional, controlled, and never bubble-like.

### Geometric Tokens
- **Micro UI (Badges, Buttons, Checkboxes, Channel Tabs):** 4px border-radius (`0.25rem`). Imparts an engineering-grade, tactile look.
- **Structural Cards, Code Blocks, Message Bubbles:** 8px border-radius (`0.5rem`). Balances modern softness with efficient grid packing.
- **Overlay Panels, Flyouts, Command Menus:** 12px border-radius (`0.75rem`). Distinguishes top-level floating elements from grid scaffolding.
- **Presence Indicators & Avatars:** Fully circular (`rounded-full` / 9999px) to contrast human elements against the architectural UI.

## Components

### Buttons
- **Primary:** Background `#4F46E5`, color `#FFFFFF`, border 1px solid `rgba(255, 255, 255, 0.15)`. On hover: `#4338CA`. Active: scale 0.98. Radius: 4px. Height: 32px (compact), 40px (standard).
- **Secondary / Ghost:** Transparent background, border 1px solid `rgba(255, 255, 255, 0.08)`, color `#CBD5E1`. On hover: surface `#1E2638`, border `rgba(255, 255, 255, 0.16)`.
- **Destructive:** Background `rgba(244, 63, 94, 0.1)`, border 1px solid `rgba(244, 63, 94, 0.3)`, color `#FB7185`. On hover: background `#F43F5E`, color `#FFFFFF`.

### Inputs & Composer
- **Message Input Canvas:** Borderless inline textarea wrapped inside a dedicated structural container (`#121826`) with a 1px border `rgba(255, 255, 255, 0.08)`. Focus-within triggers a subtle glow: border `rgba(79, 70, 229, 0.6)` and `box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.4)`. Contains dedicated action docks for attachments, code snippets, and audio clips.
- **Standard Input Fields:** Height 36px, typography `body-md`, background `#0D121F`, border 1px solid `rgba(255, 255, 255, 0.07)`, placeholder color `#475569`.

### Message Items & Stream
- **Bubbleless Default:** System defaults to Linear/Slack-style streamlined rows rather than bulky WhatsApp consumer speech bubbles. Author avatar (32px, circular), author name (`headline-sm`, 13px), timestamp (`label-xs`, `#64748B`), and body content (`body-md`).
- **Hover State:** Entire message row reveals an imperceptible surface tint (`rgba(255, 255, 255, 0.02)`) and activates an anchored floating micro-toolbar (Reactions, Reply in Thread, Bookmark, More).
- **Highlighted / Mentioned Row:** Left 2px vertical border accent in Primary (`#4F46E5`) with an ambient background tint of `rgba(79, 70, 229, 0.05)`.

### Chips & Filter Tags
- Height: 22px. Padding: 0 8px. Typography: `label-sm`.
- Static: Background `rgba(255, 255, 255, 0.04)`, border 1px solid `rgba(255, 255, 255, 0.06)`, text `#94A3B8`.
- Active Filter: Background `rgba(79, 70, 229, 0.15)`, border 1px solid `rgba(79, 70, 229, 0.4)`, text `#A5B4FC`.

### Channel & Thread Lists
- Height: 30px item rows. Typography: `body-sm`. Padding: 0 8px.
- Inactive: Text `#94A3B8`. Icon prefix (e.g., `#` or lock) tinted `#475569`.
- Active / Selected: Background `rgba(255, 255, 255, 0.06)`, text `#FFFFFF`, icon `#818CF8`.
- Unread Indicator: Crisp 6px circular dot in Secondary (`#06B6D4`) positioned to the left of the label.

### Command Palette (CMD + K / Quick Switcher)
- Centered modal dialog, 640px width.
- Backdrop: `rgba(4, 7, 13, 0.75)` with 8px blur.
- Instant search input with integrated JetBrains Mono keyboard badge (`ESC to close`, `↑↓ to navigate`).
- Grouped list items partitioned by subtle section dividers with category labels in `label-xs` uppercase tracking.