import {memo,useEffect,useRef,useState} from 'react'
import type {CSSProperties,PointerEvent,MouseEvent,RefObject} from 'react'
import {flushSync} from 'react-dom'
import {rollWindow,type RollStepNotes} from './pianoRollIndex'

export type RollSelection={minStep:number;maxStep:number;minPitch:number;maxPitch:number}|null
export type RollDragPreview={originStep:number;originPitch:number;step:number;pitch:number}|null
export type RollHandlers={
  pointerDown:(event:PointerEvent,step:number,pitch:number)=>void
  labelDown:(event:PointerEvent)=>void
  labelMove:(event:PointerEvent)=>void
  labelUp:(event:PointerEvent,step:number)=>void
  labelCancel:()=>void
  labelDoubleClick:(event:MouseEvent,step:number)=>void
}
type Props={
  steps:number;delayUnit:1|2|4;stepHeight:number;desktop:boolean;language:string
  index:Map<number,RollStepNotes>;color:string;selection:RollSelection;preview:RollDragPreview;playhead:number
  viewport:RefObject<HTMLDivElement|null>;handlers:RefObject<RollHandlers>
}
const pitches=Array.from({length:25},(_,i)=>i)
const descending=[...pitches].reverse()
const pitchNames={ja:['ファ♯','ソ','ソ♯','ラ','ラ♯','シ','ド','ド♯','レ','レ♯','ミ','ファ'],other:['F♯','G','G♯','A','A♯','B','C','C♯','D','D♯','E','F']}
type StepProps=Pick<Props,'delayUnit'|'desktop'|'language'|'color'|'selection'|'preview'|'handlers'>&{step:number;notes:RollStepNotes|undefined;isPlayhead:boolean}
const RollStep=memo(function RollStep({step,notes,delayUnit,desktop,language,color,selection,preview,handlers,isPlayhead}:StepProps){
  const poly=notes?.polyphony??0
  return <div data-roll-step={step} className={`step ${step===0?'first-step':''} ${(step+delayUnit)%16===0?'bar-end':(step+delayUnit)%4===0?'beat-end':''} ${poly>=7?'poly-over-6':poly>=4?'poly-over-3':''} ${isPlayhead?'playhead':''}`}>
    {(desktop?descending:pitches).map(pitch=>{
      const storedOwn=Boolean((notes?.ownMask??0)&(1<<pitch))
      const own=(storedOwn&&!(preview?.originStep===step&&preview.originPitch===pitch))||(preview?.step===step&&preview.pitch===pitch)
      const ghost=notes?.ghosts.get(pitch)
      const selected=Boolean(selection&&step>=selection.minStep&&step<=selection.maxStep&&pitch>=selection.minPitch&&pitch<=selection.maxPitch)
      const edges=selected&&selection&&!desktop?`${step===selection.minStep?' selection-top':''}${step===selection.maxStep?' selection-bottom':''}${pitch===selection.minPitch?' selection-left':''}${pitch===selection.maxPitch?' selection-right':''}`:''
      return <button key={pitch} data-step={step} data-pitch={pitch} onPointerDown={event=>handlers.current.pointerDown(event,step,pitch)} className={`${[0,2,4,7,9].includes(pitch%12)?'black-key':'white-key'} ${pitch%12===6?'do':''} ${own?'note':ghost?'ghost':''} ${selected?`selected-cell${edges}`:''}`} style={own?{'--note':color} as CSSProperties:ghost?{'--note':ghost} as CSSProperties:undefined} aria-label={`${(language==='ja'?pitchNames.ja:pitchNames.other)[pitch%12]}, ${language==='ja'?'小節':'bar'} ${Math.floor(step/16)+1}`}/>
    })}
    {desktop&&selection&&step>=selection.minStep&&step<=selection.maxStep&&<span className={`desktop-selection-outline ${step===selection.minStep?'selection-start':''} ${step===selection.maxStep?'selection-end':''}`} style={{gridRow:`${2+(24-selection.maxPitch)} / ${3+(24-selection.minPitch)}`}} aria-hidden="true"/>}
    <button className="step-label" title={poly>=7?(language==='ja'?`${poly}音：6和音超`:`${poly} notes: over 6`):poly>=4?(language==='ja'?`${poly}音：3和音超`:`${poly} notes: over 3`):undefined} onPointerDown={event=>handlers.current.labelDown(event)} onPointerMove={event=>handlers.current.labelMove(event)} onPointerUp={event=>handlers.current.labelUp(event,step)} onPointerCancel={()=>handlers.current.labelCancel()} onDoubleClick={event=>handlers.current.labelDoubleClick(event,step)}>{step%16===0?`${step/16+1}`:''}</button>
  </div>
})

// Playback state lives outside this memoized subtree. Only editing, zooming,
// seeking, or reaching the scroll buffer changes the grid's React tree.
export default memo(function PianoRollSteps(props:Props){
  const {steps,delayUnit,stepHeight,desktop,viewport,index,playhead,...rowProps}=props
  const total=Math.ceil(steps/delayUnit)
  const [range,setRange]=useState(()=>rollWindow(total,stepHeight,0,960))
  const currentRange=useRef(range)
  // The viewport ref belongs to our parent; passive effects run after all
  // parent refs have been attached (including on navigation back to editor).
  useEffect(()=>{
    const element=viewport.current
    if(!element)return
    const update=(synchronous:boolean)=>{
      const next=rollWindow(total,stepHeight,desktop?element.scrollLeft:element.scrollTop,desktop?element.clientWidth:element.clientHeight)
      if(next.start===currentRange.current.start&&next.end===currentRange.current.end)return
      currentRange.current=next
      if(synchronous)flushSync(()=>setRange(next));else setRange(next)
    }
    update(false)
    const onScroll=()=>update(true)
    const observer=new ResizeObserver(()=>update(false))
    element.addEventListener('scroll',onScroll,{passive:true})
    observer.observe(element)
    return()=>{element.removeEventListener('scroll',onScroll);observer.disconnect()}
  },[total,stepHeight,desktop,viewport])
  const start=Math.min(total,range.start),end=Math.min(total,Math.max(start,range.end))
  const spacer=(count:number,key:string)=>count>0?<div key={key} aria-hidden="true" style={desktop?{flex:`0 0 ${count*stepHeight}px`,width:count*stepHeight,pointerEvents:'none'}:{height:count*stepHeight,pointerEvents:'none'}}/>:null
  return <>
    {spacer(start,'before')}
    {Array.from({length:end-start},(_,i)=>{const step=(start+i)*delayUnit;return <RollStep key={step} {...rowProps} desktop={desktop} delayUnit={delayUnit} step={step} notes={index.get(step)} isPlayhead={playhead===step}/>})}
    {spacer(total-end,'after')}
  </>
})
