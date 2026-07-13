import type {Project} from './types'
import type {BlueprintCell,BlueprintInstrument,BlueprintPlan,CompactBlueprint} from './blueprint'

type TimedNote={trackId:string;trackIndex:number;pitch:number;instrument:string;volume:number;pan:number}
type EventFrame={kind:'event';step:number;notes:TimedNote[];groupId:string}
type DelayFrame={delayId:string;delayTotal:number}
type RepeaterFrame={kind:'repeater';step:number;delay:number;groupId:string}&DelayFrame
type RestFrame={kind:'rest';step:number;groupId:string;reason:'parity'|'fold'}&Partial<DelayFrame>
type Frame=EventFrame|RepeaterFrame|RestFrame
type Phase='a'|'b'
type Run={frames:Frame[];wide:boolean;lastWideIndex:number;phase:Phase;globalIndex:number}
type RunPosition={run:Run;center?:number;left?:number;right?:number;out:number}
type Corner={x:'left'|'right';y:'top'|'bottom'}
type Point={x:number;y:number}
type MixedFramePoints={left?:Point;right?:Point;carrier:Point}
type Direction='up'|'right'|'down'|'left'

const opposite=(value:'left'|'right'|'top'|'bottom')=>value==='left'?'right':value==='right'?'left':value==='top'?'bottom':'top'
const directionBetween=(a:Point,b:Point):Direction=>b.x>a.x?'right':b.x<a.x?'left':b.y>a.y?'down':'up'
const oppositeDirection=(direction:Direction):Direction=>direction==='up'?'down':direction==='down'?'up':direction==='left'?'right':'left'

/** Split a redstone delay from four ticks downward.  When the repeater count
 * is even, a zero-delay solid block goes immediately before the last repeater.
 * This keeps the physical path odd-length, exactly as in the reference PDFs. */
export function splitCompactDelay(total:number):(number|'rest')[]{
  if(total<=0)return[]
  const delays:number[]=[]
  for(let remaining=Math.round(total);remaining>0;remaining-=Math.min(4,remaining))delays.push(Math.min(4,remaining))
  const result:(number|'rest')[]=[...delays]
  if(delays.length%2===0)result.splice(result.length-1,0,'rest')
  return result
}

function collectFrames(project:Project,includeSilentEdges:boolean){
  const notesByStep=new Map<number,TimedNote[]>()
  project.tracks.forEach((track,trackIndex)=>track.notes.forEach(note=>{
    const list=notesByStep.get(note.step)??[]
    list.push({trackId:track.id,trackIndex,pitch:note.pitch,instrument:track.instrument,volume:track.volume,pan:track.pan})
    notesByStep.set(note.step,list)
  }))
  const populated=[...notesByStep.keys()].sort((a,b)=>a-b),unit=project.delayUnit??1
  const firstStep=includeSilentEdges||!populated.length?0:(populated[0]??0)
  const lastStep=includeSilentEdges||!populated.length?Math.floor((project.steps-1)/unit)*unit:(populated.at(-1)??firstStep)
  const milestones=new Set(populated.filter(step=>step>=firstStep&&step<=lastStep))
  milestones.add(firstStep);milestones.add(lastStep)
  const steps=[...milestones].sort((a,b)=>a-b),frames:Frame[]=[]
  steps.forEach((step,index)=>{
    const notes=[...(notesByStep.get(step)??[])].sort((a,b)=>a.pitch-b.pitch||a.trackIndex-b.trackIndex)
    if(notes.length>6)throw new Error(`Step ${step} has ${notes.length} notes; compact circuits support at most six.`)
    frames.push({kind:'event',step,notes,groupId:`event-${step}`})
    const next=steps[index+1]
    if(next===undefined)return
    let arrival=step
    const delayId=`delay-${step}-${next}`,delayTotal=next-step
    splitCompactDelay(next-step).forEach((part,partIndex)=>{
      if(part==='rest')frames.push({kind:'rest',step:arrival,groupId:`${delayId}-${partIndex}`,reason:'parity',delayId,delayTotal})
      else{arrival+=part;frames.push({kind:'repeater',step:arrival,delay:part,groupId:`${delayId}-${partIndex}`,delayId,delayTotal})}
    })
  })
  return{frames,firstStep,lastStep,maxPolyphony:Math.max(0,...[...notesByStep.values()].map(notes=>notes.length))}
}

