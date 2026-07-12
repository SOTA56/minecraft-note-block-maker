import { useEffect, useMemo, useRef, useState } from 'react'
import type { BlueprintSettings,Project } from './types'
import { generateEasyBlueprint,maxPolyphony,type BlueprintInstrument } from './blueprint'
import { exportBlueprint } from './blueprintExport'
import { playProject,previewTone,stopPlayback } from './audio'
import './blueprint.css'

type Props={project:Project;instruments:readonly BlueprintInstrument[];language:string;onBack:()=>void;onSettingsChange:(settings:BlueprintSettings)=>void}

export default function BlueprintView({project,instruments,language,onBack,onSettingsChange}:Props){
  const [kind,setKind]=useState<'easy'|'packed'|'fishbone'>('easy')
  const saved=project.blueprint??{runLength:40,fold:'right' as const,includeSilentEdges:true}
  const [runLength,setRunLength]=useState(saved.runLength)
  const [runLengthDraft,setRunLengthDraft]=useState(String(saved.runLength))
  const [fold,setFold]=useState<'right'|'left'>(saved.fold)
  const [includeSilentEdges,setIncludeSilentEdges]=useState(saved.includeSilentEdges)
  const [showLegend,setShowLegend]=useState(false)
  const [showOptions,setShowOptions]=useState(false)
  const [theme,setTheme]=useState<'dark'|'light'>(saved.theme??'dark')
  const [selectedCell,setSelectedCell]=useState<string|null>(null)
  const [startStep,setStartStep]=useState<number|null>(null)
  const [playingStep,setPlayingStep]=useState(-1)
  const [previewCell,setPreviewCell]=useState<string|null>(null)
  const previewTimerRef=useRef(0)
  const [particleSteps,setParticleSteps]=useState<number[]>([])
  const particleTimersRef=useRef<number[]>([])
  const poly=maxPolyphony(project)
  const eligible=poly<=3
  const plan=useMemo(()=>eligible?generateEasyBlueprint(project,instruments,runLength,fold,includeSilentEdges):null,[project,instruments,runLength,fold,includeSilentEdges,eligible])
  const ja=language==='ja'
  const wrapRef=useRef<HTMLElement>(null)
  const shellRef=useRef<HTMLDivElement>(null)
  const stageRef=useRef<HTMLDivElement>(null)
  const zoomTextRef=useRef<HTMLElement>(null)
  const zoomRef=useRef(1)
  const gestureRef=useRef<{pointers:Map<number,{x:number;y:number}>;lastX:number;lastY:number;startDistance:number;startZoom:number;anchorX:number;anchorY:number}|null>(null)
  const cell=40,axisLeft=42,axisTop=36
  const commitRunLength=(raw:string)=>{
    const requested=Number(raw)
    if(!Number.isFinite(requested)||requested<8||requested>128){setRunLengthDraft(String(runLength));return}
    const next=Math.round(requested);setRunLength(next);setRunLengthDraft(String(next));onSettingsChange({runLength:next,fold,includeSilentEdges,theme})
  }
  const applyZoom=(value:number,centerX?:number,centerY?:number)=>{
    if(!plan||!wrapRef.current||!shellRef.current||!stageRef.current)return
    const wrap=wrapRef.current,old=zoomRef.current,next=Math.max(.45,Math.min(2.4,value))
    const cx=centerX??wrap.clientWidth/2,cy=centerY??wrap.clientHeight/2
    const anchorX=(wrap.scrollLeft+cx)/old,anchorY=(wrap.scrollTop+cy)/old
    zoomRef.current=next;shellRef.current.style.transform=`scale(${next})`
    stageRef.current.style.width=`${(axisLeft*2+plan.width*cell)*next}px`;stageRef.current.style.height=`${(axisTop*2+plan.height*cell)*next}px`
    wrap.scrollLeft=anchorX*next-cx;wrap.scrollTop=anchorY*next-cy
    if(zoomTextRef.current)zoomTextRef.current.textContent=`${Math.round(next*100)}%`
  }
  useEffect(()=>{zoomRef.current=1;if(shellRef.current)shellRef.current.style.transform='scale(1)';if(stageRef.current&&plan){stageRef.current.style.width=`${axisLeft*2+plan.width*cell}px`;stageRef.current.style.height=`${axisTop*2+plan.height*cell}px`}if(zoomTextRef.current)zoomTextRef.current.textContent='100%';const frame=window.requestAnimationFrame(()=>{if(wrapRef.current)wrapRef.current.scrollTop=wrapRef.current.scrollHeight});return()=>window.cancelAnimationFrame(frame)},[plan?.width,plan?.height])
  const pointerDown=(event:React.PointerEvent<HTMLElement>)=>{
    if(event.pointerType!=='touch')return
    const rect=event.currentTarget.getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top}
    const gesture=gestureRef.current??{pointers:new Map(),lastX:point.x,lastY:point.y,startDistance:1,startZoom:zoomRef.current,anchorX:0,anchorY:0}
    gesture.pointers.set(event.pointerId,point);gestureRef.current=gesture;event.currentTarget.setPointerCapture(event.pointerId)
    if(gesture.pointers.size===2){const[a,b]=[...gesture.pointers.values()];gesture.startDistance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));gesture.startZoom=zoomRef.current;const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;gesture.anchorX=(event.currentTarget.scrollLeft+cx)/zoomRef.current;gesture.anchorY=(event.currentTarget.scrollTop+cy)/zoomRef.current}
    event.preventDefault()
  }
  const pointerMove=(event:React.PointerEvent<HTMLElement>)=>{
    const gesture=gestureRef.current;if(!gesture?.pointers.has(event.pointerId))return
    const rect=event.currentTarget.getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top};gesture.pointers.set(event.pointerId,point)
    if(gesture.pointers.size>=2&&plan&&shellRef.current&&stageRef.current){const[a,b]=[...gesture.pointers.values()];const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;const next=Math.max(.45,Math.min(2.4,gesture.startZoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.startDistance));zoomRef.current=next;shellRef.current.style.transform=`scale(${next})`;stageRef.current.style.width=`${(axisLeft*2+plan.width*cell)*next}px`;stageRef.current.style.height=`${(axisTop*2+plan.height*cell)*next}px`;event.currentTarget.scrollLeft=gesture.anchorX*next-cx;event.currentTarget.scrollTop=gesture.anchorY*next-cy;if(zoomTextRef.current)zoomTextRef.current.textContent=`${Math.round(next*100)}%`}
    else if(gesture.pointers.size===1){event.currentTarget.scrollLeft+=gesture.lastX-point.x;event.currentTarget.scrollTop+=gesture.lastY-point.y;gesture.lastX=point.x;gesture.lastY=point.y}
    event.preventDefault()
  }
  const pointerEnd=(event:React.PointerEvent<HTMLElement>)=>{const gesture=gestureRef.current;if(!gesture)return;gesture.pointers.delete(event.pointerId);if(gesture.pointers.size===1){const point=[...gesture.pointers.values()][0];gesture.lastX=point.x;gesture.lastY=point.y}if(!gesture.pointers.size)gestureRef.current=null}
  useEffect(()=>()=>{stopPlayback();window.clearTimeout(previewTimerRef.current);particleTimersRef.current.forEach(window.clearTimeout)},[])
  const emitStepParticles=(step:number)=>{
    if(step<0)return
    setParticleSteps(current=>current.includes(step)?current:[...current,step])
    const timer=window.setTimeout(()=>setParticleSteps(current=>current.filter(value=>value!==step)),250)
    particleTimersRef.current.push(timer)
  }
  const chooseCell=(item:NonNullable<typeof plan>['cells'][number])=>{
    const key=`${item.x}-${item.y}`
    if(item.type==='note'){void previewTone(Number(item.label),item.volume??1,item.instrument??'Harp');window.clearTimeout(previewTimerRef.current);setPreviewCell(null);window.requestAnimationFrame(()=>{setPreviewCell(key);previewTimerRef.current=window.setTimeout(()=>setPreviewCell(null),260)});return}
    if(item.type==='rest')return
    if(selectedCell===key){setSelectedCell(null);setStartStep(null);return}
    setSelectedCell(key);setStartStep(item.step??plan?.firstStep??0)
  }
  const playBlueprint=async()=>{
    if(playingStep>=0){stopPlayback();setPlayingStep(-1);return}
    const from=startStep??plan?.firstStep??0;setPlayingStep(from)
    await playProject(project,from,step=>{setPlayingStep(step);emitStepParticles(step)})
  }
  const cueStart=()=>{stopPlayback();setPlayingStep(-1);const source=plan?.cells.find(item=>item.type==='source');if(source){setSelectedCell(`${source.x}-${source.y}`);setStartStep(source.step??plan?.firstStep??0)}}
  return <main className={`blueprint-page theme-${theme}`}>
    <header className="blueprint-header"><button className="editor-back" onClick={onBack}><i>←</i><span>{ja?'打ち込みへ':'EDITOR'}</span></button><div className="blueprint-title"><small>OTO BLOGIC</small><h1>{ja?'回路設計図':'CIRCUIT BLUEPRINT'}</h1></div><div className="header-export">{plan&&<><button onClick={()=>exportBlueprint(plan,'png',project.title,theme).catch(error=>alert(error.message))}>PNG</button><button onClick={()=>exportBlueprint(plan,'pdf',project.title,theme).catch(error=>alert(error.message))}>PDF</button></>}</div></header>
    <nav className="blueprint-tabs"><button className={kind==='easy'?'active':''} onClick={()=>setKind('easy')}>01<small>{ja?'かんたん':'EASY'}</small></button><button className={kind==='packed'?'active':''} onClick={()=>setKind('packed')}>02<small>{ja?'詰め詰め':'COMPACT'}</small></button><button className={kind==='fishbone'?'active':''} onClick={()=>setKind('fishbone')}>03<small>{ja?'フィッシュボーン':'FISHBONE'}</small></button></nav>
    {kind==='easy'?<>
      <section className="blueprint-controls"><div className="blueprint-transport"><button className="play" onClick={playBlueprint} aria-label={playingStep>=0?'停止':'再生'}><span>{playingStep>=0?'■':'▶'}</span></button><button onClick={cueStart} aria-label="頭出し"><span>┃◀</span></button></div><label><span>{ja?'折り返しまで':'RUN LENGTH'}</span><span className="run-input"><input type="text" inputMode="numeric" value={runLengthDraft} onChange={event=>setRunLengthDraft(event.target.value.replace(/[^0-9]/g,''))} onBlur={event=>commitRunLength(event.currentTarget.value)} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur()}}/><em>{ja?'マス':'BLOCKS'}</em></span></label><button className={`legend-toggle ${showLegend?'active':''}`} onClick={()=>setShowLegend(value=>!value)}><span>ⓘ</span>{ja?'図の説明':'LEGEND'}<i>{showLegend?'▲':'▼'}</i></button><button className={`more-toggle ${showOptions?'active':''}`} onClick={()=>setShowOptions(value=>!value)}>•••<span>{ja?'設定':'OPTIONS'}</span></button></section>
      {showOptions&&<section className="blueprint-options"><label><span>{ja?'折り返す方向':'FOLD TOWARD'}</span><button className="single-toggle" onClick={()=>setFold(value=>{const next=value==='right'?'left':'right';onSettingsChange({runLength,fold:next,includeSilentEdges,theme});return next})}>{fold==='right'?(ja?'右へ →':'RIGHT →'):(ja?'← 左へ':'← LEFT')}</button></label><label><span>{ja?'前後の無音':'SILENT EDGES'}</span><button className={`single-toggle ${includeSilentEdges?'active':''}`} onClick={()=>setIncludeSilentEdges(value=>{const next=!value;onSettingsChange({runLength,fold,includeSilentEdges:next,theme});return next})}>{includeSilentEdges?(ja?'含める':'INCLUDE'):(ja?'省く':'TRIM')}</button></label><label><span>{ja?'背景色':'BACKGROUND'}</span><button className="single-toggle" onClick={()=>setTheme(value=>{const next=value==='dark'?'light':'dark';onSettingsChange({runLength,fold,includeSilentEdges,theme:next});return next})}>{theme==='dark'?(ja?'ダーク':'DARK'):(ja?'ホワイト':'WHITE')}</button></label></section>}
      {showLegend&&<section className="blueprint-legend"><span><i className="legend-note">12</i>{ja?'下に置くブロックとクリック数':'BLOCK BELOW AND CLICK COUNT'}</span><span><i className="legend-repeater"><u>1</u></i>{ja?'リピーターの向きと遅延数':'REPEATER DIRECTION AND DELAY'}</span><span><i className="legend-rest placeholder"/>{ja?'仮ブロック：任意の不透過ブロック':'PLACEHOLDER: ANY SOLID OPAQUE BLOCK'}</span><span><i className="legend-dust"><u/></i>{ja?'レッドストーンダスト':'REDSTONE DUST'}</span><span><i className="legend-source">S</i>{ja?'スタート':'START'}</span></section>}
      {!eligible?<section className="blueprint-warning"><b>!</b><div><strong>{ja?'かんたん回路では生成できません':'NOT AVAILABLE FOR EASY CIRCUIT'}</strong><p>{ja?`同時発音が最大${poly}音あります。3音以内に減らすか、詰め詰め回路を使用してください。`:`Maximum polyphony is ${poly}. Reduce it to 3 or use Compact Circuit.`}</p></div></section>:plan&&<>
        <section ref={wrapRef} className="blueprint-board-wrap" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}><div ref={stageRef} className="blueprint-stage" style={{width:axisLeft*2+plan.width*cell,height:axisTop*2+plan.height*cell}}><div ref={shellRef} className="blueprint-grid-shell" style={{width:axisLeft*2+plan.width*cell,height:axisTop*2+plan.height*cell}}><div className="column-labels top" style={{left:axisLeft,gridTemplateColumns:`repeat(${plan.width},${cell}px)`}}>{Array.from({length:plan.width},(_,index)=><b key={index}>{index+1}</b>)}</div><div className="column-labels bottom" style={{left:axisLeft,top:axisTop+plan.height*cell,gridTemplateColumns:`repeat(${plan.width},${cell}px)`}}>{Array.from({length:plan.width},(_,index)=><b key={index}>{index+1}</b>)}</div><div className="row-labels left" style={{top:axisTop,gridTemplateRows:`repeat(${plan.height},${cell}px)`}}>{Array.from({length:plan.height},(_,index)=><b key={index}>{index+1}</b>)}</div><div className="row-labels right" style={{left:axisLeft+plan.width*cell,top:axisTop,gridTemplateRows:`repeat(${plan.height},${cell}px)`}}>{Array.from({length:plan.height},(_,index)=><b key={index}>{index+1}</b>)}</div><div className="blueprint-board" style={{left:axisLeft,top:axisTop,width:plan.width*cell,height:plan.height*cell,gridTemplateColumns:`repeat(${plan.width},${cell}px)`,gridTemplateRows:`repeat(${plan.height},${cell}px)`,backgroundSize:`${cell}px ${cell}px`}}>{plan.cells.map((item,index)=>{const key=`${item.x}-${item.y}`;return <div key={`${key}-${index}`} onClick={()=>chooseCell(item)} className={`bp-cell ${item.type} ${item.texture??''} pitch-${item.label??0} ${selectedCell===key?'start-selected':''} ${item.type==='note'&&item.step===playingStep?'active-note':''} ${item.type==='note'&&(particleSteps.includes(item.step??-1)||previewCell===key)?'particle-note':''}`} style={{gridColumn:item.x+1,gridRow:item.y+1,width:cell,height:cell}}>{item.type==='repeater'?<div className={`repeater-mark ${item.direction}`}><b>{item.delay}</b></div>:item.type==='dust'?<>{item.connections?.map(direction=><i key={direction} className={`dust-arm ${direction}`}/>) }<i className="dust-dot"/></>:item.type==='note'?<b>{item.label}</b>:item.type==='source'?<b>S</b>:null}</div>})}</div></div></div></section>
      </>}
    </>:<section className="blueprint-pending"><b>{kind==='packed'?'02':'03'}</b><h2>{kind==='packed'?(ja?'詰め詰め回路':'COMPACT CIRCUIT'):(ja?'フィッシュボーン回路':'FISHBONE CIRCUIT')}</h2><p>{kind==='packed'?(ja?'6和音・可変遅延・多層折り返しの信号干渉を検証してから実装します。':'Coming after validation of 6-note, variable-delay and multi-layer routing.'):(ja?'かんたん回路と詰め詰め回路の完成後に実装します。':'Coming after Easy and Compact circuits are complete.')}</p><span>COMING SOON</span></section>}
  </main>
}
