import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App'
import { WalletProvider } from './context/wallet/WalletContext'
import { TokenProvider } from './context/token/TokenContext'
import { ToastProvider } from './context/toast/ToastContext'
import ToastViewport from './components/toast/ToastViewport'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <TokenProvider>
          <ToastProvider>
            <App />
            <ToastViewport />
          </ToastProvider>
        </TokenProvider>
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>,
)
