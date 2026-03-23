@echo off
chcp 65001 >nul
echo ==========================================
echo   油价守护者 - APK打包工具
echo ==========================================
echo.

REM 使用用户已有的JDK 12
set JAVA_HOME=C:\Program Files\Java\jdk-12.0.2
set PATH=%JAVA_HOME%\bin;%PATH%

java -version >nul 2>&1
if errorlevel 1 (
    echo ❌ JDK路径不对，请修改脚本中的JAVA_HOME
    pause
    exit /b 1
)

echo ✅ JDK: 
java -version 2>&1 | findstr /i "version"

REM 设置Android SDK
set ANDROID_HOME=%~dp0android-sdk

REM 解压SDK工具（如果需要）
if not exist "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" (
    echo ⚠️ 正在解压Android SDK工具...
    powershell -Command "Expand-Archive -Path 'cmdline-tools.zip' -DestinationPath '%TEMP%' -Force"
    if exist "%TEMP%\cmdline-tools" (
        move /y "%TEMP%\cmdline-tools" "%ANDROID_HOME%\cmdline-tools" >nul 2>&1
        mkdir "%ANDROID_HOME%\cmdline-tools\latest" 2>nul
        move /y "%ANDROID_HOME%\cmdline-tools\cmdline-tools" "%ANDROID_HOME%\cmdline-tools\latest" >nul 2>&1
    )
)

if exist "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" (
    echo ✅ Android SDK已就绪
) else (
    echo ⚠️ 正在安装Android SDK...
    if not exist "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" (
        echo 请先下载Android SDK命令行工具
        pause
        exit /b 1
    )
)

REM 安装必要的SDK组件
echo 📦 检查SDK组件...
if not exist "%ANDROID_HOME%\platforms\android-34" (
    echo 正在安装Android平台...
    echo y | "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" "platforms;android-34" "build-tools;34.0.0" "platform-tools" 2>nul
)

REM 进入项目目录
cd /d "%~dp0"

echo.
echo 📦 安装依赖...
call npm install 2>nul

echo.
echo 🔨 构建Web...
call npm run build

echo.
echo 📱 同步到Android...
call npx cap sync android

echo.
echo 🔧 构建APK...
cd android
call gradlew.bat assembleDebug

REM 检查APK
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo ==========================================
    echo   ✅ APK构建成功！
    echo ==========================================
    echo.
    echo 📂 APK: %CD%\app\build\outputs\apk\debug\app-debug.apk
    echo.
) else (
    echo.
    echo ❌ 构建失败
    cd ..
    call gradlew.bat assembleDebug --stacktrace
)

pause
