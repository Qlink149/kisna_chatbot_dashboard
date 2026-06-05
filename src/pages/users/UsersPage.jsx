import { useState, useEffect, useRef, useCallback } from 'react'
import notificationSound from '@/assets/notification_sound.mp3'
import { useSearchParams } from 'react-router-dom'
import { listUsers, searchUsers, getUserByPhone, takeoverConversation, sendAgentMessage, releaseConversation, resolveAgentRequest, getToken } from '@/lib/api'
import { toast } from 'sonner'
import { isWindowExpired as checkWindowExpired } from './utils'
import ConversationSidebar from './ConversationSidebar'
import ChatHeader from './ChatHeader'
import ChatMessages from './ChatMessages'
import AgentFooter from './AgentFooter'
import UserProfilePanel from './UserProfilePanel'
import { Badge } from '@/components/ui/badge'

function hasJewelleryProfile(profile) {
  if (!profile || typeof profile !== 'object') return false
  return Boolean(
    profile.material_preference
    || profile.category_preference
    || profile.budget_range
    || profile.occasion
  )
}

function formatJewelleryProfileBanner(profile) {
  const parts = []
  if (profile.material_preference) parts.push(profile.material_preference)
  if (profile.category_preference) parts.push(profile.category_preference)
  if (profile.budget_range) parts.push(profile.budget_range)
  if (profile.occasion) parts.push(profile.occasion)
  return parts.join(' · ')
}

