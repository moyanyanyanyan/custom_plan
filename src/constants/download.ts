export const DESKTOP_DOWNLOAD = {
  version: 'v0.1.0',
  fileName: '离谱发明所_0.1.0_x64-setup.exe',
  // 直连仓库内 release/ 目录的安装包：Gitee 上尚无 Release（releases API 返回空数组），
  // 原先的 releases/download/v0.1.0/... 会 404。此 raw 直链实测 200 / 文件头 MZ。
  // 若日后建了 Release，可再切回 releases/download/<tag>/... 形式。
  url: 'https://gitee.com/moyanyanyanyan/hackson/raw/master/release/离谱发明所_0.1.0_x64-setup.exe',
  // 校验值「不能」写成这里的常量：安装包里内嵌「自己这个安装包的 sha256」在数学上不可能成立
  // —— 改常量会让前端产物变、包哈希跟着变，常量立刻过期，永远追不上（实测：改回旧常量重建，
  // 产物精确复现旧 hash，证明包内代码没变、只有这个常量在自相矛盾）。
  // 运行时去抓也不行：桌面端 tauri.conf.json 的 CSP 是
  // `connect-src ipc: http://ipc.localhost`，不含 gitee.com，fetch 会被直接拦掉。
  // 所以只放仓库里同名 .sha256 边车文件的地址（用 <a> 导航，不受 connect-src 限制），
  // 由用户或校验工具去取权威值；重打包时只需更新那一个小文件，永不过期。
  sha256Url: 'https://gitee.com/moyanyanyanyan/hackson/raw/master/release/离谱发明所_0.1.0_x64-setup.exe.sha256',
};
