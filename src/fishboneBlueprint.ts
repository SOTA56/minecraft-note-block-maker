import type {BlueprintCell,BlueprintInstrument,BlueprintPlan} from './blueprint'
import type {FishboneMode,Project,Track} from './types'

export type FishboneRow='A'|'B'
export type FishbonePlacedNote={trackId:string;trackIndex:number;step:number;pitch:number;instrument:string;volume:number;pan:number}
export type FishboneSlot={A?:FishbonePlacedNote;B?:FishbonePlacedNote}
export type FishboneLane={number:number;slots:Map<number,FishboneSlot>}
export type FishboneTrackStatus={trackId:string;trackIndex:number;maxPolyphony:number;lanes:number[];totalNotes:number;placedNotes:number;remainingNotes:number}
export type FishboneAllocation={lanes:FishboneLane[];statuses:FishboneTrackStatus[];assignments:Record<string,number[]>;remainingNotes:number}
export type FishboneResult={plan:BlueprintPlan;laneCount:number;statuses:FishboneTrackStatus[];assignments:Record<string,number[]>;remainingNotes:number;connected:boolean}

type TrackInfo={track:Track;trackIndex:number;maxPolyphony:number;notes:FishbonePlacedNote[]}

const trackInfo=(project:Project):TrackInfo[]=>project.tracks.map((track,trackIndex)=>{
  const counts=new Map<number,number>()
  track.notes.forEach(note=>counts.set(note.step,(counts.get(note.step)??0)+1))
  return {track,trackIndex,maxPolyphony:Math.max(0,...counts.values()),notes:[...track.notes].sort((a,b)=>a.step-b.step||a.pitch-b.pitch).map(note=>({trackId:track.id,trackIndex,step:note.step,pitch:note.pitch,instrument:track.instrument,volume:track.volume,pan:track.pan}))}
}).filter(info=>info.notes.length>0)

const ensureLane=(lanes:FishboneLane[],number:number)=>{
  while(lanes.length<number)lanes.push({number:lanes.length+1,slots:new Map()})
  return lanes[number-1]
}

const put=(lane:FishboneLane,note:FishbonePlacedNote,row?:FishboneRow)=>{
  const slot=lane.slots.get(note.step)??{}
  const target=row??(!slot.A?'A':!slot.B?'B':undefined)
  if(!target||slot[target])return false
  slot[target]=note;lane.slots.set(note.step,slot);return true
}

const cleanLanes=(value:unknown)=>Array.isArray(value)?[...new Set(value.filter(item=>Number.isInteger(item)&&Number(item)>0).map(Number))]:[]

export function allocateFishboneAuto(project:Project):FishboneAllocation{
  const infos=trackInfo(project).sort((a,b)=>b.maxPolyphony-a.maxPolyphony||a.trackIndex-b.trackIndex)
  const lanes:FishboneLane[]=[],statuses:FishboneTrackStatus[]=[],assignments:Record<string,number[]>={}
  const polyphonic=infos.filter(info=>info.maxPolyphony>=2),monophonic=infos.filter(info=>info.maxPolyphony===1)
  for(const info of polyphonic){
    const count=Math.ceil(info.maxPolyphony/2),start=lanes.length+1,numbers=Array.from({length:count},(_,index)=>start+index)
    numbers.forEach(number=>ensureLane(lanes,number));assignments[info.track.id]=numbers
    const byStep=new Map<number,FishbonePlacedNote[]>()
    info.notes.forEach(note=>byStep.set(note.step,[...(byStep.get(note.step)??[]),note]))
    byStep.forEach(notes=>notes.sort((a,b)=>a.pitch-b.pitch).forEach((note,index)=>{
      const row:FishboneRow=index<count?'A':'B'
      const laneIndex=index<count?index:index-count
      put(lanes[numbers[laneIndex]-1],note,row)
    }))
    statuses.push({trackId:info.track.id,trackIndex:info.trackIndex,maxPolyphony:info.maxPolyphony,lanes:numbers,totalNotes:info.notes.length,placedNotes:info.notes.length,remainingNotes:0})
  }
  for(let index=0;index<monophonic.length;index+=2){
    const number=lanes.length+1,lane=ensureLane(lanes,number),pair=monophonic.slice(index,index+2)
    pair.forEach((info,pairIndex)=>{info.notes.forEach(note=>put(lane,note,pairIndex===0?'A':'B'));assignments[info.track.id]=[number];statuses.push({trackId:info.track.id,trackIndex:info.trackIndex,maxPolyphony:1,lanes:[number],totalNotes:info.notes.length,placedNotes:info.notes.length,remainingNotes:0})})
  }
  statuses.sort((a,b)=>a.trackIndex-b.trackIndex)
  return {lanes,statuses,assignments,remainingNotes:0}
}

