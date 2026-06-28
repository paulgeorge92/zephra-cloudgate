const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const releaseRoot = path.join(root, 'release');
const bundleName = `${pkg.name}-${pkg.version}-${process.platform}-${process.arch}`;
const bundleDir = path.join(releaseRoot, bundleName);

const requiredEntries = [
  'package.json',
  'package-lock.json',
  'prisma',
  'prisma.config.ts',
  'public',
  '.next',
  'dist-server',
  'scripts/init-sqlite.js',
  '.env.example'
];

function runBuildIfNeeded() {
  const hasNext = fs.existsSync(path.join(root, '.next'));
  const hasDist = fs.existsSync(path.join(root, 'dist-server'));
  if (hasNext && hasDist) {
    return;
  }

  console.log('Build outputs missing. Running `npm run build`...');
  execSync('npm run build', { stdio: 'inherit', cwd: root });
}

function removeExistingBundle() {
  if (fs.existsSync(bundleDir)) {
    console.log(`Removing existing bundle at ${bundleDir}`);
    fs.rmSync(bundleDir, { recursive: true, force: true });
  }
}

function copyEntry(entry) {
  const src = path.join(root, entry);
  const dest = path.join(bundleDir, entry);

  if (!fs.existsSync(src)) {
    throw new Error(`Required release entry not found: ${entry}`);
  }

  fs.cpSync(src, dest, { recursive: true, dereference: true });
}

function createBundleDir() {
  fs.mkdirSync(bundleDir, { recursive: true });
}

function writeRunScripts() {
  const sh = `#!/usr/bin/env bash
set -e

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 18+ and try again."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed. Install Node.js and try again."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "First-time setup..."
  echo "Installing production dependencies..."
  npm ci --production
  
  echo "Creating uploads directory..."
  mkdir -p data/uploads
  
  echo "Initializing SQLite database..."
  node scripts/init-sqlite.js
fi

echo "Starting Zephra CloudGate..."
npm start
`;

  const ps1 = `if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js is not installed. Install Node.js 18+ and try again.'
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error 'npm is not installed. Install Node.js and try again.'
  exit 1
}

if (-not (Test-Path 'node_modules')) {
  Write-Host 'First-time setup...'
  Write-Host 'Installing production dependencies...'
  npm ci --production
  
  Write-Host 'Creating uploads directory...'
  New-Item -ItemType Directory -Path data/uploads -Force | Out-Null
  
  Write-Host 'Initializing SQLite database...'
  node scripts/init-sqlite.js
}

Write-Host 'Starting Zephra CloudGate...'
npm start
`;

  fs.writeFileSync(path.join(bundleDir, 'run.sh'), sh, 'utf8');
  fs.chmodSync(path.join(bundleDir, 'run.sh'), 0o755);
  fs.writeFileSync(path.join(bundleDir, 'run.ps1'), ps1, 'utf8');
}

function writeReadme() {
  const content = `# Zephra CloudGate Release Bundle

This bundle contains the compiled production application artifacts needed to run Zephra CloudGate.

## Files included

- package.json
- package-lock.json
- prisma/
- prisma.config.ts
- public/
- .next/
- dist-server/
- scripts/init-sqlite.js
- .env.example
- run.sh / run.ps1 (first-time setup + start)
- start.sh / start.ps1 (start only)

## Setup (First time only)

1. Copy ".env.example" to ".env" and update the required values
2. Run the startup script (it will auto-detect first-time setup):
   - **Linux/macOS:** 
     \`\`\`bash
     ./run.sh
     \`\`\`
   - **Windows PowerShell:**
     \`\`\`powershell
     .\\run.ps1
     \`\`\`

The script will:
- Install production dependencies
- Create the uploads directory
- Initialize the SQLite database
- Start the app

## Starting the app (After setup)

After the first run, use the quick-start scripts:

    ./start.sh       # Linux/macOS
    .\\start.ps1     # Windows PowerShell

Or use npm start directly:

    npm start

Both will only start the app (no setup re-runs).

## Manual steps (if preferred)

Instead of using scripts:

    npm ci --production
    mkdir -p data/uploads
    node scripts/init-sqlite.js
    npm start

## Environment variables

Required values in ".env":

- **NODE_ENV**: production
- **PORT**: 3000 (or your preferred port)
- **HOST**: 0.0.0.0
- **DATABASE_URL**: file:./data/data.db (or absolute path)
- **UPLOADS_DIR**: ./data/uploads (or absolute path)
- **JWT_SECRET**: Generate a secure random string (min 32 chars)
- **ENCRYPTION_KEY**: 32-character hex string

## Logs and troubleshooting

After startup, the app logs will appear in the console. Check:

- http://localhost:3000 - main UI
- http://localhost:3000/api/v1 - API endpoint

If the app doesn't start, verify:

1. Node.js 18+ is installed: node --version
2. .env file exists and has valid values
3. data/uploads directory is writable
`;
  fs.writeFileSync(path.join(bundleDir, 'README_RUN.md'), content, 'utf8');
}

function writeDirectStartScripts() {
  const startSh = `#!/usr/bin/env bash
set -e

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 18+ and try again."
  exit 1
fi

echo "Starting Zephra CloudGate..."
npm start
`;

  const startPs1 = `if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js is not installed. Install Node.js 18+ and try again.'
  exit 1
}

Write-Host 'Starting Zephra CloudGate...'
npm start
`;

  fs.writeFileSync(path.join(bundleDir, 'start.sh'), startSh, 'utf8');
  fs.chmodSync(path.join(bundleDir, 'start.sh'), 0o755);
  fs.writeFileSync(path.join(bundleDir, 'start.ps1'), startPs1, 'utf8');
}

function createRelease() {
  runBuildIfNeeded();
  removeExistingBundle();
  createBundleDir();

  for (const entry of requiredEntries) {
    copyEntry(entry);
  }

  writeRunScripts();
  writeDirectStartScripts();
  writeReadme();

  console.log(`Release bundle created at ${bundleDir}`);
}

createRelease();
