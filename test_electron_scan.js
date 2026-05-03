const { app, ipcMain } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

app.whenReady().then(() => {
  const psScript = `Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json -Compress`;
  
  console.log('Testing execFile in Electron...');
  execFile('powershell.exe', [
    '-NoProfile', '-NoLogo', '-NonInteractive', '-Command', psScript
  ], { windowsHide: true, timeout: 10000 }, (err, stdout, stderr) => {
    console.log('Err:', err ? err.message : null);
    console.log('Stdout length:', stdout ? stdout.length : 0);
    console.log('Stderr:', stderr);
    app.quit();
  });
});
