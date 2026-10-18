/**
 * Section operations on a page. Every change rewrites the page document with
 * its new `sections` array, so order and content always save together.
 */
import { savePage } from './store';
import { clone, move, uid } from './utils';

const save = (page, sections) => savePage({ ...page, sections });

export function moveSection(page, id, dir) {
  const i = page.sections.findIndex((s) => s.id === id);
  if (i < 0) return Promise.resolve();
  return save(page, move(page.sections, i, i + dir));
}

export function duplicateSection(page, id) {
  const i = page.sections.findIndex((s) => s.id === id);
  if (i < 0) return Promise.resolve();
  const copy = clone(page.sections[i]);
  copy.id = uid('s');
  const next = [...page.sections];
  next.splice(i + 1, 0, copy);
  return save(page, next);
}

export function toggleSectionHidden(page, id) {
  return save(page, page.sections.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)));
}

const TRASH_MAX = 10;

/**
 * Delete a section, keeping it in the tab's "Recently deleted" list
 * (`page.trash`, newest first, last 10) so it can be restored later.
 */
export function removeSection(page, id) {
  const index = page.sections.findIndex((s) => s.id === id);
  if (index < 0) return Promise.resolve();
  const entry = { section: clone(page.sections[index]), index, deletedAt: Date.now() };
  return savePage({
    ...page,
    sections: page.sections.filter((s) => s.id !== id),
    trash: [entry, ...(page.trash || [])].slice(0, TRASH_MAX),
  });
}

/** Put a deleted section back (at `at`, or where it was) and take it out of the bin. */
export function restoreSection(page, deletedAt, at) {
  const entry = (page.trash || []).find((t) => t.deletedAt === deletedAt);
  if (!entry) return Promise.reject(new Error('That section is no longer in Recently deleted.'));
  const section = clone(entry.section);
  if (page.sections.some((s) => s.id === section.id)) section.id = uid('s');
  const next = [...page.sections];
  next.splice(Math.min(at ?? entry.index, next.length), 0, section);
  return savePage({ ...page, sections: next, trash: (page.trash || []).filter((t) => t.deletedAt !== deletedAt) });
}

/** Empty one entry from the bin for good. */
export function forgetDeleted(page, deletedAt) {
  return savePage({ ...page, trash: (page.trash || []).filter((t) => t.deletedAt !== deletedAt) });
}

export function upsertSection(page, section, index) {
  const exists = page.sections.some((s) => s.id === section.id);
  if (exists) return save(page, page.sections.map((s) => (s.id === section.id ? section : s)));
  const next = [...page.sections];
  next.splice(index ?? next.length, 0, section);
  return save(page, next);
}

/** Copy a section to another page (appended at the end). */
export function copySectionTo(targetPage, section) {
  const copy = clone(section);
  copy.id = uid('s');
  return save(targetPage, [...targetPage.sections, copy]);
}
