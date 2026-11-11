import { useAuth } from '@/context/AuthContext'
import NotFoundPage from '@/pages/NotFoundPage'
import WalletPage from './WalletPage'

// /wallet exists only for users whose /system/auth/me says features.wallet is
// true; everyone else sees the ordinary 404 (the server also answers 404).
export default function WalletRoute() {
  const { user } = useAuth()
  return user?.features?.wallet === true ? <WalletPage /> : <NotFoundPage />
}