export function allocateFishboneManual(project:Project,manual:Record<string,number[]>={}):FishboneAllocation{
  const infos=trackInfo(project).sort((a,b)=>a.trackIndex-b.trackIndex),assignments:Record<string,number[]>={}
  infos.forEach(info=>{assignments[info.track.id]=cleanLanes(manual[info.track.id])})
  const maxLane=Math.max(0,...Object.values(assignments).flat()),lanes:Array<FishboneLane>=[]
  for(let number=1;number<=maxLane;number++)ensureLane(lanes,number)
  const laneTracks=new Map<number,TrackInfo[]>()
  infos.forEach(info=>assignments[info.track.id].forEach(number=>laneTracks.set(number,[...(laneTracks.get(number)??[]),info])))
  const fixedRows=new Map<string,FishboneRow>()
  laneTracks.forEach((members,lane)=>{if(members.length===2&&members.every(info=>info.maxPolyphony===1&&assignments[info.track.id].length===1)){fixedRows.set(`${members[0].track.id}:${lane}`,'A');fixedRows.set(`${members[1].track.id}:${lane}`,'B')}})
  const statuses:FishboneTrackStatus[]=[]
  for(const info of infos){
    let placed=0
    for(const note of info.notes){
      const numbers=assignments[info.track.id]
      const fixed=numbers.map(number=>fixedRows.get(`${info.track.id}:${number}`)).find(Boolean)
      if(fixed){
        for(const number of numbers){
          if(put(ensureLane(lanes,number),note,fixed)){placed++;break}
        }
      }else{
        let inserted=false
        for(const row of ['A','B'] as const){
          for(const number of numbers){
            if(put(ensureLane(lanes,number),note,row)){placed++;inserted=true;break}
          }
          if(inserted)break
        }
      }
    }
    statuses.push({trackId:info.track.id,trackIndex:info.trackIndex,maxPolyphony:info.maxPolyphony,lanes:assignments[info.track.id],totalNotes:info.notes.length,placedNotes:placed,remainingNotes:info.notes.length-placed})
  }
  return {lanes,statuses,assignments,remainingNotes:statuses.reduce((sum,status)=>sum+status.remainingNotes,0)}
}

export function allocateFishbone(project:Project,mode:FishboneMode='auto',manual:Record<string,number[]>={}):FishboneAllocation{
  return mode==='manual'?allocateFishboneManual(project,manual):allocateFishboneAuto(project)
}

