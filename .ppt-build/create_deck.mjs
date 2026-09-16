import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "file:///C:/Users/%E5%A2%A8%E8%A8%80/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const workspaceDir = "C:\\Users\\墨言\\Desktop\\weyoung\\task_management\\hackson";
const skillDir = "C:\\Users\\墨言\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.909.12148\\skills\\presentations";
const buildDir = path.join(workspaceDir, ".ppt-build");
const outputPath = path.join(workspaceDir, "output", "离谱发明所_黑客松评审路演_定稿.pptx");
const imageStandard = "C:\\Users\\墨言\\AppData\\Local\\Temp\\codex-clipboard-bdecad3a-7f48-403d-b4d5-d5a23e57b6df.png";
const imageCompact = "C:\\Users\\墨言\\AppData\\Local\\Temp\\codex-clipboard-5fbf8f89-143a-4db5-804f-18c2d983fc64.png";
const runtimePython = "C:\\Users\\墨言\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);
const standardBytes = new Uint8Array(await fs.readFile(imageStandard));
const compactBytes = new Uint8Array(await fs.readFile(imageCompact));
const font = "Microsoft YaHei";
const C = { bg: "#101217", panel: "#181B22", paper: "#F3E8E6", white: "#F7F5F4", muted: "#B8B3B3", red: "#B81F2A", red2: "#E24A52", gold: "#F2C879", line: "#343842", ink: "#251F20" };

const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function box(slide, x, y, w, h, fill, radius = 0, line = "none") {
  return slide.shapes.add({ geometry: radius ? "roundRect" : "rect", position: { left: x, top: y, width: w, height: h }, fill, line: { fill: line, width: line === "none" ? 0 : 1 }, ...(radius ? { borderRadius: radius } : {}) });
}

function text(slide, value, x, y, w, h, size = 24, color = C.white, opts = {}) {
  const shape = slide.shapes.add({ geometry: "textbox", position: { left: x, top: y, width: w, height: h }, fill: "none", line: { fill: "none", width: 0 } });
  shape.text = value;
  shape.text.style = { typeface: font, fontSize: size, color, bold: !!opts.bold, autoFit: "shrinkText", verticalAlignment: opts.valign ?? "middle", alignment: opts.align ?? "left", ...(opts.italic ? { italic: true } : {}) };
  return shape;
}

function image(slide, bytes, x, y, w, h, fit = "contain", alt = "产品截图", crop) {
  return slide.images.add({ blob: bytes, contentType: "image/png", alt, fit, position: { left: x, top: y, width: w, height: h }, geometry: "roundRect", borderRadius: 18, ...(crop ? { crop } : {}) });
}

function header(slide, title, number) {
  text(slide, title, 64, 40, 1080, 54, 32, C.white, { bold: true });
  text(slide, String(number).padStart(2, "0"), 1170, 42, 48, 40, 15, C.red2, { bold: true, align: "right" });
  box(slide, 64, 104, 54, 4, C.red2);
}

function notes(slide, body) { slide.speakerNotes.textFrame.setText(body); }

// 1. Cover
{
  const s = deck.slides.add(); s.background.fill = C.bg;
  box(s, 0, 0, 1280, 720, C.bg);
  box(s, 70, 70, 7, 520, C.red);
  text(s, "离谱发明所", 105, 115, 520, 90, 58, C.white, { bold: true });
  text(s, "ABSURD INVENTION LAB", 108, 205, 430, 28, 16, C.red2, { bold: true });
  text(s, "一款常驻桌面的游戏化计划工具", 108, 282, 480, 60, 28, C.white, { bold: true });
  text(s, "把每天完成的小事，\n炼成值得收藏的荒诞发明。", 108, 365, 470, 100, 22, C.muted);
  text(s, "WINDOWS DESKTOP · HACKATHON DEMO", 108, 555, 460, 28, 14, C.gold, { bold: true });
  image(s, standardBytes, 655, 48, 540, 624, "contain", "离谱发明所标准模式与桌面悬浮头像");
  notes(s, "大家好，这是“离谱发明所”，一款常驻 Windows 桌面的游戏化计划工具。它会把每天完成的小事，炼成值得收藏的荒诞发明。");
}

