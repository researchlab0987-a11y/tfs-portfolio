'use client';
/**
 * DATA STORE
 * src/lib/store.js
 *
 * One in-memory store that every page reads from. It is filled in layers, so
 * the site always has something real to show:
 *
 *   1. SEED    - the content bundled in src/data/seed.js. Rendered on the
 *                server and on first paint. Never empty.
 *   2. CACHE   - the last good copy saved in this browser (localStorage).
 *                Applied immediately on load, before the network answers.
 *   3. LIVE    - Firestore snapshots. Replace the above as they arrive and
 *                are written back to the cache.
 *
 * If Firebase is not configured, blocked, over quota, or slow, the store just
 * stays on the best layer it has; nothing on the public site waits on it.
 *
 * MODES
 *   live  - Firebase configured. Edits are written to Firestore.
 *   local - No Firebase (or forced from the dashboard). Edits are saved in
 *           this browser and can be exported/pushed later from Admin > Data.
 *
 * BIN
 *   Deleting a tab or a list entry only marks it with `deletedAt`; it moves
 *   to `state.bin` (Dashboard > Bin) and can be restored. Removing it for
 *   good ("purge") needs the editor's password (components/ui/PasswordGate)
 *   and, in live mode, firestore.rules only allows deletes shortly after the
 *   password was entered.
 *
 * Firestore layout
 *   site/config   one document: theme, navigation, footer, contact, socials
 *   site/schema   one document: collection definitions (your content types)
 *   pages/{slug}  one document per tab, holding its ordered sections
 *   items/{id}    every content item, tagged with `collection`
 *   messages/{id} contact form submissions
 */
import { useMemo, useSyncExternalStore } from 'react';
import seed from '@/data/seed';
import { clone, compareValues, deepMerge, safeLocalStorage, stripUndefined, uid } from './utils';

const CACHE_KEY = 'tfs:data:v1';
const LOCAL_FLAG = 'tfs:force-local';
const LOCAL_MESSAGES = 'tfs:messages:v1';
const WRITE_TIMEOUT = 10000;
const CONNECT_TIMEOUT = 8000;

export const FIREBASE_CONFIGURED = Boolean(
  process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID
);

const byId = (list) => Object.fromEntries((list || []).map((d) => [d.id, d]));

/** Separate binned documents (deletedAt set) from live ones. */
function splitBin(map) {
  const live = {};
  const bin = {};
  Object.values(map || {}).forEach((d) => ((d.deletedAt ? bin : live)[d.id] = d));
  return [live, bin];
}

function seedData() {
  return {
    config: clone(seed.config),
    schema: clone(seed.schema),
    pages: byId(clone(seed.pages)),
    items: byId(clone(seed.items)),
  };
}

const INITIAL = {
  ...seedData(),
  bin: { pages: {}, items: {} },
  status: {
    mode: FIREBASE_CONFIGURED ? 'live' : 'local',
    source: 'seed', // seed | cache | live
    connected: false,
    slow: false,
    error: null,
    empty: {}, // parts that do not exist in Firestore yet
    pending: 0,
    lastSync: null,
  },
};

let state = INITIAL;
const listeners = new Set();
let started = false;

function emit() {
  listeners.forEach((l) => l());
}
function setState(patch) {
  state = { ...state, ...patch };
  emit();
}
function setStatus(patch) {
  setState({ status: { ...state.status, ...patch } });
}

export const getState = () => state;
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

function readCache() {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.pages || !data?.items) return null;
    return data;
  } catch {
    return null;
  }
}

let cacheTimer;
function writeCache() {
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => {
    const ls = safeLocalStorage();
    if (!ls) return;
    try {
      const { config, schema, pages, items, bin } = state;
      ls.setItem(
        CACHE_KEY,
        JSON.stringify({ config, schema, pages: { ...pages, ...bin.pages }, items: { ...items, ...bin.items }, savedAt: Date.now() })
      );
    } catch (err) {
      // Quota exceeded: the site still works, only the offline copy is stale.
      console.warn('[store] cache write skipped:', err?.message);
    }
  }, 400);
}

export function clearCache() {
  safeLocalStorage()?.removeItem(CACHE_KEY);
}

/* ------------------------------------------------------------------ */
/* Normalising remote data against the seed                            */
/* ------------------------------------------------------------------ */