const directions=[['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]] as const

export function generateFishboneBlueprint(project:Project,instruments:readonly BlueprintInstrument[],mode:FishboneMode='auto',manual:Record<string,number[]>={},packColumns=false):FishboneResult{
  const allocation=allocateFishbone(project,mode,manual),allNotes=project.tracks.flatMap(track=>track.notes)
  const laneDelay=project.delayUnit
  const firstStep=allNotes.length?Math.min(...allNotes.map(note=>note.step)):0,lastStep=allNotes.length?Math.max(...allNotes.map(note=>note.step)):0
  const laneCount=allocation.lanes.length
  if(!laneCount){
    const plan:BlueprintPlan={cells:[{x:1,y:2,type:'source',label:'S',step:firstStep,groupId:'fishbone-source'}],width:3,height:3,eventsPerRun:4,runCount:0,firstStep,lastStep}
    return {plan,laneCount,statuses:allocation.statuses,assignments:allocation.assignments,remainingNotes:allocation.remainingNotes,connected:true}
  }
  const groups=Math.floor((lastStep-firstStep)/4)+1,centers=Math.ceil(laneCount/2)
  const laneExtents=allocation.lanes.map(lane=>{
    if(!packColumns)return 8
    const maxOffsetIndex=Math.max(-1,...[...lane.slots.keys()].map(step=>Math.floor(((step-firstStep)%4)/laneDelay)))
    return maxOffsetIndex<0?0:2+maxOffsetIndex*2
  })
  const leftExtent=(pair:number)=>packColumns?(laneExtents[pair*2]??0):8,rightExtent=(pair:number)=>packColumns?(laneExtents[pair*2+1]??0):8
  const centerXs:number[]=[leftExtent(0)]
  for(let pair=1;pair<centers;pair++)centerXs.push(centerXs[pair-1]+rightExtent(pair-1)+leftExtent(pair)+2)
  const fullMaxX=centerXs.at(-1)!+rightExtent(centers-1),sourceX=Math.round(fullMaxX/2),bottomA=1+(groups-1)*2
  const cells=new Map<string,BlueprintCell>()
  const add=(cell:BlueprintCell)=>{
    const key=`${cell.x},${cell.y}`,current=cells.get(key)
    if(!current){cells.set(key,cell);return}
    if(current.type==='dust'&&cell.type!=='dust'){cells.set(key,cell);return}
    if(cell.type==='dust')return
    throw new Error(`Fishbone cell collision at ${key}: ${current.type}/${cell.type}`)
  }
  const instrumentFor=(id:string)=>instruments.find(item=>item.id===id)??instruments[0]
  const laneLastGroups=allocation.lanes.map(lane=>Math.max(-1,...[...lane.slots.keys()].map(step=>Math.floor((step-firstStep)/4))))
  for(let pair=0;pair<centers;pair++){
    const centerX=centerXs[pair],left=allocation.lanes[pair*2],right=allocation.lanes[pair*2+1]
    const centerLast=Math.max(laneLastGroups[pair*2]??-1,laneLastGroups[pair*2+1]??-1)
    for(let group=0;group<=centerLast;group++){
      const yA=1+(groups-1-group)*2,groupStep=firstStep+group*4
      add({x:centerX,y:yA,type:'rest',texture:'center-placeholder',step:groupStep,groupId:`fishbone-step-${groupStep}`})
      if(group<centerLast)add({x:centerX,y:yA-1,type:'repeater',direction:'up',delay:4,label:'4',step:groupStep+4,groupId:`fishbone-step-${groupStep+4}`})
      for(const [lane,sign] of [[left,-1],[right,1]] as const){
        if(!lane)continue
        const offsets=Array.from({length:4/laneDelay},(_,index)=>({index,stepOffset:index*laneDelay,slot:lane.slots.get(groupStep+index*laneDelay)}))
        const lastOffsetIndex=Math.max(-1,...offsets.filter(item=>item.slot?.A||item.slot?.B).map(item=>item.index))
        if(lastOffsetIndex<0)continue
        add({x:centerX+sign,y:yA,type:'dust',step:groupStep,groupId:`fishbone-step-${groupStep}`})
        for(let offsetIndex=0;offsetIndex<=lastOffsetIndex;offsetIndex++){
          const step=groupStep+offsetIndex*laneDelay,slot=lane.slots.get(step),x=centerX+sign*(2+offsetIndex*2)
          if(slot?.A){const instrument=instrumentFor(slot.A.instrument);add({x,y:yA,type:'note',label:String(slot.A.pitch),texture:instrument?.texture,step,trackId:slot.A.trackId,instrument:slot.A.instrument,volume:slot.A.volume,pan:slot.A.pan,groupId:`fishbone-step-${step}`})}
          else add({x,y:yA,type:'rest',texture:'placeholder',step,groupId:`fishbone-step-${step}`})
          if(slot?.B){const instrument=instrumentFor(slot.B.instrument);add({x,y:yA-1,type:'note',label:String(slot.B.pitch),texture:instrument?.texture,step,trackId:slot.B.trackId,instrument:slot.B.instrument,volume:slot.B.volume,pan:slot.B.pan,groupId:`fishbone-step-${step}`})}
          if(offsetIndex<lastOffsetIndex)add({x:centerX+sign*(3+offsetIndex*2),y:yA,type:'repeater',direction:sign<0?'left':'right',delay:laneDelay,label:String(laneDelay),step:step+laneDelay,groupId:`fishbone-step-${step+laneDelay}`})
        }
      }
    }
  }
  const connected=laneCount<=8,sourceY=bottomA+5
  add({x:sourceX,y:sourceY,type:'source',label:'S',step:firstStep,groupId:'fishbone-source'})
  if(connected){
    const busY=bottomA+3,repeaterAt=new Map<number,'left'|'right'>()
    for(const [end,direction] of [[Math.min(...centerXs),'left'],[Math.max(...centerXs),'right']] as const){
      const distance=Math.abs(end-sourceX),count=Math.max(0,Math.ceil(distance/14)-1)
      for(let index=1;index<=count;index++){
        const offset=Math.round(distance*index/(count+1)),x=sourceX+(direction==='left'?-offset:offset)
        repeaterAt.set(x,direction)
      }
    }
    const busMin=Math.min(sourceX,...centerXs),busMax=Math.max(sourceX,...centerXs)
    for(let x=busMin;x<=busMax;x++){
      const direction=repeaterAt.get(x)
      if(direction)add({x,y:busY,type:'repeater',direction,delay:1,label:'1',step:firstStep,groupId:'fishbone-start-distribution'})
      else add({x,y:busY,type:'dust',step:firstStep,groupId:'fishbone-start-distribution'})
    }
    add({x:sourceX,y:sourceY-1,type:'dust',step:firstStep,groupId:'fishbone-start-distribution'})
    const horizontalCounts=centerXs.map(centerX=>[...repeaterAt.keys()].filter(x=>x>Math.min(sourceX,centerX)&&x<Math.max(sourceX,centerX)).length)
    const target=Math.max(...horizontalCounts)+1
    centerXs.forEach((centerX,index)=>{
      const verticalRepeaters=target-horizontalCounts[index]
      add({x:centerX,y:bottomA+1,type:'repeater',direction:'up',delay:1,label:'1',step:firstStep,groupId:'fishbone-start-distribution'})
      if(verticalRepeaters>1)add({x:centerX,y:bottomA+2,type:'repeater',direction:'up',delay:1,label:'1',step:firstStep,groupId:'fishbone-start-distribution'})
      else add({x:centerX,y:bottomA+2,type:'dust',step:firstStep,groupId:'fishbone-start-distribution'})
    })
  }
  const occupied=new Set(cells.keys())
  cells.forEach(cell=>{if(cell.type==='dust')cell.connections=directions.filter(([,dx,dy])=>occupied.has(`${cell.x+dx},${cell.y+dy}`)).map(([direction])=>direction)})
  const plan:BlueprintPlan={cells:[...cells.values()],width:fullMaxX+1,height:sourceY+1,eventsPerRun:4,runCount:centers,firstStep,lastStep}
  return {plan,laneCount,statuses:allocation.statuses,assignments:allocation.assignments,remainingNotes:allocation.remainingNotes,connected}
}
