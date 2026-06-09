@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ========================================
echo MXU Golden Spatula Launcher
echo ========================================
echo.

if not exist "package.json" (
  echo [ERROR] package.json was not found. Put this BAT file in the MXU project root.
  goto fail
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] pnpm was not found in PATH.
  goto fail
)

echo [1/4] Generating tutorial pipeline...
call pnpm golden:generate-tutorial
if errorlevel 1 goto fail

echo.
echo [2/4] Preparing Golden Spatula project package...
call pnpm prepare:golden-spatula-mumu
if errorlevel 1 goto fail

if not exist "src-tauri\target\debug\maafw\MaaFramework.dll" (
  echo [ERROR] MaaFramework.dll was not found under src-tauri\target\debug\maafw.
  echo Put MaaFramework release bin files there, then run this BAT again.
  goto fail
)

echo.
echo [3/4] Refreshing MuMu ADB connection...
set "MUMU_ADB=C:\Program Files\Netease\MuMu\nx_main\adb.exe"
if exist "%MUMU_ADB%" (
  "%MUMU_ADB%" connect 127.0.0.1:16384 >nul 2>nul
  "%MUMU_ADB%" devices
) else (
  echo MuMu ADB was not found at "%MUMU_ADB%"; skipping ADB refresh.
)

echo.
echo [4/4] Opening MXU...
echo Closing old MXU debug process if one is still running...
taskkill /IM mxu.exe /F >nul 2>nul

echo Starting Tauri dev mode. This window must stay open while MXU is running.
call pnpm tauri dev
if errorlevel 1 goto fail
exit /b 0

:fail
echo.
echo Launch failed. Check the messages above.
pause
exit /b 1
