/** Small, dependency-free helpers shared across the app. */

export const cx = (...parts) => parts.filter(Boolean).join(' ');

let counter = 0;
export function uid(prefix = 'id') {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${counter.toString(36)}`;
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0980-\u09ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Deep merge where `over` wins; arrays are replaced, not merged. */
export function deepMerge(base, over) {
  if (!isPlainObject(base) || !isPlainObject(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = isPlainObject(v) && isPlainObject(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

export function getIn(obj, path, fallback) {
  if (!path) return obj;
  const value = String(path)
    .split('.')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  return value === undefined ? fallback : value;
}

/** Immutable set by dotted path. */
export function setIn(obj, path, value) {
  const keys = String(path).split('.');
  const root = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cur = root;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) {
      cur[key] = value;
    } else {
      const next = cur[key];
      cur[key] = Array.isArray(next) ? [...next] : { ...(isPlainObject(next) ? next : {}) };
      cur = cur[key];
    }
  });
  return root;
}

/** Firestore rejects `undefined` anywhere in a document. */
export function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined).filter((v) => v !== undefined);
  if (isPlainObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

export function move(arr, from, to) {
  const copy = [...arr];
  if (to < 0 || to >= copy.length) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function toTags(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function compareValues(a, b) {
  const na = typeof a === 'number' ? a : Number(a);
  const nb = typeof b === 'number' ? b : Number(b);
  if (a !== '' && b !== '' && a != null && b != null && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });
}

export function isExternal(href) {
  return /^(https?:)?\/\//i.test(href || '') || /^mailto:|^tel:/i.test(href || '');
}

export function safeLocalStorage() {
  try {
    if (typeof window === 'undefined') return null;
    const k = '__t';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
