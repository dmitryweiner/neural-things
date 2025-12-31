import { fmt } from '../dom';
import { createKnob, updateKnob, type KnobSize } from './Knob';
import type { FormulaConfig } from '../../types';

export interface FormulaCardCallbacks {
  onEnable: (id: string, enabled: boolean) => void;
  onParamChange: (id: string, param: string, value: number) => void;
  onReset: (id: string) => void;
}

/**
 * Determine knob size based on parameter type
 * - Gain parameters get large knobs (most important)
 * - Frequency parameters get medium knobs
 * - Other parameters get small knobs
 */
function getKnobSize(paramKey: string): KnobSize {
  if (paramKey === 'gain') return 'lg';
  if (paramKey.includes('freq') || paramKey.includes('Freq') || paramKey === 'f' || paramKey === 'fc' || paramKey === 'fm' || paramKey === 'f0' || paramKey === 'fbeat' || paramKey === 'fd' || paramKey === 'fq') return 'md';
  return 'sm';
}

/**
 * Creates the UI for a single formula card
 */
export function createFormulaCard(
  formula: FormulaConfig,
  callbacks: FormulaCardCallbacks
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'formula';
  wrap.dataset.formulaId = formula.id;

  const resetHtml = formula.hasReset
    ? `
      <div class="sep"></div>
      <div class="row">
        <button id="reset_${formula.id}" disabled>Reset state</button>
      </div>`
    : '';

  wrap.innerHTML = `
    <div class="fhead">
      <div>
        <h3>
          <input type="checkbox" id="en_${formula.id}">
          ${formula.title}
        </h3>
        <div class="small">${formula.desc}</div>
      </div>
      <div class="factions">
        <button class="collapseBtn" id="col_${formula.id}" type="button">▼</button>
      </div>
    </div>

    <div class="fbody" id="body_${formula.id}">
      <div class="knobs-grid" id="knobs_${formula.id}"></div>${resetHtml}
    </div>
  `;

  const knobsHost = wrap.querySelector(`#knobs_${formula.id}`)!;

  // Create knobs for each slider parameter
  for (const s of formula.sliders) {
    const knobId = `${formula.id}_${s.k}`;
    const size = getKnobSize(s.k);

    const knob = createKnob({
      id: knobId,
      min: s.min,
      max: s.max,
      step: s.step,
      value: s.value,
      size,
      label: s.name,
      showTicks: size !== 'sm', // Hide ticks on small knobs
      onChange: (value) => {
        callbacks.onParamChange(formula.id, s.k, value);
      },
    });

    knobsHost.appendChild(knob);
  }

  // Wire up events
  const enableCheckbox = wrap.querySelector<HTMLInputElement>(
    `#en_${formula.id}`
  )!;
  const collapseBtn = wrap.querySelector(`#col_${formula.id}`)!;
  const body = wrap.querySelector(`#body_${formula.id}`)!;
  const resetBtn = wrap.querySelector<HTMLButtonElement>(
    `#reset_${formula.id}`
  );

  // Enable/disable
  enableCheckbox.addEventListener('change', () => {
    callbacks.onEnable(formula.id, enableCheckbox.checked);
  });

  // Collapse/expand
  collapseBtn.addEventListener('click', () => {
    const collapsed = !body.classList.contains('collapsed');
    body.classList.toggle('collapsed', collapsed);
    collapseBtn.textContent = collapsed ? '▶' : '▼';
  });

  // Reset
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      callbacks.onReset(formula.id);
    });
  }

  return wrap;
}

/**
 * Update formula card state
 */
export function updateFormulaCard(
  container: HTMLElement,
  id: string,
  enabled: boolean,
  params: Record<string, number>
): void {
  const card = container.querySelector(`[data-formula-id="${id}"]`);
  if (!card) return;

  const enableCheckbox = card.querySelector<HTMLInputElement>(`#en_${id}`);
  if (enableCheckbox) {
    enableCheckbox.checked = enabled;
  }

  // Update active highlight
  card.classList.toggle('active', enabled);

  // Update knobs
  for (const [key, value] of Object.entries(params)) {
    const knob = card.querySelector(`[data-knob-id="${id}_${key}"]`) as HTMLElement;
    if (knob) {
      updateKnob(knob, value);
    }
  }

  // Update reset button
  const resetBtn = card.querySelector<HTMLButtonElement>(`#reset_${id}`);
  if (resetBtn) {
    resetBtn.disabled = !enabled;
  }

  // Auto-collapse/expand based on enabled state
  const body = card.querySelector(`#body_${id}`);
  const colBtn = card.querySelector(`#col_${id}`);
  if (body && colBtn) {
    if (enabled && body.classList.contains('collapsed')) {
      body.classList.remove('collapsed');
      colBtn.textContent = '▼';
    } else if (!enabled && !body.classList.contains('collapsed')) {
      body.classList.add('collapsed');
      colBtn.textContent = '▶';
    }
  }
}
