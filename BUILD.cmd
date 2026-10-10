@echo off
cd /d "%~dp0"
where bun >nul 2>nul
if errorlevel 1 exit /b 1
call bun install --frozen-lockfile
if errorlevel 1 exit /b 1
call bun run typecheck
if errorlevel 1 exit /b 1
call bun test
if errorlevel 1 exit /b 1
call bun run build
exit /b %errorlevel%