// 2. Target users
{
  const s = deck.slides.add(); s.background.fill = C.bg; header(s, "需要随时看到计划，也希望桌面足够好看的人", 2);
  text(s, "计划一旦离开视线，就容易被忘记", 64, 130, 610, 62, 34, C.white, { bold: true });
  const rows = [
    ["轻量", "只想快速管理当天任务，不需要复杂项目流程"],
    ["可见", "工作或学习时，容易忘记主动打开计划软件"],
    ["个性", "在意桌面美观、个性化表达和轻游戏化反馈"],
  ];
  rows.forEach(([k, v], i) => {
    const y = 235 + i * 112;
    text(s, k, 66, y, 110, 44, 20, C.red2, { bold: true });
    text(s, v, 176, y - 4, 465, 58, 21, C.white);
    box(s, 66, y + 72, 560, 1, C.line);
  });
  image(s, compactBytes, 760, 125, 430, 500, "contain", "紧凑模式常驻桌面的实际效果");
  box(s, 722, 166, 5, 408, C.red);
  text(s, "悬浮头像持续但低打扰\n需要时，一点即开", 748, 623, 450, 48, 18, C.gold, { bold: true, align: "center" });
  notes(s, "我们面向只想管理当天小任务，却容易忘记打开计划软件的用户。他们也在意桌面审美和个性表达。因此我们把计划入口放在桌面上，始终可见，但保持低打扰。");
}

// 3. Product form
{
  const s = deck.slides.add(); s.background.fill = C.bg; header(s, "一个头像，两种计划面板", 3);
  text(s, "标准模式", 70, 122, 260, 38, 24, C.white, { bold: true });
  text(s, "完整管理与每日发明", 70, 159, 300, 28, 15, C.muted);
  text(s, "紧凑模式", 690, 122, 260, 38, 24, C.white, { bold: true });
  text(s, "保留任务与进度，降低占用", 690, 159, 350, 28, 15, C.muted);
  image(s, standardBytes, 66, 197, 540, 420, "contain", "标准模式完整面板");
  image(s, compactBytes, 687, 197, 500, 420, "contain", "紧凑模式计划面板");
  box(s, 66, 645, 1120, 1, C.line);
  text(s, "悬浮头像一点即开", 68, 657, 330, 30, 17, C.gold, { bold: true });
  text(s, "Ctrl + Shift + M  应用内切换模式", 430, 657, 430, 30, 17, C.white, { bold: true, align: "center" });
  text(s, "可安装的 Windows 桌面 App", 866, 657, 320, 30, 17, C.red2, { bold: true, align: "right" });
  notes(s, "软件平时是桌面边缘的悬浮头像，外圈显示今日进度，点击即可展开完整 App。标准模式用于完整管理，紧凑模式保留任务和进度。用户还可在应用内按 Ctrl Shift M 快速切换。");
}

