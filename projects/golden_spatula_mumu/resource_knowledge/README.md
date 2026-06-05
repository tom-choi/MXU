# 金铲铲知识库资源

本目录由 `pnpm golden:fetch-knowledge` 生成，是独立的 MaaFramework bundle。

- `pipeline/knowledge.json`：棋子、装备、羁绊识别调试任务。
- `image/champion/`：按费用分类的棋子头像模板。
- `image/item/`：按 `basic`、`completed`、`special` 分类的装备模板。
- `image/trait/`：羁绊图标模板。
- `image/augment/`：强化符文图标模板。

MXU 默认资源只加载 `resource/`。需要识别调试时切换到 `金铲铲资源 + 知识库`，它会按顺序加载 `resource/` 和本目录。
