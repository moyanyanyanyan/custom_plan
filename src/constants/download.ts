export const DESKTOP_DOWNLOAD = {
  version: 'v0.1.0',
  fileName: '离谱发明所_0.1.0_x64-setup.exe',
  // 直连仓库内 release/ 目录的安装包：Gitee 上尚无 Release（releases API 返回空数组），
  // 原先的 releases/download/v0.1.0/... 会 404。此 raw 直链实测 200 / 3854590 字节 / 文件头 MZ。
  // 若日后建了 Release，可再切回 releases/download/<tag>/... 形式。
  url: 'https://gitee.com/moyanyanyanyan/hackson/raw/master/release/离谱发明所_0.1.0_x64-setup.exe',
  sha256: '962480F66FD0D20095767A28FC363337F360BF80FF35F675FF3956962485FE02',
};
