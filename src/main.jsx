import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import App from './App'
import TripPage from './pages/TripPage'
import RankingsPage from './pages/RankingsPage'
import StationsPage from './pages/StationsPage'
import './index.css'

function Router() {
  const navigate = useNavigate()
  const location = useLocation()
  const isTrip = location.pathname === '/trip'
  const isRankings = location.pathname === '/rankings'
  const isStations = location.pathname === '/stations'

  return (
    <>
      {isTrip ? (
        <TripPage />
      ) : isRankings ? (
        <RankingsPage />
      ) : isStations ? (
        <StationsPage />
      ) : (
        <App
          onGotoTrip={() => navigate('/trip')}
          onGotoRankings={() => navigate('/rankings')}
        />
      )}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Router />} />
        <Route path="/trip" element={<TripPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/stations" element={<StationsPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
