@echo off
echo ==========================================
echo   油价守护者 - Android SDK 安装脚本
echo ==========================================

REM 检查Java
java -version >nul 2>&1
if errorlevel 1 (
    echo 请先安装JDK 12+
    pause
    exit /b 1
)

echo 正在安装Android SDK组件...

REM 设置路径
set ANDROID_HOME=%~dp0android-sdk
set JAVA_HOME=%ProgramFiles%\Java\jdk-12.0.2
if exist "%JAVA_HOME%" goto :found_java
set JAVA_HOME=%ProgramFiles(x86)%\Java\jdk-12.0.2
:found_java

echo Java路径: %JAVA_HOME%

REM 解压SDK工具
echo 正在解压SDK工具...
powershell -Command "Expand-Archive -Path 'cmdline-tools.zip' -DestinationPath '%TEMP%' -Force"

REM 安装SDK组件
echo 正在安装SDK组件...
call %~dp0android-sdk\cmdline-tools\latest\bin\sdkmanager.bat "platform-tools" "platforms;android-34" "build-tools;34.0.0"

REM 接受许可
echo y | call %~dp0android-sdk\cmdline-tools\latest\bin\sdkmanager.bat --licenses

echo.
echo ==========================================
echo   SDK安装完成！
echo ==========================================
echo.
pause
