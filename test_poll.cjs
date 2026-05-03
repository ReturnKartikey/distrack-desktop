const { execFile } = require('child_process');

const PS_SCRIPT = `
Add-Type -MemberDefinition '
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
' -Name 'U' -Namespace 'W' -ErrorAction SilentlyContinue
$h=[W.U]::GetForegroundWindow()
$p=[uint32]0
[W.U]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null
$pr=Get-Process -Id $p -ErrorAction SilentlyContinue
if($pr){@{n=$pr.ProcessName;t=$pr.MainWindowTitle;p=[int]$p}|ConvertTo-Json -Compress}
`;

execFile('powershell', [
  '-NoProfile', '-NoLogo', '-NonInteractive', '-Command', PS_SCRIPT
], { timeout: 4000, windowsHide: true }, (err, stdout) => {
  if (err) {
    console.error('Error:', err.message);
  }
  console.log('Poll STDOUT:', stdout);
});