export default function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = 20

  const setSearch = (val) => setSearchParams(prev => { const p = new URLSearchParams(prev); val ? p.set('search', val) : p.delete('search'); p.set('page', '1'); return p }, { replace: true })
  const setPage = (val) => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('page', String(val)); return p }, { replace: true })

  // Debounce search so the API isn't hit on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // User list state
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [total, setTotal] = useState(0)
  const [agentFilter, setAgentFilter] = useState(false)

  // Active conversation state — driven by ?phone= param
  const [activePhone, setActivePhone] = useState(searchParams.get('phone') || null)
  const [userMap, setUserMap] = useState({})
  const [loadingActive, setLoadingActive] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)

  // Takeover state — keyed by phone so switching chats doesn't reset it
  const [takeoverMap, setTakeoverMap] = useState({}) // { [phone]: { active, takenBy } }
  const [agentInput, setAgentInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [takingOver, setTakingOver] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [resolvingAgent, setResolvingAgent] = useState(false)

  const isTakenOver = takeoverMap[activePhone]?.active ?? false
  const takeoverBy = takeoverMap[activePhone]?.takenBy ?? null

  const setTakeover = useCallback((phone, active, takenBy = null) => {
    setTakeoverMap(prev => ({ ...prev, [phone]: { active, takenBy } }))
  }, [])

  const chatScrollRef = useRef(null)
  const sseRef = useRef(null)
  const prevAgentPhonesRef = useRef(null)

  const totalPages = Math.ceil(total / limit) || 1

  // Play a chime when a new "agent required" lead appears in the list
  useEffect(() => {
    const current = new Set(users.filter(u => u.live_agent_required).map(u => u.phone_number))
    if (prevAgentPhonesRef.current !== null) {
      const hasNew = [...current].some(p => !prevAgentPhonesRef.current.has(p))
      if (hasNew) {
        try {
          new Audio(notificationSound).play()
        } catch {}
      }
    }
    prevAgentPhonesRef.current = current
  }, [users])

  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
      setShowScrollBottom(false)
    }
  }, [])

  const handleChatScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight >= 100)
  }, [])

  // Fetch user list + auto-refresh every 5s
  const fetchUsers = useCallback(() => {
    const req = debouncedSearch
      ? searchUsers(debouncedSearch).then(res => ({ users: res?.results || [], total: res?.count ?? 0 }))
      : listUsers(page, limit, agentFilter).then(res => ({ users: res?.users || [], total: res?.total ?? 0 }))
    req
      .then(({ users, total }) => { setUsers(users); setTotal(total) })
      .catch(() => {})
      .finally(() => setLoadingUsers(false))
  }, [page, limit, agentFilter, debouncedSearch])

  const handleFilterChange = (val) => {
    setAgentFilter(val)
    setPage(1)
  }

  useEffect(() => {
    setLoadingUsers(true)
    fetchUsers()
    const interval = setInterval(fetchUsers, 5000)
    return () => clearInterval(interval)
  }, [fetchUsers])

  // Poll active conversation every 10s — SSE is real-time, this is the fallback
  useEffect(() => {
    if (!activePhone) return
    const interval = setInterval(() => {
      getUserByPhone(activePhone)
        .then(data => setUserMap(prev => {
          const existing = prev[activePhone] || {}
          const serverHistory = data.chat_history || []
          const localHistory = existing.chat_history || []
          return {
            ...prev,
            [activePhone]: {
              ...existing,
              ...data,
              // keep local if it has more messages (preserves optimistic updates)
              chat_history: serverHistory.length >= localHistory.length ? serverHistory : localHistory,
            }
          }
        }))
        .catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [activePhone])

  // SSE connection + initial history fetch for active conversation
  useEffect(() => {
    if (!activePhone) return

    const fetchUser = () => {
      getUserByPhone(activePhone)
        .then(data => {
          setUserMap(prev => {
            const existing = prev[activePhone] || {}
            const serverHistory = data.chat_history || []
            const localHistory = existing.chat_history || []
            return {
              ...prev,
              [activePhone]: {
                ...existing,
                ...data,
                chat_history: serverHistory.length >= localHistory.length ? serverHistory : localHistory,
              }
            }
          })
          setTakeover(activePhone, data.human_takeover?.active ?? false, data.human_takeover?.taken_by ?? null)
        })
        .catch(() => {})
    }
    fetchUser()

    const token = getToken()
    const baseUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')
    const es = new EventSource(
      `${baseUrl}/system/conversation/${activePhone}/stream${token ? `?token=${token}` : ''}`
    )
    sseRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        switch (event.type) {
          case 'connected':
            break

          // User replies (only pushed when takeover is active)
          case 'user_message':
            setUserMap(prev => {
              const user = prev[activePhone] || {}
              return { ...prev, [activePhone]: { ...user, chat_history: [...(user.chat_history || []), { role: 'user', content: event.content, timestamp: event.timestamp ?? Date.now() / 1000 }] } }
            })
            break

          // Agent messages + takeover/release system messages
          case 'agent_message':
            setUserMap(prev => {
              const user = prev[activePhone] || {}
              return { ...prev, [activePhone]: { ...user, chat_history: [...(user.chat_history || []), { role: 'agent', content: event.content, timestamp: event.timestamp ?? Date.now() / 1000 }] } }
            })
            break

          case 'takeover':
            setTakeover(activePhone, true)
            fetchUser()
            break

          case 'release':
            setTakeover(activePhone, false)
            toast.success('Agent handed back to bot')
            fetchUser()
            break
        }
      } catch {}
    }

    es.onerror = () => {
      fetchUser()
      es.close()
    }

    return () => {
      es.close()
      sseRef.current = null
    }
  }, [activePhone])

  // Scroll to bottom on conversation switch or initial load
  useEffect(() => {
    scrollToBottom()
  }, [activePhone, loadingActive, scrollToBottom])

  // Auto-scroll on new messages if already at bottom
  useEffect(() => {
    if (!showScrollBottom) scrollToBottom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMap, scrollToBottom])

  const handleSelectUser = useCallback(async (phone) => {
    setActivePhone(phone)
    setAgentInput('')
    setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('phone', phone); return p }, { replace: true })
    if (!userMap[phone]) {
      setLoadingActive(true)
      try {
        const data = await getUserByPhone(phone)
        setUserMap(prev => ({ ...prev, [phone]: data }))
      } catch {
      } finally {
        setLoadingActive(false)
      }
    }
  }, [userMap, setSearchParams])

  // Open chat when ?phone= is present in URL (e.g. direct link or page refresh)
  useEffect(() => {
    const phone = searchParams.get('phone')
    if (phone && phone !== activePhone) {
      setActivePhone(phone)
      if (!userMap[phone]) {
        setLoadingActive(true)
        getUserByPhone(phone)
          .then(data => setUserMap(prev => ({ ...prev, [phone]: data })))
          .catch(() => {})
          .finally(() => setLoadingActive(false))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derived state
  const activeUserData = activePhone ? userMap[activePhone] : null
  const displayUsers = [...users]
  if (activeUserData && !displayUsers.find(u => u.phone_number === activePhone)) {
    displayUsers.unshift(activeUserData)
  }
  // Server handles filtering; just pin the active user on top if not in list
  const filteredUsers = displayUsers

  const isWindowExpired = checkWindowExpired(activeUserData?.updated_at)

  // Takeover / release / send handlers
  const handleTakeover = async () => {
    const agentName = localStorage.getItem('agent_username') || 'Agent'
    setTakingOver(true)
    try {
      await takeoverConversation(activePhone, agentName)
      setTakeover(activePhone, true, agentName)
      toast.success('You have taken over the conversation')
    } catch (err) {
      toast.error(err.message || 'Failed to take over')
    } finally {
      setTakingOver(false)
    }
  }

  const handleRelease = async () => {
    setReleasing(true)
    try {
      await releaseConversation(activePhone)
      setTakeover(activePhone, false)
    } catch (err) {
      toast.error(err.message || 'Failed to release')
    } finally {
      setReleasing(false)
    }
  }

  const handleResolveAgent = async () => {
    setResolvingAgent(true)
    try {
      await resolveAgentRequest(activePhone)
      setUserMap(prev => ({
        ...prev,
        [activePhone]: { ...(prev[activePhone] || {}), live_agent_required: false }
      }))
      fetchUsers()
      getUserByPhone(activePhone)
        .then(data => setUserMap(prev => ({ ...prev, [activePhone]: data })))
        .catch(() => {})
      toast.success('Agent request resolved')
    } catch (err) {
      toast.error(err.message || 'Failed to resolve agent request')
    } finally {
      setResolvingAgent(false)
    }
  }

  const handleSendMessage = async () => {
    const msg = agentInput.trim()
    if (!msg || sendingMessage) return
    setSendingMessage(true)
    setAgentInput('')
    try {
      await sendAgentMessage(activePhone, msg)
    } catch (err) {
      setAgentInput(msg)
      toast.error(err.message || 'Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex bg-card rounded-xl border border-border shadow-sm overflow-hidden h-full min-h-0">

        <ConversationSidebar
          users={filteredUsers}
          loadingUsers={loadingUsers}
          activePhone={activePhone}
          search={search}
          onSearchChange={setSearch}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          onSelectUser={handleSelectUser}
          agentFilter={agentFilter}
          onFilterChange={handleFilterChange}
        />

        {/* Chat pane */}
        <div className="flex-1 flex flex-col bg-[url('https://ik.imagekit.io/0rf6agnve/one%20reside/chat-bg-light.png')] dark:bg-[url('https://ik.imagekit.io/0rf6agnve/one%20reside/chat-bg-dark.png')] bg-cover bg-center">

          <ChatHeader
            activeUserData={activeUserData}
            isTakenOver={isTakenOver}
            isWindowExpired={isWindowExpired}
            releasing={releasing}
            takingOver={takingOver}
            resolvingAgent={resolvingAgent}
            showProfile={showProfile}
            onTakeover={handleTakeover}
            onRelease={handleRelease}
            onResolveAgent={handleResolveAgent}
            onToggleProfile={() => setShowProfile(p => !p)}
          />

          {/* Jewellery Profile Banner */}
          {hasJewelleryProfile(activeUserData?.jewellery_profile) && (
            <div className="bg-card/80 backdrop-blur-sm border-b p-3 px-4 shadow-sm z-10 flex flex-wrap gap-2 items-center shrink-0">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mr-2">
                Jewellery Profile:
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                {formatJewelleryProfileBanner(activeUserData.jewellery_profile)}
              </Badge>
            </div>
          )}

          {/* Live Agent Banner */}
          {activeUserData && isTakenOver && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2 shrink-0">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Live agent mode — {takeoverBy || 'Agent'} is handling this conversation
              </span>
            </div>
          )}

          <ChatMessages
            activePhone={activePhone}
            loadingActive={loadingActive}
            chatHistory={activeUserData?.chat_history || []}
            scrollRef={chatScrollRef}
            showScrollBottom={showScrollBottom}
            onScroll={handleChatScroll}
            onScrollToBottom={scrollToBottom}
          />

          {activePhone && (
            <AgentFooter
              isTakenOver={isTakenOver}
              isWindowExpired={isWindowExpired}
              agentInput={agentInput}
              onAgentInputChange={setAgentInput}
              sendingMessage={sendingMessage}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>

        {showProfile && activeUserData && (
          <UserProfilePanel
            userData={activeUserData}
            onClose={() => setShowProfile(false)}
          />
        )}

      </div>
    </div>
  )
}
