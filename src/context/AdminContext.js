'use client';
/**
 * AdminContext
 *
 * Who may edit, whether edit mode is on, and which editor is open.
 *
 * Live mode signs in with Firebase email/password. The account's role comes
 * from lib/access.js: the super admin email(s), or an `admins/{email}`
 * document written by the super admin (followed live, so permission changes
 * apply at once). Accounts with neither are signed out.
 *
 * Local mode (no Firebase)
 * offers a "local editor" whose changes stay in this browser only, so the
 * whole design can be tried before any backend exists.
 */
import { ALL_PERMS, adminDocId, can as canDo, canAnyList, canList as canDoList, isSuperEmail } from '@/lib/access';
import { FIREBASE_CONFIGURED, isForcedLocal } from '@/lib/store';
import { safeLocalStorage } from '@/lib/utils';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AdminContext = createContext(null);
const LOCAL_EDITOR_KEY = 'tfs:local-editor';
const EDIT_MODE_KEY = 'tfs:edit-mode';

export function AdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null); // { role: 'super' | 'admin', perms }
  const [authReady, setAuthReady] = useState(false);
  const [localEditor, setLocalEditor] = useState(false);
  const [editMode, setEditModeState] = useState(false);

  // Editors
  const [sectionEdit, setSectionEdit] = useState(null); // { pageId, sectionId, draft, isNew, index }
  const [itemEdit, setItemEdit] = useState(null); // { collection, item }
  const [addSection, setAddSection] = useState(null); // { pageId, index }
  const [pageSettings, setPageSettings] = useState(null); // pageId | 'new'

  const liveMode = FIREBASE_CONFIGURED && !isForcedLocalSafe();

  useEffect(() => {
    const ls = safeLocalStorage();
    if (!liveMode) {
      setLocalEditor(window.sessionStorage?.getItem(LOCAL_EDITOR_KEY) === '1');
      setAuthReady(true);
    }
    if (ls?.getItem(EDIT_MODE_KEY) === '1') setEditModeState(true);
  }, [liveMode]);

  useEffect(() => {
    if (!liveMode) return undefined;
    let unsub = () => {};
    let unsubRole = () => {};
    let cancelled = false;
    (async () => {
      try {
        const [{ getFirebase }, { onAuthStateChanged, signOut }, fsMod] = await Promise.all([
          import('@/lib/firebase'),
          import('firebase/auth'),
          import('firebase/firestore'),
        ]);
        const fb = getFirebase();
        if (!fb || cancelled) return setAuthReady(true);
        unsub = onAuthStateChanged(
          fb.auth,
          (u) => {
            unsubRole();
            unsubRole = () => {};
            // Unverified emails get no access (the database rules agree).
            if (!u || !u.emailVerified) {
              setUser(null);
              setAccess(null);
              return setAuthReady(true);
            }
            if (isSuperEmail(u.email)) {
              setUser(u);
              setAccess({ role: 'super', perms: ALL_PERMS });
              return setAuthReady(true);
            }
            // Admin: follow their access document so changes apply immediately.
            unsubRole = fsMod.onSnapshot(
              fsMod.doc(fb.db, 'admins', adminDocId(u.email)),
              (snap) => {
                const d = snap.exists() ? snap.data() : null;
                if (d && d.active !== false) {
                  setUser(u);
                  setAccess({ role: 'admin', perms: d.perms || {}, name: d.name || '' });
                } else {
                  setUser(null);
                  setAccess(null);
                  signOut(fb.auth).catch(() => {});
                }
                setAuthReady(true);
              },
              () => {
                setUser(null);
                setAccess(null);
                setAuthReady(true);
              }
            );
          },
          () => setAuthReady(true)
        );
      } catch {
        setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
      unsubRole();
    };
  }, [liveMode]);

  const isAdmin = liveMode ? Boolean(user && access) : localEditor;
  // The local editor (no Firebase) can do everything in their own browser.
  const effectiveAccess = useMemo(
    () => (liveMode ? access : localEditor ? { role: 'super', perms: ALL_PERMS } : null),
    [liveMode, access, localEditor]
  );

  const setEditMode = useCallback((on) => {
    setEditModeState(on);
    const ls = safeLocalStorage();
    if (on) ls?.setItem(EDIT_MODE_KEY, '1');
    else ls?.removeItem(EDIT_MODE_KEY);
    if (!on) {
      setSectionEdit(null);
      setAddSection(null);
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    const [{ getFirebase }, { signInWithEmailAndPassword, signOut, sendEmailVerification }, { doc, getDoc }] = await Promise.all([
      import('@/lib/firebase'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const fb = getFirebase();
    if (!fb) throw new Error('Firebase is not available.');
    const cred = await signInWithEmailAndPassword(fb.auth, email, password);
    if (!cred.user.emailVerified) {
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // Too many requests: a link was sent recently.
      }
      await signOut(fb.auth);
      throw new Error(`Please verify your email first. We sent a link to ${cred.user.email}; open it, then sign in again.`);
    }
    if (isSuperEmail(cred.user.email)) return cred.user;
    let allowed = false;
    try {
      const snap = await getDoc(doc(fb.db, 'admins', adminDocId(cred.user.email)));
      allowed = snap.exists() && snap.data().active !== false;
    } catch {
      allowed = false;
    }
    if (!allowed) {
      await signOut(fb.auth);
      throw new Error('This account has not been given editing access (or it is paused). Ask the site owner.');
    }
    return cred.user;
  }, []);

  const enterLocalEditor = useCallback(() => {
    window.sessionStorage?.setItem(LOCAL_EDITOR_KEY, '1');
    setLocalEditor(true);
  }, []);

  const signOutAll = useCallback(async () => {
    setEditMode(false);
    if (liveMode) {
      const [{ getFirebase }, { signOut }] = await Promise.all([import('@/lib/firebase'), import('firebase/auth')]);
      const fb = getFirebase();
      if (fb) await signOut(fb.auth);
    } else {
      window.sessionStorage?.removeItem(LOCAL_EDITOR_KEY);
      setLocalEditor(false);
    }
  }, [liveMode, setEditMode]);

  const value = useMemo(
    () => ({
      user,
      authReady,
      isAdmin,
      liveMode,
      access: effectiveAccess,
      isSuper: effectiveAccess?.role === 'super',
      can: (key) => canDo(effectiveAccess, key),
      canList: (key) => canDoList(effectiveAccess, key),
      canAnyList: () => canAnyList(effectiveAccess),
      editMode: isAdmin && editMode,
      setEditMode,
      signIn,
      signOut: signOutAll,
      enterLocalEditor,
      sectionEdit,
      setSectionEdit,
      itemEdit,
      openItemEditor: (collection, item = null) => setItemEdit({ collection, item }),
      closeItemEditor: () => setItemEdit(null),
      addSection,
      setAddSection,
      pageSettings,
      setPageSettings,
    }),
    [user, authReady, isAdmin, liveMode, effectiveAccess, editMode, setEditMode, signIn, signOutAll, enterLocalEditor, sectionEdit, itemEdit, addSection, pageSettings]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

function isForcedLocalSafe() {
  try {
    return isForcedLocal();
  } catch {
    return false;
  }
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}
