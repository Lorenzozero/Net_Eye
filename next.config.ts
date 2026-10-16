import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ancora la root del workspace a questa cartella: evita che Next scelga
  // un lockfile esterno (es. C:\Users\User\package-lock.json) come root.
  turbopack: {
    root: import.meta.dirname,
  },
  // Output "standalone": .next/standalone contiene un server minimale con solo le
  // dipendenze di produzione effettivamente usate (no devDependencies, no sorgenti).
  // Usato dal Dockerfile.frontend multi-stage per un'immagine molto più piccola
  // (da ~1.6GB a poche centinaia di MB) — vedi quella build per i dettagli.
  output: "standalone",
};

export default nextConfig;
