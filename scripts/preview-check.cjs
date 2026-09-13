const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

/** 截图和检查静态预览，避免把浏览器检查误报为桌面窗口验收。 */
async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const output = path.resolve('.artifacts');
  fs.mkdirSync(output, { recursive: true });
  try {
    for (const [width, height] of [[760, 800], [520, 680], [360, 600]]) {
      await page.setViewportSize({ width, height });
      await page.goto('http://127.0.0.1:1420/#panel');
      await page.getByRole('heading', { name: '离谱道具', exact: true }).waitFor();
      assert.equal(await page.locator('.task-pill').count(), 5);
      assert.equal(await page.locator('.task-pill.completed').count(), 2);
      assert.equal(await page.locator('.static-button:not(:disabled)').count(), 0);
      assert.equal(await page.locator('[role="progressbar"]').getAttribute('aria-valuenow'), '2');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (width === 760) assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
      await page.screenshot({ path: path.join(output, `panel-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 64, height: 64 });
    await page.goto('http://127.0.0.1:1420/#avatar');
    await page.reload();
    await page.locator('.avatar-launcher').waitFor();
    await page.screenshot({ path: path.join(output, 'avatar.png'), omitBackground: true });
    assert.equal(await page.locator('.avatar-launcher').count(), 1);
    assert.deepEqual(errors, []);
    console.log('Preview checks passed: 3 panel sizes, static controls, counts, avatar, no page errors.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