function partitionRuns(frames:Frame[],firstCapacity:number,laterCapacity:number,wideMode:boolean,firstRunEvery=0){
  const runs:Run[]=[]
  let offset=0,phase:Phase='a'
  while(offset<frames.length){
    const capacity=runs.length===0||(firstRunEvery>0&&runs.length%firstRunEvery===0)?firstCapacity:laterCapacity
    let consumed=Math.min(capacity,frames.length-offset)
    let slice=frames.slice(offset,offset+consumed)
    const boundary=slice.at(-1),continuation=frames[offset+consumed]
    const splitsLongDelay=boundary?.kind==='repeater'
      &&boundary.delayTotal>=5
      &&continuation!==undefined
      &&'delayId' in continuation
      &&continuation.delayId===boundary.delayId
    if(wideMode&&continuation&&boundary?.kind==='repeater'){
      const prior=slice.at(-2)
      if(prior?.kind==='repeater'&&boundary.delayTotal>=5){
        const displaced=slice.pop() as RepeaterFrame
        consumed--
        slice.push({kind:'rest',step:prior.step??displaced.step,groupId:`fold-${runs.length}`,reason:'fold'})
      }else{
        slice.pop()
        consumed--
      }
    }else if(splitsLongDelay){
      const displaced=slice.pop() as RepeaterFrame
      consumed--
      slice.push({kind:'rest',step:slice.at(-1)?.step??displaced.step,groupId:`fold-${runs.length}`,reason:'fold'})
    }
    if(!slice.length)throw new Error('The compact circuit area is too small to place a run.')
    const lastWideIndex=wideMode?slice.reduce((last,frame,index)=>frame.kind==='event'&&frame.notes.length>3?index:last,-1):-1
    const wide=lastWideIndex>=0
    if(runs.length&&runs.at(-1)?.wide===false&&wide)phase=phase==='a'?'b':'a'
    runs.push({frames:slice,wide,lastWideIndex,phase,globalIndex:runs.length})
    offset+=consumed
  }
  return runs
}

class CellBuilder{
  private cells=new Map<string,BlueprintCell>()
  private dustConnections=new Map<string,Set<Direction>>()
  constructor(private width:number,private height:number){}
  add(cell:BlueprintCell){
    if(cell.x<0||cell.y<0||cell.x>=this.width||cell.y>=this.height)throw new Error(`Compact blueprint cell outside board: ${cell.x},${cell.y}`)
    const key=`${cell.x},${cell.y}`,old=this.cells.get(key)
    if(old){
      if(old.type==='dust'&&cell.type==='dust')return
      throw new Error(`Compact blueprint collision at ${key}: ${old.type}[${old.groupId}@${old.step}]/${cell.type}[${cell.groupId}@${cell.step}]`)
    }
    this.cells.set(key,cell)
    if(cell.type==='dust')this.dustConnections.set(key,new Set(cell.connections??[]))
  }
  dust(point:Point,step:number,groupId:string){this.add({...point,type:'dust',step,groupId,connections:[]})}
  connectDust(a:Point,b:Point){
    const aKey=`${a.x},${a.y}`,bKey=`${b.x},${b.y}`,aSet=this.dustConnections.get(aKey),bSet=this.dustConnections.get(bKey)
    if(!aSet||!bSet)throw new Error(`Dust connection is missing an endpoint: ${aKey}/${bKey}`)
    const direction=directionBetween(a,b);aSet.add(direction);bSet.add(oppositeDirection(direction))
  }
  arm(dust:Point,cell:Point){
    const set=this.dustConnections.get(`${dust.x},${dust.y}`)
    if(set)set.add(directionBetween(dust,cell))
  }
  path(points:Point[],step:number,groupId:string){
    points.forEach(point=>this.dust(point,step,groupId))
    points.slice(1).forEach((point,index)=>this.connectDust(points[index],point))
  }
  finish(){
    return[...this.cells.entries()].map(([key,cell])=>cell.type==='dust'?{...cell,connections:[...(this.dustConnections.get(key)??[])]}:cell)
  }
}

