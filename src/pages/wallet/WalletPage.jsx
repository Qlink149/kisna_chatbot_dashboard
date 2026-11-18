import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Eye, Shield } from 'lucide-react'
import { getWalletSummary, refreshWalletStatus } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBox } from './parts'
import { StatusStrip } from './StatusStrip'
import { StatCards } from './StatCards'
import { DailyChart } from './DailyChart'
import { TopupCard } from './TopupCard'
import { CustomersTable } from './CustomersTable'
import { ChargesTable } from './ChargesTable'
import { BackfillCard } from './BackfillCard'
import { InvoicesCard } from './InvoicesCard'
import { SettingsCard } from './SettingsCard'

const SUMMARY_KEY = ['wallet', 'summary']
const DESCRIPTION = 'What the chatbot costs, the wallet balance and top-ups.'
const CLIENT_DESCRIPTION = 'Your WhatsApp assistant’s balance, usage, top-ups and invoices.'

export default function WalletPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  // Admins see everything and can preview the client's page; client logins
  // only ever get the client view (the server hides the rest from them too).
  const isAdmin = user?.features?.wallet_admin === true
  const [preview, setPreview] = useState(false)
  const client = !isAdmin || preview

  // Every 30s while the tab is visible (react-query pauses interval refetches
  // in a background tab). Tables do not poll.
  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: getWalletSummary,
    refetchInterval: 30_000,
  })

  const refresh = useMutation({
    mutationFn: refreshWalletStatus,
    onSuccess: wallet => {
      queryClient.setQueryData(SUMMARY_KEY, old => (old ? { ...old, wallet } : old))
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY })
      toast.success('Balance refreshed')
    },
    onError: e => toast.error(e.message || 'Could not reach the wallet service'),
  })

  // After a payment the wallet credits a little later: look again at ~5s and ~30s.
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const onPaid = () => {
    for (const ms of [5_000, 30_000]) {
      timers.current.push(setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: SUMMARY_KEY })
        queryClient.invalidateQueries({ queryKey: ['wallet', 'invoices'] })
      }, ms))
    }
  }

  const description = client ? CLIENT_DESCRIPTION : DESCRIPTION
  const viewToggle = isAdmin && (
    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setPreview(p => !p)}>
      {preview
        ? <><Shield className="mr-1 h-3.5 w-3.5" /> Back to admin view</>
        : <><Eye className="mr-1 h-3.5 w-3.5" /> Preview client view</>}
    </Button>
  )

  if (isError) {
    return (
      <div>
        <PageHeader title="Wallet" description={description} action={viewToggle} />
        <ErrorBox>{error?.message || 'Couldn’t load the wallet'}</ErrorBox>
      </div>
    )
  }

  if (isLoading || !summary) {
    return (
      <div>
        <PageHeader title="Wallet" description={description} action={viewToggle} />
        <Skeleton className="mb-4 h-14 w-full" />
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Wallet" description={description} action={viewToggle} />
      {preview && (
        <div className="mb-3 rounded-md border border-[rgb(var(--violet-rgb)/0.3)] bg-[rgb(var(--violet-rgb)/0.06)] px-3 py-2 text-xs text-muted-foreground">
          Preview: this is what the client&rsquo;s login sees (once WALLET_CLIENT_USERS includes it). Nothing here is clickable that they couldn&rsquo;t click.
        </div>
      )}
      <StatusStrip summary={summary} onRefresh={() => refresh.mutate()} refreshing={refresh.isPending} client={client} />
      <StatCards summary={summary} client={client} />
      <DailyChart client={client} />
      <TopupCard onPaid={onPaid} />
      <CustomersTable client={client} />
      {!client && <ChargesTable summary={summary} />}
      {!client && <BackfillCard backfill={summary.backfill} />}
      <InvoicesCard client={client} />
      {!client && <SettingsCard summary={summary} />}
    </div>
  )
}
