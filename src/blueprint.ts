import type { Project } from './types'

export type BlueprintInstrument = { id:string; ja:string; en:string; blockJa:string; blockEn:string; texture:string }
export type BlueprintCell = { x:number; y:number; type:'note'|'rest'|'repeater'|'dust'|'source'; label?:string; sub?:string; texture?:string; direction?:'up'|'down'|'left'|'right'; delay?:number; connections?:Array<'up'|'right'|'down'|'left'>; step?:number; instrument?:string; volume?:number; pan?:number }

type TimedNote = { trackId:string; trackIndex:number; pitch:number; instrument:string; volume:number; pan:number }

export function maxPolyphony(project:Project) {
  const counts=new Map<number,number>()
  project.tracks.forEach(track=>track.notes.forEach(note=>counts.set(note.step,(counts.get(note.step)??0)+1)))
  return Math.max(0,...counts.values())
}

export function generateEasyBlueprint(project:Project,instruments:readonly BlueprintInstrument[],runLength:number,fold:'right'|'left',includeSilentEdges=true) {
  const populatedSteps=project.tracks.flatMap(track=>track.notes.map(note=>note.step))
  const firstStep=includeSilentEdges||!populatedSteps.length?0:Math.min(...populatedSteps)
  const lastStep=includeSilentEdges||!populatedSteps.length?project.steps-1:Math.max(...populatedSteps)
  const events=Array.from({length:Math.max(1,lastStep-firstStep+1)},(_,offset)=>{
    const step=firstStep+offset
    const notes:TimedNote[]=[]
    project.tracks.forEach((track,trackIndex)=>track.notes.filter(note=>note.step===step).forEach(note=>notes.push({trackId:track.id,trackIndex,pitch:note.pitch,instrument:track.instrument,volume:track.volume,pan:track.pan})))
    return notes
  })
  const cells:BlueprintCell[]=[]
  const laneAffinity=new Map<string,number>()
  const trackCounts=new Map(project.tracks.map(track=>[track.id,track.notes.length]))
  const rankedTracks=[...project.tracks].sort((a,b)=>(trackCounts.get(b.id)??0)-(trackCounts.get(a.id)??0))
  const preferredLane=new Map(rankedTracks.map((track,index)=>[track.id,[1,0,2][index]??1]))
  const cellsPerEvent=2
  const eventsPerRun=Math.max(1,Math.floor(runLength/cellsPerEvent))
  const runCount=Math.ceil(events.length/eventsPerRun)
  // The two center columns have exactly two cells between them.
  const runGap=3
  const directionSign=fold==='right'?1:-1
  const originX=fold==='right'?2:2+(runCount-1)*runGap
  const height=eventsPerRun*cellsPerEvent-1

  const placeNotes=(notes:TimedNote[],centerX:number,y:number,step:number)=>{
    const lanes:Array<TimedNote|undefined>=Array(3)
    const singleTrackChord=notes.length>1&&new Set(notes.map(note=>note.trackId)).size===1
    if(singleTrackChord){
      const chordLanes=notes.length===2?[0,2]:[0,1,2]
      notes.sort((a,b)=>a.pitch-b.pitch).slice(0,3).forEach((note,index)=>{lanes[chordLanes[index]]=note;laneAffinity.set(note.trackId,chordLanes[index])})
    }
    else notes.sort((a,b)=>(trackCounts.get(b.trackId)??0)-(trackCounts.get(a.trackId)??0)||a.trackIndex-b.trackIndex||a.pitch-b.pitch).forEach(note=>{
      const preferred=notes.length===1?1:(laneAffinity.get(note.trackId)??preferredLane.get(note.trackId)??1)
      const candidates=[preferred,1,0,2].filter((lane,pos,list)=>list.indexOf(lane)===pos)
      const lane=candidates.find(candidate=>!lanes[candidate])??lanes.findIndex(value=>!value)
      if(lane>=0){lanes[lane]=note;laneAffinity.set(note.trackId,lane)}
    })
    if(!lanes[1])cells.push({x:centerX,y,type:'rest',texture:'placeholder',step})
    lanes.forEach((note,lane)=>{
      if(!note)return
      const instrument=instruments.find(item=>item.id===note.instrument)??instruments[0]
      cells.push({x:centerX+lane-1,y,type:'note',label:String(note.pitch),texture:instrument?.texture,step,instrument:note.instrument,volume:note.volume,pan:note.pan})
    })
  }

  events.forEach((notes,step)=>{
    const projectStep=firstStep+step
    const run=Math.floor(step/eventsPerRun)
    const within=step%eventsPerRun
    const up=run%2===0
    const centerX=originX+directionSign*run*runGap
    // Block rows align across every run. Repeaters follow the signal direction:
    // above blocks while travelling up, below blocks while travelling down.
    const rowIndex=up?eventsPerRun-1-within:within
    const noteY=rowIndex*cellsPerEvent
    const repeaterY=up?noteY-1:noteY+1
    placeNotes(notes,centerX,noteY,projectStep)
    cells.push({x:centerX,y:repeaterY,type:'repeater',label:'1',direction:up?'up':'down',delay:1,step:projectStep})
    if(within===eventsPerRun-1&&run<runCount-1){
      const nextX=centerX+directionSign*runGap
      const foldY=up?repeaterY-1:repeaterY+1
      const nextStep=Math.min(lastStep,projectStep+1)
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
