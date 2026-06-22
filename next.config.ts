import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lastfm.freetls.fastly.net" },
      { protocol: "https", hostname: "*.last.fm" },
      { protocol: "https", hostname: "coverartarchive.org" },
      { protocol: "https", hostname: "*.coverartarchive.org" },
      { protocol: "https", hostname: "archive.org" },
      { protocol: "https", hostname: "*.archive.org" },
    ],
  },
};

export default nextConfig;
