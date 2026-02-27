#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log('\n' + '='.repeat(60));
console.log(`${colors.cyan}  🚀 Starting SocialHive Platform${colors.reset}`);
console.log('='.repeat(60) + '\n');

// Start backend
console.log(`${colors.blue}[BACKEND]${colors.reset} Starting backend server...`);
const backendCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
const backend = spawn(backendCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Wait a bit then start frontend
setTimeout(() => {
  console.log(`\n${colors.magenta}[FRONTEND]${colors.reset} Starting frontend server...\n`);
  const frontendCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
  const frontend = spawn(frontendCmd, ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
  });

  // Open browser after frontend starts
  setTimeout(() => {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.green}✨ SocialHive Platform is Ready!${colors.reset}`);
    console.log('='.repeat(60));
    console.log(`\n${colors.cyan}🌐 Frontend:${colors.reset} http://localhost:5173`);
    console.log(`${colors.blue}🔧 Backend:${colors.reset}  http://localhost:5000\n`);
    console.log(`${colors.yellow}📝 Opening browser...${colors.reset}\n`);
    
    // Open browser
    const openCmd = os.platform() === 'win32' ? 'start' :
                    os.platform() === 'darwin' ? 'open' : 'xdg-open';
    require('child_process').exec(`${openCmd} http://localhost:5173`);
  }, 8000);

  frontend.on('exit', (code) => {
    if (code !== 0) {
      console.log(`${colors.yellow}Frontend exited with code ${code}${colors.reset}`);
    }
    process.exit(code);
  });
}, 3000);

backend.on('exit', (code) => {
  if (code !== 0) {
    console.log(`${colors.yellow}Backend exited with code ${code}${colors.reset}`);
  }
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}🛑 Shutting down SocialHive Platform...${colors.reset}`);
  backend.kill();
  process.exit(0);
});

