import { useLocation } from 'react-router-dom'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  const isUsersRoute = useLocation().pathname.startsWith('/users')

  return (
    <SidebarProvider
      className="h-svh max-h-svh overflow-hidden"
      style={{ '--sidebar-width-icon': '4.5rem' }}
    >
      <AppSidebar />
      <main className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        <MobileHeader />
        <div className={cn(
          'flex flex-1 flex-col min-h-0 min-w-0 basis-0',
          isUsersRoute ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-8'
        )}>
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
