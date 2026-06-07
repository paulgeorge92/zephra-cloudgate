import { NextResponse } from 'next/server';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Discovery: Find the root .env file regardless of where the app is started from
  // In the new unified structure, it is always at the root.
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),         // Root dir (if started from root)
    path.resolve(process.cwd(), '..', '.env'),   // Parent dir (if started from frontend/)
    path.resolve(process.cwd(), '..', '..', '.env') // Grandparent (deep dev structure)
  ];

  let rootEnvPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      rootEnvPath = p;
      break;
    }
  }

  let runtimeApiUrl = null;
  let backendPort = '5000';

  if (rootEnvPath) {
    try {
      const envContent = fs.readFileSync(rootEnvPath, 'utf8');
      const envConfig = dotenv.parse(envContent);
      
      if (envConfig.NEXT_PUBLIC_API_URL) runtimeApiUrl = envConfig.NEXT_PUBLIC_API_URL;
      if (envConfig.BACKEND_PORT) backendPort = envConfig.BACKEND_PORT;
      
      // Auto-generate URL if port is set but URL is missing
      if (!runtimeApiUrl && backendPort) {
        runtimeApiUrl = `http://localhost:${backendPort}`;
      }
    } catch (e) {
      console.error('[Config Bridge] Error parsing .env file:', e);
    }
  }

  // Final fallback to process.env only if file lookup failed
  if (!runtimeApiUrl) {
    runtimeApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  }

  return NextResponse.json({
    apiUrl: runtimeApiUrl,
    backendPort: backendPort,
    frontendPort: process.env.FRONTEND_PORT || '3000'
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
