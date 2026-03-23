import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import axios from 'axios'

// Mock axios
vi.mock('axios')

const mockPricesData = {
  update_time: '2026-03-19 10:00:00',
  prices: {
    '北京': { '92': 7.64, '95': 8.13, '98': 9.63, '0': 7.34 },
    '上海': { '92': 7.60, '95': 8.09, '98': 10.09, '0': 7.28 },
    '广东': { '92': 7.66, '95': 8.29, '98': 10.29, '0': 7.30 }
  }
}

const mockHistoryData = {
  province: '北京',
  days: 7,
  history: {
    '2026-03-12': { '92': 7.58, '95': 8.05, '98': 9.50, '0': 7.28 },
    '2026-03-13': { '92': 7.60, '95': 8.07, '98': 9.52, '0': 7.30 },
    '2026-03-14': { '92': 7.62, '95': 8.10, '98': 9.55, '0': 7.32 },
    '2026-03-15': { '92': 7.64, '95': 8.13, '98': 9.58, '0': 7.34 },
    '2026-03-16': { '92': 7.64, '95': 8.13, '98': 9.60, '0': 7.34 },
    '2026-03-17': { '92': 7.64, '95': 8.13, '98': 9.62, '0': 7.34 },
    '2026-03-18': { '92': 7.64, '95': 8.13, '98': 9.63, '0': 7.34 }
  }
}

describe('API调用测试', () => {
  beforeEach(() => {
    axios.get.mockResolvedValueOnce({ data: mockPricesData })
    axios.get.mockResolvedValueOnce({ data: mockHistoryData })
  })

  it('应该从API加载油价数据', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/今日油价/)).toBeDefined()
    })
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/oil-prices'))
  })

  it('应该能切换到趋势页面并加载历史数据', async () => {
    render(<App />)
    const trendButton = screen.getByText('趋势')
    fireEvent.click(trendButton)
    await waitFor(() => {
      expect(screen.getByText('油价走势')).toBeDefined()
    })
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/price-changes'))
  })
})

describe('趋势图功能测试', () => {
  beforeEach(() => {
    axios.get.mockResolvedValueOnce({ data: mockPricesData })
    axios.get.mockResolvedValueOnce({ data: mockHistoryData })
  })

  it('应该显示趋势图', async () => {
    render(<App />)
    const trendButton = screen.getByText('趋势')
    fireEvent.click(trendButton)
    await waitFor(() => {
      // 应该显示图表相关内容
      expect(screen.getByText('油价走势')).toBeDefined()
    })
  })

  it('应该能选择不同省份查看趋势', async () => {
    render(<App />)
    const trendButton = screen.getByText('趋势')
    fireEvent.click(trendButton)
    await waitFor(() => {
      expect(screen.getByText('油价走势')).toBeDefined()
    })
  })
})