const normalizeConfig = (remote) => deepMerge(clone(seed.config), remote || {});
/**
 * Fields added to built-in collections after sites were already published.
 * Each runs once: the missing fields are appended to the saved schema (the
 * owner's own fields and changes are kept), and the id is recorded so a field
 * the owner later deletes does not come back.
 */
const SCHEMA_MIGRATIONS = [{ id: 'collaborator-bio', collection: 'collaborators', fields: ['photo', 'bio', 'interests', 'email'] }];

function migrateCollections(collections, done) {
  const out = clone(collections);
  SCHEMA_MIGRATIONS.forEach((m) => {
    const target = out[m.collection];
    const source = seed.schema.collections?.[m.collection];
    if (done.includes(m.id) || !target || !source) return;
    const have = new Set((target.fields || []).map((f) => f.key));
    const add = source.fields.filter((f) => m.fields.includes(f.key) && !have.has(f.key));
    // Keep a trailing link field last, as in the seed.
    const fields = [...(target.fields || [])];
    const linkAt = fields.findIndex((f) => f.role === 'link');
    if (linkAt >= 0) fields.splice(linkAt, 0, ...add);
    else fields.push(...add);
    target.fields = fields;
  });
  return out;
}

const normalizeSchema = (remote) => ({
  ...clone(seed.schema),
  ...(remote || {}),
  collections: remote?.collections ? migrateCollections(remote.collections, remote.migrations || []) : clone(seed.schema.collections),
  migrations: SCHEMA_MIGRATIONS.map((m) => m.id),
});

/* ------------------------------------------------------------------ */
/* Firebase access                                                     */
/* ------------------------------------------------------------------ */

async function firestore() {
  if (state.status.mode !== 'live') return null;
  try {
    const [{ getFirebase }, fs] = await Promise.all([import('./firebase'), import('firebase/firestore')]);
    const fb = getFirebase();
    if (!fb) return null;
    return { db: fb.db, fs };
  } catch (err) {
    setStatus({ error: 'Firebase failed to load.' });
    return null;
  }
}

export function isForcedLocal() {
  return safeLocalStorage()?.getItem(LOCAL_FLAG) === '1';
}
export function setForcedLocal(on) {
  const ls = safeLocalStorage();
  if (!ls) return;
  if (on) ls.setItem(LOCAL_FLAG, '1');
  else ls.removeItem(LOCAL_FLAG);
}

/* ------------------------------------------------------------------ */
/* Start-up                                                            */
/* ------------------------------------------------------------------ */

export function initStore() {
  if (started || typeof window === 'undefined') return;
  started = true;

  const mode = FIREBASE_CONFIGURED && !isForcedLocal() ? 'live' : 'local';
  const cached = readCache();

  const [cachedPages, binPages] = splitBin(cached?.pages);
  const [cachedItems, binItems] = splitBin(cached?.items);
  setState({
    ...(cached
      ? {
          config: normalizeConfig(cached.config),
          schema: normalizeSchema(cached.schema),
          pages: cachedPages,
          items: cachedItems,
          bin: { pages: binPages, items: binItems },
        }
      : {}),
    status: { ...state.status, mode, source: cached ? 'cache' : 'seed' },
  });

  if (mode === 'live') connect();
}

