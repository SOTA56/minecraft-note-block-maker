import {useEffect,useState} from 'react'

export function BuyMeCoffeeButton({className=''}:{className?:string}){
  return <span className={`buy-me-coffee-button ${className}`}><a className="buy-me-coffee-fallback" href="https://www.buymeacoffee.com/sota56" target="_blank" rel="noreferrer">☕ Buy me a coffee</a></span>
}

export function BuyMeCoffeeWidget(){
  const [fallback,setFallback]=useState(true)
  const [open,setOpen]=useState(false)
  useEffect(()=>{
    const script=document.createElement('script')
    script.dataset.name='BMC-Widget'
    script.dataset.cfasync='false'
    script.src='https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js'
    script.dataset.id='sota56'
    script.dataset.description='Support me on Buy me a coffee!'
    script.dataset.message='Like this site? Please consider supporting it!'
    script.dataset.color='#FFDD00'
    script.dataset.position='Right'
    script.dataset.x_margin='18'
    script.dataset.y_margin='18'
    document.body.appendChild(script)
    const timer=window.setTimeout(()=>setFallback(!document.querySelector('#bmc-wbtn')),1800)
    return()=>{window.clearTimeout(timer);script.remove()}
  },[])
  return fallback?<><button className="buy-me-coffee-widget-fallback" onClick={()=>setOpen(true)} aria-label="Buy Me a Coffee">☕</button>{open&&<div className="buy-me-coffee-modal" role="dialog" aria-modal="true" aria-label="Buy Me a Coffee"><button type="button" className="buy-me-coffee-modal-close" style={{width:36,height:36,minWidth:36,maxWidth:36,minHeight:36,maxHeight:36,padding:0,borderRadius:'50%',display:'grid',placeItems:'center',flex:'none',lineHeight:1}} onClick={()=>setOpen(false)} aria-label="Close">×</button><iframe title="Buy Me a Coffee" src="https://www.buymeacoffee.com/widget/page/sota56"/></div>}</>:null
}

export function BuyMeCoffeeSupport({className='',onActivate}:{className?:string;onActivate?:()=>void}){
  const [open,setOpen]=useState(false)
  return <><button type="button" className={className} onClick={()=>{onActivate?.();setOpen(true)}}><b className="menu-icon">☕</b><span>制作者を支援</span><small>OPEN</small></button>{open&&<div className="buy-me-coffee-modal" role="dialog" aria-modal="true" aria-label="Buy Me a Coffee"><button type="button" className="buy-me-coffee-modal-close" style={{width:36,height:36,minWidth:36,maxWidth:36,minHeight:36,maxHeight:36,padding:0,borderRadius:'50%',display:'grid',placeItems:'center',flex:'none',lineHeight:1}} onClick={()=>setOpen(false)} aria-label="Close">×</button><iframe title="Buy Me a Coffee" src="https://www.buymeacoffee.com/widget/page/sota56"/></div>}</>
}
