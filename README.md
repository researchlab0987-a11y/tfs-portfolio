# Dr. Tahsina Farah Sanam — website

A fully editable academic website. Every tab, section, colour, font and piece of content can be changed from the browser. Built with Next.js 14, Tailwind CSS and Firebase.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

It works immediately without Firebase. The site shows the bundled content (from `src/data/seed.js`), and `/login` opens a **local editor** whose changes are saved in your browser only.

## Connect Firebase

1. Create a Firebase project. Enable **Authentication → Email/Password** and add the super admin's user. Create a **Firestore** database.
2. Copy `.env.example` to `.env.local` and fill in the Firebase web-app keys. `NEXT_PUBLIC_SUPER_ADMIN_EMAILS` is the super admin (full control). `.env.local` is git-ignored: never commit it.
3. Put the same super admin email in `isSuper()` in `firestore.rules` and publish the rules: `firebase deploy --only firestore:rules` (run inside this folder).
4. Run the site, sign in at `/login` (the first time you are asked to verify your email), then **Dashboard → Data and backups → Publish** once to upload the starting content.
5. **Dashboard → Access** (super admin only): add admins, choose what each may edit (sections, tabs, which lists, design, messages, permanent delete, backups) and email them a link to set their password. The database rules enforce the same permissions.

Optional: for image hosting, create an **unsigned upload preset** in Cloudinary and add `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`. Without it, images are compressed and stored inside the site data.

Deploy to Vercel as usual, add the same environment variables there, and add the domain under Firebase Authentication → Settings → Authorized domains.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for how everything fits together.

## When Firebase fails

Content is loaded in three layers, so visitors always see the site:

| Layer | When it is used |
| --- | --- |
| Bundled content | First paint, and whenever nothing better is available. Also rendered on the server, so search engines see real text. |
| Browser copy | The last content this browser received from Firebase, shown instantly on return visits and when Firebase is unreachable. |
| Live Firestore | Replaces the above as soon as it answers. |

Other safeguards:

- Saves appear on screen immediately. If Firebase rejects a save, it is undone and the reason is shown.
- If Firebase does not confirm a save within 10 seconds, the editor is told the change is saved on this device and will sync later.
- If the contact form cannot send, the visitor is offered an email link with their message already filled in.
- An image whose link breaks turns into a neat placeholder with initials.
- A section that fails to render disappears for visitors instead of breaking the page. Editors see what went wrong.
- **Dashboard → Data** has backups (download and restore), a reset to the starting content, and a **local mode** for working offline and publishing later.

## Editing

Sign in at `/login`. A dark bar appears at the bottom of every page.

**On the site (Edit page):**

- Hover a section for its toolbar: **Edit**, move up or down, duplicate, hide, delete.
- **Add section here** appears between sections. Choose from 17 templates, or copy any section from another tab.
- The section editor has four tabs: **Content**, **Heading**, **Design** (background tone, custom colour, gradient or image, accent override, spacing, width, height, text size, corners, lines, entrance motion) and **Advanced** (anchor id, hide on phones or desktops, CSS classes, custom CSS, copy to another tab). Changes preview live and are saved only when you press Save.
- Items inside lists have a pencil button to edit and an eye button to hide or show.
- **+ Tab** in the menu bar creates a new tab. **Tab settings** at the top of each page renames it, changes its address or title band, hides it, or deletes it.

**Dashboard (`/admin`):**

- **Tabs**: order, menu visibility and settings.
- **Content**: every collection (publications, awards, experience and more). Add, edit, reorder, hide, duplicate or delete items. Under **Fields** you can add fields to a collection, or create a brand-new collection (for example *Talks* or *Courses*). It is immediately available in every list layout.
- **Design**: 8 themes, every colour, heading and body fonts, text size, corner roundness, page width, menu, side-panel side and width, site details, contact details, profile links and footer.
- **Messages**: contact-form inbox.
- **Data and backups**.

## Section types

| Type | What it does |
| --- | --- |
| Introduction | Photo (shape, side, width), name, titles, bio, buttons, keywords and profile links. 80% of the window height by default. |
| Content list | Any collection in six layouts: citation list, list, cards, timeline, compact rows or photo wall. Items can be filtered, hand-picked, sorted, limited and grouped, with search and filter buttons. Clicking an item opens it in the side panel. |
| Text and image | Markdown text, an image on any side, and a key-facts box. |
| Free layout | Blocks: heading, text, image, buttons, quote, checklist, cards, columns, video or embed, divider, spacer and HTML. |
| Numbers | Live counts from collections, or fixed figures. |
| Contact | Details, message form and map. |

Every button can open a tab in the side panel, go to a tab, scroll to an anchor, open a link, or start an email.

## The side panel

Items and tabs open in a panel from the left, at 75% of the window width by default.

- Drag its edge (or focus it and use the arrow keys) to resize it, and double-click the edge to reset.
- Its URL (`?view=item:…` or `?view=page:…`) can be shared.
- The browser back button and Escape both close it.

The side and default width can be changed under Design.

## Project map

```
src/data/seed.js          starting content (all of Dr. Sanam's data)
src/lib/store.js          data layer: seed → browser copy → Firestore, saves
src/lib/sections.js       section types, design options, blocks, templates
src/lib/themes.js         themes and fonts
src/lib/roles.js          how collection fields map onto layouts; citations
src/components/sections/  the six section renderers
src/components/page/      PageView, SectionFrame (design settings), toolbar
src/components/drawer/    the side panel and item detail
src/components/editor/    section editor, form fields, dialogs
src/components/admin/     dashboard panels
```

To add a design option, add one line to `STYLE_FIELDS` in `src/lib/sections.js` and read it in `SectionFrame.js`. To add a section type, add an entry to `KINDS` and a component to `src/components/sections/index.js`.
