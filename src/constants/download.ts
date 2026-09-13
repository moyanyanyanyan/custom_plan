export const DESKTOP_DOWNLOAD = {
  version: 'v0.1.0',
  fileName: '离谱发明所_0.1.0_x64-setup.exe',
  // 直连仓库内 release/ 目录的安装包：Gitee 上尚无 Release（releases API 返回空数组），
  // 原先的 releases/download/v0.1.0/... 会 404。此 raw 直链实测 200 / 文件头 MZ。
  // 若日后建了 Release，可再切回 releases/download/<tag>/... 形式。
  url: 'https://gitee.com/moyanyanyanyan/hackson/raw/master/release/离谱发明所_0.1.0_x64-setup.exe',
  // 2026-09-13 重打：旧包(3854590B / 962480F6…)不含图生图回退等修复，已换成本次 tauri build 产物
  // (4340586B，内嵌 dist index-DfrDBZwB.js，含 image_once 的 edits→文生图回退与内嵌 key)。
  sha256: 'C5D94D6AEF0AE66E85B58B8EED7A9FD46FF45B0CC49B29703A1FBEB81162D6DE',
};
