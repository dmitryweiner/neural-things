/**
 * Rotary Knob Component
 * A synthesizer-style rotary control with SVG rendering
 */

export type KnobSize = 'sm' | 'md' | 'lg';

export interface KnobOptions {
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  size?: KnobSize;
  label?: string;
  showTicks?: boolean;
  onChange?: (value: number) => void;
}

// Size configurations
const SIZE_CONFIG: Record<KnobSize, { diameter: number; fontSize: number; labelSize: number }> = {
  sm: { diameter: 40, fontSize: 10, labelSize: 8 },
  md: { diameter: 56, fontSize: 11, labelSize: 9 },
  lg: { diameter: 72, fontSize: 13, labelSize: 10 },
};

// Rotation range: -135 (7 o'clock) to +135 (5 o'clock) = 270 degrees
const MIN_ANGLE = -135;
const MAX_ANGLE = 135;
const ANGLE_RANGE = MAX_ANGLE - MIN_ANGLE;

// Drag sensitivity (degrees per pixel)
const SENSITIVITY = {
  normal: 1.5,
  fine: 0.15, // With Shift key
};

/**
 * Convert normalized value (0-1) to rotation angle
 */
function valueToAngle(normalized: number): number {
  return MIN_ANGLE + normalized * ANGLE_RANGE;
}

/**
 * Convert rotation angle to normalized value (0-1)
 */
function angleToValue(angle: number): number {
  const clamped = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angle));
  return (clamped - MIN_ANGLE) / ANGLE_RANGE;
}

/**
 * Format value for display (max 2 decimal places, smart formatting)
 */
function formatValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

/**
 * Format tick label (shorter format for min/mid/max)
 */
function formatTickLabel(value: number): string {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Math.abs(value) >= 10) return value.toFixed(1);
  if (Math.abs(value) >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

/**
 * Create a knob component
 */
export function createKnob(options: KnobOptions): HTMLElement {
  const {
    id,
    min,
    max,
    step,
    value,
    size = 'md',
    label,
    showTicks = true,
    onChange,
  } = options;

  const config = SIZE_CONFIG[size];
  const midValue = (min + max) / 2;

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = `knob-wrap knob-${size}`;
  wrapper.dataset.knobId = id;

  // Create label (if provided)
  const labelHtml = label ? `<div class="knob-label">${label}</div>` : '';

  // Calculate initial angle
  const normalized = (value - min) / (max - min);
  const angle = valueToAngle(normalized);

  // SVG viewBox is 100x100 for easy calculations
  const svgContent = createKnobSVG(angle, min, midValue, max, showTicks);

  wrapper.innerHTML = `
    ${labelHtml}
    <div class="knob-value" id="${id}_display">${formatValue(value)}</div>
    <div class="knob-container">
      ${svgContent}
      ${showTicks ? `
        <span class="knob-tick-label knob-tick-min">${formatTickLabel(min)}</span>
        <span class="knob-tick-label knob-tick-mid">${formatTickLabel(midValue)}</span>
        <span class="knob-tick-label knob-tick-max">${formatTickLabel(max)}</span>
      ` : ''}
    </div>
  `;

  // Store state on element
  const state = {
    value,
    min,
    max,
    step,
    defaultValue: value,
    isDragging: false,
    startY: 0,
    startValue: 0,
  };

  // Get elements
  const svg = wrapper.querySelector('svg')!;
  const indicator = svg.querySelector('.knob-indicator') as SVGLineElement;
  const valueDisplay = wrapper.querySelector('.knob-value')!;

  // Update function
  const updateKnobValue = (newValue: number, fireChange = true) => {
    // Clamp and snap to step
    newValue = Math.max(min, Math.min(max, newValue));
    newValue = Math.round(newValue / step) * step;
    // Fix floating point issues
    newValue = Number(newValue.toFixed(10));

    if (newValue === state.value) return;

    state.value = newValue;
    const normalized = (newValue - min) / (max - min);
    const angle = valueToAngle(normalized);

    // Update indicator rotation
    indicator.setAttribute('transform', `rotate(${angle}, 50, 50)`);
    valueDisplay.textContent = formatValue(newValue);

    if (fireChange && onChange) {
      onChange(newValue);
    }
  };

  // Mouse/touch drag handling
  const handleDragStart = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    state.isDragging = true;
    state.startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    state.startValue = state.value;
    wrapper.classList.add('dragging');
    document.body.style.cursor = 'ns-resize';
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!state.isDragging) return;

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = state.startY - clientY; // Inverted: up = increase

    const sensitivity = (e as MouseEvent).shiftKey ? SENSITIVITY.fine : SENSITIVITY.normal;
    const deltaAngle = deltaY * sensitivity;
    const deltaValue = (deltaAngle / ANGLE_RANGE) * (max - min);

    updateKnobValue(state.startValue + deltaValue);
  };

  const handleDragEnd = () => {
    if (!state.isDragging) return;
    state.isDragging = false;
    wrapper.classList.remove('dragging');
    document.body.style.cursor = '';
  };

  // Double-click to reset
  const handleDoubleClick = () => {
    updateKnobValue(state.defaultValue);
  };

  // Mouse wheel support
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const sensitivity = e.shiftKey ? 0.1 : 1;
    const delta = -Math.sign(e.deltaY) * step * sensitivity * 5;
    updateKnobValue(state.value + delta);
  };

  // Attach events
  svg.addEventListener('mousedown', handleDragStart);
  svg.addEventListener('touchstart', handleDragStart, { passive: false });
  svg.addEventListener('dblclick', handleDoubleClick);
  svg.addEventListener('wheel', handleWheel, { passive: false });

  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('touchmove', handleDragMove, { passive: false });
  document.addEventListener('mouseup', handleDragEnd);
  document.addEventListener('touchend', handleDragEnd);

  // Store update function and state for external access
  (wrapper as any)._knobState = state;
  (wrapper as any)._updateValue = updateKnobValue;

  return wrapper;
}