async function connect() {
  const conn = await firestore();
  if (!conn) {
    setStatus({ error: 'Could not start Firebase. Showing saved content.' });
    return;
  }
  const { db, fs } = conn;
  const { doc, collection, onSnapshot } = fs;

  const slowTimer = setTimeout(() => {
    if (!state.status.connected) setStatus({ slow: true });
  }, CONNECT_TIMEOUT);

  const onLive = (part, patch, empty) => {
    clearTimeout(slowTimer);
    setState({
      ...patch,
      status: {
        ...state.status,
        source: 'live',
        connected: true,
        slow: false,
        error: null,
        lastSync: Date.now(),
        empty: { ...state.status.empty, [part]: Boolean(empty) },
      },
    });
    writeCache();
  };

  const onError = (part) => (err) => {
    console.warn(`[store] ${part} listener failed:`, err?.code || err?.message);
    setStatus({ error: friendlyError(err), connected: false });
  };

  const opts = { includeMetadataChanges: false };

  onSnapshot(
    doc(db, 'site', 'config'),
    opts,
    (snap) => onLive('config', snap.exists() ? { config: normalizeConfig(snap.data()) } : {}, !snap.exists()),
    onError('config')
  );
  onSnapshot(
    doc(db, 'site', 'schema'),
    opts,
    (snap) => onLive('schema', snap.exists() ? { schema: normalizeSchema(snap.data()) } : {}, !snap.exists()),
    onError('schema')
  );
  onSnapshot(
    collection(db, 'pages'),
    opts,
    (snap) => {
      if (snap.empty) return onLive('pages', {}, true);
      const all = {};
      snap.forEach((d) => (all[d.id] = { ...d.data(), id: d.id }));
      const [pages, binned] = splitBin(all);
      onLive('pages', { pages, bin: { ...state.bin, pages: binned } }, false);
    },
    onError('pages')
  );
  onSnapshot(
    collection(db, 'items'),
    opts,
    (snap) => {
      if (snap.empty) return onLive('items', {}, true);
      const all = {};
      snap.forEach((d) => (all[d.id] = { ...d.data(), id: d.id }));
      const [items, binned] = splitBin(all);
      onLive('items', { items, bin: { ...state.bin, items: binned } }, false);
    },
    onError('items')
  );
}

