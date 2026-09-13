import { DESKTOP_DOWNLOAD } from '../../constants/download';

export function DesktopDownloadCard() {
  return <section className="desktop-download-card" aria-labelledby="desktop-download-title">
    <div className="desktop-download-heading"><div><span>DESKTOP EDITION</span><h3 id="desktop-download-title">桌面版</h3></div><b>Windows 10 / 11 · x64</b></div>
    <p>桌面端提供悬浮头像、窗口贴边、系统通知和定时提醒等能力，浏览器端无法完整体验这些桌面功能。</p>
    <a className="desktop-download-button" href={DESKTOP_DOWNLOAD.url} download={DESKTOP_DOWNLOAD.fileName} target="_blank" rel="noopener noreferrer">下载 Windows 安装包</a>
    <small>{DESKTOP_DOWNLOAD.fileName} · {DESKTOP_DOWNLOAD.version}</small>
    <details><summary>安全与校验说明</summary><div>本版本由个人开发者构建，尚未购买代码签名证书，因此 Windows 可能显示“未知发布者”或 SmartScreen 提示。这不是安装包被判定为恶意软件的结论，而是未签名程序的常见提示。请确认文件来自本项目仓库，并核对 SHA-256：权威校验值见 <a href={DESKTOP_DOWNLOAD.sha256Url} target="_blank" rel="noopener noreferrer">{DESKTOP_DOWNLOAD.fileName}.sha256</a>，本地可用 <code>Get-FileHash .\{DESKTOP_DOWNLOAD.fileName} -Algorithm SHA256</code> 与之一致即未被改动。项目不在安装包中植入广告、捆绑软件或额外安装器；如需进一步验证，可使用 Windows Defender 或其他安全软件扫描。</div></details>
  </section>;
}