/**
 * Create the SVG markup for a knob
 */
function createKnobSVG(
  angle: number,
  min: number,
  mid: number,
  max: number,
  showTicks: boolean
): string {
  // Tick positions (on the circle at radius 42, viewBox is 100x100 centered at 50,50)
  const tickMarkup = showTicks
    ? `
      <!-- Tick marks -->
      <line class="knob-tick" x1="18" y1="82" x2="24" y2="76" />
      <line class="knob-tick" x1="50" y1="8" x2="50" y2="16" />
      <line class="knob-tick" x1="82" y1="82" x2="76" y2="76" />
    `
    : '';

  return `
    <svg class="knob-svg" viewBox="0 0 100 100">
      <!-- Outer ring / track -->
      <circle class="knob-track" cx="50" cy="50" r="42" />

      <!-- Main knob body -->
      <circle class="knob-body" cx="50" cy="50" r="36" />

      <!-- Inner shadow/highlight -->
      <circle class="knob-inner" cx="50" cy="50" r="28" />

      ${tickMarkup}

      <!-- Indicator line -->
      <line
        class="knob-indicator"
        x1="50" y1="50"
        x2="50" y2="20"
        transform="rotate(${angle}, 50, 50)"
      />

      <!-- Center dot -->
      <circle class="knob-center" cx="50" cy="50" r="4" />
    </svg>
  `;
}

/**
 * Update a knob's value programmatically
 */
export function updateKnob(knob: HTMLElement, value: number): void {
  const updateFn = (knob as any)._updateValue;
  if (updateFn) {
    updateFn(value, false); // Don't fire onChange for programmatic updates
  }
}

/**
 * Get the current value of a knob
 */
export function getKnobValue(knob: HTMLElement): number {
  const state = (knob as any)._knobState;
  return state ? state.value : 0;
}
