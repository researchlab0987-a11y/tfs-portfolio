/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Images are rendered with plain <img> through <SafeImage>, so any host works
  // and a broken URL degrades to a placeholder instead of a build error.
};
export default nextConfig;
