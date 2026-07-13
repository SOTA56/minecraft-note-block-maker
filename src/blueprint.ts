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
  const eventSteps=populated.filter(step=>step>=firstStep&&step<=lastStep)
  type Token={kind:'repeater'|'rest';step:number;delay?:number;notes?:TimedNote[];groupId:string;wide:boolean;afterWide:boolean}
  const tokens:Token[]=[]
  const firstWide=eventSteps.find(step=>(notesByStep.get(step)?.length??0)>3)??Infinity
  const lastWide=[...eventSteps].reverse().find(step=>(notesByStep.get(step)?.length??0)>3)??-1
  let cursor=firstStep
  eventSteps.forEach((step,eventIndex)=>{
    const notes=(notesByStep.get(step)??[]).sort((a,b)=>a.pitch-b.pitch),wide=step>=firstWide&&step<=lastWide
    if(step===cursor&&tokens.length===0)tokens.push({kind:'rest',step,notes,groupId:`event-${step}`,wide,afterWide:step>lastWide})
    else{
      const parts=splitCompactDelay(step-cursor)
      let arrival=cursor
      parts.forEach((part,index)=>{if(part!=='rest')arrival+=part;tokens.push({kind:part==='rest'?'rest':'repeater',delay:part==='rest'?undefined:part,step:index===parts.length-1?step:arrival,notes:index===parts.length-1?notes:undefined,groupId:index===parts.length-1?`event-${step}`:`delay-${eventIndex}-${index}`,wide,afterWide:step>lastWide})})
    }
    cursor=step
  })
  if(cursor<lastStep){let arrival=cursor;splitCompactDelay(lastStep-cursor).forEach((part,index)=>{if(part!=='rest')arrival+=part;tokens.push({kind:part==='rest'?'rest':'repeater',delay:part==='rest'?undefined:part,step:arrival,groupId:`tail-${index}`,wide:false,afterWide:cursor>=lastWide&&lastWide>=0})})}
  if(!tokens.length)tokens.push({kind:'rest',step:firstStep,groupId:'empty',wide:false,afterWide:false})
  // A six-note unit occupies two staggered construction rows. The inserted
  // solid row has zero musical delay; it is the interlocking support row shown
  // between paired repeaters in the supplied six-note PDF.
  const routedTokens=tokens.flatMap((token,index)=>token.wide?[token,{kind:'rest' as const,step:token.step,groupId:`structure-${index}`,wide:true,afterWide:false}]:[token])
  const layers:BlueprintPlan[]=[]
  const hasWide=lastWide>=0,topRow=hasWide?3:2,usable=hasWide?side-6:side-4,firstSignalX=hasWide?4:2,runs=Math.max(1,Math.floor((side-firstSignalX-3)/2)+1)
  // A fold in the middle of a rest must finish on a solid block. It is a
  // zero-delay construction cell; the displaced repeater starts the next run.
  for(let boundary=usable-1;boundary<routedTokens.length;boundary+=usable){
    const token=routedTokens[boundary]
    if(token?.kind==='repeater'&&!token.notes?.length)routedTokens.splice(boundary,0,{kind:'rest',step:token.step,groupId:`fold-rest-${boundary}`,wide:token.wide,afterWide:token.afterWide})
  }
  const capacity=usable*runs
  for(let offset=0,layerIndex=0;offset<routedTokens.length;offset+=capacity,layerIndex++){
    const slice=routedTokens.slice(offset,offset+capacity),cells:BlueprintCell[]=[]
    const globalRunOffset=layerIndex*runs
    const add=(cell:BlueprintCell)=>cells.push(cell)
    const mirrored=layerIndex%2===1,horizontalSign=mirrored?-1:1
    const placeNotes=(notes:TimedNote[],signalX:number,y:number,up:boolean,groupId:string,step:number)=>{
      const ordered=[...notes].sort((a,b)=>a.pitch-b.pitch),lanes=up?ordered:ordered.reverse()
      lanes.slice(0,3).forEach((note,index)=>{const instrument=instruments.find(item=>item.id===note.instrument)??instruments[0],side=(up?1:-1)*horizontalSign;add({x:signalX+side*(index+1),y,type:'note',label:String(note.pitch),texture:instrument?.texture,step,groupId,instrument:note.instrument,volume:note.volume,pan:note.pan})})
    }
    slice.forEach((token,index)=>{
      const run=Math.floor(index/usable),within=index%usable
      const up=(run+globalRunOffset)%2===0
      const rawSignalX=firstSignalX+run*2,signalX=mirrored?side-1-rawSignalX:rawSignalX
      const y=topRow+(up?usable-1-within:within)
      const direction=up?'up':'down'
      const retainedX=token.afterWide&&!up?signalX+2*horizontalSign:signalX
      const putSignal=(x:number,yy:number)=>add({x, y:yy, type:token.kind==='repeater'?'repeater':'rest',texture:token.kind==='rest'?'placeholder':undefined,delay:token.delay,label:token.delay?String(token.delay):undefined,direction:token.kind==='repeater'?direction:undefined,step:token.step,groupId:token.groupId})
      putSignal(retainedX,y)
      const notes=token.notes??[]
      if(token.wide){
        const pairedX=signalX+(up?-2:2)*horizontalSign,pairedY=y+(up?-1:1)
        putSignal(pairedX,pairedY)
        // The second three-note bank is one construction cell ahead in the
        // direction of travel, matching the stagger in the supplied PDF.
        placeNotes(notes.slice(0,3),up?pairedX:signalX,y+(up?-1:0),up,token.groupId,token.step)
        placeNotes(notes.slice(3,6),up?signalX:pairedX,y+(up?0:1),up,token.groupId,token.step)
      }else placeNotes(notes.slice(0,3),retainedX,y,up,token.groupId,token.step)
      if(within===usable-1&&index<slice.length-1){
        const nextX=signalX+2*horizontalSign,foldY=up?1:side-2,groupId=`fold-${layerIndex}-${run}`
        const foldStart=token.wide?signalX-2*horizontalSign:signalX
        for(let x=Math.min(foldStart,nextX);x<=Math.max(foldStart,nextX);x++)add({x,y:foldY,type:'dust',step:token.step,groupId})
        if(token.wide)add({x:signalX,y:up?2:side-3,type:'dust',step:token.step,groupId})
      }
    })
    const sourceToken=slice[0],sourceY=side-1
    if(layerIndex===0){
      if(sourceToken?.wide){
        const left=firstSignalX-2,right=firstSignalX,sourceX=firstSignalX-1
        add({x:sourceX,y:sourceY,type:'source',label:'S',step:sourceToken.step,groupId:'source'})
        for(let x=left;x<=right;x++)add({x,y:sourceY-1,type:'dust',step:sourceToken.step,groupId:'source'})
        add({x:left,y:sourceY-2,type:'dust',step:sourceToken.step,groupId:'source'})
        add({x:right,y:sourceY-2,type:'dust',step:sourceToken.step,groupId:'source'})
      }else{
        add({x:firstSignalX,y:sourceY,type:'source',label:'S',step:sourceToken?.step??firstStep,groupId:'source'})
        add({x:firstSignalX,y:sourceY-1,type:'dust',step:sourceToken?.step??firstStep,groupId:'source'})
      }
    }
    const priority={dust:0,rest:1,note:2,repeater:3,source:4}
    const unique=new Map<string,BlueprintCell>();cells.forEach(cell=>{if(cell.x<0||cell.y<0||cell.x>=side||cell.y>=side)return;const key=`${cell.x},${cell.y}`,old=unique.get(key);if(!old||priority[cell.type]>=priority[old.type])unique.set(key,cell)})
    const compact=[...unique.values()],occupied=new Set(compact.map(cell=>`${cell.x},${cell.y}`)),vectors=[['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]] as const
    compact.forEach(cell=>{if(cell.type==='dust')cell.connections=vectors.filter(([,dx,dy])=>occupied.has(`${cell.x+dx},${cell.y+dy}`)).map(([d])=>d)})
    layers.push({cells:compact,width:side,height:side,eventsPerRun:usable,runCount:runs,firstStep:slice[0]?.step??firstStep,lastStep:slice.at(-1)?.step??lastStep,layer:layerIndex+1})
  }
  if(!layers.length)layers.push({cells:[],width:side,height:side,eventsPerRun:usable,runCount:runs,firstStep,lastStep,layer:1})
  return {layers,firstStep,lastStep,size:side}
}
