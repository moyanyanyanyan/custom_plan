import { expect, test } from '@playwright/test';

test('任务面板在常用尺寸下可用', async ({ page }) => {
  await page.goto('/#panel');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: '离谱发明所', exact: true })).toBeVisible();
  await expect(page.locator('.task-pill')).toHaveCount(5);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  await expect(page.getByRole('button', { name: '研究所设置' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
