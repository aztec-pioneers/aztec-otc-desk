import { useContext } from 'react'
import WalletContext from '../context/wallet/WalletContext'

const useWallet = () => {
  const context = useContext(WalletContext)

  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }

  return context
}

export default useWallet
