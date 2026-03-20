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
    '广东': { '92': 7.66, '95': 8.29, '98': 10.29, '0': 7.30 },
    '江苏': { '92': 7.61, '95': 8.09, '98': 10.16, '0': 7.26 },
    '浙江': { '92': 7.61, '95': 8.09, '98': 9.59, '0': 7.28 }
  }
}

const mockHistoryData = {
  province: '北京',
  days: 30,
  history: {
    '2026-03-01': { '92': 7.58, '95': 8.05, '98': 9.50, '0': 7.28 },
    '2026-03-05': { '92': 7.60, '95': 8.07, '98': 9.52, '0': 7.30 },
    '2026-03-10': { '92': 7.62, '95': 8.10, '98': 9.55, '0': 7.32 },
    '2026-03-15': { '92': 7.64, '95': 8.13, '98': 9.58, '0': 7.34 },
    '2026-03-19': { '92': 7.64, '95': 8.13, '98': 9.63, '0': 7.34 }
  }
}

describe('油价查询功能', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: mockPricesData })
  })

  it('应该显示油价守护者标题', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('油价守护者')).toBeDefined()
    })
  })

  it('应该显示今日油价', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/今日油价/)).toBeDefined()
    })
  })

  it('应该从API加载油价数据', async () => {
    render(<App />)
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/oil-prices'))
    })
  })

  it('应该显示省份列表', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('北京')).toBeDefined()
      expect(screen.getByText('上海')).toBeDefined()
    })
  })

  it('应该有底部导航栏', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('油价')).toBeDefined()
      expect(screen.getByText('趋势')).toBeDefined()
      expect(screen.getByText('油耗')).toBeDefined()
      expect(screen.getByText('我的')).toBeDefined()
    })
  })

  it('应该能切换到趋势页面', async () => {
    render(<App />)
    await waitFor(() => {
      const trendButton = screen.getByText('趋势')
      fireEvent.click(trendButton)
      expect(screen.getByText('油价走势')).toBeDefined()
    })
  })

  it('应该能切换到油耗页面', async () => {
    render(<App />)
    await waitFor(() => {
      const fuelButton = screen.getByText('油耗')
      fireEvent.click(fuelButton)
      expect(screen.getByText('油耗记录')).toBeDefined()
    })
  })

  it('应该能切换到我的页面', async () => {
    render(<App />)
    await waitFor(() => {
      const myButton = screen.getByText('我的')
      fireEvent.click(myButton)
      expect(screen.getByText('用户中心')).toBeDefined()
    })
  })
})

describe('API调用测试', () => {
  beforeEach(() => {
    axios.get
      .mockResolvedValueOnce({ data: mockPricesData })
      .mockResolvedValueOnce({ data: mockHistoryData })
  })

  it('应该调用油价API', async () => {
    render(<App />)
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/oil-prices'))
    })
  })

  it('应该能切换到趋势页面并加载历史数据', async () => {
    render(<App />)
    await waitFor(() => {
      const trendButton = screen.getByText('趋势')
      fireEvent.click(trendButton)
    })
    await waitFor(() => {
      expect(screen.getByText('油价走势')).toBeDefined()
    })
  })
})

describe('趋势图功能测试', () => {
  beforeEach(() => {
    axios.get
      .mockResolvedValueOnce({ data: mockPricesData })
      .mockResolvedValueOnce({ data: mockHistoryData })
  })

  it('应该显示趋势图页面', async () => {
    render(<App />)
    const trendButton = screen.getByText('趋势')
    fireEvent.click(trendButton)
    await waitFor(() => {
      expect(screen.getByText('油价走势')).toBeDefined()
    })
  })

  it('应该能选择不同油号', async () => {
    render(<App />)
    const trendButton = screen.getByText('趋势')
    fireEvent.click(trendButton)
    await waitFor(() => {
      expect(screen.getByText('选择油号')).toBeDefined()
    })
  })

  it('应该显示省份选择器', async () => {
    render(<App />)
    const trendButton = screen.getByText('趋势')
    fireEvent.click(trendButton)
    await waitFor(() => {
      expect(screen.getByText('选择省份')).toBeDefined()
    })
  })
})
