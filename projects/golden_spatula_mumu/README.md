# 金铲铲 MuMu 项目包

这是给 MXU 使用的保守 ProjectInterface 包。当前目标是本机连接、主界面导航、弹窗处理、红点巡检和截图采集，不包含对局 AI、阵容决策或购买确认。

## 准备到 MXU

一键启动可以直接双击项目根目录的 `start-mxu-golden-spatula.bat`。它会生成教程 pipeline、准备资源、检查 `maafw/MaaFramework.dll`，关闭旧的 `mxu.exe`，然后用 `pnpm tauri dev` 同时启动 Vite 前端和 Tauri 后端。这个命令窗口需要保持打开。

```powershell
pnpm prepare:golden-spatula-mumu
```

脚本会把本目录复制到 `src-tauri/target/debug`，MXU 本地开发运行时会从该目录读取 `interface.json`、`resource/` 和按需加载的 `resource_knowledge/`。

运行 MXU 前需要把 MaaFramework release binaries 放在 `src-tauri/target/debug/maafw`。准备脚本只检查 runtime 是否存在，不会自动下载。

## 调试脚本

```powershell
pnpm golden:red-dot
pnpm golden:generate-tutorial
pnpm golden:analyze
pnpm golden:crop-assets -- --dry-run
pnpm golden:fetch-knowledge
```

- `golden:red-dot` 会准备资源、连接 MuMu、加载 bundle 并运行严格版 `RedDotPatrol`。脚本会自动探测 MXU 后端 `12701-12710` 端口；本轮必须产出完整巡检截图，且不能出现 fresh `failed` / `unverified` / `on_error` 诊断图才算通过。
- `golden:generate-tutorial` 会从高层可复用片段生成 `resource/pipeline/tutorial.json`；维护完整新手教学时优先改生成脚本，不直接手写长 pipeline。
- `golden:analyze` 会列出最近截图、on_error 图和日志线索。
- `golden:crop-assets` 会按 `tooling/crop-recipes.json` 重新裁剪模板；调试新截图时建议先用 `--dry-run` 检查 recipe。
- `golden:fetch-knowledge` 会从 `jinchanchan.fun` 当前版本 API 抓取英雄、羁绊、装备、强化符文与热门阵容资料，下载 Tencent CDN 图标，并生成 `resource_knowledge/` Maa 模板与 `knowledge/` JSON。

## 任务

- `回到主界面`：启动游戏，按模板尝试关闭常见弹窗，并保存主界面截图。
- `关闭常见弹窗`：按模板处理右上角关闭按钮和退出确认的取消按钮，然后保存截图。
- `事件签到巡检`：进入事件页保存截图并返回主界面；当前版本仍不点击领取按钮。
- `商城免费项巡检`：进入商城保存截图并返回主界面，不触碰购买按钮。
- `红点巡检截图`：检测左侧红点并依次巡检主要入口；每个页面会先识别左上角标题模板，命中后才保存命名截图用于模板和 ROI 调整。
- `新手引导点击测试`：假设当前在赛季玩法页，点击中间的新手引导，再点击右下开始游戏，用于先验证点击链路。
- `只选中新手引导`：只点击赛季玩法页中间的新手引导，并保存前后截图，用于单独校准第一个点位。
- `只点击开始游戏`：只点击赛季玩法页右下开始游戏，并保存前后截图，用于单独校准第二个点位。
- `完整新手教学`：假设当前在赛季玩法页，自动选择新手引导并完成升级、上阵、升星、羁绊、装备、选秀和三星教程；这是教程专用测试，会执行教程内要求的买卖、刷新、出售和拖拽。
- `知识库模板加载测试`：加载棋子、装备、羁绊和强化符文模板并保存截图，用于确认知识库资源可被 Maa 读取。
- `识别商店棋子`：只截图并在商店区域尝试匹配当前版本棋子头像，不点击棋子或购买。
- `识别基础装备`：只截图并匹配基础装备图标，作为装备识别的轻量入口。
- `识别成装图标`：只截图并匹配常规成装图标。
- `识别特殊装备`：只截图并匹配特殊装备、神器和机制装备图标；模板较多，建议按需调试。
- `识别羁绊面板`：只截图并在左侧羁绊区域尝试匹配当前版本羁绊图标。
- `连线截图测试`：保存一张截图，用于确认控制器和资源已准备好。
- `仅截图`：保存当前模拟器画面。
- `启动游戏`：启动 `com.tencent.jkchess`，然后进入主界面确认流程。
- `停止游戏`：停止 `com.tencent.jkchess`。
- `点击屏幕中心`：点击 720 短边逻辑画面的中心点；1600x900 等 16:9 画面会由 Maa 按比例映射。

## 素材

- `samples/screenshots/` 保存重新命名后的原始巡检截图，方便回看裁剪来源。
- `resource/image/lobby/` 保存主界面左侧入口和红点模板。
- `resource/image/page/` 保存页面返回箭头、页面标题和开始游戏按钮模板。
- `resource/image/popup/` 保存关闭、取消和奖励弹窗模板。
- `resource_knowledge/image/champion/` 保存按费用分类的当前版本棋子头像模板。
- `resource_knowledge/image/item/` 保存基础装、成装和特殊装备图标模板。
- `resource_knowledge/image/trait/` 保存羁绊图标模板。
- `resource_knowledge/image/augment/` 保存强化符文图标模板。

## 知识库

`knowledge/seasons/current.json` 记录当前版本、抓取时间、来源 URL 和条目数量。`knowledge/champions/`、`knowledge/traits/`、`knowledge/items/`、`knowledge/augments/`、`knowledge/lineups/` 保存结构化条目；`raw/jinchanchan/<version>/` 保存原始 API 响应和 CDN 原图，方便以后核对来源或重新裁剪。

MXU 默认的 `金铲铲资源` 只加载轻量基础 bundle。需要跑棋子、装备、羁绊识别调试时，请在连接设置里切到 `金铲铲资源 + 知识库`，它会先加载 `resource/`，再加载 `resource_knowledge/`。

## 策略自动化

- 当前策略资料放在 `knowledge/strategy/lin_xiaobei_17_4.json`，以林小北 17.4 上分思路为主，本地知识库补充棋子、装备和阵容信息。
- MXU 桌面右侧会显示 `17.4 策略面板`，先展示阶段规则、主线阵容池和当前自动化测试状态。
- 第一阶段已加入完整新手教学测试；它只面向游戏内教程环境，正常日常巡检和识别调试任务仍不会自动买卖棋子、刷新商店、D 牌或站位。
- 新手教学的踩坑复盘、可复用子脚本和后续优化顺序见 `docs/tutorial-automation-playbook.md`。

识别调试任务只做 `Screencap` 和 `TemplateMatch`。这些资料用于本地学习、模板验证和 UI 识别，不会产生对局决策、自动选秀、买卖棋子、上阵或购买确认。

当前版本只把模板用于导航、页面标题确认、返回和截图巡检。事件与商城仍然是巡检任务，不会自动领取或购买。
