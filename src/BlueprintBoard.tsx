import {memo,useCallback,useEffect,useImperativeHandle,useLayoutEffect,useMemo,useRef,useState} from 'react'
import {flushSync} from 'react-dom'
import {bufferedBoardBounds,indexBlueprintCells,visibleBlueprintIndices,type BoardBounds} from './blueprintViewport'
import type {MutableRefObject,RefObject} from 'react'
import {blueprintColumnNumber,blueprintRowNumber,type BlueprintCell,type BlueprintPlan} from './blueprint'
import type {RepeaterDisplay} from './types'

export type BlueprintBoardHandle={
  setPlaybackStep:(step:number)=>void
  setPreviewCell:(key:string|null)=>void
}

type Props={
  value:BlueprintPlan
  cell:number
  axis:number
  selected:string|null
  repeaterDisplay:RepeaterDisplay
  boardRef:MutableRefObject<BlueprintBoardHandle|null>
  wrapRef:RefObject<HTMLElement|null>
  stageRef:RefObject<HTMLDivElement|null>
  shellRef:RefObject<HTMLDivElement|null>
  zoomRef:MutableRefObject<number>
  onZoomChangeRef:MutableRefObject<(value:number)=>void>
  suppressClickRef:MutableRefObject<number>
  onActivateCellRef:MutableRefObject<(item:BlueprintCell)=>void>
}

type BoardCellProps={
  item:BlueprintCell
  index:number
  cell:number
  repeaterDisplay:RepeaterDisplay
  onClick:(event:React.MouseEvent<HTMLDivElement>)=>void
  register:(index:number,key:string,selection:string|undefined,step:number|undefined,isPlayback:boolean,isNote:boolean,node:HTMLDivElement,attached:boolean)=>void
}

const canSelectPlaybackStart=(item:BlueprintCell)=>item.type==='source'||item.type==='repeater'

const BoardCell=memo(function BoardCell({item,index,cell,repeaterDisplay,onClick,register}:BoardCellProps){
  const key=`${item.x}-${item.y}`
  const selection=canSelectPlaybackStart(item)?(item.groupId??key):undefined
  const nodeRef=useRef<HTMLDivElement|null>(null)
  const setNode=useCallback((node:HTMLDivElement|null)=>{
    if(nodeRef.current&&nodeRef.current!==node)register(index,key,selection,item.step,item.type!=='layer-link',item.type==='note',nodeRef.current,false)
    if(node)register(index,key,selection,item.step,item.type!=='layer-link',item.type==='note',node,true)
    nodeRef.current=node
  },[index,key,selection,item.step,item.type,register])
  return <div ref={setNode} data-cell={index} onClick={onClick} className={`bp-cell ${item.type} ${item.texture??''} pitch-${item.label??0}`} style={{gridColumn:item.x+1,gridRow:item.y+1,width:cell,height:cell}}>{item.type==='repeater'?<div className={`repeater-mark ${item.direction} ${repeaterDisplay==='clicks'?'click-display':''}`}><b>{repeaterDisplay==='clicks'?Math.max(0,(item.delay??1)-1):item.delay}</b></div>:item.type==='dust'?<>{item.connections?.map(direction=><i key={direction} className={`dust-arm ${direction}`}/>)}<i className="dust-dot"/></>:item.type==='layer-link'?<b>{item.label}</b>:item.type==='note'?<b>{item.label}</b>:item.type==='source'?<b>S</b>:null}</div>
})

