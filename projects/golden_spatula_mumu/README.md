# 金铲铲 MuMu 项目包

这是给 MXU 使用的保守 ProjectInterface 包。当前目标是本机连接、主界面导航、弹窗处理、红点巡检和截图采集，不包含对局 AI、阵容决策或购买确认。

## 准备到 MXU

```powershell
pnpm prepare:golden-spatula-mumu
```

脚本会把本目录复制到 `src-tauri/target/debug`，MXU 本地开发运行时会从该目录读取 `interface.json` 和 `resource/`。

运行 MXU 前需要把 MaaFramework release binaries 放在 `src-tauri/target/debug/maafw`。准备脚本只检查 runtime 是否存在，不会自动下载。

## 任务

- `回到主界面`：启动游戏，按模板尝试关闭常见弹窗，并保存主界面截图。
- `关闭常见弹窗`：按模板处理右上角关闭按钮和退出确认的取消按钮，然后保存截图。
- `事件签到巡检`：进入事件页保存截图并返回主界面；当前版本仍不点击领取按钮。
- `商城免费项巡检`：进入商城保存截图并返回主界面，不触碰购买按钮。
- `红点巡检截图`：检测左侧红点并依次巡检主要入口，保存命名截图用于模板和 ROI 调整。
- `连线截图测试`：保存一张截图，用于确认控制器和资源已准备好。
- `仅截图`：保存当前模拟器画面。
- `启动游戏`：启动 `com.tencent.jkchess`，然后进入主界面确认流程。
- `停止游戏`：停止 `com.tencent.jkchess`。
- `点击屏幕中心`：点击 1280x720 MuMu 画面的中心点。

## 素材

- `samples/screenshots/` 保存重新命名后的原始巡检截图，方便回看裁剪来源。
- `resource/image/lobby/` 保存主界面左侧入口和红点模板。
- `resource/image/page/` 保存页面返回箭头模板。
- `resource/image/popup/` 保存关闭、取消和奖励弹窗模板。

当前版本只把模板用于导航、返回和截图巡检。事件与商城仍然是巡检任务，不会自动领取或购买。
