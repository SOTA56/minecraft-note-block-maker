import type { Project } from './types'

export type BlueprintInstrument = { id:string; ja:string; en:string; blockJa:string; blockEn:string; texture:string }
export type BlueprintCell = { x:number; y:number; type:'note'|'rest'|'repeater'|'dust'|'source'; label?:string; sub?:string; texture?:string; direction?:'up'|'down'|'left'|'right'; delay?:number }

type TimedNote = { trackId:string; trackIndex:number; pitch:number; instrument:string }

export function maxPolyphony(project:Project) {
  const counts=new Map<number,number>()
  project.tracks.forEach(track=>track.notes.forEach(note=>counts.set(note.step,(counts.get(note.step)??0)+1)))
  return Math.max(0,...counts.values())
}

export function generateEasyBlueprint(project:Project,instruments:readonly BlueprintInstrument[],runLength:number,fold:'right'|'left') {
  const events=Array.from({length:project.steps},(_,step)=>{
    const notes:TimedNote[]=[]
    project.tracks.forEach((track,trackIndex)=>track.notes.filter(note=>note.step===step).forEach(note=>notes.push({trackId:track.id,trackIndex,pitch:note.pitch,instrument:track.instrument})))
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
  const height=eventsPerRun*cellsPerEvent

  const placeNotes=(notes:TimedNote[],centerX:number,y:number)=>{
    const lanes:Array<TimedNote|undefined>=Array(3)
    notes.sort((a,b)=>(trackCounts.get(b.trackId)??0)-(trackCounts.get(a.trackId)??0)||a.trackIndex-b.trackIndex).forEach(note=>{
      const preferred=notes.length===1?1:(laneAffinity.get(note.trackId)??preferredLane.get(note.trackId)??1)
      const candidates=[preferred,1,0,2].filter((lane,pos,list)=>list.indexOf(lane)===pos)
      const lane=candidates.find(candidate=>!lanes[candidate])??lanes.findIndex(value=>!value)
      if(lane>=0){lanes[lane]=note;laneAffinity.set(note.trackId,lane)}
    })
    if(!lanes[1])cells.push({x:centerX,y,type:'rest',texture:'placeholder'})
    lanes.forEach((note,lane)=>{
      if(!note)return
      const instrument=instruments.find(item=>item.id===note.instrument)??instruments[0]
      cells.push({x:centerX+lane-1,y,type:'note',label:String(note.pitch),texture:instrument?.texture})
    })
  }

  events.forEach((notes,step)=>{
    const run=Math.floor(step/eventsPerRun)
    const within=step%eventsPerRun
    const down=run%2===0
    const centerX=originX+directionSign*run*runGap
    const baseY=down?1+within*cellsPerEvent:height-within*cellsPerEvent
    const noteY=baseY
    const repeaterY=down?baseY+1:baseY-1
    placeNotes(notes,centerX,noteY)
    cells.push({x:centerX,y:repeaterY,type:'repeater',label:'1',direction:down?'down':'up',delay:1})
    if(within===eventsPerRun-1&&run<runCount-1){
      const nextX=centerX+directionSign*runGap
      const foldY=down?height+2:0
      const fromY=down?repeaterY+1:repeaterY-1
      for(let y=Math.min(fromY,foldY);y<=Math.max(fromY,foldY);y++)cells.push({x:centerX,y,type:'dust'})
      for(let x=Math.min(centerX,nextX);x<=Math.max(centerX,nextX);x++)cells.push({x,y:foldY,type:'dust'})
    }
  })
  const firstX=originX
  cells.push({x:firstX,y:-2,type:'source',label:'START'})
  cells.push({x:firstX,y:-1,type:'dust',direction:'down'})
  cells.push({x:firstX,y:0,type:'dust',direction:'down'})
  const minX=Math.min(...cells.map(cell=>cell.x)),minY=Math.min(...cells.map(cell=>cell.y))
  const normalized=cells.map(cell=>({...cell,x:cell.x-minX+1,y:cell.y-minY+1}))
  return {cells:normalized,width:Math.max(...normalized.map(cell=>cell.x))+2,height:Math.max(...normalized.map(cell=>cell.y))+2,eventsPerRun,runCount}
}