// 4. Differentiation
{
  const s = deck.slides.add(); s.background.fill = C.bg; header(s, "低打扰入口与个性化激励闭环", 4);
  const values = [
    ["比较维度", "常规计划体验", "离谱发明所"],
    ["查看方式", "主动打开完整窗口", "桌面悬浮头像，一点即开"],
    ["使用形态", "相对固定的单一窗口", "标准与紧凑模式切换"],
    ["个性化", "以基础主题设置为主", "头像、背景、透明度与主题色"],
    ["完成反馈", "勾选或状态变化", "稳定余波、史莱姆与 AI 发明"],
    ["长期回顾", "历史任务列表", "真实完成事项变成可收藏成果"],
  ];
  const table = s.tables.add({ rows: 6, columns: 3, left: 64, top: 137, width: 800, height: 475, columnWidths: [150, 270, 380], values });
  const all = table.cells.block({ row: 0, column: 0, rowCount: 6, columnCount: 3 });
  all.textStyle.typeface = font; all.textStyle.fontSize = 16; all.textStyle.color = C.white;
  all.borders = { style: "solid", fill: C.line, width: 1 };
  const head = table.cells.block({ row: 0, column: 0, rowCount: 1, columnCount: 3 });
  head.fill = C.red; head.textStyle.bold = true; head.textStyle.color = C.white; head.textStyle.fontSize = 17;
  const first = table.cells.block({ row: 1, column: 0, rowCount: 5, columnCount: 1 });
  first.fill = C.panel; first.textStyle.bold = true; first.textStyle.color = C.gold;
  const middle = table.cells.block({ row: 1, column: 1, rowCount: 5, columnCount: 1 }); middle.fill = "#14171D"; middle.textStyle.color = C.muted;
  const last = table.cells.block({ row: 1, column: 2, rowCount: 5, columnCount: 1 }); last.fill = "#24191C"; last.textStyle.color = C.white; last.textStyle.bold = true;
  image(s, standardBytes, 902, 140, 306, 355, "cover", "个性化主题效果", { left: 0.04, top: 0.03, right: 0.16, bottom: 0.12 });
  text(s, "用户可自定义", 920, 520, 250, 28, 17, C.red2, { bold: true, align: "center" });
  text(s, "头像  背景  透明度  主题色", 890, 552, 320, 32, 16, C.white, { bold: true, align: "center" });
  text(s, "更方便地看计划，也把计划工具变成自己的桌面空间", 130, 636, 1020, 40, 23, C.gold, { bold: true, align: "center" });
  notes(s, "用户可更换头像、背景、透明度和主题色，让面板融入自己的桌面。完成任务会产生稳定余波，拖延会形成史莱姆，AI 则把真实完成事项生成发明卡牌和像素道具，把认真生活留成收藏。");
}

// 5. Technology and next step
{
  const s = deck.slides.add(); s.background.fill = C.bg; header(s, "支撑完整桌面体验的技术实现", 5);
  text(s, "已完成可安装运行的\nWindows 单机原型", 64, 135, 520, 100, 36, C.white, { bold: true });
  const tech = [
    ["React 19 · TypeScript · Vite", "计划界面与个性化主题"],
    ["Tauri 2 · Rust", "Windows 双窗口、悬浮置顶、贴边与尺寸切换"],
    ["本地数据仓库", "任务、设置、收藏与图片资产保存在本地"],
    ["AI 生成", "发明文案、卡牌插图与像素道具"],
  ];
  tech.forEach(([a, b], i) => {
    const y = 275 + i * 78;
    box(s, 66, y + 6, 7, 48, i === 1 ? C.red2 : C.gold);
    text(s, a, 92, y, 390, 30, 19, C.white, { bold: true });
    text(s, b, 92, y + 31, 470, 30, 15, C.muted);
  });
  image(s, standardBytes, 670, 106, 500, 475, "contain", "已完成的 Windows 桌面原型");
  box(s, 650, 603, 550, 1, C.line);
  text(s, "NEXT", 674, 620, 70, 28, 14, C.red2, { bold: true });
  text(s, "更丰富的主题内容、桌面交互与长期使用验证", 750, 614, 430, 42, 17, C.white, { bold: true });
  text(s, "用户负责认真生活，AI 负责胡乱发明。", 64, 656, 540, 32, 20, C.gold, { bold: true });
  notes(s, "我们用 React、TypeScript 和 Vite 完成界面，用 Tauri 和 Rust 实现 Windows 双窗口、悬浮置顶、贴边和模式切换。任务和收藏保存在本地，AI 生成发明内容。目前可安装的 Windows 原型和主要闭环已经完成。用户负责认真生活，AI 负责胡乱发明。");
}

await fs.mkdir(buildDir, { recursive: true });
const stagingDir = path.join(workspaceDir, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(path.dirname(outputPath), { recursive: true });
const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);

const result = await finalizePresentation({
  explicitTotalSlideCount: 5,
  requiredNativeTableOwnerSlides: [4],
  requiredNativeChartOwnerSlides: [],
  workspaceDir,
  candidatePath,
  finalPath: outputPath,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit", "--require-native-table-slide", "4"],
  fontPolicy: { basis: "design", families: [font, "Calibri"] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "deck-final.validation.json"),
});
console.log(JSON.stringify({ outputPath, result }, null, 2));
