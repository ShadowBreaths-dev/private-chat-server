@echo off
REM ================================================================
REM OREO Chat Server - Git Setup Script for Render Deployment
REM ================================================================

echo.
echo ================================================================
echo   🍪 OREO Chat Server - Git Setup for Render
echo ================================================================
echo.

cd /d "%~dp0"

REM Check if git is initialized
if not exist ".git" (
    echo Initializing Git repository...
    git init
    echo.
)

REM Check current status
echo Current Git Status:
git status --short
echo.

REM Ask user for GitHub username
set /p GITHUB_USERNAME="Enter your GitHub username: "
if "%GITHUB_USERNAME%"=="" (
    echo Error: GitHub username is required
    pause
    exit /b 1
)

echo.
echo Setting up remote repository...
echo.

REM Check if origin exists
git remote get-url origin >nul 2>&1
if %errorlevel% equ 0 (
    echo Remote 'origin' already exists
    git remote get-url origin
    echo.
    set /p UPDATE_REMOTE="Do you want to update it? (y/n): "
    if /i "%UPDATE_REMOTE%"=="y" (
        git remote set-url origin https://github.com/%GITHUB_USERNAME%/oreo-chat-server.git
    )
) else (
    git remote add origin https://github.com/%GITHUB_USERNAME%/oreo-chat-server.git
)

echo.
echo Remote URL: 
git remote get-url origin
echo.

REM Rename branch to main
echo Renaming branch to 'main'...
git branch -M main
echo.

REM Add all files
echo Adding all files...
git add .
echo.

REM Commit
echo Committing changes...
git commit -m "Complete Oreo messaging app with WebRTC and chat options"
echo.

REM Show instructions for pushing
echo ================================================================
echo   ✅ Git Setup Complete!
echo ================================================================
echo.
echo Next steps:
echo.
echo 1. Create a new repository on GitHub:
echo    https://github.com/new
echo.
echo    Repository name: oreo-chat-server
echo    Description: Real-time messaging app with WebRTC calls
echo    Visibility: Public (or Private)
echo    DO NOT initialize with README
echo.
echo 2. Then push your code:
echo.
echo    git push -u origin main
echo.
echo 3. Deploy on Render:
echo    - Go to https://render.com
echo    - New + ^> Web Service
echo    - Connect your GitHub repository
echo    - Build: npm install
echo    - Start: node server.js
echo.
echo ================================================================
echo.
pause
