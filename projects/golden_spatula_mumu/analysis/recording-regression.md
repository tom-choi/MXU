# Golden Spatula Recording Regression

Generated: 2026-06-09T07:15:14.966Z
Analysis root: `projects/golden_spatula_mumu/analysis/video`
Overall status: **warn**

## Recordings

| Recording | Status | Video events | MMOR gestures | Shop gestures | Transform        |
| --------- | ------ | -----------: | ------------: | ------------: | ---------------- |
| 1         | warn   |           61 |             - |             - | -                |
| 2         | pass   |          223 |           365 |            87 | rotatedClockwise |

## 1

Directory: `projects/golden_spatula_mumu/analysis/video/1`

| Status | Key                     | Message                           |
| ------ | ----------------------- | --------------------------------- |
| pass   | `video:resolution`      | Video resolution is 1280x720      |
| pass   | `video:duration`        | Video duration is 282.47s         |
| pass   | `video:event-coverage`  | Video candidate event count is 61 |
| warn   | `mmor:analysis-missing` | No operations.json was found      |

## 2

Directory: `projects/golden_spatula_mumu/analysis/video/2`

| Status | Key                               | Message                                           |
| ------ | --------------------------------- | ------------------------------------------------- |
| pass   | `video:resolution`                | Video resolution is 1280x720                      |
| pass   | `video:duration`                  | Video duration is 858.79s                         |
| pass   | `video:event-coverage`            | Video candidate event count is 223                |
| pass   | `mmor:coordinate-transform`       | Selected coordinate transform is rotatedClockwise |
| pass   | `mmor:coordinate-transform-score` | Selected transform score 2686, best score 2686    |
| pass   | `mmor:actions`                    | 3498 actions                                      |
| pass   | `mmor:gestures`                   | 365 gestures                                      |
| pass   | `mmor:shop-coverage`              | 87 shop gestures                                  |
| pass   | `mmor:refresh-coverage`           | 3 refresh gestures                                |
| pass   | `mmor:xp-coverage`                | 1 buy XP gestures                                 |
| pass   | `mmor:slot1-coverage`             | Slot 1 has 23 recorded gestures                   |
| pass   | `mmor:slot2-coverage`             | Slot 2 has 28 recorded gestures                   |
| pass   | `mmor:slot3-coverage`             | Slot 3 has 20 recorded gestures                   |
| pass   | `mmor:slot4-coverage`             | Slot 4 has 7 recorded gestures                    |
| pass   | `mmor:slot5-coverage`             | Slot 5 has 9 recorded gestures                    |
| pass   | `target:buyXp`                    | buy XP target drift is 19.15px                    |
| pass   | `target:refresh`                  | refresh target drift is 42.1px                    |
| pass   | `target:slot1`                    | Slot 1 target drift is 45.12px                    |
| pass   | `target:slot2`                    | Slot 2 target drift is 46.48px                    |
| pass   | `target:slot3`                    | Slot 3 target drift is 46.76px                    |
| pass   | `target:slot4`                    | Slot 4 target drift is 34.06px                    |
| pass   | `target:slot5`                    | Slot 5 target drift is 29.21px                    |
| pass   | `timing:buy-click-delay`          | Buy click post_delay is 650ms                     |
| pass   | `timing:refresh-window`           | Refresh window is 1800ms                          |
| pass   | `timing:refresh-delay-cap`        | Refresh post_delay is 1300ms                      |
| pass   | `timing:xp-delay`                 | XP post_delay is 900ms                            |
