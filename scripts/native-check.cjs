const { chromium } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const { checkPanelDrag } = require('./panel-drag-check.cjs');

/** 只定位本应用窗口，并在拖动验证后恢复鼠标原位置。 */
function probe(title, action = 'Inspect', x = 0, y = 0, offsetX = -1, offsetY = -1) {
  const output = execFileSync('powershell.exe', ['-NoProfile', '-File',
    path.resolve('scripts/native-input.ps1'), '-AppProcessId', process.env.NATIVE_APP_PID,
    '-Title', title, '-Action', action,
    '-X', String(x), '-Y', String(y), '-OffsetX', String(offsetX), '-OffsetY', String(offsetY)],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(output.trim());
}

/** 通过调试实例验证原生窗口，不能用于浏览器预览替代桌面验收。 */
async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const pages = browser.contexts().flatMap((context) => context.pages());
  const avatar = pages.find((page) => page.url().includes('#avatar'));
  const panel = pages.find((page) => page.url().includes('#panel'));
  assert.ok(avatar && panel, 'Both native webviews must exist');
  const errors = [];
  for (const page of [avatar, panel]) page.on('pageerror', (error) => errors.push(error.message));
  const avatarTitle = '离谱发明所 · 头像';
  const panelTitle = '离谱发明所';
  const original = probe(avatarTitle);
  assert.ok(original.visible);
  assert.ok(original.frameless && original.topmost);
  await avatar.screenshot({ path: '.artifacts/native-avatar.png', omitBackground: true });
  assert.equal(probe(panelTitle).visible, true, 'Panel must be visible on startup');
  await avatar.getByRole('button').click();
  await panel.waitForTimeout(150);
  assert.equal(probe(panelTitle).visible, false, 'Avatar must hide a visible panel');
  await avatar.getByRole('button').click();
  await panel.waitForTimeout(300);
  let bounds = probe(panelTitle);
  const panelAvoidsAvatar = bounds.x + bounds.width <= original.x
    || bounds.x >= original.x + original.width;
  assert.ok(bounds.visible && panelAvoidsAvatar, 'Panel must open beside the avatar');
  await checkPanelDrag({ avatar, panel, probe, avatarTitle, panelTitle, original });
  await avatar.bringToFront();
  assert.equal(probe(panelTitle).visible, true, 'Panel should remain visible after losing focus');
  await panel.screenshot({ path: '.artifacts/native-panel.png' });
  await avatar.getByRole('button').click();
  await panel.waitForTimeout(150);
  await panel.getByRole('button', { name: '收起面板', exact: true }).click();
  await panel.waitForTimeout(150);
  assert.equal(probe(panelTitle).visible, false);
  await avatar.getByRole('button').click();
  await panel.waitForTimeout(150);
  assert.equal(probe(panelTitle).visible, true, 'Avatar must restore a minimized panel in one click');
  const dragged = probe(avatarTitle, 'Drag', 120, original.y + 32);
  assert.ok(dragged.x > 0 && dragged.x < original.x, 'Interior drag must keep a free position');
  assert.equal(probe(panelTitle).visible, false, 'Drag must hide panel without toggling it');
  await avatar.getByRole('button').click();
  await panel.waitForTimeout(200);
  bounds = probe(panelTitle);
  assert.ok(bounds.visible && bounds.x > dragged.x + dragged.width);
  const snapped = probe(avatarTitle, 'Drag', -100, dragged.y + dragged.height / 2);
  assert.equal(snapped.x, 0, 'Drag near the screen edge must snap to it');
  assert.equal(probe(panelTitle).visible, false);
  const restoreX = original.x === 0 ? -100 : original.x + original.width + 400;
  probe(avatarTitle, 'Drag', restoreX, original.y + original.height / 2);
  const restored = probe(avatarTitle);
  assert.equal(restored.x === 0, original.x === 0, 'Cleanup must restore the original screen edge');
  assert.equal(probe(panelTitle).visible, false);
  assert.deepEqual(errors, []);
  const exitMethod = process.env.NATIVE_EXIT_METHOD ?? 'system-close';
  if (exitMethod === 'button') {
    await avatar.getByRole('button').click();
    await panel.waitForTimeout(150);
    await panel.getByRole('button', { name: '退出应用', exact: true }).click().catch((error) => {
      if (!/closed|disconnected/.test(error.message)) throw error;
    });
  } else {
    assert.equal(probe(panelTitle, 'Close').visible, false, 'System close should exit the application');
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.throws(() => probe(avatarTitle), `${exitMethod} should remove the avatar window`);
  console.log(JSON.stringify({ result: 'Native checks passed', original, free: dragged, snapped, restored }));
  await browser.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
