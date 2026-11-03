@echo off
rem Runs llama-server in router mode with the presets from models.ini.
rem Extra arguments go straight to llama-server, e.g. run.bat --port 8080
setlocal
cd /d "%~dp0"

rem Use the newest unpacked release in this folder, else llama-server on PATH.
set "server="
for /d %%d in (llama-*) do if exist "%%d\llama-server.exe" set "server=%%~fd\llama-server.exe"
if not defined server for %%s in (llama-server.exe) do set "server=%%~$PATH:s"
if not defined server (
  echo llama-server not found: unpack a llama.cpp release into "%CD%" or put it on PATH 1>&2
  exit /b 1
)

"%server%" --models-preset models.ini %*
exit /b %errorlevel%
