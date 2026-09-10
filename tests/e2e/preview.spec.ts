import { expect, test } from '@playwright/test';

test('任务面板在常用尺寸下可用', async ({ page }) => {
  await page.goto('/#panel');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: '离谱发明所', exact: true })).toBeVisible();
  await expect(page.locator('.today-row')).toHaveCount(5);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  await expect(page.getByRole('button', { name: '研究所设置' })).toBeEnabled();
  await expect(page.getByRole('textbox', { name: '任务内容' })).toBeVisible();
  await page.getByRole('textbox', { name: '任务内容' }).fill('检查反应釜');
  await page.getByRole('button', { name: '添加', exact: true }).click();
  await expect(page.getByText('检查反应釜')).toBeVisible();
  await expect(page.getByText('停滞能量').locator('..').getByText('4')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
