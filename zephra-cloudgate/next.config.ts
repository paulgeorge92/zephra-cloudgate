import type { NextConfig } from "next";
import * as dotenv from 'dotenv';
import * as path from 'path';

import * as fs from 'fs';

// Load shared .env - handle both dev (../../.env) and prod (../.env)
const paths = [
  path.resolve(process.cwd(), '.env'),         // Local
  path.resolve(process.cwd(), '..', '.env'),   // Root in Dist
  path.resolve(process.cwd(), '..', '..', '.env') // Root in Dev
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
