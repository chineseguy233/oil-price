module.exports = {
  pages: [
    'pages/oil/index',
    'pages/trend/index',
    'pages/trip/index',
    'pages/fuel/index',
    'pages/nearby/index',
    'pages/my/index',
    'pages/login/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '油价守护者',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#2563eb',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/oil/index',
        text: '油价',
        iconPath: 'assets/tab-price.png',
        selectedIconPath: 'assets/tab-price-active.png',
      },
      {
        pagePath: 'pages/trend/index',
        text: '趋势',
        iconPath: 'assets/tab-trend.png',
        selectedIconPath: 'assets/tab-trend-active.png',
      },
      {
        pagePath: 'pages/trip/index',
        text: '油费',
        iconPath: 'assets/tab-trip.png',
        selectedIconPath: 'assets/tab-trip-active.png',
      },
      {
        pagePath: 'pages/fuel/index',
        text: '油耗',
        iconPath: 'assets/tab-fuel.png',
        selectedIconPath: 'assets/tab-fuel-active.png',
      },
      {
        pagePath: 'pages/my/index',
        text: '我的',
        iconPath: 'assets/tab-my.png',
        selectedIconPath: 'assets/tab-my-active.png',
      },
    ],
  },
  permission: {
    'scope.userLocation': {
      desc: '你的位置信息将用于查找附近加油站',
    },
  },
  requiredPrivateInfos: ['chooseAddress', 'getLocation'],
  usingComponents: {},
}
