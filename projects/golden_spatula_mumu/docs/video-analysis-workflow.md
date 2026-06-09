# 金铲铲录像分析流程

这个流程用于把模拟器录像转成可检查的时间线，辅助校准 D 牌、购买棋子、购买经验和教程点击点位。

## 使用

把录制文件放到固定目录后，可以直接跑批次入口：

```powershell
pnpm golden:analyze-recordings
```

默认会扫描：

- `docs/mp4s/`
- `docs/mmors/`

脚本会自动把 `金铲铲之战(2).mp4` 和 `金铲铲之战_2.mmor` 归到同一个 `projects/golden_spatula_mumu/analysis/video/2` 输出目录。已有 `analysis.json` / `operations.json` 时会跳过重算；如果需要重新分析所有录制文件，可以加 `--force`。批次结束后会自动跑 `golden:recording-regression`，并写入 `projects/golden_spatula_mumu/analysis/recording-batch-analysis.json`。

也可以单独分析某段录像：

```powershell
pnpm golden:analyze-video -- "docs\mp4s\金铲铲之战(1).mp4" --fps 2 --scene-threshold 14 --region-threshold 12 --max-frames 80
```

输出会写入：

- `projects/golden_spatula_mumu/analysis/video/<video-name>/analysis.md`
- `projects/golden_spatula_mumu/analysis/video/<video-name>/analysis.json`
- `projects/golden_spatula_mumu/analysis/video/<video-name>/frames/`

如果同时录制了 MuMu 操作文件，也可以把 `.mmor` 转成点击时间线：

```powershell
pnpm golden:analyze-mmor -- "docs\mmors\金铲铲之战_2.mmor" --out "projects\golden_spatula_mumu\analysis\video\2"
```

输出会写入：

- `projects/golden_spatula_mumu/analysis/video/<video-name>/operations.md`
- `projects/golden_spatula_mumu/analysis/video/<video-name>/operations.json`

`.mmor` 中的 `press_rel` 坐标由脚本自动推断。第二段实录使用的是直向短边坐标再旋转回 1280x720 画面，最终选择 `rotatedClockwise`；报告里会列出所有候选坐标变换的分数、落在商店/刷新/购买经验 ROI 的次数，以及每个商店槽位的点击中位点。

## 本次校准结论

来源录像：`docs/mp4s/金铲铲之战(1).mp4`，分辨率 `1280x720`。

关键帧：

- `02:24.500`：常规商店五格清楚出现。
- `03:11.000`：商店底部按钮、购买经验和刷新按钮清楚出现。

校准值：

- 商店棋子识别 ROI：`[325, 580, 790, 125]`
- 刷新按钮点击点：`[286, 681, 2, 2]`
- 购买经验点击点：`[286, 615, 2, 2]`
- 刷新按钮 guard ROI：`[180, 640, 140, 80]`
- 购买经验 guard ROI：`[180, 575, 140, 80]`
- 动态 D 牌商店槽位 ROI 与固定购买点：
  - 1 号位：ROI `[325, 580, 158, 125]`，购买点 `[404, 642, 2, 2]`
  - 2 号位：ROI `[483, 580, 158, 125]`，购买点 `[562, 642, 2, 2]`
  - 3 号位：ROI `[641, 580, 158, 125]`，购买点 `[720, 642, 2, 2]`
  - 4 号位：ROI `[799, 580, 158, 125]`，购买点 `[878, 642, 2, 2]`
  - 5 号位：ROI `[957, 580, 158, 125]`，购买点 `[1036, 642, 2, 2]`

这些点位已经同步到：

- `src/components/GoldenSpatulaAssistantPanel.tsx`
- `projects/golden_spatula_mumu/resource/pipeline/main.json`
- `scripts/golden-spatula-generate-tutorial-pipeline.mjs`
- `projects/golden_spatula_mumu/resource/pipeline/tutorial.json`

按钮模板来自本次录像关键帧：

- `resource/image/ingame/buy_xp_button_idle.png`
- `resource/image/ingame/buy_xp_button_active.png`
- `resource/image/ingame/shop_refresh_button_idle.png`
- `resource/image/ingame/shop_refresh_button_active.png`

