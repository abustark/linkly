@echo off
setlocal

echo Set your OpenRouter API key for future terminals.
set /p OR_KEY=Paste OPENROUTER_API_KEY: 

if "%OR_KEY%"=="" (
    echo No key entered.
    exit /b 1
)

setx OPENROUTER_API_KEY "%OR_KEY%" >nul
echo Saved OPENROUTER_API_KEY.
echo Close and reopen terminal before using model.bat.
