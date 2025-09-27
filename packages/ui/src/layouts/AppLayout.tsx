import { Outlet } from 'react-router-dom'
import NavBar from '../components/navigation/NavBar'
import AppFooter from '../components/footer/AppFooter'
import './AppLayout.css'

const AppLayout = () => {
  return (
    <div className="app-layout">
      <NavBar />
      <main className="app-layout__content">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  )
}

export default AppLayout
