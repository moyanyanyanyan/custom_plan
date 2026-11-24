import { expect, test } from '@playwright/test';

for (const [width,height] of [[1280,900], [360,900], [320,900], [1280,600], [844,390]]) {
  test(`完整卡面与键盘翻牌 ${width}x${height}px`, async ({ page }) => {
    await page.setViewportSize({width,height});
    await page.goto('/#panel');
    await page.evaluate(async () => {
      // 浏览器直接使用项目的生成器，避免另造一份持久化格式。
      const {generateCardFromTasks}=await import('/src/utils/cardGenerator.ts');
      const {createDefaultData}=await import('/src/constants/defaults.ts');
      const {createTask}=await import('/src/utils/taskModel.ts');
      const sources=['读书','跑步','做饭','整理桌面','写代码'];
      const card=generateCardFromTasks(sources.map(name=>createTask({id:name,name,completed:true,icon:'flask',minutes:10,group:'A'})));
      card.name='静默回响封印书签';
      card.effect='合拢夹有书签的书页，使范围3内一个目标沉默8秒，书页开启时效果立即解除。'.repeat(4).slice(0,120);
      card.description='世界终于安静了，只剩截止日期还在催促你交稿。'.repeat(2).slice(0,40);
      card.setting='你拥有一枚由读书凝成的书签。';
      const data=createDefaultData();data.cards=[card];
      localStorage.setItem('absurd.app-data.v1',JSON.stringify(data));
    });
    await page.reload();
    await page.getByRole('button',{name:'跳过'}).click();
    await page.getByRole('button',{name:/打开发明档案馆/}).click();
    await page.getByRole('button',{name:'查看静默回响封印书签'}).click();
    const dialog=page.getByRole('dialog',{name:'卡牌浏览',exact:true});
    const card=dialog.locator('.fantasy-card').first();
    const box=await card.boundingBox();expect(box!.width/box!.height).toBeCloseTo(756/1128,3);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y+box!.height).toBeLessThanOrEqual(height);
    expect(box!.x+box!.width/2).toBeCloseTo(width/2,0);
    expect(box!.y+box!.height/2).toBeCloseTo(height/2,0);
    const layout=await card.evaluate(element=>{
      const effect=element.querySelector('.fantasy-effect')!.getBoundingClientRect();
      const art=element.querySelector('.fantasy-art')!.getBoundingClientRect();
      const flavor=element.querySelector('.fantasy-flavor')!.getBoundingClientRect();
      return {artHeight:art.height,noOverlap:art.bottom<=effect.top+1 && effect.bottom<=flavor.top+1,inside:flavor.bottom<=element.getBoundingClientRect().bottom-5};
    });
    expect(layout.noOverlap).toBe(true);expect(layout.inside).toBe(true);expect(layout.artHeight).toBeGreaterThan(box!.height * .08);
    expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    await page.screenshot({path:`.artifacts/card-front-${width}-${height}.png`});
    await page.getByRole('button',{name:'翻到背面'}).focus();await page.keyboard.press('Enter');
    await expect(page.getByLabel('角色扮演牌背')).toBeVisible();
    await expect(dialog.locator('.fantasy-back')).not.toContainText('任务来源');
    await expect(dialog.locator('.fantasy-flipper')).toHaveCSS('transform','matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)');
    const backImage=dialog.locator('.fantasy-back img');
    await expect(backImage).toHaveCSS('object-fit','contain');
    const imageSize=await backImage.evaluate(async (image: HTMLImageElement)=>{
      await image.decode();
      return {width:image.naturalWidth,height:image.naturalHeight};
    });
    const backBox=await dialog.locator('.fantasy-back').boundingBox();
    expect(backBox!.width/backBox!.height).toBeCloseTo(imageSize.width/imageSize.height,3);
    expect(backBox!.width).toBeCloseTo(box!.width,1);
    expect(backBox!.height).toBeCloseTo(box!.height,1);
    await page.screenshot({path:`.artifacts/card-back-${width}-${height}.png`});
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button',{name:'查看静默回响封印书签'})).toBeFocused();
  });
}
