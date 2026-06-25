import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client has native bindings — keep it external so it's traced into
  // the serverless function rather than bundled.
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
