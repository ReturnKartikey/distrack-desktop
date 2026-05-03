const { spawn } = require('child_process');

const PS_SCRIPT = `
Add-Type -MemberDefinition '
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
' -Name 'U' -Namespace 'W' -ErrorAction SilentlyContinue

while($true) {
  $h=[W.U]::GetForegroundWindow()
  $p=[uint32]0
  [W.U]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null
  $pr=Get-Process -Id $p -ErrorAction SilentlyContinue
  if($pr){@{n=$pr.ProcessName;t=$pr.MainWindowTitle;p=[int]$p}|ConvertTo-Json -Compress}
  Start-Sleep -Seconds 1
}
`;

console.log('Spawning persistent powershell...');
const ps = spawn('powershell.exe', [
  '-NoProfile', '-NoLogo', '-NonInteractive', '-Command', PS_SCRIPT
], { windowsHide: true });

ps.stdout.on('data', (data) => {
  console.log('DATA:', data.toString().trim());
});
ps.stderr.on('data', (data) => {
  console.error('ERR:', data.toString().trim());
});

setTimeout(() => {
  ps.kill();
  console.log('Done test');
}, 5000);
