declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function trackPageView(path:string,title?:string){
  window.gtag?.('event','page_view',{page_path:path,page_title:title??document.title,page_location:window.location.href})
}
