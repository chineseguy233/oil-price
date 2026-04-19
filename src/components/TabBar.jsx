// 共享底部 TabBar 组件 — App/RankingsPage/TripPage 共用
const TABS = [
  { id: 'price', name: '油价', icon: '⛽' },
  { id: 'trend', name: '趋势', icon: '📈' },
  { id: 'fuel', name: '油耗', icon: '📊' },
  { id: 'stations', name: '附近', icon: '🔍' },
  { id: 'my', name: '我的', icon: '👤' },
]

export default function TabBar({ activeTab = 'price', onTabChange }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '480px',
      background: '#ffffff',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      padding: '6px 0 calc(6px + env(safe-area-inset-bottom))',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.04)',
      zIndex: 100,
    }}>
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          style={{
            flex: 1,
            padding: '8px 0',
            background: 'none',
            border: 'none',
            textAlign: 'center',
            cursor: 'pointer',
            color: activeTab === t.id ? '#2563eb' : '#9ca3af',
            transition: 'color 0.2s',
          }}
        >
          <div style={{ fontSize: '22px', marginBottom: '2px', lineHeight: 1 }}>{t.icon}</div>
          <div style={{ fontSize: '11px', fontWeight: activeTab === t.id ? '600' : '400' }}>{t.name}</div>
        </button>
      ))}
    </div>
  )
}
