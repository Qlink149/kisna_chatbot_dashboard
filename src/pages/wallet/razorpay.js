// Loads Razorpay Checkout once per page load and reuses the same promise.
const SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let loading = null

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay did not load')))
    script.onerror = () => {
      script.remove()
      loading = null
      reject(new Error('Could not load Razorpay. Check the connection and try again.'))
    }
    document.body.appendChild(script)
  })
  return loading
}
