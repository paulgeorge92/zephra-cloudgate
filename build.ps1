# Unified Build Script for Zephra CloudGate

$ErrorActionPreference = "Stop"

Write-Host "--- Starting Unified Build ---" -ForegroundColor Cyan
$ProdPath = Join-Path $PSScriptRoot "dist"
$PreservedDbPath = Join-Path $PSScriptRoot ".build-preserved-db"

# 1. Prepare Root Dist
Write-Host "Preparing Production folder..."
if (Test-Path $PreservedDbPath) {
    Remove-Item -Recurse -Force $PreservedDbPath -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $PreservedDbPath -Force | Out-Null

if (Test-Path $ProdPath) {
    $dbPatterns = @("*.db", "*.db-wal", "*.db-shm")
    $dbFiles = Get-ChildItem -Path $ProdPath -Recurse -File -Include $dbPatterns -ErrorAction SilentlyContinue

    foreach ($dbFile in $dbFiles) {
        $relativePath = $dbFile.FullName.Substring($ProdPath.Length).TrimStart('\', '/')
        $backupPath = Join-Path $PreservedDbPath $relativePath
        $backupDir = Split-Path $backupPath -Parent

        if ($backupDir) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }

        Copy-Item -LiteralPath $dbFile.FullName -Destination $backupPath -Force
    }

    if ($dbFiles.Count -gt 0) {
        Write-Host "Preserved $($dbFiles.Count) existing database file(s) from dist."
    }
}

if (Test-Path $ProdPath) { 
    Remove-Item -Recurse -Force $ProdPath -ErrorAction SilentlyContinue
    if (Test-Path $ProdPath) {
        Write-Host "Warning: Could not fully remove $ProdPath (likely locked). Attempting to clean contents..."
        Get-ChildItem -Path $ProdPath | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
}
New-Item -ItemType Directory -Path $ProdPath -Force
New-Item -ItemType Directory -Path $ProdPath/backend -Force
New-Item -ItemType Directory -Path $ProdPath/frontend -Force

if (Test-Path $PreservedDbPath) {
    $preservedDbFiles = Get-ChildItem -Path $PreservedDbPath -Recurse -File -ErrorAction SilentlyContinue

    foreach ($dbFile in $preservedDbFiles) {
        $relativePath = $dbFile.FullName.Substring($PreservedDbPath.Length).TrimStart('\', '/')
        $restorePath = Join-Path $ProdPath $relativePath
        $restoreDir = Split-Path $restorePath -Parent

        if ($restoreDir) {
            New-Item -ItemType Directory -Path $restoreDir -Force | Out-Null
        }

        Copy-Item -LiteralPath $dbFile.FullName -Destination $restorePath -Force
    }

    if ($preservedDbFiles.Count -gt 0) {
        Write-Host "Restored $($preservedDbFiles.Count) existing database file(s) to dist."
    }

    Remove-Item -Recurse -Force $PreservedDbPath -ErrorAction SilentlyContinue
}

# 2. Build Backend
Write-Host "Building Backend..."
Set-Location backend
npm run build
Set-Location ..

Write-Host "Extracting Backend to $ProdPath/backend..."
Copy-Item -Path backend/dist/* -Destination $ProdPath/backend -Recurse -Force
Copy-Item -Path backend/package.json -Destination $ProdPath/backend -Force

# Explicitly include Prisma schema
Write-Host "Including Prisma schema..."
Copy-Item -Path backend/prisma -Destination $ProdPath/backend/prisma -Recurse -Force

# Include Prisma Config as JS for production compatibility (Prisma 7)
Write-Host "Generating Prisma config JS for $ProdPath..."
$distPrismaConfig = @'
const path = require('path');
const dotenv = require('dotenv');

// Load .env from dist root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

module.exports = {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'file:./data.db',
  },
};
'@
$distPrismaConfig | Out-File -FilePath $ProdPath/backend/prisma.config.js -Encoding utf8
$distPrismaConfig | Out-File -FilePath $ProdPath/prisma.config.js -Encoding utf8

# 3. Build Frontend
Write-Host "Building Frontend..."
Set-Location frontend
npm run build
Set-Location ..

Write-Host "Extracting Frontend to $ProdPath/frontend..."
# For Next.js, we need .next, public, and package.json
Copy-Item -Path frontend/.next -Destination $ProdPath/frontend -Recurse -Force
Copy-Item -Path frontend/public -Destination $ProdPath/frontend -Recurse -Force
Copy-Item -Path frontend/package.json -Destination $ProdPath/frontend -Force

# 4. Shared Folder
Write-Host "Including Shared folder..."
if (Test-Path "shared") {
    Copy-Item -Path shared -Destination $ProdPath/shared -Recurse -Force
}

# 5. Shared Configuration
Write-Host "Creating shared .env and package.json in dist..."
Copy-Item -Path .env -Destination $ProdPath/.env -Force

$distPackageJson = @'
{
  "name": "zephra-cloudgate",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "setup": "npm install --omit=dev && cd backend && npm install --omit=dev && cd .. && npx prisma generate --schema backend/prisma/schema.prisma && npx prisma db push --schema backend/prisma/schema.prisma && cd frontend && npm install --omit=dev && cd ..",
    "start:backend": "node -e \"require('dotenv').config({path: './.env'}); require('./backend/main.js')\"",
    "start:frontend": "node -e \"require('dotenv').config({path: './.env'}); const { spawn } = require('child_process'); spawn('npx', ['next', 'start', '-p', process.env.FRONTEND_PORT], { stdio: 'inherit', shell: true, cwd: 'frontend' });\"",
    "start": "concurrently \"npm run start:backend\" \"npm run start:frontend\""
  },
  "dependencies": {
    "prisma": "^7.5.0",
    "@prisma/client": "^7.5.0",
    "dotenv": "^17.3.1",
    "concurrently": "^8.2.2"
  }
}
'@
$distPackageJson | Out-File -FilePath $ProdPath/package.json -Encoding utf8

Write-Host "--- Build Complete! ---" -ForegroundColor Green
Write-Host "Unified build is located in the top-level 'dist' folder." -ForegroundColor White
Write-Host "Structure:"
Write-Host "  dist/.env           <- Shared config"
Write-Host "  dist/backend/       <- NestJS production code + prisma schema"
Write-Host "  dist/backend/uploads/ <- Dynamically created uploads folder"
Write-Host "  dist/frontend/      <- Next.js production bundle"
Write-Host "  dist/shared/        <- Shared logic and types"