function orderedNotes(notes:TimedNote[],up:boolean){return up?[...notes]:[...notes].reverse()}

function placeBank(builder:CellBuilder,notes:TimedNote[],center:Point,up:boolean,groupId:string,step:number,instruments:readonly BlueprintInstrument[]){
  if(!notes.length){builder.add({...center,type:'rest',texture:'placeholder',step,groupId});return}
  const offsets=up?[0,-1,1]:[0,1,-1]
  orderedNotes(notes,up).slice(0,3).forEach((note,index)=>{
    const instrument=instruments.find(item=>item.id===note.instrument)??instruments[0]
    builder.add({x:center.x+offsets[index],y:center.y,type:'note',label:String(note.pitch),texture:instrument?.texture,step,groupId,instrument:note.instrument,volume:note.volume,pan:note.pan})
  })
}

function placeSingleFrame(builder:CellBuilder,frame:Frame,point:Point,up:boolean,instruments:readonly BlueprintInstrument[]){
  if(frame.kind==='event')placeBank(builder,frame.notes,point,up,frame.groupId,frame.step,instruments)
  else if(frame.kind==='repeater')builder.add({...point,type:'repeater',label:String(frame.delay),delay:frame.delay,direction:up?'up':'down',step:frame.step,groupId:frame.groupId})
  else builder.add({...point,type:'rest',texture:'placeholder',step:frame.step,groupId:frame.groupId})
}

function transformCells(cells:BlueprintCell[],width:number,height:number,entry:Corner){
  const mirrorX=entry.x==='right',mirrorY=entry.y==='top'
  const mapDirection=(direction:Direction)=>mirrorX?(direction==='left'?'right':direction==='right'?'left':direction):direction
  const mapBoth=(direction:Direction)=>mirrorY?(direction==='up'?'down':direction==='down'?'up':direction):direction
  return cells.map(cell=>({
    ...cell,
    x:mirrorX?width-1-cell.x:cell.x,
    y:mirrorY?height-1-cell.y:cell.y,
    direction:cell.direction?mapBoth(mapDirection(cell.direction)):undefined,
    connections:cell.connections?.map(direction=>mapBoth(mapDirection(direction))),
  }))
}

function layerExit(entry:Corner,runCount:number):Corner{
  return{x:opposite(entry.x) as 'left'|'right',y:(runCount%2?opposite(entry.y):entry.y) as 'top'|'bottom'}
}

const threeRunsPerLayer=(width:number)=>Math.max(1,Math.floor((width-4)/2)+1)

function groupThreeLayers(runs:Run[],width:number){
  const maxRuns=threeRunsPerLayer(width),layers:Run[][]=[]
  for(let offset=0;offset<runs.length;offset+=maxRuns)layers.push(runs.slice(offset,offset+maxRuns))
  return layers
}

