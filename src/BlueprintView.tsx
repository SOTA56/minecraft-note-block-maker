import { useMemo, useState } from 'react'
import type { Project } from './types'
import { generateEasyBlueprint,maxPolyphony,type BlueprintInstrument } from './blueprint'
import './blueprint.css'

type Props={project:Project;instruments:readonly BlueprintInstrument[];language:string;onBack:()=>void}

export default function BlueprintView({project,instruments,language,onBack}:Props){
  const [kind,setKind]=useState<'easy'|'packed'|'fishbone'>('easy')
  const [runLength,setRunLength]=useState(40)
  const [fold,setFold]=useState<'right'|'left'>('right')
  const poly=maxPolyphony(project)
  const eligible=poly<=3
  const plan=useMemo(()=>eligible?generateEasyBlueprint(project,instruments,runLength,fold):null,[project,instruments,runLength,fold,eligible])
  const ja=language==='ja'
  return <main className="blueprint-page">
    <header className="blueprint-header"><button onClick={onBack}>← <span>{ja?'打ち込みへ':'EDITOR'}</span></button><div><small>OTO BLOGIC</small><h1>{ja?'回路設計図':'CIRCUIT BLUEPRINT'}</h1></div><b>{project.title}</b></header>
    <nav className="blueprint-tabs"><button className={kind==='easy'?'active':''} onClick={()=>setKind('easy')}>01<small>{ja?'かんたん':'EASY'}</small></button><button className={kind==='packed'?'active':''} onClick={()=>setKind('packed')}>02<small>{ja?'詰め詰め':'COMPACT'}</small></button><button className={kind==='fishbone'?'active':''} onClick={()=>setKind('fishbone')}>03<small>{ja?'フィッシュボーン':'FISHBONE'}</small></button></nav>
    {kind==='easy'?<>
      <section className="blueprint-controls"><label><span>{ja?'折り返しまで':'RUN LENGTH'}</span><input type="number" min="8" max="128" value={runLength} onChange={event=>setRunLength(Math.max(8,Math.min(128,Number(event.target.value)||40)))}/><em>{ja?'マス':'BLOCKS'}</em></label><label><span>{ja?'折り返す方向':'FOLD TOWARD'}</span><select value={fold} onChange={event=>setFold(event.target.value as 'right'|'left')}><option value="right">{ja?'右':'RIGHT'}</option><option value="left">{ja?'左':'LEFT'}</option></select></label><div><span>{ja?'最大同時発音':'MAX POLY'}</span><strong className={eligible?'ok':'bad'}>{poly} / 3</strong></div></section>
      {!eligible?<section className="blueprint-warning"><b>!</b><div><strong>{ja?'かんたん回路では生成できません':'NOT AVAILABLE FOR EASY CIRCUIT'}</strong><p>{ja?`同時発音が最大${poly}音あります。3音以内に減らすか、詰め詰め回路を使用してください。`:`Maximum polyphony is ${poly}. Reduce it to 3 or use Compact Circuit.`}</p></div></section>:plan&&<>
        <section className="blueprint-summary"><div><small>{ja?'1列あたり':'PER RUN'}</small><b>{plan.eventsPerRun}{ja?'ステップ':' STEPS'}</b></div><div><small>{ja?'折り返し':'RUNS'}</small><b>{plan.runCount}{ja?'列':''}</b></div><div><small>{ja?'リピーター':'REPEATER'}</small><b>1 TICK</b></div></section>
        <section className="blueprint-board-wrap"><div className="blueprint-board" style={{gridTemplateColumns:`repeat(${plan.width},34px)`,gridTemplateRows:`repeat(${plan.height},34px)`}}>{plan.cells.map((cell,index)=><div key={`${cell.x}-${cell.y}-${index}`} className={`bp-cell ${cell.type} ${cell.texture??''}`} style={{gridColumn:cell.x+1,gridRow:cell.y+1}}>{cell.type==='repeater'?<><i className={`arrow ${cell.direction}`}>➜</i><b>{cell.delay}</b></>:cell.type==='dust'?<i className={`dust-line ${cell.direction}`}/>:<><b>{cell.label}</b>{cell.sub&&<small>{cell.sub}</small>}</>}</div>)}</div></section>
        <section className="blueprint-legend"><span><i className="legend-note"/>0–24 {ja?'クリック数':'CLICKS'}</span><span><i className="legend-repeater">➜1</i>{ja?'向き・遅延':'DIRECTION / DELAY'}</span><span><i className="legend-rest">休</i>{ja?'休符用ブロック':'REST BLOCK'}</span><span><i className="legend-dust"/>{ja?'折り返し用ダスト':'FOLD DUST'}</span></section>
      </>}
    </>:<section className="blueprint-pending"><b>{kind==='packed'?'02':'03'}</b><h2>{kind==='packed'?(ja?'詰め詰め回路':'COMPACT CIRCUIT'):(ja?'フィッシュボーン回路':'FISHBONE CIRCUIT')}</h2><p>{kind==='packed'?(ja?'6和音・可変遅延・多層折り返しの信号干渉を検証してから実装します。':'Coming after validation of 6-note, variable-delay and multi-layer routing.'):(ja?'かんたん回路と詰め詰め回路の完成後に実装します。':'Coming after Easy and Compact circuits are complete.')}</p><span>COMING SOON</span></section>}
  </main>
}
