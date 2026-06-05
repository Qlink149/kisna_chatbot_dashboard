import { NavLink, useLocation } from 'react-router-dom'
import { logout } from '@/lib/api'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Diamond,
  ShieldCheck,
  LogOut,
  AlertTriangle,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
      { to: '/users', label: 'Users', icon: Users },
      { to: '/complaints', label: 'Complaints', icon: AlertTriangle },
    ],
  },
]

function NavItem({ to, label, icon: Icon, exact }) {
  const location = useLocation()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to)

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
        collapsed
          ? 'justify-center px-0 py-1 bg-transparent hover:bg-transparent'
          : isActive
            ? 'px-3 py-2.5 bg-white text-zinc-900 shadow-sm'
            : 'px-3 py-2.5 text-zinc-400 hover:bg-white/8 hover:text-white'
      )}
    >
      {collapsed ? (
        <span className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          isActive
            ? 'bg-white shadow-sm'
            : 'hover:bg-white/10'
        )}>
          <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-zinc-800' : 'text-zinc-400 group-hover:text-white')} />
        </span>
      ) : (
        <>
          <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-zinc-800' : 'text-zinc-500 group-hover:text-white')} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function AppSidebar() {
  const { toggleSidebar, state } = useSidebar()
  const collapsed = state === 'collapsed'

  async function handleLogout() {
    try { await logout() } catch {}
    window.location.href = '/login'
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0 *:bg-zinc-950">
      {/* Brand */}
      <SidebarHeader className={cn('pt-5 pb-5', collapsed ? 'px-0 flex items-center justify-center' : 'px-4')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C9A84C] shadow-lg shadow-[#C9A84C]/30">
            <Diamond className="h-4 w-4 text-zinc-900" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-none">KISNA</p>
              <p className="text-[11px] text-zinc-500 mt-1 leading-none">Diamond & Gold</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent className={cn('', collapsed ? 'px-2' : 'px-3')}>
        <div className="space-y-6">
          {navGroups.map(({ label, items }) => (
            <div key={label}>
              {!collapsed && (
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {label}
                </p>
              )}
              {collapsed && <div className="mb-2 h-px bg-white/5 mx-1" />}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className={cn('py-4 space-y-3', collapsed ? 'px-2' : 'px-4')}>
        {/* Admin badge */}
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/20">
              <ShieldCheck className="h-3.5 w-3.5 text-[#C9A84C]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white leading-none">Admin</p>
              <p className="text-[11px] text-zinc-500 mt-1 leading-none">Internal access</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C]/20" title="Admin">
              <ShieldCheck className="h-3.5 w-3.5 text-[#C9A84C]" />
            </div>
          </div>
        )}

        <div className="space-y-1">
          {/* Logout button */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Log out' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500/80 hover:bg-white/5 hover:text-red-400 transition-colors',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Log out</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={toggleSidebar}
            title={collapsed ? 'Expand' : 'Collapse'}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-200 transition-colors',
              collapsed && 'justify-center px-2'
            )}
          >
            {collapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <><PanelLeftClose className="h-4 w-4" /><span>Collapse</span></>
            }
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
