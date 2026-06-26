import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ancora la root del workspace a questa cartella: evita che Next scelga
  // un lockfile esterno (es. C:\Users\User\package-lock.json) come root.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
