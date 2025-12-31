# Knob Component Implementation Plan

## Overview

Replace linear sliders with rotary knobs (similar to synthesizer controls) throughout the Formula Audio Lab UI.

## Component Specification

### Visual Design

```
        [0.35]          <- Current value (2 decimal max)

      ╭───────╮
    0 │   ●   │ 1       <- Min at 7 o'clock, Max at 5 o'clock
      │  ╱    │
      ╰───────╯
        0.5             <- Middle value at 12 o'clock (top)
```

- **Rotation range**: 270 degrees (from 7 o'clock to 5 o'clock, passing through 12 o'clock)
- **Dead zone**: 90 degrees at bottom (from 5 o'clock to 7 o'clock) - no rotation here
- **Indicator**: A line or notch from center pointing outward, showing current position
- **Value display**: Above the knob, formatted with max 2 decimal places

### Angle Mapping

```
Position    Angle (from top)    Value
─────────────────────────────────────
7 o'clock   -135° (225°)        min
12 o'clock   0°                 middle
5 o'clock   +135° (135°)        max
```

### Configurable Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Knob diameter |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `1` | Maximum value |
| `step` | `number` | `0.01` | Step increment |
| `value` | `number` | `0.5` | Initial value |
| `label` | `string` | `''` | Label text (optional) |
| `showTicks` | `boolean` | `true` | Show min/mid/max ticks |

### Size Presets

| Size | Diameter | Use Case |
|------|----------|----------|
| `sm` | 40px | Simple params (on/off-ish, low sensitivity) |
| `md` | 56px | Standard params (default) |
| `lg` | 72px | Sensitive/important params (gain, frequency) |

---

## Implementation Steps

### Step 1: Create Knob Component

**File**: `src/ui/components/Knob.ts`

```typescript
export interface KnobOptions {
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showTicks?: boolean;
  onChange?: (value: number) => void;
}

export function createKnob(options: KnobOptions): HTMLElement;
export function updateKnob(knob: HTMLElement, value: number): void;
```

**Implementation approach**:
- Use SVG for rendering (scalable, crisp at any size)
- Circle for knob body
- Line or triangle for indicator
- Text elements for value labels

### Step 2: Add Knob Styles

**File**: `src/styles/knob.css` (or add to `main.css`)

Styles needed:
- `.knob-wrap` - Container with flex column layout
- `.knob-value` - Value display above knob
- `.knob-svg` - The SVG element
- `.knob-body` - Circular knob background
- `.knob-indicator` - The rotation indicator line
- `.knob-tick` - Tick marks around perimeter
- `.knob-tick-label` - Min/mid/max labels
- Hover/active states for visual feedback
- Cursor styles for drag interaction

### Step 3: Implement Drag Interaction

**Interaction modes** (implement vertical drag - most intuitive):
- Mouse down on knob starts drag
- Moving mouse **up** increases value
- Moving mouse **down** decreases value
- Shift + drag for fine control (10x slower)
- Double-click to reset to default

**Events to handle**:
- `mousedown` / `touchstart` - Begin drag
- `mousemove` / `touchmove` - Update value (on document, not just knob)
- `mouseup` / `touchend` - End drag
- `dblclick` - Reset to default
- `wheel` - Optional scroll-to-adjust

### Step 4: Update FormulaCard Component

**File**: `src/ui/components/FormulaCard.ts`

Changes:
1. Import `createKnob`, `updateKnob`
2. Replace slider HTML generation with knob creation
3. Update layout from horizontal slider row to knob grid
4. Adjust `updateFormulaCard` to use `updateKnob`

**New layout** (formulas with many params):
```
┌─────────────────────────────────────────┐
│ ☑ Lorenz Attractor                   ▼  │
├─────────────────────────────────────────┤
│  [Gain]   [σ]     [ρ]     [β]          │
│   0.10    10     28    2.67             │
│                                         │
│  [Base f] [Freq]  [Amp]                │
│   120     40     0.25                   │
└─────────────────────────────────────────┘
```

### Step 5: Update Effects Panel

**File**: `src/index.ts` (or extract to separate effects UI file)

Changes:
1. Replace effect slider HTML with knob components
2. Update layout to grid of knobs per effect card
3. Wire up change handlers

### Step 6: Update Master Gain

Replace the master gain slider in topbar with a larger knob (size `lg`).

### Step 7: Remove Slider Styles

Clean up unused slider-related CSS:
- `.ctrl.with-adj` grid layout
- `.adj-btn` (plus/minus buttons)
- `input[type="range"]` styles

---

## File Structure

```
src/ui/components/
├── Knob.ts          <- NEW: Knob component
├── FormulaCard.ts   <- MODIFY: Use knobs instead of sliders
├── Oscilloscope.ts  <- No changes
└── index.ts         <- Export Knob

src/styles/
├── main.css         <- Add knob styles (or import knob.css)
└── knob.css         <- NEW (optional): Separate knob styles
```

---

## Technical Details

### SVG Structure

```svg
<svg class="knob-svg" viewBox="0 0 100 100" width="56" height="56">
  <!-- Background circle -->
  <circle class="knob-body" cx="50" cy="50" r="40" />

  <!-- Tick marks (min, mid, max) -->
  <line class="knob-tick" x1="15" y1="75" x2="22" y2="68" />  <!-- min -->
  <line class="knob-tick" x1="50" y1="10" x2="50" y2="18" />  <!-- mid -->
  <line class="knob-tick" x1="85" y1="75" x2="78" y2="68" />  <!-- max -->

  <!-- Indicator (rotates based on value) -->
  <line class="knob-indicator" x1="50" y1="50" x2="50" y2="18"
        transform="rotate(angle, 50, 50)" />
</svg>
```

### Value-to-Angle Conversion

```typescript
// Value (0-1 normalized) to angle in degrees
function valueToAngle(normalized: number): number {
  // -135 (7 o'clock) to +135 (5 o'clock)
  return -135 + normalized * 270;
}

// Angle to normalized value
function angleToValue(angleDeg: number): number {
  return (angleDeg + 135) / 270;
}

// Clamp to valid range
function clampAngle(angle: number): number {
  return Math.max(-135, Math.min(135, angle));
}
```

### Drag Sensitivity

```typescript
const SENSITIVITY = {
  normal: 0.5,    // degrees per pixel of mouse movement
  fine: 0.05,     // with Shift held
};
```

---

## Testing Checklist

- [ ] Knob renders correctly at all sizes (sm, md, lg)
- [ ] Value display updates in real-time during drag
- [ ] Min/mid/max labels positioned correctly
- [ ] Drag interaction works smoothly
- [ ] Shift+drag provides fine control
- [ ] Double-click resets to default
- [ ] Touch interaction works on mobile
- [ ] Keyboard accessibility (focus + arrow keys)
- [ ] All formula params work with knobs
- [ ] All effect params work with knobs
- [ ] State serialization still works (URL/localStorage)
- [ ] Performance is acceptable with many knobs visible

---

## Migration Order

1. Create `Knob.ts` component (standalone, testable)
2. Add knob CSS styles
3. Test knob in isolation
4. Update `FormulaCard.ts` to use knobs
5. Update effects panel controls
6. Update master gain control
7. Clean up old slider styles
8. Test full application
