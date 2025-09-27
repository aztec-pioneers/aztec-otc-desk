import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import LandingView from './views/landing/LandingView'
import MintView from './views/mint/MintView'
import SellView from './views/sell/SellView'
import BuyView from './views/buy/BuyView'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<LandingView />} />
        <Route path="mint" element={<MintView />} />
        <Route path="sell" element={<SellView />} />
        <Route path="buy" element={<BuyView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