function renderThreeLayer(runs:Run[],width:number,height:number,entry:Corner,layerIndex:number,firstStep:number,lastStep:number,instruments:readonly BlueprintInstrument[]){
  const builder=new CellBuilder(width,height),centers=runs.map((_,index)=>2+index*2),framePoints:Point[][]=[]
  runs.forEach((run,runIndex)=>{
    const up=runIndex%2===0,start=runIndex===0?height-3:up?height-2:1,dy=up?-1:1
    framePoints[runIndex]=run.frames.map((frame,index)=>{
      const point={x:centers[runIndex],y:start+dy*index};placeSingleFrame(builder,frame,point,up,instruments);return point
    })
  })
  if(runs.length){
    const x=centers[0],source={x,y:height-1},dust={x,y:height-2},step=runs[0].frames[0]?.step??firstStep
    const groupId=`source-${layerIndex}`
    builder.add({...source,type:'source',label:'S',step,groupId});builder.path([dust],step,groupId);builder.arm(dust,source);builder.arm(dust,framePoints[0][0])
  }
  runs.slice(0,-1).forEach((run,index)=>{
    const up=index%2===0,current=framePoints[index].at(-1) as Point,next=framePoints[index+1][0],foldY=up?0:height-1,step=run.frames.at(-1)?.step??firstStep,groupId=`fold-${run.globalIndex}`
    const path:Array<Point>=[];for(let x=current.x;x<=next.x;x++)path.push({x,y:foldY})
    builder.path(path,step,groupId);builder.arm(path[0],current);builder.arm(path.at(-1) as Point,next)
  })
  const cells=transformCells(builder.finish(),width,height,entry),steps=runs.flatMap(run=>run.frames.map(frame=>frame.step))
  return{cells,width,height,eventsPerRun:Math.max(...runs.map(run=>run.frames.filter(frame=>frame.kind==='event').length)),runCount:runs.length,firstStep:steps.length?Math.min(...steps):firstStep,lastStep:steps.length?Math.max(...steps):lastStep,layer:layerIndex+1} satisfies BlueprintPlan
}

function groupMixedLayers(runs:Run[],width:number,height:number){
  const layers:Array<{runs:Run[];positions:RunPosition[]}>=[]
  let offset=0
  while(offset<runs.length){
    const layerRuns:Run[]=[],positions:RunPosition[]=[]
    let out=-1
    while(offset+layerRuns.length<runs.length){
      const run=runs[offset+layerRuns.length]
      const position:RunPosition=run.wide
        ?layerRuns.length?{run,left:out+2,right:out+4,out:out+4}:{run,left:1,right:3,out:3}
        :layerRuns.length?{run,center:out+2,out:out+2}:{run,center:1,out:1}
      const far=(position.right??position.center??0)+1
      if(far>=width&&layerRuns.length)break
      if(far>=width)throw new Error('The compact circuit area is too narrow for one run.')
      try{collisionFreeMixedPoints([...positions,position],height)}
      catch(error){if(layerRuns.length)break;throw error}
      layerRuns.push(run);positions.push(position);out=position.out
    }
    layers.push({runs:layerRuns,positions});offset+=layerRuns.length
  }
  return layers
}

function mixedPoints(position:RunPosition,frameCount:number,localRunIndex:number,height:number,phase=position.run.phase):MixedFramePoints[]{
  const up=localRunIndex%2===0,first=position.run.globalIndex===0,dy=up?-1:1
  if(!position.run.wide){
    const start=first?height-4:up?height-4:2
    return Array.from({length:frameCount},(_,index)=>({carrier:{x:position.center as number,y:start+dy*index}}))
  }
  let leftStart:number,rightStart:number
  if(first){leftStart=height-4;rightStart=height-5}
  else if(up&&phase==='a'){leftStart=height-3;rightStart=height-4}
  else if(up){leftStart=height-4;rightStart=height-3}
  else if(phase==='a'){leftStart=2;rightStart=1}
  else{leftStart=1;rightStart=2}
  return Array.from({length:frameCount},(_,index)=>({left:{x:position.left as number,y:leftStart+dy*index},right:{x:position.right as number,y:rightStart+dy*index},carrier:{x:position.right as number,y:rightStart+dy*index}}))
}

function bankPoints(center:Point,count:number,up:boolean){
  if(!count)return[center]
  const offsets=up?[0,-1,1]:[0,1,-1]
  return offsets.slice(0,Math.min(3,count)).map(offset=>({x:center.x+offset,y:center.y}))
}

function occupiedMixedPoints(run:Run,points:MixedFramePoints[],up:boolean){
  return run.frames.flatMap((frame,index)=>{
    const paired=run.wide&&index<=run.lastWideIndex,left=points[index].left,right=points[index].right
    if(!paired)return frame.kind==='event'?bankPoints(points[index].carrier,frame.notes.length,up):[points[index].carrier]
    if(!left||!right)throw new Error('A wide compact run is missing its paired lane.')
    if(frame.kind!=='event')return[left,right]
    if(frame.notes.length>3)return[...bankPoints(right,3,up),...bankPoints(left,frame.notes.length-3,up)]
    return[left,...bankPoints(right,frame.notes.length,up)]
  })
}

