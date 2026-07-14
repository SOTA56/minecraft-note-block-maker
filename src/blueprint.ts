import type { Project } from './types'

export type BlueprintInstrument = { id:string; ja:string; en:string; blockJa:string; blockEn:string; texture:string }
export type BlueprintCell = { x:number; y:number; type:'note'|'rest'|'repeater'|'dust'|'source'|'layer-link'; label?:string; sub?:string; texture?:string; direction?:'up'|'down'|'left'|'right'; delay?:number; connections?:Array<'up'|'right'|'down'|'left'>; step?:number; groupId?:string; instrument?:string; volume?:number; pan?:number; targetLayer?:number }
export type BlueprintPlan={cells:BlueprintCell[];width:number;height:number;eventsPerRun:number;runCount:number;firstStep:number;lastStep:number;layer?:number;exit?:{x:number;y:number;direction:'up'|'down'}}
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

export {generateCompactBlueprint,generateCompactBlueprintRect,splitCompactDelay} from './compactBlueprint'
