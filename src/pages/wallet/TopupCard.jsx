import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CreditCard } from 'lucide-react'
import { createTopup, quoteTopup } from '@/lib/api'
import { formatRupees, TOPUP_MAX, TOPUP_MIN, TOPUP_PICKS, topupProblem } from '@/lib/wallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Section } from './parts'
import { loadRazorpay } from './razorpay'
import { useDebouncedValue } from './useDebouncedValue'

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t pt-2 text-sm font-semibold' : 'text-xs text-muted-foreground'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{formatRupees(value)}</span>
    </div>
  )
}

// The payable total always comes from the server's quote; the browser never works it out.
export function TopupCard({ onPaid }) {
  const [amount, setAmount] = useState('1000')
  const [unavailable, setUnavailable] = useState('')
  const debounced = useDebouncedValue(amount.trim(), 300)
  const problem = topupProblem(debounced)
  const typing = amount.trim() !== debounced

  const quote = useQuery({
    queryKey: ['wallet', 'topup-quote', debounced],
    queryFn: () => quoteTopup(debounced),
    enabled: !problem,
    staleTime: 60_000,
    retry: false,
  })

  const pay = useMutation({
    mutationFn: () => createTopup(debounced),
    onSuccess: async res => {
      if (!res?.available) {
        setUnavailable(res?.reason || 'Top-up isn’t available right now.')
        return
      }
      setUnavailable('')
      try {
        const Razorpay = await loadRazorpay()
        const checkout = new Razorpay({
          key: res.razorpay_key_id,
          order_id: res.razorpay_order_id,
          amount: res.amount_paise,
          currency: 'INR',
          name: 'Clara Wallet',
          description: 'KISNA wallet top-up',
          handler: () => {
            toast.success('Payment received. The balance updates in a minute.')
            onPaid?.()
          },
          modal: { ondismiss: () => toast('Payment cancelled. Nothing was charged.') },
        })
        checkout.open()
      } catch (e) {
        toast.error(e.message || 'Could not open the payment window')
      }
    },
    onError: e => toast.error(e.message || 'Could not start the top-up'),
  })

  const q = quote.data
  const ready = !problem && !typing && q && !quote.isFetching

  return (
    <Section title="Top up" icon={CreditCard}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-medium" htmlFor="wallet-topup-amount">Wallet credit (₹)</label>
          <Input
            id="wallet-topup-amount"
            inputMode="decimal"
            value={amount}
            onChange={e => { setAmount(e.target.value); setUnavailable('') }}
            aria-invalid={Boolean(problem && !typing)}
            className="max-w-48 bg-white"
          />
          <div className="flex flex-wrap gap-1.5">
            {TOPUP_PICKS.map(v => (
              <Button key={v} type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setAmount(String(v)); setUnavailable('') }}>
                {formatRupees(v).replace('.00', '')}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            From {formatRupees(TOPUP_MIN).replace('.00', '')} to {formatRupees(TOPUP_MAX).replace('.00', '')}.
          </p>
          {problem && !typing && <p className="text-xs text-red-700">{problem}</p>}
        </div>

        <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
          {problem ? (
            <p className="text-xs text-muted-foreground">Enter an amount to see what you will pay.</p>
          ) : quote.isError ? (
            <p className="text-xs text-red-700">{quote.error?.message || 'Couldn’t get a quote'}</p>
          ) : !q || typing ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <>
              <Row label="Wallet credit" value={q.base_rupees} />
              <Row label="GST 18%" value={q.gst_rupees} />
              <Row label="Payment gateway fee" value={q.fee_rupees} />
              <Row label="GST on fee" value={q.fee_gst_rupees} />
              <Row label="Total payable" value={q.total_rupees} strong />
            </>
          )}
          <Button
            type="button"
            className="mt-2 w-full"
            disabled={!ready || pay.isPending}
            onClick={() => pay.mutate()}
          >
            {pay.isPending ? 'Starting…' : ready ? `Pay ${formatRupees(q.total_rupees)}` : 'Pay'}
          </Button>
          {unavailable && <p className="text-xs text-muted-foreground">{unavailable}</p>}
        </div>
      </div>
    </Section>
  )
}