模板裁剪来源保存在：

- `samples/screenshots/source_in_game_shop_idle.png`
- `samples/screenshots/source_in_game_shop_active.png`

当前 `AutoRollShop*`、`AutoBuyExperienceOnce/Three/Five`、`Tutorial_Stage1BuyXp` 和 `Tutorial_Stage5Refresh*` 都会先匹配对应按钮模板，再执行固定点击。

`AutoBuyExperienceOnce/Three/Five` 会分别执行 1/3/5 次购买经验点击；每次点击前都会确认购买经验按钮仍可见，无法匹配时转入 `AutoBuyExperienceNotReady` 并保存诊断截图。

金铲铲辅助面板的「策略 / 对局助手」内也提供 1/3/5 次购买经验入口，会直接提交对应的 `AutoBuyExperience*` 任务。

UI 内的动态 `D 牌 + 购买` 会按「目标顺序 × 1-5 号商店槽位」逐一识别。命中后不再点击模板中心，而是点击对应槽位的固定购买点；callback 会记录 `slotIndex` / `slotLabel`，面板状态会显示本次买到的槽位，例如 `#3`。

点击购买后会在同一槽位再次做反向模板识别：

- 目标头像消失：记录 `buyConfirmed`，表示购买已确认。
- 目标头像仍存在：记录 `buyUnconfirmed` 并保存诊断截图，表示点击执行了但购买未确认。

动态 D 牌刷新前也会再次匹配刷新按钮模板；如果刷新按钮不可见，会进入 `AutoRollBuy_Roll*_NotReady`，保存 `auto_roll_buy_roll*_refresh_not_ready` 诊断截图，并上报 `goldenSpatula.roll` 的 `notReady` focus，让面板停止本次 D 牌状态并保留原因。

首版确认逻辑只验证「同槽位目标头像是否消失」，不额外判断金币、备战席容量或商店整体变化。

## 第二段实录校验

来源录像：`docs/mp4s/金铲铲之战(2).mp4`，对应操作文件：`docs/mmors/金铲铲之战_2.mmor`。

分析结果：

- 录像时长 `858.79s`，抽样 `1716` 帧，候选变化点 `223` 个。
- `.mmor` 操作时长 `858.78s`，共 `3498` 个 action，归并出 `365` 个手势。
- 自动选择坐标变换：`rotatedClockwise`。
- 商店区域操作 `87` 次；其中 1-5 号商店槽位分别为 `23 / 28 / 20 / 7 / 9` 次。
- 购买经验按钮操作 `1` 次，中位点 `[292, 596.81]`，与当前点击点 `[286, 615]` 距离 `19.15`。
- 刷新按钮操作 `3` 次，中位点 `[246, 694.13]`，与当前点击点 `[286, 681]` 距离 `42.1`，仍在 guard ROI 内。
- 近距离连续商店点击间隔中位数 `0.944s`，P25 `0.664s`。
- 刷新后下一次商店点击最短 `1.696s`，中位数 `2.192s`。
- 购买经验后下一次商店点击 `0.64s`。

这段实录已经作为 `golden:test-mmor-calibration` 的校验基准，用来检查「真实操作轨迹」和当前 D 牌/购买经验 ROI 是否同步，也会检查 1-5 号商店槽位的固定购买点是否落在对应 ROI 内，并且没有明显偏离实录点击分布。刷新后的等待已根据这段证据调为 `1300ms`；配合第一次目标识别 `500ms` timeout，总窗口覆盖实录里最短的刷新后商店更新时间。

## 动态 D 牌/升级 runner

`golden:auto-roll` 会复用前端同一套动态管线生成逻辑，先生成 `pipeline_override`，再交给现有 MXU API runner。默认是 dry-run，只检查和输出管线，不会点击模拟器。

