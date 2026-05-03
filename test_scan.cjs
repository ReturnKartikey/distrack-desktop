const { execFile } = require('child_process');

const psScript = `Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json`;
execFile('powershell.exe', [
  '-NoProfile', '-NoLogo', '-NonInteractive', '-Command', psScript
], { windowsHide: true, timeout: 10000 }, (err, stdout, stderr) => {
  if (err) {
    console.error('Error:', err.message);
  }
  console.log('STDOUT LENGTH:', stdout ? stdout.length : 0);
  try {
    const data = JSON.parse(stdout.trim());
    console.log('Parsed successfully, items:', Array.isArray(data) ? data.length : 1);
  } catch (e) {
    console.error('JSON parse error:', e.message);
    console.error('Raw stdout prefix:', stdout.substring(0, 100));
  }
});
