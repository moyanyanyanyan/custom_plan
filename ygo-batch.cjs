const fs = require('fs');
const path = require('path');
const outDir = String.raw`C:\Users\ASUS\Pictures\图标`;
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const names = ['Dark Magician', 'Red-Eyes Black Dragon', 'Pot of Greed'];
(async () => {
  for (const name of names) {
    try {
      const apiUrl =
        'https://db.ygoprodeck.com/api/v7/cardinfo.php?name=' +
        encodeURIComponent(name);
      const apiRes = await fetch(apiUrl);
      const data = await apiRes.json();
      const img = data?.data?.[0]?.card_images?.[0]?.image_url;
      console.log(name, 'api', apiRes.status, 'img', img);
      if (img) {
        const imgRes = await fetch(img);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const safe = name.replace(/[^a-zA-Z0-9-_]/g, '_');
        const outFile = path.join(outDir, 'ygo-' + safe + '.jpg');
        fs.writeFileSync(outFile, buf);
        console.log('saved', outFile, buf.length);
      }
    } catch (e) {
      console.log(name, 'ERR', e.message);
    }
  }
})();
