import {useEffect,useRef,useState} from 'react'

export function BuyMeCoffeeButton({className=''}:{className?:string}){
  const host=useRef<HTMLSpanElement>(null)
  useEffect(()=>{
    const target=host.current
    if(!target)return
    const script=document.createElement('script')
    script.type='text/javascript'
    script.src='https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js'
    script.dataset.name='bmc-button'
    script.dataset.slug='sota56'
    script.dataset.color='#FFDD00'
    script.dataset.emoji='☕'
    script.dataset.font='Cookie'
    script.dataset.text='Buy me a coffee'
    script.dataset.outlineColor='#000000'
    script.dataset.fontColor='#000000'
    script.dataset.coffeeColor='#ffffff'
    target.appendChild(script)
    return()=>target.replaceChildren()
  },[])
  return <span ref={host} className={`buy-me-coffee-button ${className}`}><a className="buy-me-coffee-fallback" href="https://www.buymeacoffee.com/sota56" target="_blank" rel="noreferrer">☕ Buy me a coffee</a></span>
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
  return fallback?<><button className="buy-me-coffee-widget-fallback" onClick={()=>setOpen(true)} aria-label="Buy Me a Coffee">☕</button>{open&&<div className="buy-me-coffee-modal" role="dialog" aria-modal="true" aria-label="Buy Me a Coffee"><button className="buy-me-coffee-modal-close" onClick={()=>setOpen(false)} aria-label="Close">×</button><iframe title="Buy Me a Coffee" src="https://www.buymeacoffee.com/widget/page/sota56"/></div>}</>:null
}
