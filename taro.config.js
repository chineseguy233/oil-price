const path = require('path');
const config = {
  projectName: 'oil-price-app',
  date: '2026-04-19',
  designWidth: 375,
  deviceRatio: {
    375: 1,
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [
    '@tarojs/plugin-framework-react',
  ],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  cacheDirectory: 'node_modules/.taro-cache',
  mini: {
    compile: {
      exclude: [
        // 排除不需要编译的模块
      ],
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      url: {
        enable: true,
        config: {
          limit: 1024,
        },
      },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    output: {
      assetPath: 'static',
    },
    webpackChain(chain) {
      chain.merge({
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'src'),
          },
        },
      })
    },
  },
}

module.exports = config
