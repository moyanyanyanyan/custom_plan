const assert = require('node:assert/strict');

/** 用真实鼠标输入验证顶部拖动，避免仅调用命令而漏测区域和按钮隔离。 */
async function checkPanelDrag({ avatar, panel, probe, avatarTitle, panelTitle, original }) {
  const scale = original.width / 48;
  const initial = probe(panelTitle);
  const titleBox = await panel.locator('.brand h1').boundingBox();
  const ox = Math.round((titleBox.x + titleBox.width / 2) * scale);
  const oy = Math.round((titleBox.y + titleBox.height / 2) * scale);
  const moved = probe(panelTitle, 'Drag', initial.x + ox - 220, initial.y + oy + 35, ox, oy);
  assert.ok(moved.x < initial.x - 100 && moved.visible, 'Title must move the panel');
  await panel.waitForTimeout(350);
  assert.equal(probe(panelTitle).x, moved.x, 'Released panel must stay in place');
  const blankX = Math.round(400 * scale), blankY = Math.round(30 * scale);
  const movedAgain = probe(panelTitle, 'Drag', moved.x + blankX - 80, moved.y + blankY - 30, blankX, blankY);
  assert.ok(movedAgain.x < moved.x - 30, 'Header blank area must also drag');
  assert.deepEqual(probe(avatarTitle), original, 'Panel drag must not move avatar');
  const task = await panel.locator('.today-row').first().boundingBox();
  const tx = Math.round((task.x + task.width / 2) * scale);
  const ty = Math.round((task.y + task.height / 2) * scale);
  const afterTask = probe(panelTitle, 'Drag', movedAgain.x + tx - 80, movedAgain.y + ty, tx, ty);
  assert.equal(afterTask.x, movedAgain.x, 'Task region must not drag panel');
  assert.equal(afterTask.y, movedAgain.y);
  const denied = await avatar.evaluate(async () => {
    try { await window.__TAURI_INTERNALS__.invoke('drag_panel'); return false; }
    catch { return true; }
  });
  assert.ok(denied, 'Avatar cannot call panel-only drag command');
  await panel.getByRole('button', { name: '收起面板', exact: true }).click();
  await panel.waitForTimeout(150);
  assert.equal(probe(panelTitle).visible, false);
  await avatar.getByRole('button').click();
  await panel.waitForTimeout(200);
  const reopened = probe(panelTitle);
  assert.equal(reopened.x, initial.x, 'Reopen must return to avatar');
  assert.equal(reopened.y, initial.y);
  assert.equal(await panel.locator('[role="alert"]').count(), 0);
  console.log('Panel dragging passed: title, blank area, release, task exclusion, command isolation, reopen.');
}

module.exports = { checkPanelDrag };
