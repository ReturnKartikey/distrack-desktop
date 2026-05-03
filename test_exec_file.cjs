const { execFile } = require('child_process');
const psScript = `Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json -Compress`;
execFile('powershell.exe', ['-NoProfile', '-NoLogo', '-NonInteractive', '-Command', psScript], { windowsHide: true }, (err, stdout, stderr) => {
  console.log('Err:', err);
  console.log('StdOut:', stdout.length);
  console.log('StdErr:', stderr);
});