```powershell
pnpm golden:auto-roll -- --preflight-only --roll-count 3 --lineup 4341 --write-override "src-tauri\target\debug\auto-roll-buy.json" --report-file "src-tauri\target\debug\auto-roll-preflight.json"
pnpm golden:auto-roll -- --dry-run --roll-count 3 --lineup 4341 --report-file "src-tauri\target\debug\auto-roll-report.json"
pnpm golden:auto-roll -- --dry-run --lineup "木灵薇古丝九五" --lineup-target-mode main
pnpm golden:auto-roll -- --dry-run --level-first --xp-count 3 --roll-count 3 --lineup 4341 --write-override "src-tauri\target\debug\auto-roll-buy.json"
```

确认 MuMu 已经停在对局商店、ADB 可连接、且目标模板来自 `resource_knowledge/image/` 后，才使用 `--run`：

```powershell
pnpm golden:readiness -- --report-file "src-tauri\target\debug\golden-spatula-readiness-report.json"
pnpm golden:auto-roll -- --run --roll-count 3 --lineup 4341
pnpm golden:auto-roll -- --run --level-first --xp-count 3 --roll-count 3 --lineup 4341
```

`--lineup` 会从本地 `knowledge/lineups/index.json` 和对应详情 JSON 读取推荐阵容。默认 `--lineup-target-mode core` 只取主 C + 前排；也可以设为 `main` 只 D 主 C，或 `all` 取整套阵容中有本地模板的棋子。

`--champion` 会从本地 `resource_knowledge/image/champion/manifest.json` 查找模板；如果需要手动指定模板，也可以用 `--target "名称=champion/5/xxx.png"`。

`--report-file` 会输出 `mxu.goldenSpatula.autoRollReport` JSON，记录解析出的阵容、目标模板、override SHA-256、节点统计和 dry-run/real-run 结果；real-run 还会保存子 runner 的退出码、耗时、stdout/stderr 尾部输出，并嵌入底层 `mxu.goldenSpatula.runnerSummary`（API、设备、资源、任务和截图 artifact 摘要）。实机排查时优先保留这份报告。

`--preflight-only` 只生成动态 override、执行模板/点位/录像证据预检并写报告，不会连接 MXU API，也不会点击模拟器。正式 `--run` 前建议先跑一次；报告状态为 `preflight-succeeded` 时再进入实机提交。

`golden:readiness` 会连接 MXU API、扫描 ADB、创建临时 Maa 实例、加载 `resource` + `resource_knowledge`，并抓一张截图写到 `src-tauri/target/debug/golden-spatula-readiness.png`。它不提交任务、不点击模拟器；如果发现已有 Maa 任务正在运行，会默认失败，避免和正在执行的任务互相干扰。

runner 在 dry-run 和 real-run 前都会执行 `preflight`：

- 检查目标棋子模板是否存在于 `resource_knowledge/image/`。
- 检查购买经验和刷新按钮模板是否存在于 `resource/image/`。
- 检查 1-5 号商店槽位固定购买点是否落在对应 ROI 内。
- 检查动态 override 的买牌节点是否使用固定槽位购买点，而不是模板中心点。
- 如果第二段 `.mmor` 操作分析存在，会检查固定购买点是否明显偏离实录点击中位点。
- 如果第二段 `.mmor` 操作分析存在，也会检查买牌、刷新、购买经验后的等待时间是否符合实录节奏。

`preflight.status` 为 `fail` 时不会提交 real-run；报告状态会写成 `preflight-failed`，优先修复失败项后再跑。

实机模式会载入 `resource` 与 `resource_knowledge`，并提交：

- `AutoRollAndBuyTargets`：识别目标头像、点击购买、确认头像消失、必要时刷新。
- `AutoLevelRollAndBuyTargets`：先点击购买经验，再接入 `AutoRollAndBuyTargets`。

`AutoRollAndBuyTargets` 进入目标识别前会先执行 `AutoRollBuy_ShopReady`：通过刷新按钮模板确认当前确实在对局商店画面。若商店/刷新控制不可见，会进入 `AutoRollBuy_InitialShopNotReady`，保存 `auto_roll_buy_initial_shop_not_ready` 诊断截图，并上报 `goldenSpatula.roll` 的 `notReady`，不会继续扫描或点击棋子。

