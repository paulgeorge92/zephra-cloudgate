const { spawn, spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  NODE_ENV: 'development',
  TS_NODE_PROJECT: path.join(root, 'tsconfig.server.json'),
  TS_NODE_TRANSPILE_ONLY: 'true',
};

const init = spawnSync(process.execPath, ['scripts/init-sqlite.js'], {
  cwd: root,
  env,
  stdio: 'inherit',
});

if (init.status !== 0) {
  process.exit(init.status || 1);
}

const child = spawn(
  process.execPath,
  [
    '--watch',
    '--watch-path=server',
    '-r',
    'ts-node/register/transpile-only',
    'server/index.ts',
  ],
  {
    cwd: root,
    env,
    stdio: 'inherit',
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Killing Process ${process.pid}`)
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code || 0);
});
