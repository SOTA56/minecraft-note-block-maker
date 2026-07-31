import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
const root=document.getElementById('root')!
createRoot(root).render(<StrictMode><App /></StrictMode>)
requestAnimationFrame(()=>{
  // Remove parameters left by the retired automatic recovery implementation.
  // It treated temporary asset/network errors as a stale deployment and could
  // trap otherwise healthy browsers in a forced-refresh loop.
  sessionStorage.removeItem('otoblogic:startup-recovery-attempted-v2')
  sessionStorage.removeItem('otoblogic:startup-recovery-attempted-v3')
  sessionStorage.removeItem('otoblogic:last-startup-recovery')
  const url=new URL(location.href)
  if(url.searchParams.has('__refresh')){
    url.searchParams.delete('__refresh')
    history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`)
  }
})
