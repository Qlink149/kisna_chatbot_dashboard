import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getWalletSummary, refreshWalletStatus } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
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

export default function WalletPage() {
  const queryClient = useQueryClient()
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
      toast.success('Wallet status refreshed')
    },
    onError: e => toast.error(e.message || 'Could not reach the wallet service'),
  })

  // After a payment the wallet credits a little later: look again at ~5s and ~30s.
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const onPaid = () => {
    for (const ms of [5_000, 30_000]) {
      timers.current.push(setTimeout(() => queryClient.invalidateQueries({ queryKey: SUMMARY_KEY }), ms))
    }
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Wallet" description={DESCRIPTION} />
        <ErrorBox>{error?.message || 'Couldn’t load the wallet'}</ErrorBox>
      </div>
    )
  }

  if (isLoading || !summary) {
    return (
      <div>
        <PageHeader title="Wallet" description={DESCRIPTION} />
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
      <PageHeader title="Wallet" description={DESCRIPTION} />
      <StatusStrip summary={summary} onRefresh={() => refresh.mutate()} refreshing={refresh.isPending} />
      <StatCards summary={summary} />
      <DailyChart />
      <TopupCard onPaid={onPaid} />
      <CustomersTable />
      <ChargesTable summary={summary} />
      <BackfillCard backfill={summary.backfill} />
      <InvoicesCard />
      <SettingsCard summary={summary} />
    </div>
  )
}