export function friendlyError(err) {
  const code = err?.code || '';
  if (code.includes('permission-denied')) return 'Permission denied. Check that your email is allowed in firestore.rules.';
  if (code.includes('unavailable')) return 'The database is unreachable right now.';
  if (code.includes('resource-exhausted')) return 'Firebase quota reached for today.';
  if (code.includes('unauthenticated')) return 'Sign in again to save changes.';
  return err?.message || 'Something went wrong with the database.';
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/** Resolves with { queued: true } if the server has not answered in time. */
function withTimeout(promise) {
  return Promise.race([
    promise.then(() => ({ queued: false })),
    new Promise((resolve) => setTimeout(() => resolve({ queued: true }), WRITE_TIMEOUT)),
  ]);
}

/**
 * Apply a change locally at once, then persist it. If persisting fails the
 * local change is rolled back and the error is rethrown for a toast.
 */
async function commit(patch, remote) {
  const previous = { config: state.config, schema: state.schema, pages: state.pages, items: state.items, bin: state.bin };
  setState(patch);
  writeCache();

  if (state.status.mode !== 'live') return { mode: 'local', queued: false };

  setStatus({ pending: state.status.pending + 1 });
  try {
    const conn = await firestore();
    if (!conn) throw new Error('Firebase is not available. Your change was not saved.');
    const result = await withTimeout(remote(conn));
    return { mode: 'live', ...result };
  } catch (err) {
    setState(previous);
    writeCache();
    throw new Error(friendlyError(err));
  } finally {
    setStatus({ pending: Math.max(0, state.status.pending - 1) });
  }
}

/** Write every document of a part that has never been saved to Firestore. */
async function ensureSeeded(conn, part) {
  if (!state.status.empty[part]) return;
  const { db, fs } = conn;
  const docs = Object.values(state[part]);
  for (let i = 0; i < docs.length; i += 400) {
    const batch = fs.writeBatch(db);
    docs.slice(i, i + 400).forEach(({ id, ...rest }) => batch.set(fs.doc(db, part, id), stripUndefined(rest)));
    await batch.commit();
  }
  setStatus({ empty: { ...state.status.empty, [part]: false } });
}

export function saveConfig(config) {
  return commit({ config }, ({ db, fs }) => fs.setDoc(fs.doc(db, 'site', 'config'), stripUndefined(config)));
}

export function saveSchema(schema) {
  return commit({ schema }, ({ db, fs }) => fs.setDoc(fs.doc(db, 'site', 'schema'), stripUndefined(schema)));
}

/** Bin patch without these ids (a saved document is live again). */
function unbin(part, ids) {
  if (!ids.some((id) => state.bin[part][id])) return {};
  const next = { ...state.bin[part] };
  ids.forEach((id) => delete next[id]);
  return { bin: { ...state.bin, [part]: next } };
}

export function savePage(page, { previousId } = {}) {
  const pages = { ...state.pages, [page.id]: page };
  if (previousId && previousId !== page.id) delete pages[previousId];
  return commit({ pages, ...unbin('pages', [page.id]) }, async (conn) => {
    await ensureSeeded(conn, 'pages');
    const { db, fs } = conn;
    const { id, ...rest } = page;
    const batch = fs.writeBatch(db);
    batch.set(fs.doc(db, 'pages', id), stripUndefined(rest));
    if (previousId && previousId !== id) batch.delete(fs.doc(db, 'pages', previousId));
    return batch.commit();
  });
}

export function savePages(list) {
  const pages = { ...state.pages };
  list.forEach((p) => (pages[p.id] = p));
  return commit({ pages, ...unbin('pages', list.map((p) => p.id)) }, async (conn) => {
    await ensureSeeded(conn, 'pages');
    const { db, fs } = conn;
    const batch = fs.writeBatch(db);
    list.forEach(({ id, ...rest }) => batch.set(fs.doc(db, 'pages', id), stripUndefined(rest)));
    return batch.commit();
  });
}

/** Move a tab to the Bin (restorable). */
export function deletePage(id) {
  const page = state.pages[id];
  if (!page) return Promise.resolve();
  const pages = { ...state.pages };
  delete pages[id];
  const binned = { ...page, deletedAt: Date.now() };
  return commit({ pages, bin: { ...state.bin, pages: { ...state.bin.pages, [id]: binned } } }, async (conn) => {
    await ensureSeeded(conn, 'pages');
    const { id: _id, ...rest } = binned;
    return conn.fs.setDoc(conn.fs.doc(conn.db, 'pages', id), stripUndefined(rest));
  });
}

/** Bring a tab back from the Bin. */
export function restorePage(id) {
  const page = state.bin.pages[id];
  if (!page) return Promise.resolve();
  if (state.pages[id]) return Promise.reject(new Error(`A tab with the address /${id} already exists. Rename that one first.`));
  const { deletedAt, ...clean } = page;
  const bin = { ...state.bin, pages: { ...state.bin.pages } };
  delete bin.pages[id];
  return commit({ pages: { ...state.pages, [id]: clean }, bin }, (conn) => {
    const { id: _id, ...rest } = clean;
    return conn.fs.setDoc(conn.fs.doc(conn.db, 'pages', id), stripUndefined(rest));
  });
}

/** Delete binned tabs for good. Ask for the password first (PasswordGate). */
export function purgePages(ids) {
  const bin = { ...state.bin, pages: { ...state.bin.pages } };
  ids.forEach((id) => delete bin.pages[id]);
  return commit({ bin }, async ({ db, fs }) => {
    for (let i = 0; i < ids.length; i += 400) {
      const batch = fs.writeBatch(db);
      ids.slice(i, i + 400).forEach((id) => batch.delete(fs.doc(db, 'pages', id)));
      await batch.commit();
    }
  });
}

export function newItemId(collectionKey) {
  return uid(String(collectionKey || 'item').slice(0, 4));
}

export function saveItem(item) {
  const now = Date.now();
  const full = {
    ...item,
    id: item.id || newItemId(item.collection),
    createdAt: item.createdAt || now,
    updatedAt: now,
  };
  const { deletedAt, ...clean } = full;
  return commit({ items: { ...state.items, [clean.id]: clean }, ...unbin('items', [clean.id]) }, async (conn) => {
    await ensureSeeded(conn, 'items');
    const { id, ...rest } = clean;
    return conn.fs.setDoc(conn.fs.doc(conn.db, 'items', id), stripUndefined(rest));
  }).then((r) => ({ ...r, id: clean.id }));
}

export function saveItems(list) {
  const items = { ...state.items };
  list.forEach((it) => (items[it.id] = it));
  return commit({ items }, async (conn) => {
    await ensureSeeded(conn, 'items');
    const { db, fs } = conn;
    for (let i = 0; i < list.length; i += 400) {
      const batch = fs.writeBatch(db);
      list.slice(i, i + 400).forEach(({ id, ...rest }) => batch.set(fs.doc(db, 'items', id), stripUndefined(rest)));
      await batch.commit();
    }
  });
}

/** Move a list entry to the Bin (restorable). */
export function deleteItem(id) {
  const item = state.items[id];
  if (!item) return Promise.resolve();
  const items = { ...state.items };
  delete items[id];
  const binned = { ...item, deletedAt: Date.now() };
  return commit({ items, bin: { ...state.bin, items: { ...state.bin.items, [id]: binned } } }, async (conn) => {
    await ensureSeeded(conn, 'items');
    const { id: _id, ...rest } = binned;
    return conn.fs.setDoc(conn.fs.doc(conn.db, 'items', id), stripUndefined(rest));
  });
}

/** Bring list entries back from the Bin. */
export function restoreItems(ids) {
  const items = { ...state.items };
  const bin = { ...state.bin, items: { ...state.bin.items } };
  const restored = [];
  ids.forEach((id) => {
    const it = bin.items[id];
    if (!it) return;
    const { deletedAt, ...clean } = it;
    items[id] = clean;
    restored.push(clean);
    delete bin.items[id];
  });
  return commit({ items, bin }, async ({ db, fs }) => {
    for (let i = 0; i < restored.length; i += 400) {
      const batch = fs.writeBatch(db);
      restored.slice(i, i + 400).forEach(({ id, ...rest }) => batch.set(fs.doc(db, 'items', id), stripUndefined(rest)));
      await batch.commit();
    }
  });
}

/**
 * Delete list entries for good (from the Bin, or live ones when a whole list
 * is deleted). Ask for the password first (PasswordGate).
 */
export function purgeItems(ids) {
  const items = { ...state.items };
  const bin = { ...state.bin, items: { ...state.bin.items } };
  ids.forEach((id) => {
    delete items[id];
    delete bin.items[id];
  });
  return commit({ items, bin }, async (conn) => {
    await ensureSeeded(conn, 'items');
    const { db, fs } = conn;
    for (let i = 0; i < ids.length; i += 400) {
      const batch = fs.writeBatch(db);
      ids.slice(i, i + 400).forEach((id) => batch.delete(fs.doc(db, 'items', id)));
      await batch.commit();
    }
  });
}

/**
 * Replace everything — used by Import and by "Publish to Firestore".
 * Documents in Firestore that are not in `data` are deleted.
 */
export async function replaceAll(data) {
  const next = {
    config: normalizeConfig(data.config),
    schema: normalizeSchema(data.schema),
    pages: data.pages && !Array.isArray(data.pages) ? data.pages : byId(data.pages),
    items: data.items && !Array.isArray(data.items) ? data.items : byId(data.items),
  };
  const removedPages = Object.keys(state.pages).filter((id) => !next.pages[id]);
  const removedItems = Object.keys(state.items).filter((id) => !next.items[id]);

  return commit(next, async ({ db, fs }) => {
    const ops = [
      ['site', 'config', next.config],
      ['site', 'schema', next.schema],
      ...Object.values(next.pages).map(({ id, ...rest }) => ['pages', id, rest]),
      ...Object.values(next.items).map(({ id, ...rest }) => ['items', id, rest]),
    ];
    const deletes = [...removedPages.map((id) => ['pages', id]), ...removedItems.map((id) => ['items', id])];
    for (let i = 0; i < ops.length; i += 400) {
      const batch = fs.writeBatch(db);
      ops.slice(i, i + 400).forEach(([c, id, d]) => batch.set(fs.doc(db, c, id), stripUndefined(d)));
      await batch.commit();
    }
    for (let i = 0; i < deletes.length; i += 400) {
      const batch = fs.writeBatch(db);
      deletes.slice(i, i + 400).forEach(([c, id]) => batch.delete(fs.doc(db, c, id)));
      await batch.commit();
    }
    setStatus({ empty: {} });
  });
}

/**
 * Remove ALL content from the database (live) or this browser (local):
 * settings, tabs, list entries, the Bin and messages. The site then shows the
 * bundled starting content. Ask for the password first (PasswordGate).
 */
export async function eraseEverything() {
  if (state.status.mode === 'live') {
    const conn = await firestore();
    if (!conn) throw new Error('Firebase is not available.');
    const { db, fs } = conn;
    const refs = [];
    for (const name of ['site', 'pages', 'items', 'messages']) {
      const snap = await fs.getDocs(fs.collection(db, name));
      snap.forEach((d) => refs.push(d.ref));
    }
    for (let i = 0; i < refs.length; i += 400) {
      const batch = fs.writeBatch(db);
      refs.slice(i, i + 400).forEach((r) => batch.delete(r));
      await batch.commit();
    }
  } else {
    safeLocalStorage()?.removeItem(LOCAL_MESSAGES);
  }
  clearCache();
  setState({ ...seedData(), bin: { pages: {}, items: {} }, status: { ...state.status, empty: { config: true, schema: true, pages: true, items: true } } });
}

export function exportData() {
  const { config, schema, pages, items } = state;
  return { version: 1, exportedAt: new Date().toISOString(), config, schema, pages, items };
}

export const seedSnapshot = () => seedData();

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

function readLocalMessages() {
  try {
    return JSON.parse(safeLocalStorage()?.getItem(LOCAL_MESSAGES) || '[]');
  } catch {
    return [];
  }
}
function writeLocalMessages(list) {
  try {
    safeLocalStorage()?.setItem(LOCAL_MESSAGES, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export async function sendMessage(message) {
  const payload = {
    name: String(message.name || '').slice(0, 190),
    email: String(message.email || '').slice(0, 190),
    subject: String(message.subject || '').slice(0, 300),
    message: String(message.message || '').slice(0, 4900),
    createdAt: Date.now(),
    read: false,
  };
  if (state.status.mode !== 'live') {
    writeLocalMessages([{ id: uid('msg'), ...payload }, ...readLocalMessages()]);
    return { mode: 'local' };
  }
  const conn = await firestore();
  if (!conn) throw new Error('offline');
  const result = await withTimeout(conn.fs.addDoc(conn.fs.collection(conn.db, 'messages'), payload));
  return { mode: 'live', ...result };
}

/** Admin inbox. Returns an unsubscribe function. */
export function watchMessages(onData, onError) {
  if (state.status.mode !== 'live') {
    onData(readLocalMessages());
    return () => {};
  }
  let unsub = () => {};
  let cancelled = false;
  firestore().then((conn) => {
    if (!conn || cancelled) return onError?.(new Error('Database unavailable.'));
    const { fs, db } = conn;
    unsub = fs.onSnapshot(
      fs.query(fs.collection(db, 'messages'), fs.orderBy('createdAt', 'desc')),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => onError?.(new Error(friendlyError(err)))
    );
  });
  return () => {
    cancelled = true;
    unsub();
  };
}

export async function updateMessage(id, patch) {
  if (state.status.mode !== 'live') {
    writeLocalMessages(readLocalMessages().map((m) => (m.id === id ? { ...m, ...patch } : m)));
    return;
  }
  const conn = await firestore();
  if (!conn) throw new Error('Database unavailable.');
  await conn.fs.updateDoc(conn.fs.doc(conn.db, 'messages', id), patch);
}

export async function removeMessage(id) {
  if (state.status.mode !== 'live') {
    writeLocalMessages(readLocalMessages().filter((m) => m.id !== id));
    return;
  }
  const conn = await firestore();
  if (!conn) throw new Error('Database unavailable.');
  await conn.fs.deleteDoc(conn.fs.doc(conn.db, 'messages', id));
}

/* ------------------------------------------------------------------ */
/* React hooks                                                         */
/* ------------------------------------------------------------------ */

function useSlice(selector) {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(INITIAL)
  );
}

export const useConfig = () => useSlice((s) => s.config);
export const useSchema = () => useSlice((s) => s.schema);
export const useStatus = () => useSlice((s) => s.status);
export const usePagesMap = () => useSlice((s) => s.pages);
export const useBin = () => useSlice((s) => s.bin);
export const useItemsMap = () => useSlice((s) => s.items);

export function usePages({ includeHidden = false } = {}) {
  const pages = usePagesMap();
  return useMemo(
    () =>
      Object.values(pages)
        .filter((p) => includeHidden || !p.hidden)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [pages, includeHidden]
  );
}

export function usePage(id) {
  const pages = usePagesMap();
  return pages[id] || null;
}

export function useCollectionDef(key) {
  const schema = useSchema();
  return schema.collections?.[key] || null;
}

export function sortItems(list, sort) {
  const field = sort?.field || 'order';
  const dir = sort?.dir === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => {
    const primary = compareValues(a[field], b[field]) * dir;
    if (primary !== 0) return primary;
    return compareValues(a.order, b.order);
  });
}

export function useCollectionItems(key, { includeHidden = false, sort } = {}) {
  const items = useItemsMap();
  const def = useCollectionDef(key);
  return useMemo(() => {
    const list = Object.values(items).filter((it) => it.collection === key && (includeHidden || !it.hidden));
    return sortItems(list, sort || def?.defaultSort);
  }, [items, key, includeHidden, sort, def]);
}