const BlueprintBoardImpl=({value,cell,axis,selected,repeaterDisplay,boardRef,wrapRef,stageRef,shellRef,zoomRef,onZoomChangeRef,suppressClickRef,onActivateCellRef}:Props)=>{
  const cellNodesRef=useRef(new Map<string,Set<HTMLDivElement>>())
  const cellStepRef=useRef(new Map<string,number|undefined>())
  const stepNodesRef=useRef(new Map<number,Set<HTMLDivElement>>())
  const noteStepNodesRef=useRef(new Map<number,Set<HTMLDivElement>>())
  const selectionNodesRef=useRef(new Map<string,Set<HTMLDivElement>>())
  const activeStepRef=useRef<number|null>(null)
  const particleStepsRef=useRef(new Set<number>())
  const particleTimersRef=useRef(new Map<number,number>())
  const previewKeyRef=useRef<string|null>(null)
  const selectedRef=useRef<string|null>(selected)
  const previewTimerRef=useRef<number|null>(null)
  const gestureRef=useRef<{id:number;x:number;y:number;ox:number;oy:number;moved:boolean}|null>(null)
  const pointsRef=useRef(new Map<number,{x:number;y:number;ox:number;oy:number}>())
  const pinchRef=useRef<{distance:number;zoom:number;anchorX:number;anchorY:number}|null>(null)
  const pinchFrameRef=useRef<number|null>(null)

  const register=useCallback((index:number,key:string,selection:string|undefined,step:number|undefined,isPlayback:boolean,isNote:boolean,node:HTMLDivElement,attached:boolean)=>{
    const update=(map:Map<string|number,Set<HTMLDivElement>>,mapKey:string|number)=>{
      let nodes=map.get(mapKey)
      if(attached){if(!nodes){nodes=new Set();map.set(mapKey,nodes)}nodes.add(node)}
      else if(nodes){nodes.delete(node);if(!nodes.size)map.delete(mapKey)}
    }
    update(cellNodesRef.current,key)
    if(attached)cellStepRef.current.set(key,step)
    else if(!cellNodesRef.current.has(key))cellStepRef.current.delete(key)
    if(selection!==undefined)update(selectionNodesRef.current,selection)
    if(step!==undefined&&isPlayback)update(stepNodesRef.current,step)
    if(step!==undefined&&isNote)update(noteStepNodesRef.current,step)
    if(attached){
      node.classList.toggle('active-note',isPlayback&&step!==undefined&&activeStepRef.current===step)
      node.classList.toggle('particle-note',isNote&&((step!==undefined&&particleStepsRef.current.has(step))||previewKeyRef.current===key))
      node.classList.toggle('start-selected',selection!==undefined&&selectedRef.current===selection)
    }
    // Keep the callback's index in its signature so the data-cell contract is
    // explicit at the registration boundary, even though the maps use keys.
    void index
  },[])

  const clearClass=(className:string)=>{cellNodesRef.current.forEach(nodes=>nodes.forEach(node=>node.classList.remove(className)))}
  const syncImperativeClasses=useCallback(()=>{
    clearClass('active-note');clearClass('particle-note')
    if(activeStepRef.current!==null)stepNodesRef.current.get(activeStepRef.current)?.forEach(node=>node.classList.add('active-note'))
    particleStepsRef.current.forEach(step=>noteStepNodesRef.current.get(step)?.forEach(node=>node.classList.add('particle-note')))
    if(selectedRef.current)selectionNodesRef.current.get(selectedRef.current)?.forEach(node=>node.classList.add('start-selected'))
    if(previewKeyRef.current)cellNodesRef.current.get(previewKeyRef.current)?.forEach(node=>node.classList.add('particle-note'))
  },[])

  const previousSelectedRef=useRef<string|null>(null)
  selectedRef.current=selected
  useLayoutEffect(()=>{
    if(previousSelectedRef.current)selectionNodesRef.current.get(previousSelectedRef.current)?.forEach(node=>node.classList.remove('start-selected'))
    if(selected)selectionNodesRef.current.get(selected)?.forEach(node=>node.classList.add('start-selected'))
    previousSelectedRef.current=selected
  },[selected])

  const setPlaybackStep=useCallback((step:number)=>{
    if(activeStepRef.current!==null)stepNodesRef.current.get(activeStepRef.current)?.forEach(node=>node.classList.remove('active-note'))
    activeStepRef.current=step>=0?step:null
    if(step<0){
      particleTimersRef.current.forEach(timer=>window.clearTimeout(timer));particleTimersRef.current.clear()
      particleStepsRef.current.forEach(particleStep=>noteStepNodesRef.current.get(particleStep)?.forEach(node=>node.classList.remove('particle-note')))
      particleStepsRef.current.clear()
      return
    }
    stepNodesRef.current.get(step)?.forEach(node=>node.classList.add('active-note'))
    particleStepsRef.current.add(step)
    const existing=particleTimersRef.current.get(step)
    if(existing!==undefined)window.clearTimeout(existing)
    const timer=window.setTimeout(()=>{
      particleStepsRef.current.delete(step)
      particleTimersRef.current.delete(step)
      const previewNodes=previewKeyRef.current?cellNodesRef.current.get(previewKeyRef.current):undefined
      noteStepNodesRef.current.get(step)?.forEach(node=>{if(!previewNodes?.has(node))node.classList.remove('particle-note')})
    },250)
    particleTimersRef.current.set(step,timer)
    noteStepNodesRef.current.get(step)?.forEach(node=>node.classList.add('particle-note'))
  },[])

  const setPreviewCell=useCallback((key:string|null)=>{
    if(previewTimerRef.current!==null)window.clearTimeout(previewTimerRef.current)
    if(previewKeyRef.current){const oldKey=previewKeyRef.current;cellNodesRef.current.get(oldKey)?.forEach(node=>{if(!particleStepsRef.current.has(cellStepRef.current.get(oldKey)??-1))node.classList.remove('particle-note')})}
    previewKeyRef.current=key
    if(key)cellNodesRef.current.get(key)?.forEach(node=>node.classList.add('particle-note'))
    if(key)previewTimerRef.current=window.setTimeout(()=>{if(previewKeyRef.current===key){previewKeyRef.current=null;cellNodesRef.current.get(key)?.forEach(node=>{if(!particleStepsRef.current.has(cellStepRef.current.get(key)??-1))node.classList.remove('particle-note')})}},260)
  },[])

  useImperativeHandle(boardRef,()=>({setPlaybackStep,setPreviewCell}),[setPlaybackStep,setPreviewCell])
  useLayoutEffect(()=>{syncImperativeClasses()},[value,repeaterDisplay,syncImperativeClasses])

  useEffect(()=>()=>{
    particleTimersRef.current.forEach(timer=>window.clearTimeout(timer))
    if(previewTimerRef.current!==null)window.clearTimeout(previewTimerRef.current)
    if(pinchFrameRef.current!==null)window.cancelAnimationFrame(pinchFrameRef.current)
  },[])

  const onClick=useCallback((event:React.MouseEvent<HTMLDivElement>)=>{
    if(performance.now()<suppressClickRef.current)return
    const index=Number(event.currentTarget.dataset.cell)
    const item=value.cells[index]
    if(item)onActivateCellRef.current(item)
  },[value,suppressClickRef,onActivateCellRef])

  const pointerDown=useCallback((event:React.PointerEvent<HTMLElement>)=>{
    if(event.pointerType!=='touch')return
    pointsRef.current.set(event.pointerId,{x:event.clientX,y:event.clientY,ox:event.clientX,oy:event.clientY})
    event.currentTarget.setPointerCapture(event.pointerId)
    if(pointsRef.current.size===1)gestureRef.current={id:event.pointerId,x:event.clientX,y:event.clientY,ox:event.clientX,oy:event.clientY,moved:false}
    else{
      const[a,b]=[...pointsRef.current.values()],shell=shellRef.current
      if(shell){const zoom=zoomRef.current,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,rect=shell.getBoundingClientRect();pinchRef.current={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom,anchorX:(mx-rect.left)/zoom,anchorY:(my-rect.top)/zoom}}
      gestureRef.current=null
    }
    event.preventDefault()
  },[shellRef,zoomRef])

  const pointerMove=useCallback((event:React.PointerEvent<HTMLElement>)=>{
    const point=pointsRef.current.get(event.pointerId),wrap=wrapRef.current
    if(!point||!wrap)return
    point.x=event.clientX;point.y=event.clientY
    if(pointsRef.current.size>=2&&pinchRef.current){
      if(pinchFrameRef.current===null)pinchFrameRef.current=window.requestAnimationFrame(()=>{
        pinchFrameRef.current=null
        const pinch=pinchRef.current,wrap=wrapRef.current,shell=shellRef.current,stage=stageRef.current
        if(!pinch||!wrap||!shell||!stage||pointsRef.current.size<2)return
        const[a,b]=[...pointsRef.current.values()],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,valueZoom=Math.max(.3,Math.min(2.4,pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance))
        zoomRef.current=valueZoom;onZoomChangeRef.current(valueZoom);shell.style.transform=`scale(${valueZoom})`;shell.style.setProperty('--blueprint-line',`${Math.max(.75,1/valueZoom+Math.max(0,1-valueZoom))}px`);shell.style.setProperty('--blueprint-inner-line',valueZoom<.55?'0px':'1px')
        stage.style.width=`${(axis*2+value.width*cell)*valueZoom}px`;stage.style.height=`${(axis*2+value.height*cell)*valueZoom}px`
        const rect=shell.getBoundingClientRect();wrap.scrollLeft+=rect.left+pinch.anchorX*valueZoom-mx;wrap.scrollTop+=rect.top+pinch.anchorY*valueZoom-my
      })
    }else{
      const gesture=gestureRef.current
      if(gesture&&gesture.id===event.pointerId){const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(Math.hypot(event.clientX-gesture.ox,event.clientY-gesture.oy)>8)gesture.moved=true;wrap.scrollLeft-=dx;wrap.scrollTop-=dy;gesture.x=event.clientX;gesture.y=event.clientY}
    }
    event.preventDefault()
  },[axis,cell,value,wrapRef,shellRef,stageRef,zoomRef,onZoomChangeRef])

  const pointerUp=useCallback((event:React.PointerEvent<HTMLElement>)=>{
    const gesture=gestureRef.current,wasSingle=pointsRef.current.size===1
    pointsRef.current.delete(event.pointerId)
    if(wasSingle&&gesture&&gesture.id===event.pointerId&&!gesture.moved){const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-cell]'),index=Number(target?.dataset.cell);if(Number.isFinite(index)&&value.cells[index]){suppressClickRef.current=performance.now()+700;onActivateCellRef.current(value.cells[index])}}
    if(pointsRef.current.size===1){const[id,p]=[...pointsRef.current.entries()][0];gestureRef.current={id,x:p.x,y:p.y,ox:p.x,oy:p.y,moved:true}}else gestureRef.current=null
    if(pointsRef.current.size<2){if(pinchFrameRef.current!==null){window.cancelAnimationFrame(pinchFrameRef.current);pinchFrameRef.current=null}pinchRef.current=null}
  },[value,suppressClickRef,onActivateCellRef])

  const pointerCancel=useCallback((event:React.PointerEvent<HTMLElement>)=>{pointsRef.current.delete(event.pointerId);if(gestureRef.current?.id===event.pointerId)gestureRef.current=null;if(pointsRef.current.size<2){if(pinchFrameRef.current!==null){window.cancelAnimationFrame(pinchFrameRef.current);pinchFrameRef.current=null}pinchRef.current=null}},[])
  const buckets=useMemo(()=>indexBlueprintCells(value.cells),[value.cells])
  const [windowBounds,setWindowBounds]=useState<BoardBounds>(()=>bufferedBoardBounds(value.width,value.height,0,Math.max(0,value.height-32),32,32))
  const boundsRef=useRef(windowBounds)
  const useWindow=value.cells.length>4096
  useLayoutEffect(()=>{
    if(!useWindow)return
    const wrap=wrapRef.current,shell=shellRef.current,stage=stageRef.current
    if(!wrap||!shell||!stage)return
    const update=(synchronous:boolean)=>{
      const wr=wrap.getBoundingClientRect(),sr=shell.getBoundingClientRect(),zoom=zoomRef.current
      const next=bufferedBoardBounds(value.width,value.height,((wr.left-sr.left)/zoom-axis)/cell,((wr.top-sr.top)/zoom-axis)/cell,wrap.clientWidth/zoom/cell,wrap.clientHeight/zoom/cell)
      const old=boundsRef.current
      if(next.left===old.left&&next.right===old.right&&next.top===old.top&&next.bottom===old.bottom)return
      boundsRef.current=next
      if(synchronous)flushSync(()=>setWindowBounds(next));else setWindowBounds(next)
    }
    update(false)
    const scroll=()=>update(true)
    const resize=new ResizeObserver(()=>update(false))
    resize.observe(wrap);resize.observe(stage)
    // CSS transforms do not resize the shell's layout box. Observe the actual
    // zoom style as well, including a pinch that leaves the scroll offset at 0.
    const transform=new MutationObserver(()=>update(false))
    transform.observe(shell,{attributes:true,attributeFilter:['style']})
    wrap.addEventListener('scroll',scroll,{passive:true})
    return()=>{resize.disconnect();transform.disconnect();wrap.removeEventListener('scroll',scroll)}
  },[useWindow,value,axis,cell,wrapRef,shellRef,stageRef,zoomRef])
  const bounds=useWindow?windowBounds:{left:0,right:value.width,top:0,bottom:value.height}
  const indices=useMemo(()=>useWindow?visibleBlueprintIndices(buckets,windowBounds):value.cells.map((_,index)=>index),[useWindow,buckets,windowBounds,value.cells])
  const cells=useMemo(()=>indices.map(index=>{const item=value.cells[index];return <BoardCell key={`${item.x}-${item.y}-${index}`} item={item} index={index} cell={cell} repeaterDisplay={repeaterDisplay} onClick={onClick} register={register}/>}),[indices,value.cells,cell,repeaterDisplay,onClick,register])
  const columns=Array.from({length:Math.max(0,bounds.right-bounds.left)},(_,i)=>bounds.left+i)
  const rows=Array.from({length:Math.max(0,bounds.bottom-bounds.top)},(_,i)=>bounds.top+i)

  return <section ref={wrapRef} className="blueprint-board-wrap" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerCancel} onLostPointerCapture={pointerCancel}><div ref={stageRef} className="blueprint-stage"><div ref={shellRef} className="blueprint-grid-shell" style={{width:axis*2+value.width*cell,height:axis*2+value.height*cell}}><div className="column-labels top" style={{left:axis,gridTemplateColumns:`repeat(${value.width},${cell}px)`}}>{columns.map(index=><b key={index} style={{gridColumn:index+1}}>{blueprintColumnNumber(value,index)}</b>)}</div><div className="column-labels bottom" style={{left:axis,top:axis+value.height*cell,gridTemplateColumns:`repeat(${value.width},${cell}px)`}}>{columns.map(index=><b key={index} style={{gridColumn:index+1}}>{blueprintColumnNumber(value,index)}</b>)}</div><div className="row-labels left" style={{top:axis,gridTemplateRows:`repeat(${value.height},${cell}px)`}}>{rows.map(index=><b key={index} style={{gridRow:index+1}}>{blueprintRowNumber(value,index)}</b>)}</div><div className="row-labels right" style={{left:axis+value.width*cell,top:axis,gridTemplateRows:`repeat(${value.height},${cell}px)`}}>{rows.map(index=><b key={index} style={{gridRow:index+1}}>{blueprintRowNumber(value,index)}</b>)}</div><div className="blueprint-board" style={{left:axis,top:axis,width:value.width*cell,height:value.height*cell,gridTemplateColumns:`repeat(${value.width},${cell}px)`,gridTemplateRows:`repeat(${value.height},${cell}px)`,backgroundSize:`${cell}px ${cell}px`}}>{cells}</div></div></div></section>
}

export default memo(BlueprintBoardImpl)
