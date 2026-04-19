import { useState, useEffect, useRef } from 'react'
import { getVehicles, addVehicle, updateVehicle, deleteVehicle, getSelectedVehicleId, setSelectedVehicleId } from '../utils/vehicles'

const OIL_TYPES = [
  { key: '92', label: '92#汽油' },
  { key: '95', label: '95#汽油' },
  { key: '98', label: '98#汽油' },
  { key: '0', label: '0#柴油' },
]

const OIL_COLORS = { '92': '#3b82f6', '95': '#8b5cf6', '98': '#f59e0b', '0': '#10b981' }

// ========== 添加/编辑弹窗 ==========
export function VehicleEditModal({ vehicle, onClose, onSaved }) {
  // vehicle 为 null 表示添加模式，有值表示编辑模式
  const [name, setName] = useState(vehicle?.name || '')
  const [oilType, setOilType] = useState(vehicle?.oilType || '92')
  const [fuelConsumption, setFuelConsumption] = useState(
    vehicle?.fuelConsumption != null ? String(vehicle.fuelConsumption) : '7.5'
  )
  const [error, setError] = useState('')
  const nameRef = useRef(null)

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 100)
  }, [])

  const handleSave = () => {
    if (!name.trim()) {
      setError('请输入车辆名称')
      nameRef.current?.focus()
      return
    }
    const fc = parseFloat(fuelConsumption)
    if (isNaN(fc) || fc <= 0 || fc > 100) {
      setError('油耗需在 0.1~100 之间')
      return
    }
    if (vehicle) {
      updateVehicle(vehicle.id, { name, oilType, fuelConsumption: fc })
    } else {
      addVehicle({ name, oilType, fuelConsumption: fc })
    }
    onSaved?.()
    onClose()
  }

  return (
    <>
      {/* 遮罩 */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      }} onClick={onClose} />

      {/* 弹窗 */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderRadius: '20px 20px 0 0',
        padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
        zIndex: 1001, maxWidth: '480px', margin: '0 auto',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
      }}>
        {/* 标题栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#1f2937' }}>
            {vehicle ? '编辑车辆' : '添加车辆'}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '22px',
            cursor: 'pointer', padding: '4px', color: '#9ca3af',
          }}>✕</button>
        </div>

        {/* 车辆名称 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>车辆名称</div>
          <input
            ref={nameRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="例如：我的速腾 / 家用 SUV"
            style={{
              width: '100%', padding: '12px 14px',
              borderRadius: '12px', border: '1.5px solid #e5e7eb',
              fontSize: '15px', color: '#1f2937', outline: 'none',
              boxSizing: 'border-box', background: '#f9fafb',
            }}
          />
        </div>

        {/* 油号选择 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>选择油号</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {OIL_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setOilType(t.key)}
                style={{
                  padding: '10px 4px',
                  borderRadius: '12px',
                  border: oilType === t.key ? 'none' : '1.5px solid #e5e7eb',
                  background: oilType === t.key
                    ? `linear-gradient(135deg, ${OIL_COLORS[t.key]}, ${OIL_COLORS[t.key]}cc)`
                    : '#f9fafb',
                  color: oilType === t.key ? 'white' : '#6b7280',
                  fontWeight: oilType === t.key ? 'bold' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: oilType === t.key ? `0 4px 12px ${OIL_COLORS[t.key]}44` : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 油耗输入 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>
            油耗（L/百公里）
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              value={fuelConsumption}
              onChange={e => setFuelConsumption(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              placeholder="例如：7.5"
              style={{
                flex: 1, padding: '12px 14px',
                borderRadius: '12px', border: '1.5px solid #e5e7eb',
                fontSize: '15px', color: '#1f2937', outline: 'none',
                boxSizing: 'border-box', background: '#f9fafb',
              }}
            />
            <span style={{ fontSize: '14px', color: '#6b7280', flexShrink: 0 }}>L/百公里</span>
          </div>
          {error && (
            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>{error}</div>
          )}
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          style={{
            width: '100%', padding: '14px',
            borderRadius: '14px', border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white', fontSize: '15px', fontWeight: 'bold',
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
          }}
        >
          {vehicle ? '保存修改' : '添加车辆'}
        </button>
      </div>
    </>
  )
}

// ========== 车辆选择器（切换当前车辆用） ==========
export function VehicleSelector({ selectedVehicle, onChange }) {
  const [open, setOpen] = useState(false)
  const [vehicles, setVehicles] = useState(getVehicles)

  // 每次打开下拉时重新读取最新车辆列表
  // 依赖 selectedVehicle.id 确保：编辑保存后下次打开能读到新数据
  useEffect(() => {
    if (open) setVehicles(getVehicles())
  }, [open, selectedVehicle?.id])

  return (
    <div style={{ position: 'relative' }}>
      {/* 当前车辆显示 */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 14px', borderRadius: '12px',
          border: '1.5px solid #e5e7eb',
          background: '#f9fafb', cursor: 'pointer',
          fontSize: '14px', color: '#374151',
          minWidth: '160px',
        }}
      >
        <span>🚗</span>
        <span style={{ flex: 1, textAlign: 'left', fontWeight: '500' }}>
          {selectedVehicle ? selectedVehicle.name : '选择车辆'}
        </span>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* 下拉列表 */}
      {open && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
            onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'white', borderRadius: '14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000, overflow: 'hidden', minWidth: '200px',
          }}>
            {vehicles.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                暂无车辆
              </div>
            ) : (
              vehicles.map(v => (
                <div
                  key={v.id}
                  onClick={() => { onChange(v); setOpen(false) }}
                  style={{
                    padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer',
                    background: selectedVehicle?.id === v.id ? '#eff6ff' : 'transparent',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '14px', color: '#374151',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🚗</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{v.name}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {v.oilType}# · {v.fuelConsumption}L/百公里
                    </div>
                  </div>
                  {selectedVehicle?.id === v.id && (
                    <span style={{ color: '#2563eb', fontSize: '14px' }}>✓</span>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ========== 车辆管理卡片（嵌入「我的」Tab） ==========
export function VehicleManager() {
  const [vehicles, setVehicles] = useState(getVehicles())
  const [editing, setEditing] = useState(null) // null=添加, vehicle=编辑
  const [confirmDelete, setConfirmDelete] = useState(null)

  const reload = () => setVehicles(getVehicles())

  const handleDelete = (vehicle) => {
    deleteVehicle(vehicle.id)
    setConfirmDelete(null)
    reload()
  }

  return (
    <>
      <div style={{
        background: 'white', borderRadius: '20px',
        padding: '16px 20px', marginBottom: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🚗 我的车辆
          </div>
          <button
            onClick={() => setEditing(null)}
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: 'none', borderRadius: '20px',
              padding: '4px 12px', fontSize: '12px',
              color: 'white', fontWeight: '600', cursor: 'pointer',
            }}
          >
            + 添加
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '20px',
            color: '#9ca3af', fontSize: '13px',
          }}>
            还没有添加车辆，点击上方「+ 添加」登记你的车
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {vehicles.map(v => (
              <div
                key={v.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px', borderRadius: '14px',
                  background: '#f9fafb', border: '1.5px solid #e5e7eb',
                  cursor: 'pointer',
                }}
                onClick={() => setEditing(v)}
              >
                <span style={{ fontSize: '22px' }}>🚗</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{v.name}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                    {v.oilType}#汽油 · {v.fuelConsumption}L/百公里
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(v) }}
                  style={{
                    background: 'none', border: 'none',
                    fontSize: '16px', cursor: 'pointer',
                    padding: '4px', color: '#d1d5db',
                  }}
                >🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 删除确认 */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'white', borderRadius: '20px',
            padding: '24px', maxWidth: '320px', width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
              删除车辆？
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              确定删除「{confirmDelete.name}」？此操作不可撤销。
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  border: '1.5px solid #e5e7eb', background: 'white',
                  fontSize: '14px', color: '#6b7280', cursor: 'pointer',
                }}
              >取消</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  border: 'none', background: '#ef4444',
                  fontSize: '14px', color: 'white', fontWeight: '600', cursor: 'pointer',
                }}
              >删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {(editing !== undefined) && (
        <VehicleEditModal
          vehicle={editing} // null=添加, 有值=编辑
          onClose={() => setEditing(undefined)}
          onSaved={reload}
        />
      )}
    </>
  )
}
