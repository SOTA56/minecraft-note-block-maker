const MEASUREMENT_ID='G-BDWSLHN0D4'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let loaded=false

export function loadAnalytics(){
  if(loaded)return
  loaded=true
  window.dataLayer=window.dataLayer||[]
  window.gtag=(...args:unknown[])=>window.dataLayer.push(args)
  window.gtag('js',new Date())
  window.gtag('config',MEASUREMENT_ID,{anonymize_ip:true})
  const script=document.createElement('script')
  script.async=true
  script.src=`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  document.head.appendChild(script)
}

loadAnalytics()

export function trackPageView(path:string,title?:string){
  window.gtag?.('event','page_view',{page_path:path,page_title:title??document.title,page_location:window.location.href})
}
