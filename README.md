# 离谱发明所

把每天完成的小事，炼成一件毫无用处但值得收藏的离谱发明。

当前版本为 Tauri 2 + React + TypeScript Windows 桌面原型：

- 64px 圆形头像，拖动松手后吸附当前屏幕最近的左右边缘。
- 单击头像打开／收起静态控制面板，拖动时自动收起。
- 参考产品图的科研蓝玻璃界面、身份区、统计区、胶囊任务和发明机入口。
- 任务、卡牌、史莱姆均使用固定示例数据，不绑定业务事件。

## 开始使用

准备 Rust、Windows C++ 构建工具和 WebView2 后，在项目目录执行：

```powershell
npm install
npm run desktop
```

面板右上角减号收起，电源按钮退出整个应用。

仅预览界面：`npm run dev`。
构建桌面可执行文件：`npm run desktop:build`，不生成安装包。

完整环境准备、构建和验证说明见 [DEVELOPMENT.md](DEVELOPMENT.md)。
产品方向见 [PRODUCT_MEMORY.md](PRODUCT_MEMORY.md)。
