const { execFileSync, spawn } = require('node:child_process');
const http = require('node:http');

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForDebugger(timeout = 90_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const request = http.get('http://127.0.0.1:9222/json', () => resolve(true));
      request.on('error', () => resolve(false));
      request.setTimeout(500, () => { request.destroy(); resolve(false); });
    });
    if (ready) return;
    await delay(500);
  }
  throw new Error('桌面测试实例未在 90 秒内开放调试端口');
}

function findAppProcess(startedAt) {
  const script = [
    `$since=[DateTimeOffset]::FromUnixTimeMilliseconds(${startedAt}).LocalDateTime`,
    "$app=Get-Process -Name 'absurd-invention-lab' -ErrorAction SilentlyContinue",
    '| Where-Object { $_.StartTime -ge $since } | Sort-Object StartTime -Descending',
    '| Select-Object -First 1 -ExpandProperty Id',
  ].join(' ');
  return Number(execFileSync('powershell.exe', ['-NoProfile', '-Command', script],
    { encoding: 'utf8', windowsHide: true }).trim());
}

async function runScenario(exitMethod) {
  const startedAt = Date.now();
  // Node 22 在 Windows 不再直接启动 .cmd，统一交给系统命令解释器处理。
  const tauri = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c',
    'corepack pnpm run desktop'], {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9222',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let appProcessId = 0;
  let output = '';
  tauri.stdout.on('data', (chunk) => { output += chunk; });
  tauri.stderr.on('data', (chunk) => { output += chunk; });
  try {
    await waitForDebugger();
    appProcessId = findAppProcess(startedAt);
    if (!appProcessId) throw new Error('无法定位本轮启动的桌面应用进程');
    execFileSync(process.execPath, ['scripts/native-check.cjs'], {
      env: { ...process.env, NATIVE_APP_PID: String(appProcessId), NATIVE_EXIT_METHOD: exitMethod },
      stdio: 'inherit',
      windowsHide: true,
    });
  } catch (error) {
    process.stderr.write(output);
    throw error;
  } finally {
    if (appProcessId) {
      try {
        execFileSync('powershell.exe', ['-NoProfile', '-Command',
          `Stop-Process -Id ${appProcessId} -Force -ErrorAction SilentlyContinue`],
        { windowsHide: true });
      } catch { /* 测试可能已经通过退出按钮结束该专用实例。 */ }
    }
    tauri.kill();
  }
}

async function main() {
  await runScenario('button');
  await runScenario('system-close');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
