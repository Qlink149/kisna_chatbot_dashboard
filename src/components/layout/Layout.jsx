import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

function MobileHeader() {
  const { toggleSidebar, isMobile } = useSidebar()
  if (!isMobile) return null
  return (
    <div className="flex items-center gap-3 px-4 h-14 border-b bg-zinc-950 shrink-0">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>
      <span className="text-sm font-bold text-white">KISNA</span>
    </div>
  )
}

export function Layout({ children }) {
  return (
    <SidebarProvider style={{ '--sidebar-width-icon': '4.5rem' }}>
      <AppSidebar />
      <main className="flex flex-1 flex-col min-w-0">
        <MobileHeader />
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