function collisionFreeMixedPoints(positions:RunPosition[],height:number){
  const occupied=new Set<string>(),result:MixedFramePoints[][]=[]
  positions.forEach((position,index)=>{
    const preferred=position.run.phase,phases:Phase[]=position.run.wide?[preferred,preferred==='a'?'b':'a']:[preferred]
    const candidates=phases.map(phase=>{
      const points=mixedPoints(position,position.run.frames.length,index,height,phase)
      const physical=occupiedMixedPoints(position.run,points,index%2===0)
      return{points,physical,collisions:physical.filter(point=>occupied.has(`${point.x},${point.y}`)).length}
    })
    const chosen=candidates.sort((a,b)=>a.collisions-b.collisions)[0]
    if(chosen.collisions)throw new Error(`Compact blueprint cannot separate adjacent runs ${position.run.globalIndex-1}/${position.run.globalIndex}.`)
    result.push(chosen.points);chosen.physical.forEach(point=>occupied.add(`${point.x},${point.y}`))
  })
  return result
}

function placeMixedFrame(builder:CellBuilder,run:Run,frame:Frame,index:number,points:MixedFramePoints,up:boolean,instruments:readonly BlueprintInstrument[]){
  const paired=run.wide&&index<=run.lastWideIndex,left=points.left,right=points.right
  if(!paired){placeSingleFrame(builder,frame,points.carrier,up,instruments);return}
  if(!left||!right)throw new Error('A wide compact run is missing its paired lane.')
  if(frame.kind==='event'){
    if(frame.notes.length>3){placeBank(builder,frame.notes.slice(0,3),right,up,frame.groupId,frame.step,instruments);placeBank(builder,frame.notes.slice(3,6),left,up,frame.groupId,frame.step,instruments)}
    else{builder.add({...left,type:'rest',texture:'placeholder',step:frame.step,groupId:frame.groupId});placeBank(builder,frame.notes,right,up,frame.groupId,frame.step,instruments)}
  }else if(frame.kind==='repeater'){
    ;[left,right].forEach(point=>builder.add({...point,type:'repeater',label:String(frame.delay),delay:frame.delay,direction:up?'up':'down',step:frame.step,groupId:frame.groupId}))
  }else [left,right].forEach(point=>builder.add({...point,type:'rest',texture:'placeholder',step:frame.step,groupId:frame.groupId}))
}

function verticalDust(builder:CellBuilder,x:number,outerY:number,cell:Point,step:number,groupId:string){
  const points:Point[]=[]
  const direction=cell.y>outerY?1:-1
  for(let y=outerY;y!==cell.y;y+=direction)points.push({x,y})
  points.forEach(point=>builder.dust(point,step,groupId))
  points.slice(1).forEach((point,index)=>builder.connectDust(points[index],point))
  if(points.length)builder.arm(points.at(-1) as Point,cell)
}

