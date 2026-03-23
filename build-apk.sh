#!/bin/bash

# 油价守护者 - Android APK 打包脚本
# 
# 使用方法：
# 1. 安装 Java JDK 17: https://adoptium.net/
# 2. 安装 Android SDK: https://developer.android.com/studio
# 3. 设置环境变量: 
#    export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-17.0.x"
#    export ANDROID_HOME="C:/Users/你的用户名/AppData/Local/Android/Sdk"
# 4. 运行本脚本: ./build-apk.sh

echo "=========================================="
echo "  油价守护者 - Android APK 打包工具"
echo "=========================================="

# 检查Java
if ! command -v java &> /dev/null; then
    echo "❌ 未找到Java，请先安装 JDK 17"
    echo "   下载地址: https://adoptium.net/"
    exit 1
fi

echo "✅ Java已安装: $(java -version 2>&1 | head -1)"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到Node.js，请先安装"
    exit 1
fi

echo "✅ Node.js已安装: $(node --version)"

# 安装依赖
echo ""
echo "📦 安装项目依赖..."
npm install

# 构建Web
echo ""
echo "🔨 构建Web应用..."
npm run build

# 同步到Android
echo ""
echo "📱 同步到Android..."
npx cap sync android

# 构建APK
echo ""
echo "🔧 构建APK..."
cd android
./gradlew assembleDebug

# 检查APK
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ APK构建成功！"
    echo "=========================================="
    echo ""
    echo "📂 APK位置: android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "安装到手机："
    echo "  1. 数据线连接手机，开启USB调试"
    echo "  2. 运行: adb install app/build/outputs/apk/debug/app-debug.apk"
    echo "  3. 或者直接发送APK文件到手机安装"
else
    echo "❌ APK构建失败，请检查错误信息"
    exit 1
fi
