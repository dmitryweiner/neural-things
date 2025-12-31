/**
 * DOM utility functions
 */

/**
 * Query selector shorthand with optional type parameter
 */
export function $<T extends HTMLElement = HTMLElement>(selector: string): T | null {
  return document.querySelector(selector) as T | null;
}

/**
 * Query selector that throws if element not found
 */
export function $require<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector(selector) as T | null;
  if (!el) {
    throw new Error(`Element not found: ${selector}`);
  }
  return el;
}

/**
 * Format a numeric value for display
 * - Values >= 100: integer
 * - Values >= 10: 2 decimal places
 * - Values < 10: 3 decimal places
 */
export function fmt(v: number): string {
  v = Number(v);
  if (Math.abs(v) >= 100) return String(Math.round(v));
  if (Math.abs(v) >= 10) return v.toFixed(2);
  return v.toFixed(3);
}

/**
 * Create an HTML element with attributes and children
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }
  return el;
}