function renderMixedLayer(layer:{runs:Run[];positions:RunPosition[]},width:number,height:number,entry:Corner,layerIndex:number,firstStep:number,lastStep:number,instruments:readonly BlueprintInstrument[]){
  const {runs,positions}=layer,builder=new CellBuilder(width,height),framePoints=collisionFreeMixedPoints(positions,height)
  runs.forEach((run,runIndex)=>run.frames.forEach((frame,index)=>placeMixedFrame(builder,run,frame,index,framePoints[runIndex][index],runIndex%2===0,instruments)))
  if(runs.length){
    const position=positions[0],step=runs[0].frames[0]?.step??firstStep,sourceY=height-1,outerY=height-2
    const groupId=`source-${layerIndex}`
    if(position.run.wide){
      const left=position.left as number,right=position.right as number,sourceX=(left+right)/2,path:Array<Point>=[]
      builder.add({x:sourceX,y:sourceY,type:'source',label:'S',step,groupId})
      for(let x=left;x<=right;x++)path.push({x,y:outerY})
      builder.path(path,step,groupId);builder.arm(path[Math.round(sourceX-left)],{x:sourceX,y:sourceY})
      verticalDust(builder,left,outerY,framePoints[0][0].left as Point,step,groupId);verticalDust(builder,right,outerY,framePoints[0][0].right as Point,step,groupId)
    }else{
      const x=position.center as number,source={x,y:sourceY};builder.add({...source,type:'source',label:'S',step,groupId})
      verticalDust(builder,x,outerY,framePoints[0][0].carrier,step,groupId);builder.arm({x,y:outerY},source)
    }
  }
  runs.slice(0,-1).forEach((run,index)=>{
    const up=index%2===0,current=framePoints[index].at(-1)?.carrier as Point,nextPosition=positions[index+1],nextPoints=framePoints[index+1][0],outerY=up?0:height-2,step=run.frames.at(-1)?.step??firstStep,groupId=`fold-${run.globalIndex}`
    const targetX=nextPosition.run.wide?nextPosition.right as number:nextPosition.center as number,path:Point[]=[]
    for(let x=current.x;x<=targetX;x++)path.push({x,y:outerY})
    builder.path(path,step,groupId);verticalDust(builder,current.x,outerY,current,step,groupId)
    if(nextPosition.run.wide){verticalDust(builder,nextPosition.left as number,outerY,nextPoints.left as Point,step,groupId);verticalDust(builder,nextPosition.right as number,outerY,nextPoints.right as Point,step,groupId)}
    else verticalDust(builder,nextPosition.center as number,outerY,nextPoints.carrier,step,groupId)
  })
  const cells=transformCells(builder.finish(),width,height,entry),steps=runs.flatMap(run=>run.frames.map(frame=>frame.step))
  return{cells,width,height,eventsPerRun:Math.max(...runs.map(run=>run.frames.filter(frame=>frame.kind==='event').length)),runCount:runs.length,firstStep:steps.length?Math.min(...steps):firstStep,lastStep:steps.length?Math.max(...steps):lastStep,layer:layerIndex+1} satisfies BlueprintPlan
}

function generate(project:Project,instruments:readonly BlueprintInstrument[],width:number,height:number,includeSilentEdges:boolean):CompactBlueprint{
  const timeline=collectFrames(project,includeSilentEdges)
  if(timeline.maxPolyphony>6)throw new Error('Compact circuits support at most six simultaneous notes.')
  const mixed=timeline.maxPolyphony>3
  const runs=partitionRuns(timeline.frames,mixed?height-6:height-3,mixed?height-5:height-2,mixed,mixed?0:threeRunsPerLayer(width))
  const mixedGrouped=mixed?groupMixedLayers(runs,width,height):null
  const grouped=mixed?(mixedGrouped as Array<{runs:Run[];positions:RunPosition[]}>).map(item=>item.runs):groupThreeLayers(runs,width)
  const layers:BlueprintPlan[]=[]
  let entry:Corner={x:'left',y:'bottom'}
  grouped.forEach((layerRuns,index)=>{
    const plan=mixed
      ?renderMixedLayer((mixedGrouped as Array<{runs:Run[];positions:RunPosition[]}>)[index],width,height,entry,index,timeline.firstStep,timeline.lastStep,instruments)
      :renderThreeLayer(layerRuns,width,height,entry,index,timeline.firstStep,timeline.lastStep,instruments)
    layers.push(plan);entry=layerExit(entry,layerRuns.length)
  })
  return{layers,firstStep:timeline.firstStep,lastStep:timeline.lastStep,size:Math.max(width,height)}
}

export function generateCompactBlueprintRect(project:Project,instruments:readonly BlueprintInstrument[],width:number,height:number,includeSilentEdges=true){
  return generate(project,instruments,Math.max(10,Math.round(width)),Math.max(10,Math.round(height)),includeSilentEdges)
}

export function generateCompactBlueprint(project:Project,instruments:readonly BlueprintInstrument[],size=50,includeSilentEdges=true){
  const side=Math.max(16,Math.min(96,Math.round(size)))
  return generate(project,instruments,side,side,includeSilentEdges)
}
