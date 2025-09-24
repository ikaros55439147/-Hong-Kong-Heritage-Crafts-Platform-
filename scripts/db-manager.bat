@echo off
setlocal enabledelayedexpansion

:: PostgreSQL 數據庫管理工具 (Windows 版本)
:: 香港弱勢行業傳承平台

title PostgreSQL 數據庫管理工具

:: 配置變數
set DB_NAME=hk_heritage_crafts
set DB_USER=app_user
set DB_HOST=localhost
set DB_PORT=5432
set BACKUP_DIR=backups

:: 顏色代碼 (Windows 10/11)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "CYAN=[96m"
set "NC=[0m"

:main
cls
echo %CYAN%╔══════════════════════════════════════════════════════════════╗%NC%
echo %CYAN%║                PostgreSQL 數據庫管理工具                      ║%NC%
echo %CYAN%║                香港弱勢行業傳承平台                            ║%NC%
echo %CYAN%╚══════════════════════════════════════════════════════════════╝%NC%
echo.
echo %GREEN%請選擇操作：%N