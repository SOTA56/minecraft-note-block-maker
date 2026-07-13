import type { Project } from './types'

export type BlueprintInstrument = { id:string; ja:string; en:string; blockJa:string; blockEn:string; texture:string }
export type BlueprintCell = { x:number; y:number; type:'note'|'rest'|'repeater'|'dust'|'source'; label?:string; sub?:string; texture?:string; direction?:'up'|'down'|'left'|'right'; delay?:number; connections?:Array<'up'|'right'|'down'|'left'>; step?:number; groupId?:string; instrument?:string; volume?:number; pan?:number }
export type BlueprintPlan={cells:BlueprintCell[];width:number;height:number;eventsPerRun:number;runCount:number;firstStep:number;lastStep:number;layer?:number}
export type CompactBlueprint={layers:BlueprintPlan[];firstStep:number;lastStep:number;size:number}

type TimedNote = { trackId:string; trackIndex:number; pitch:number; instrument:string; volume:number; pan:number }

export function maxPolyphony(project:Project) {
  const counts=new Map<number,number>()
  project.tracks.forEach(track=>track.notes.forEach(note=>counts.set(note.step,(counts.get(note.step)??0)+1)))
  return Math.max(0,...counts.values())
}

export function generateEasyBlueprint(project:Project,instruments:readonly BlueprintInstrument[],runLength:number,fold:'right'|'left',includeSilentEdges=true) {
  const delay=project.delayUnit??1
  const populatedSteps=project.tracks.flatMap(track=>track.notes.map(note=>note.step))
  const firstStep=includeSilentEdges||!populatedSteps.length?0:Math.min(...populatedSteps)
  const lastStep=includeSilentEdges||!populatedSteps.length?Math.floor((project.steps-1)/delay)*delay:Math.max(...populatedSteps)
  const eventSteps:number[]=[]
  for(let step=firstStep;step<=lastStep;step+=delay)eventSteps.push(step)
  const events=eventSteps.map(step=>{
    const notes:TimedNote[]=[]
    project.tracks.forEach((track,trackIndex)=>track.notes.filter(note=>note.step===step).forEach(note=>notes.push({trackId:track.id,trackIndex,pitch:note.pitch,instrument:track.instrument,volume:track.volume,pan:track.pan})))
    return notes
  })
  const cells:BlueprintCell[]=[]
  const trackCounts=new Map(project.tracks.map(track=>[track.id,track.notes.length]))
  const cellsPerEvent=2
  const eventsPerRun=Math.max(1,Math.floor(runLength/cellsPerEvent))
  const runCount=Math.ceil(events.length/eventsPerRun)
  // The two center columns have exactly two cells between them.
  const runGap=3
  const directionSign=fold==='right'?1:-1
  const originX=fold==='right'?2:2+(runCount-1)*runGap
  const height=eventsPerRun*cellsPerEvent-1

  const placeNotes=(notes:TimedNote[],centerX:number,y:number,step:number,up:boolean)=>{
    const lanes:Array<TimedNote|undefined>=Array(3)
    // Lanes are expressed from the builder's direction of travel. This keeps the
    // centre occupied first, then the travel-left and travel-right positions.
    const travelLeft=up?0:2
    const travelRight=up?2:0
    const placementOrder=[1,travelLeft,travelRight]
    const groups=[...new Set(notes.map(note=>note.trackId))].map(trackId=>({
      trackId,
      notes:notes.filter(note=>note.trackId===trackId).sort((a,b)=>a.pitch-b.pitch),
      trackIndex:notes.find(note=>note.trackId===trackId)?.trackIndex??0,
    }))
    // A chord needs a stable centre more than a single note does. Among equal
    // group sizes, the track used most often in the song wins. Every note then
    // occupies exactly one remaining lane, so competing preferences never drop
    // a sound from the circuit.
    groups.sort((a,b)=>b.notes.length-a.notes.length||(trackCounts.get(b.trackId)??0)-(trackCounts.get(a.trackId)??0)||a.trackIndex-b.trackIndex)
    const ordered=groups.flatMap(group=>group.notes)
    ordered.slice(0,3).forEach((note,index)=>{lanes[placementOrder[index]]=note})
    if(!lanes[1])cells.push({x:centerX,y,type:'rest',texture:'placeholder',step})
    lanes.forEach((note,lane)=>{
      if(!note)return
      const instrument=instruments.find(item=>item.id===note.instrument)??instruments[0]
      cells.push({x:centerX+lane-1,y,type:'note',label:String(note.pitch),texture:instrument?.texture,step,instrument:note.instrument,volume:note.volume,pan:note.pan})
    })
  }

  events.forEach((notes,eventIndex)=>{
    const projectStep=eventSteps[eventIndex]
    const run=Math.floor(eventIndex/eventsPerRun)
    const within=eventIndex%eventsPerRun
    const up=run%2===0
    const centerX=originX+directionSign*run*runGap
    // Block rows align across every run. Repeaters follow the signal direction:
    // above blocks while travelling up, below blocks while travelling down.
    const rowIndex=up?eventsPerRun-1-within:within
    const noteY=rowIndex*cellsPerEvent
    const repeaterY=up?noteY-1:noteY+1
    placeNotes(notes,centerX,noteY,projectStep,up)
    cells.push({x:centerX,y:repeaterY,type:'repeater',label:String(delay),direction:up?'up':'down',delay,step:projectStep})
    if(within===eventsPerRun-1&&run<runCount-1){
      const nextX=centerX+directionSign*runGap
      const foldY=up?repeaterY-1:repeaterY+1
      const nextStep=Math.min(lastStep,projectStep+delay)
      for(let y=Math.min(repeaterY,foldY);y<=Math.max(repeaterY,foldY);y++)cells.push({x:centerX,y,type:'dust',step:nextStep})
      for(let x=Math.min(centerX,nextX);x<=Math.max(centerX,nextX);x++)cells.push({x,y:foldY,type:'dust',step:nextStep})
      // One final dust cell turns from the bridge toward the first block of the next run.
      cells.push({x:nextX,y:repeaterY,type:'dust',step:nextStep})
    }
  })
  const firstX=originX
  cells.push({x:firstX,y:height+1,type:'source',label:'S',step:firstStep})
  cells.push({x:firstX,y:height,type:'dust',step:firstStep})
  const unique=new Map<string,BlueprintCell>()
  cells.forEach(cell=>{const key=`${cell.x},${cell.y}`;const current=unique.get(key);if(!current||current.type==='dust')unique.set(key,cell)})
  const compact=[...unique.values()]
  const minX=Math.min(...compact.map(cell=>cell.x)),minY=Math.min(...compact.map(cell=>cell.y))
  const normalized=compact.map(cell=>({...cell,x:cell.x-minX+1,y:cell.y-minY+1}))
  const occupied=new Set(normalized.map(cell=>`${cell.x},${cell.y}`))
  const vectors=[['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]] as const
  normalized.forEach(cell=>{if(cell.type==='dust')cell.connections=vectors.filter(([,dx,dy])=>occupied.has(`${cell.x+dx},${cell.y+dy}`)).map(([direction])=>direction)})
  return {cells:normalized,width:Math.max(...normalized.map(cell=>cell.x))+2,height:Math.max(...normalized.map(cell=>cell.y))+2,eventsPerRun,runCount,firstStep,lastStep}
}

/** Split a redstone delay greedily from four ticks.  An even repeater count
 * receives a neutral solid block immediately before its final repeater so the
 * alternating compact-circuit geometry stays aligned. */
export function splitCompactDelay(total:number):(number|'rest')[]{
  if(total<=0)return []
  const delays:number[]=[]
  let remaining=total
  while(remaining>4){delays.push(4);remaining-=4}
  delays.push(remaining)
  const result:(number|'rest')[]=[...delays]
  if(delays.length%2===0)result.splice(result.length-1,0,'rest')
  return result
}

export function generateCompactBlueprint(project:Project,instruments:readonly BlueprintInstrument[],size=50,includeSilentEdges=true):CompactBlueprint{
  const side=Math.max(16,Math.min(96,Math.round(size)))
  const notesByStep=new Map<number,TimedNote[]>()
  project.tracks.forEach((track,trackIndex)=>track.notes.forEach(note=>{
    const list=notesByStep.get(note.step)??[]
    list.push({trackId:track.id,trackIndex,pitch:note.pitch,instrument:track.instrument,volume:track.volume,pan:track.pan});notesByStep.set(note.step,list)
  }))
  const populated=[...notesByStep.keys()].sort((a,b)=>a-b)
  const firstStep=includeSilentEdges||!populated.length?0:(populated[0]??0)
  const lastStep=includeSilentEdges||!populated.length?project.steps-1:(populated.at(-1)??0)
  const eventSteps=[...new Set([firstStep,...populated.filter(step=>step>=firstStep&&step<=lastStep),lastStep])].sort((a,b)=>a-b)
  type Token={kind:'event'|'repeater'|'rest';step:number;delay?:number;notes?:TimedNote[];groupId:string;wide?:boolean;secondaryOnly?:boolean}
  const tokens:Token[]=[]
  const lastWideStep=[...eventSteps].reverse().find(step=>(notesByStep.get(step)?.length??0)>3)??-1
  eventSteps.forEach((step,index)=>{
    const notes=(notesByStep.get(step)??[]).sort((a,b)=>a.pitch-b.pitch)
    tokens.push({kind:'event',step,notes,groupId:`event-${step}`,wide:notes.length>3,secondaryOnly:lastWideStep>=0&&step>lastWideStep})
    const next=eventSteps[index+1]
    if(next===undefined)return
    const futureWide=eventSteps.slice(index+1).some(value=>(notesByStep.get(value)?.length??0)>3)
    const secondaryOnly=lastWideStep>=0&&step>=lastWideStep&&!futureWide
    splitCompactDelay(next-step).forEach((part,partIndex)=>tokens.push(part==='rest'
      ?{kind:'rest',step,groupId:`delay-${step}-${partIndex}`,wide:futureWide,secondaryOnly}
      :{kind:'repeater',step,delay:part,groupId:`delay-${step}-${partIndex}`,wide:futureWide,secondaryOnly}))
  })
  const layers:BlueprintPlan[]=[]
  const usable=Math.max(8,side-4),runStride=7,runs=Math.max(1,Math.floor((side-4)/runStride))
  // A compressed rest may cross a fold, but the final cell of that run must be
  // a solid block. Insert a zero-delay construction block and push the repeater
  // to the next run instead of replacing (and losing) its delay.
  for(let boundary=usable-1;boundary<tokens.length;boundary+=usable){
    if(tokens[boundary]?.kind==='repeater')tokens.splice(boundary,0,{kind:'rest',step:tokens[boundary].step,groupId:`fold-rest-${boundary}`})
  }
  const capacity=usable*runs
  for(let offset=0,layerIndex=0;offset<tokens.length;offset+=capacity,layerIndex++){
    const slice=tokens.slice(offset,offset+capacity),cells:BlueprintCell[]=[]
    const layerStartCorner=layerIndex%4
    slice.forEach((token,index)=>{
      const run=Math.floor(index/usable),within=index%usable
      const up=(run+layerStartCorner)%2===0
      const baseX=2+run*runStride
      const y=2+(up?usable-1-within:within)
      const direction=up?'up':'down'
      const centerX=baseX+1,signalX=centerX+(token.secondaryOnly?3:0)
      if(token.kind==='repeater'){
        cells.push({x:signalX,y,type:'repeater',delay:token.delay,label:String(token.delay),direction,step:token.step,groupId:token.groupId})
        if(token.wide)cells.push({x:centerX+3,y,type:'repeater',delay:token.delay,label:String(token.delay),direction,step:token.step,groupId:token.groupId})
      }
      else if(token.kind==='rest'){
        cells.push({x:signalX,y,type:'rest',texture:'placeholder',step:token.step,groupId:token.groupId})
        if(token.wide)cells.push({x:centerX+3,y,type:'rest',texture:'placeholder',step:token.step,groupId:token.groupId})
      }
      else {
        const notes=token.notes??[],travelL=up?0:2,travelR=up?2:0,order=[1,travelL,travelR]
        const placeGroup=(group:TimedNote[],cx:number,groupId:string)=>{
          const lanes:Array<TimedNote|undefined>=Array(3)
          group.slice(0,3).forEach((note,i)=>lanes[order[i]]=note)
          if(!lanes[1])cells.push({x:cx,y,type:'rest',texture:'placeholder',step:token.step,groupId})
          lanes.forEach((note,lane)=>{if(note){const instrument=instruments.find(item=>item.id===note.instrument)??instruments[0];cells.push({x:cx+lane-1,y,type:'note',label:String(note.pitch),texture:instrument?.texture,step:token.step,groupId,instrument:note.instrument,volume:note.volume,pan:note.pan})}})
        }
        placeGroup(notes.slice(0,3),signalX,token.groupId)
        if(notes.length>3)placeGroup(notes.slice(3,6),centerX+3,token.groupId)
      }
      if(within===usable-1&&index<slice.length-1){
        const nextX=centerX+runStride,foldY=up?y-1:y+1
        for(let yy=Math.min(y,foldY);yy<=Math.max(y,foldY);yy++)cells.push({x:centerX,y:yy,type:'dust',step:token.step,groupId:`fold-${layerIndex}-${run}`})
        for(let x=centerX;x<=nextX;x++)cells.push({x,y:foldY,type:'dust',step:token.step,groupId:`fold-${layerIndex}-${run}`})
        cells.push({x:nextX,y,type:'dust',step:token.step,groupId:`fold-${layerIndex}-${run}`})
      }
    })
    const sourceToken=slice[0],sourceX=3,sourceY=usable+2
    if(layerIndex===0){cells.push({x:sourceX,y:sourceY,type:'source',label:'S',step:sourceToken?.step??firstStep,groupId:'source'});cells.push({x:sourceX,y:sourceY-1,type:'dust',step:sourceToken?.step??firstStep,groupId:'source'})}
    const unique=new Map<string,BlueprintCell>();cells.forEach(cell=>{const key=`${cell.x},${cell.y}`;const old=unique.get(key);if(!old||old.type==='dust')unique.set(key,cell)})
    const compact=[...unique.values()],occupied=new Set(compact.map(cell=>`${cell.x},${cell.y}`)),vectors=[['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]] as const
    compact.forEach(cell=>{if(cell.type==='dust')cell.connections=vectors.filter(([,dx,dy])=>occupied.has(`${cell.x+dx},${cell.y+dy}`)).map(([d])=>d)})
    layers.push({cells:compact,width:side,height:side,eventsPerRun:usable,runCount:runs,firstStep:slice[0]?.step??firstStep,lastStep:slice.at(-1)?.step??lastStep,layer:layerIndex+1})
  }
  if(!layers.length)layers.push({cells:[],width:side,height:side,eventsPerRun:usable,runCount:runs,firstStep,lastStep,layer:1})
  return {layers,firstStep,lastStep,size:side}
}
