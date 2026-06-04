# Golden Spatula MuMu Project

This is a minimal ProjectInterface package for MXU. It is intended for local
connection and smoke testing only.

## Prepare for MXU

```powershell
pnpm prepare:golden-spatula-mumu
```

The script copies this package to `src-tauri/target/debug`, where the Tauri app
looks for `interface.json` and `resource/` during local development.

Put MaaFramework release binaries under `src-tauri/target/debug/maafw` before
running MXU. The script checks for the runtime but does not download it.

## Included Tasks

- `SmokeTest`: capture one screenshot.
- `ScreencapOnly`: capture the current screen.
- `StartGame`: start `com.tencent.jkchess`, then capture a screenshot.
- `StopGame`: stop `com.tencent.jkchess`.
- `TapKnownPoint`: tap `(640, 360)` on a 1280x720 MuMu screen.
