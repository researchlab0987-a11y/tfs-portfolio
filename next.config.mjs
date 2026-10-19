/** @type {import('next').NextConfig} */

/*
 * Settings the app reads at build time. They are written into the browser
 * bundle because the browser itself talks to Firebase (web config) and
 * Cloudinary (unsigned upload preset). None of them is a secret: data is
 * protected by firestore.rules, not by hiding the Firebase web key.
 *
 * Plain names (FIREBASE_API_KEY …) are used; the older NEXT_PUBLIC_… names
 * still work as a fallback.
 */
const PUBLIC_SETTINGS = [
  'SITE_URL',
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_APP_ID',
  'SUPER_ADMIN_EMAILS',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_UPLOAD_PRESET',
];
const pick = (name) => process.env[name] || process.env[`NEXT_PUBLIC_${name}`] || '';

const nextConfig = {
  reactStrictMode: true,
  // Images are rendered with plain <img> through <SafeImage>, so any host works
  // and a broken URL degrades to a placeholder instead of a build error.
  env: Object.fromEntries(PUBLIC_SETTINGS.map((n) => [n, pick(n)])),
};
export default nextConfig;
