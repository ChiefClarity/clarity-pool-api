console.log("Starting Clarity Pool Platform...");
console.log("Launching API server...");

const { spawn } = require('child_process');
const path = require('path');

// Change to API directory and start the server
const apiPath = path.join(__dirname, 'apps', 'api');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const apiProcess = spawn(npm, ['run', 'start:dev'], {
  cwd: apiPath,
  stdio: 'inherit',
  shell: true
});

apiProcess.on('error', (error) => {
  console.error('Failed to start API:', error);
});

apiProcess.on('close', (code) => {
  console.log(`API process exited with code ${code}`);
});