底层 `golden-spatula-run-red-dot.mjs` 也支持 `--pipeline-override-file` 与 `--load-knowledge-resource`，可用于复现 UI 生成的动态任务。

## 检查

```powershell
pnpm golden:test-automation
pnpm golden:test-video-calibration
pnpm golden:test-mmor-calibration
pnpm golden:recording-regression
pnpm golden:test-ingame-template-match
pnpm golden:test-roll-pipeline
pnpm golden:test-dynamic-pipeline-graph
pnpm golden:test-dynamic-runner
pnpm golden:test-readiness-runner
pnpm golden:test-battle-automation
pnpm golden:test-automation-events
pnpm golden:test-automation-scenarios
pnpm golden:audit-automation
pnpm golden:generate-tutorial:check
```

`golden:test-video-calibration` 会把本次录像分析、关键帧、裁剪配方、按钮模板尺寸、静态 `main.json` 点位和动态 D 牌/购买经验 TypeScript 常量放在一起检查，确保录像校准值没有在不同执行路径里漂移。

`golden:test-mmor-calibration` 会读取第二段录像分析和 `.mmor` 操作分析，检查操作文件坐标变换、商店槽位点击分布、刷新按钮和购买经验按钮是否仍与当前 ROI/点击点位对齐。

`golden:recording-regression` 会扫描 `projects/golden_spatula_mumu/analysis/video/*` 下的所有录像分析，输出 `projects/golden_spatula_mumu/analysis/recording-regression.json` 和 `.md` 总表。它会把每段录像的候选事件、`.mmor` 坐标变换、商店槽位覆盖、刷新/购买经验点位漂移和当前 D/XP 管线等待时间放在一起检查；没有 `.mmor` 的旧录像只会记为 warning，不会阻止测试继续。

`golden:test-ingame-template-match` 会把购买经验与刷新按钮模板放回对应来源截图的 guard ROI 中做离线滑窗匹配，确认模板能在校准区域内命中原始按钮位置。

`golden:test-roll-pipeline` 会直接生成并解析动态 D 牌购买 override，检查目标扫描、购买确认、未确认截图、刷新衔接和空目标行为。它也会生成「购买经验后继续 D 牌购买」override，检查 1/3/5 次经验购买 guard、`goldenSpatula.xp` focus、经验购买结束后接入 `AutoRollAndBuyTargets` 的链路。

`golden:test-dynamic-pipeline-graph` 会生成所有 1/3/5 次 D 牌，以及 1/3/5 次购买经验 × 1/3/5 次 D 牌组合，检查动态 override 的 `next` / `on_error` 引用、全节点可达性、ROI 和点击点位形状、以及所有 focus payload 的 scope/display/event。

`golden:test-dynamic-runner` 会通过 `golden:auto-roll --dry-run` 生成普通 D 牌与「购买经验后继续 D 牌」两种可提交 override，检查目标 focus、经验点击节点和缺少目标时的保护错误。

它也会检查 runner 的 `preflight` 报告：正常阵容必须通过模板/点位预检；手动传入不存在的模板路径时必须失败并写出 `preflight-failed` 报告。

`golden:test-battle-automation` 会检查静态对局任务、购买经验任务、动态任务占位入口、录像裁剪模板和裁剪来源截图是否一致。

`golden:test-automation-events` 会模拟 Maa focus callback，检查 D 牌和购买经验的状态事件解析与合并。

`golden:test-automation-scenarios` 会从实际生成的「购买经验后继续 D 牌购买」override 中读取 focus payload，模拟「升级 3 次 → D 牌命中购买 → 刷新 → 未命中 → 完成」以及「经验按钮不可用后停止」两条状态流，确认面板的 XP/D 牌状态不会串线。

`golden:test-automation` 是当前金铲铲自动化测试总入口，会串起视频校准、`.mmor` 操作校准、按钮模板离线匹配、动态 D 牌测试、动态 override 图验证、静态对局任务测试、callback 事件测试、动态场景测试、结构稽核和教程生成检查。

`golden:audit-automation` 会检查本次录像校准出的刷新和购买经验点位，避免后续改动不小心回退。
