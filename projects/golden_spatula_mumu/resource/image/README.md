# 模板素材

本目录保存从 MaaFramework 截图裁剪出的金铲铲模板，基准分辨率为 MuMu `1280x720`，MaaFramework `display_short_side` 为 `720`。

## 原始截图

重新命名后的原始截图保存在 `../../samples/screenshots/`：

- `source_lobby_main.png`
- `source_event_page.png`
- `source_exit_confirm_popup.png`
- `source_codex_rules_popup.png`
- `source_reward_popup.png`
- `source_start_screen.png`
- `source_recharge_popup.png`
- `source_event_current_page.png`
- `source_shop_page.png`
- `source_treasure_page.png`
- `source_codex_page.png`
- `source_summon_page.png`

## 已裁剪模板

- `lobby/nav_event.png`
- `lobby/nav_shop.png`
- `lobby/nav_treasure.png`
- `lobby/nav_codex.png`
- `lobby/nav_summon.png`
- `lobby/left_menu_anchor.png`
- `lobby/red_dot_yellow.png`
- `page/back_arrow.png`
- `page/back_arrow_gold.png`
- `page/event_title.png`
- `page/shop_title.png`
- `page/treasure_title.png`
- `page/codex_title.png`
- `page/summon_title.png`
- `page/start_game_button.png`
- `popup/close_x.png`
- `popup/recharge_close_x.png`
- `popup/exit_cancel_button.png`
- `popup/exit_confirm_title.png`
- `popup/codex_rules_title.png`
- `popup/reward_title.png`
- `popup/reward_ok_button.png`

## 知识库模板

运行 `pnpm golden:fetch-knowledge` 后会在 `../../resource_knowledge/image/` 生成以下目录：

- `champion/{1|2|3|4|5}/`：当前版本棋子头像模板，默认标准化为 `64x64`。
- `item/{basic|completed|special}/`：基础装、常规成装和特殊装备模板，默认标准化为 `48x48`。
- `trait/`：羁绊图标模板，默认标准化为 `48x48`。
- `augment/`：强化符文图标模板，默认标准化为 `48x48`。

每个分类目录会生成 `manifest.json`，记录中文名、slug、来源 URL、版本、用途和建议 ROI。原图保存在 `../../raw/jinchanchan/<version>/image/`，结构化资料保存在 `../../knowledge/`。基础 `resource/` 不再直接携带这些大批量识别模板，日常任务加载会更轻。

当前 pipeline 只使用这些模板做主界面识别、入口点击、页面标题确认、红点截图、页面返回和保守弹窗处理。免费领取、购买确认和对局内操作仍保持禁用。
