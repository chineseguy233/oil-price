import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'

const API_BASE = 'http://localhost:3000'

function LoginPage() {
  const handleWxLogin = () => {
    if (typeof wx === 'undefined') {
      Taro.showToast({ title: '请在微信环境中使用', icon: 'none' })
      return
    }
    wx.login({
      success: (res) => {
        if (res.code) {
          Taro.request({
            url: `${API_BASE}/api/auth/wxlogin`,
            method: 'POST',
            data: { code: res.code },
            header: { 'Content-Type': 'application/json' },
          }).then(r => r.data).then(data => {
            if (data.success) {
              Taro.setStorageSync('oil_token', data.token)
              Taro.setStorageSync('oil_user', data.user)
              Taro.showToast({ title: '登录成功', icon: 'success' })
              setTimeout(() => {
                Taro.switchTab({ url: '/pages/oil/index' })
              }, 1000)
            } else {
              Taro.showToast({ title: data.error || '登录失败', icon: 'none' })
            }
          }).catch(() => {
            Taro.showToast({ title: '网络错误', icon: 'none' })
          })
        }
      },
      fail: () => {
        Taro.showToast({ title: '微信登录失败', icon: 'none' })
      },
    })
  }

  const handleGuestLogin = () => {
    Taro.setStorageSync('oil_guest', true)
    Taro.setStorageSync('oil_user', { guest: true })
    Taro.showToast({ title: '游客模式', icon: 'success' })
    setTimeout(() => {
      Taro.switchTab({ url: '/pages/oil/index' })
    }, 1000)
  }

  return (
    <View style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
    }}>
      <Text style={{ fontSize: '48px', marginBottom: '16px' }}>⛽</Text>
      <Text style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>油价守护者</Text>
      <Text style={{ fontSize: '14px', color: '#6b7280', marginBottom: '48px' }}>让每一次加油都明智</Text>

      <Button
        onClick={handleWxLogin}
        style={{
          width: '100%',
          background: '#07c160',
          color: 'white',
          borderRadius: '12px',
          fontSize: '16px',
          marginBottom: '16px',
        }}
        type='primary'
      >
        微信一键登录
      </Button>

      <Button
        onClick={handleGuestLogin}
        style={{
          width: '100%',
          background: 'white',
          color: '#374151',
          borderRadius: '12px',
          fontSize: '14px',
          border: '1px solid #e5e7eb',
        }}
        plain
      >
        游客体验
      </Button>

      <Text style={{ fontSize: '11px', color: '#9ca3af', marginTop: '24px', textAlign: 'center' }}>
        登录即表示同意《用户协议》和《隐私政策》
      </Text>
    </View>
  )
}

export default LoginPage