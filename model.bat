@echo off
setlocal EnableDelayedExpansion

color 0A
cls
echo ===============================
echo        AI MODEL SELECTOR
echo ===============================

if "%OPENROUTER_API_KEY%"=="" (
    echo OPENROUTER_API_KEY is not set.
    echo Run set-openrouter-key.bat once, then reopen terminal.
    echo.
    pause
    exit /b 1
)

echo 1. GLM 4.5 Air
echo 2. Qwen3 Coder
echo 3. Gemma 4
echo 4. DeepSeek Chat
echo 5. GPT OSS 120B
echo 6. Laguna
echo 7. Inclusion AI
echo 8. Llama Nemotron
echo ===============================
set /p choice=Enter choice (1-8): 

if "%choice%"=="1" (
    set "MODEL=z-ai/glm-4.5-air:free"
    set "PROFILE=GLM 4.5 Air"
)
if "%choice%"=="2" (
    set "MODEL=qwen/qwen3-coder:free"
    set "PROFILE=Qwen3 Coder"
)
if "%choice%"=="3" (
    set "MODEL=google/gemma-4-31b-it:free"
    set "PROFILE=Gemma 4"
)
if "%choice%"=="4" (
    set "MODEL=deepseek/deepseek-chat"
    set "PROFILE=DeepSeek Chat"
)
if "%choice%"=="5" (
    set "MODEL=openai/gpt-oss-120b:free"
    set "PROFILE=GPT OSS 120B"
)
if "%choice%"=="6" (
    set "MODEL=poolside/laguna-m.1:free"
    set "PROFILE=Laguna"
)
if "%choice%"=="7" (
    set "MODEL=inclusionai/ling-2.6-1t:free"
    set "PROFILE=Inclusion AI"
)
if "%choice%"=="8" (
    set "MODEL=nvidia/llama-nemotron-embed-vl-1b-v2:free"
    set "PROFILE=Llama Nemotron"
)

if not defined MODEL (
    echo Invalid choice.
    pause
    exit /b 1
)

(
echo {
echo   "provider": "openrouter",
echo   "apiKey": "%OPENROUTER_API_KEY%",
echo   "model": "!MODEL!",
echo   "systemPrompt": "You are using model: !PROFILE!. You are a professional frontend developer who writes clean, modern UI code."
echo }
) > .opencode.json

echo.
echo Active model: !MODEL!
echo Launching OpenCode...
echo.
opencode
