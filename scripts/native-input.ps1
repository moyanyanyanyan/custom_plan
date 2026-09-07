param([int]$AppProcessId, [string]$Title, [string]$Action = 'Inspect', [int]$X = 0, [int]$Y = 0,
      [int]$OffsetX = -1, [int]$OffsetY = -1)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class LabWindowProbe {
    public delegate bool EnumProc(IntPtr hwnd, IntPtr param);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumProc callback, IntPtr param);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint process);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int max);
    public static IntPtr FindAppWindow(uint process, string title) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((hwnd, param) => {
            uint owner;
            GetWindowThreadProcessId(hwnd, out owner);
            var text = new StringBuilder(512);
            GetWindowText(hwnd, text, 512);
            if (owner == process && text.ToString() == title) { found = hwnd; return false; }
            return true;
        }, IntPtr.Zero);
        return found;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)]
    public struct Point { public int X, Y; }
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hwnd, out Rect rect);
    [DllImport("user32.dll")]
    public static extern bool GetClientRect(IntPtr hwnd, out Rect rect);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hwnd, int index);
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hwnd, uint msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr info);
    [DllImport("user32.dll")]
    public static extern bool SetProcessDpiAwarenessContext(IntPtr context);
}
'@
[LabWindowProbe]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null
if ($AppProcessId -le 0) { throw 'An explicit application process is required' }
$handle = [LabWindowProbe]::FindAppWindow($AppProcessId, $Title)
if ($handle -eq [IntPtr]::Zero) { throw 'Application window not found' }
$rect = New-Object LabWindowProbe+Rect
[LabWindowProbe]::GetWindowRect($handle, [ref]$rect) | Out-Null
$client = New-Object LabWindowProbe+Rect
[LabWindowProbe]::GetClientRect($handle, [ref]$client) | Out-Null
if ($Action -eq 'Close') {
    [LabWindowProbe]::PostMessage($handle, 16, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
    Start-Sleep -Milliseconds 200
}
if ($Action -eq 'Drag') {
    $original = New-Object LabWindowProbe+Point
    [LabWindowProbe]::GetCursorPos([ref]$original) | Out-Null
    $startX = [int](($rect.Left + $rect.Right) / 2)
    $startY = [int](($rect.Top + $rect.Bottom) / 2)
    if ($OffsetX -ge 0) { $startX = $rect.Left + $OffsetX }
    if ($OffsetY -ge 0) { $startY = $rect.Top + $OffsetY }
    try {
        [LabWindowProbe]::SetCursorPos($startX, $startY) | Out-Null
        [LabWindowProbe]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
        Start-Sleep -Milliseconds 150
        for ($step = 1; $step -le 12; $step++) {
            [LabWindowProbe]::SetCursorPos(
                [int]($startX + ($X - $startX) * $step / 12),
                [int]($startY + ($Y - $startY) * $step / 12)) | Out-Null
            Start-Sleep -Milliseconds 80
        }
    } finally {
        [LabWindowProbe]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
        Start-Sleep -Milliseconds 750
        [LabWindowProbe]::SetCursorPos($original.X, $original.Y) | Out-Null
    }
}
[LabWindowProbe]::GetWindowRect($handle, [ref]$rect) | Out-Null
@{ x = $rect.Left; y = $rect.Top; width = $rect.Right - $rect.Left;
   height = $rect.Bottom - $rect.Top; visible = [LabWindowProbe]::IsWindowVisible($handle);
   frameless = ($client.Right -eq ($rect.Right - $rect.Left)) -and ($client.Bottom -eq ($rect.Bottom - $rect.Top));
   topmost = ([LabWindowProbe]::GetWindowLong($handle, -20) -band 8) -ne 0
} | ConvertTo-Json -Compress
