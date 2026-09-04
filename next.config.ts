import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'tbt.sonty.cc',
    '*.sonty.cc',
    'local',
    '*.local',
    '192.168.1.125',
    '127.0.0.1',
    'localhost',
  ],
};

export default nextConfig;
