/**
 * Who may do what.
 *
 * Super admin: the emails in NEXT_PUBLIC_SUPER_ADMIN_EMAILS (and in
 * firestore.rules). Can do everything, including managing admins.
 *
 * Admins: one Firestore document per admin, `admins/{lower-case email}`:
 *   { email, name, active: true, perms: { sections, tabs, lists, design, messages, purge, backup, content: 'all' | [listKeys] }, updatedAt }
 * Only the super admin can read the whole collection or write it; an admin
 * can read only their own document. firestore.rules enforces the same
 * permissions on every write, so hiding buttons is a convenience, not the
 * security.
 */

export const SUPER_ADMINS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || 'abdullahalmazid.bd@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isSuperEmail = (email) => SUPER_ADMINS.includes(String(email || '').toLowerCase());

/** Permissions the super admin can give an admin, in the order shown. */
export const PERMISSIONS = [
  { key: 'sections', label: 'Edit sections on pages', help: 'Change text, images and layout of sections; add, move, hide and delete sections.' },
  { key: 'tabs', label: 'Manage tabs', help: 'Add, rename, reorder, hide and delete tabs, and change tab settings.' },
  { key: 'lists', label: 'Change list structure', help: 'Create new lists and change their fields (for example add a “DOI” field).' },
  { key: 'design', label: 'Design and site details', help: 'Theme, colours, fonts, menu, motion, pointer, contact details, profile links and footer.' },
  { key: 'messages', label: 'Contact messages', help: 'Read, mark and reply to messages from the contact form.' },
  { key: 'purge', label: 'Delete permanently', help: 'Empty the Bin and delete forever (always asks for their password).' },
  { key: 'backup', label: 'Download backups', help: 'Download a copy of all content. Restoring backups stays with the super admin.' },
];

export const NO_PERMS = { sections: false, tabs: false, lists: false, design: false, messages: false, purge: false, backup: false, content: [] };
export const ALL_PERMS = { sections: true, tabs: true, lists: true, design: true, messages: true, purge: true, backup: true, content: 'all' };

/** Sensible starting point for a new admin: content editing only. */
export const DEFAULT_ADMIN_PERMS = { ...NO_PERMS, sections: true, content: 'all' };

/** access = { role: 'super' | 'admin', perms } or null */
export function can(access, key) {
  if (!access) return false;
  if (access.role === 'super') return true;
  return Boolean(access.perms?.[key]);
}

export function canList(access, listKey) {
  if (!access) return false;
  if (access.role === 'super') return true;
  const c = access.perms?.content;
  return c === 'all' || (Array.isArray(c) && c.includes(listKey));
}

export function canAnyList(access) {
  if (!access) return false;
  if (access.role === 'super') return true;
  const c = access.perms?.content;
  return c === 'all' || (Array.isArray(c) && c.length > 0);
}

export const adminDocId = (email) => String(email || '').trim().toLowerCase();

/**
 * Whether a dashboard section is shown. `admin` is the AdminContext value
 * (isSuper, can, canAnyList). Sections a role cannot use are not rendered at
 * all, so admins never see what the super admin controls.
 */
export function sectionAllowed(id, admin) {
  if (!admin) return false;
  if (admin.isSuper) return true;
  switch (id) {
    case 'overview':
      return true;
    case 'tabs':
      return admin.can('tabs');
    case 'content':
      return admin.canAnyList() || admin.can('lists');
    case 'design':
      return admin.can('design');
    case 'messages':
      return admin.can('messages');
    case 'data':
      return admin.can('backup');
    case 'bin':
      return admin.can('sections') || admin.can('tabs') || admin.canAnyList();
    default:
      return false; // access and anything else: super admin only
  }
}
