declare global {
  interface Window {
    dataLayer: IArguments[]
    gtag?: (...args: unknown[]) => void
  }
}

const MEASUREMENT_ID = 'G-BDWSLHN0D4'

let loaded = false
let scriptReady = false
let pendingPageView: { path: string; title: string } | null = null

function sendPageView(path: string, title: string) {
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
    debug_mode: true,
  })
}

function loadAnalytics() {
  if (loaded) return
  loaded = true
  window.dataLayer = window.dataLayer || []

  // Keep the official gtag queue shape. Google Tag Manager expects the
  // function's Arguments object rather than a rest-parameter array.
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }

  window.gtag('js', new Date())
  window.gtag('config', MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: false,
    debug_mode: true,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  script.onload = () => {
    scriptReady = true
    if (pendingPageView) {
      sendPageView(pendingPageView.path, pendingPageView.title)
      pendingPageView = null
    }
  }
  document.head.appendChild(script)
}
loadAnalytics()

export function trackPageView(path: string, title?: string) {
  const pageTitle = title ?? document.title
  if (!scriptReady) {
    pendingPageView = { path, title: pageTitle }
    return
  }
  sendPageView(path, pageTitle)
}

export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  window.gtag?.('event', name, { ...params, debug_mode: true })
}
