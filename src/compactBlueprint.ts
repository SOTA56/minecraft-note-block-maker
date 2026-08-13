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
const transformPoint=(point:Point,width:number,height:number,entry:Corner):Point=>({x:entry.x==='right'?width-1-point.x:point.x,y:entry.y==='top'?height-1-point.y:point.y})
const transformVerticalDirection=(direction:'up'|'down',entry:Corner)=>entry.y==='top'?(direction==='up'?'down':'up'):direction

/** Split a redstone delay from four ticks downward.  When the repeater count
 * is even, a zero-delay solid block goes immediately before the last repeater.
 * This keeps the physical path odd-length, exactly as in the reference PDFs. */
export function splitCompactDelay(total:number):(number|'rest')[]{
  if(total<=0)return[]
  const delays=splitCompactRepeaterDelay(total)
  const result:(number|'rest')[]=[...delays]
  if(delays.length%2===0)result.splice(result.length-1,0,'rest')
  return result
}

function splitCompactRepeaterDelay(total:number){
  const delays:number[]=[]
  for(let remaining=Math.round(total);remaining>0;remaining-=Math.min(4,remaining))delays.push(Math.min(4,remaining))
  return delays
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
    splitCompactRepeaterDelay(next-step).forEach((part,partIndex)=>{
      arrival+=part;frames.push({kind:'repeater',step:arrival,delay:part,groupId:`${delayId}-${partIndex}`,delayId,delayTotal})
    })
  })
  return{frames,firstStep,lastStep,maxPolyphony:Math.max(0,...[...notesByStep.values()].map(notes=>notes.length))}
}

/**
 * Repeater parity belongs to one physical performance column, not to the
 * complete silent interval on the timeline.  A fold/layer boundary resets the
 * count, so every consecutive repeater group inside this run is normalized
 * independently.  Even groups receive one placeholder immediately before
 * their final repeater; odd groups can remain consecutive.
 */
function normalizeRunDelayParity(frames:Frame[]){
  const normalized:Frame[]=[]
  for(let index=0;index<frames.length;){
    const frame=frames[index]
    if(frame.kind!=='repeater'){
      normalized.push(frame);index++;continue
    }
    let end=index+1
    while(end<frames.length){
      const candidate=frames[end]
      if(candidate.kind!=='repeater'||candidate.delayId!==frame.delayId)break
      end++
    }
    const repeaters=frames.slice(index,end) as RepeaterFrame[]
    if(repeaters.length%2===0){
      const last=repeaters.at(-1) as RepeaterFrame
      normalized.push(...repeaters.slice(0,-1),{
        kind:'rest',step:last.step,groupId:`${last.delayId}-run-parity`,reason:'parity',delayId:last.delayId,delayTotal:last.delayTotal,
      },last)
    }else normalized.push(...repeaters)
    index=end
  }
  return normalized
}

function partitionRuns(frames:Frame[],firstCapacity:number,laterCapacity:number,wideMode:boolean,firstRunEvery=0){
  const runs:Run[]=[]
  let offset=0,phase:Phase='a'
  while(offset<frames.length){
    const capacity=runs.length===0||(firstRunEvery>0&&runs.length%firstRunEvery===0)?firstCapacity:laterCapacity
    let consumed=0,slice:Frame[]=[]
    // A locally inserted parity block consumes a real cell.  Search backward
    // for the largest timeline slice whose normalized physical route fits,
    // instead of overflowing a full column after parity correction.
    for(let requested=Math.min(capacity,frames.length-offset);requested>0;requested--){
      let candidateConsumed=requested
      const candidate=frames.slice(offset,offset+requested)
      const boundary=candidate.at(-1),continuation=frames[offset+requested]
      const splitsLongDelay=boundary?.kind==='repeater'
        &&boundary.delayTotal>=5
        &&continuation!==undefined
        &&'delayId' in continuation
        &&continuation.delayId===boundary.delayId
      if(wideMode&&continuation&&boundary?.kind==='repeater'){
        const prior=candidate.at(-2)
        if(prior?.kind==='repeater'&&boundary.delayTotal>=5){
          const displaced=candidate.pop() as RepeaterFrame
          candidateConsumed--
          candidate.push({kind:'rest',step:prior.step??displaced.step,groupId:`fold-${runs.length}`,reason:'fold'})
        }else{
          candidate.pop();candidateConsumed--
        }
      }else if(splitsLongDelay){
        const displaced=candidate.pop() as RepeaterFrame
        candidateConsumed--
        candidate.push({kind:'rest',step:candidate.at(-1)?.step??displaced.step,groupId:`fold-${runs.length}`,reason:'fold'})
      }
      if(candidateConsumed<=0)continue
      const normalized=normalizeRunDelayParity(candidate)
      if(normalized.length<=capacity){consumed=candidateConsumed;slice=normalized;break}
    }
    if(!slice.length||consumed<=0)throw new Error('The compact circuit area is too small to place a run.')
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
  replaceDustWithRepeater(point:Point,direction:Direction,step:number,groupId:string){
    const key=`${point.x},${point.y}`,old=this.cells.get(key)
    if(old?.type!=='dust')throw new Error(`Compact blueprint source input is not dust at ${key}.`)
    this.cells.set(key,{...point,type:'repeater',label:'1',delay:1,direction,step,groupId})
    this.dustConnections.delete(key)
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

function layerEntryFromExit(exit:BlueprintPlan['exit'],width:number,height:number, fallback:Corner):Corner{
  if(!exit)return fallback
  return{x:exit.x>=width/2?'right':'left',y:exit.y<=height/2?'top':'bottom'}
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
    const x=centers[0],source={x,y:height-1},input={x,y:height-2},step=runs[0].frames[0]?.step??firstStep
    const groupId=`source-${layerIndex}`
    builder.add({...source,type:'source',label:'S',step,groupId})
    builder.add({...input,type:'repeater',label:'1',delay:1,direction:'up',step,groupId})
  }
  runs.slice(0,-1).forEach((run,index)=>{
    const up=index%2===0,current=framePoints[index].at(-1) as Point,next=framePoints[index+1][0],foldY=up?0:height-1,step=run.frames.at(-1)?.step??firstStep,groupId=`fold-${run.globalIndex}`
    const path:Array<Point>=[];for(let x=current.x;x<=next.x;x++)path.push({x,y:foldY})
    builder.path(path,step,groupId)
    // At the end of a three-chord column the dust remains a straight
    // horizontal run extending to both sides of its centre dot.  The block
    // still supplies the signal in Minecraft, so a vertical arm here would
    // render the misleading ┏/┛ corner.
    builder.arm(path[0],{x:path[0].x-1,y:foldY})
    // The next column keeps its normal bent entry connection.
    builder.arm(path.at(-1) as Point,next)
  })
  const cells=transformCells(builder.finish(),width,height,entry),steps=runs.flatMap(run=>run.frames.map(frame=>frame.step)),lastRunIndex=runs.length-1,rawExit=framePoints[lastRunIndex]?.at(-1)
  const exit=rawExit?{...transformPoint(rawExit,width,height,entry),direction:transformVerticalDirection(lastRunIndex%2===0?'up':'down',entry)}:undefined
  return{cells,width,height,eventsPerRun:Math.max(...runs.map(run=>run.frames.filter(frame=>frame.kind==='event').length)),runCount:runs.length,firstStep:steps.length?Math.min(...steps):firstStep,lastStep:steps.length?Math.max(...steps):lastStep,layer:layerIndex+1,exit} satisfies BlueprintPlan
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

/** Lay every run on one board.  The configured Compact size is a row limit in
 * this mode, so the board grows only in the horizontal direction.  Normally
 * the same two/four-column cadence as layered Compact circuits is enough; if
 * two staggered footprints would collide, add horizontal breathing room
 * instead of silently creating another layer. */
function groupMixedContinuous(runs:Run[],height:number){
  const positions:RunPosition[]=[]
  let out=-1
  runs.forEach(run=>{
    const first=positions.length===0
    const base:RunPosition=run.wide
      ?first?{run,left:1,right:3,out:3}:{run,left:out+2,right:out+4,out:out+4}
      :first?{run,center:1,out:1}:{run,center:out+2,out:out+2}
    let shift=0,position=base
    while(true){
      position=run.wide
        ?{run,left:(base.left as number)+shift,right:(base.right as number)+shift,out:base.out+shift}
        :{run,center:(base.center as number)+shift,out:base.out+shift}
      try{collisionFreeMixedPoints([...positions,position],height);break}
      catch(error){
        if(first||shift>=height*2)throw error
        shift+=2
      }
    }
    positions.push(position);out=position.out
  })
  const far=Math.max(0,...positions.map(position=>(position.right??position.center??0)+1))
  return{runs,positions,width:Math.max(10,far+1)}
}

function mixedPoints(position:RunPosition,frameCount:number,localRunIndex:number,height:number,phase=position.run.phase):MixedFramePoints[]{
  const up=localRunIndex%2===0,first=position.run.globalIndex===0,dy=up?-1:1
  if(!position.run.wide){
    // A sparse single lane still follows the same two-row physical cycle as
    // a complete three-note lane.  Long-delay folds can place it beside the
    // staggered edge of a preceding six-note lane, so retain a one-row
    // alternate instead of treating that edge contact as a reason to start a
    // new layer.
    const start=first?height-4:up?(phase==='a'?height-4:height-3):(phase==='a'?2:1)
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

/**
 * Reserve the complete physical width of every individual repeater lane while
 * choosing the stagger phase. A 1–3 note lane uses the same footprint as a
 * full three-note lane; each of the two repeater lanes in a 4–6 note group
 * uses that footprint independently. Looking only at occupied note cells lets
 * a sparse lane skip the alternating row cycle and power an adjacent lane.
 */
function mixedCycleFootprint(run:Run,points:MixedFramePoints[],up:boolean){
  return run.frames.flatMap((frame,index)=>{
    const paired=run.wide&&index<=run.lastWideIndex,left=points[index].left,right=points[index].right
    if(frame.kind!=='event')return paired?[left as Point,right as Point]:[points[index].carrier]
    if(!paired)return bankPoints(points[index].carrier,3,up)
    if(!left||!right)throw new Error('A wide compact run is missing its paired lane.')
    return[...bankPoints(right,3,up),...bankPoints(left,3,up)]
  })
}

function collisionFreeMixedPoints(positions:RunPosition[],height:number){
  const occupied=new Set<string>(),result:MixedFramePoints[][]=[]
  positions.forEach((position,index)=>{
    const preferred=position.run.phase,phases:Phase[]=[preferred,preferred==='a'?'b':'a']
    const candidates=phases.map(phase=>{
      const points=mixedPoints(position,position.run.frames.length,index,height,phase)
      const footprint=mixedCycleFootprint(position.run,points,index%2===0)
      return{points,footprint,collisions:footprint.filter(point=>occupied.has(`${point.x},${point.y}`)).length}
    })
    const chosen=candidates.sort((a,b)=>a.collisions-b.collisions)[0]
    if(chosen.collisions)throw new Error(`Compact blueprint cannot separate adjacent runs ${position.run.globalIndex-1}/${position.run.globalIndex}.`)
    result.push(chosen.points);chosen.footprint.forEach(point=>occupied.add(`${point.x},${point.y}`))
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

function replaceLastSourceDustWithRepeater(builder:CellBuilder,outerY:number,cell:Point,step:number,groupId:string){
  const dy=cell.y>outerY?1:-1,point={x:cell.x,y:cell.y-dy}
  builder.replaceDustWithRepeater(point,directionBetween(point,cell),step,groupId)
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
      replaceLastSourceDustWithRepeater(builder,outerY,framePoints[0][0].left as Point,step,groupId)
      replaceLastSourceDustWithRepeater(builder,outerY,framePoints[0][0].right as Point,step,groupId)
    }else{
      const x=position.center as number,source={x,y:sourceY};builder.add({...source,type:'source',label:'S',step,groupId})
      verticalDust(builder,x,outerY,framePoints[0][0].carrier,step,groupId);builder.arm({x,y:outerY},source)
      replaceLastSourceDustWithRepeater(builder,outerY,framePoints[0][0].carrier,step,groupId)
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
  const cells=transformCells(builder.finish(),width,height,entry),steps=runs.flatMap(run=>run.frames.map(frame=>frame.step)),lastRunIndex=runs.length-1,rawExit=framePoints[lastRunIndex]?.at(-1)?.carrier
  const exit=rawExit?{...transformPoint(rawExit,width,height,entry),direction:transformVerticalDirection(lastRunIndex%2===0?'up':'down',entry)}:undefined
  return{cells,width,height,eventsPerRun:Math.max(...runs.map(run=>run.frames.filter(frame=>frame.kind==='event').length)),runCount:runs.length,firstStep:steps.length?Math.min(...steps):firstStep,lastStep:steps.length?Math.max(...steps):lastStep,layer:layerIndex+1,exit} satisfies BlueprintPlan
}

function alignRouteToBoard(plan:BlueprintPlan,boardHeight:number,entry:Corner){
  const offset=entry.y==='bottom'?boardHeight-plan.height:0
  return{...plan,height:boardHeight,cells:offset?plan.cells.map(cell=>({...cell,y:cell.y+offset})):plan.cells,exit:plan.exit&&{...plan.exit,y:plan.exit.y+offset}}
}

function addLayerNavigation(layers:BlueprintPlan[]){
  if(layers.length<2)return layers
  return layers.map((plan,index)=>{
    let cells=plan.cells.map(cell=>{
      if(index===0||cell.type!=='source')return cell
      const direction:Direction=cell.y===0?'down':'up'
      return{...cell,type:'layer-link' as const,label:direction==='up'?'↑':'↓',direction,connections:undefined,targetLayer:index-1}
    })
    if(index<layers.length-1&&plan.exit){
      const {x,y,direction}=plan.exit,edgeY=direction==='up'?0:plan.height-1,dy=direction==='up'?-1:1,groupId=`layer-exit-${index}`
      for(let nextY=y+dy;nextY!==edgeY;nextY+=dy)cells.push({x,y:nextY,type:'dust',step:plan.lastStep,groupId,connections:['up','down']})
      cells.push({x,y:edgeY,type:'layer-link',label:direction==='up'?'↑':'↓',direction,step:plan.lastStep,groupId,targetLayer:index+1})
    }
    return{...plan,cells}
  })
}

function generate(project:Project,instruments:readonly BlueprintInstrument[],width:number,height:number,includeSilentEdges:boolean,firstFold:'right'|'left',splitLayers:boolean):CompactBlueprint{
  const timeline=collectFrames(project,includeSilentEdges)
  if(timeline.maxPolyphony>6)throw new Error('Compact circuits support at most six simultaneous notes.')
  const mixed=timeline.maxPolyphony>3
  // The single-lane (three-chord-and-under) pattern has a two-row period.
  // Treat an odd requested height as the preceding even route and leave the
  // extra board row as breathing room, rather than changing the fold parity.
  const routeHeight=mixed&&height%2===0?height-1:!mixed&&height%2===1?height-1:height
  const runs=partitionRuns(timeline.frames,mixed?routeHeight-6:routeHeight-3,mixed?routeHeight-5:routeHeight-2,mixed,!mixed&&splitLayers?threeRunsPerLayer(width):0)
  const continuousMixed=mixed&&!splitLayers?groupMixedContinuous(runs,routeHeight):null
  const mixedGrouped=mixed?(splitLayers?groupMixedLayers(runs,width,routeHeight):[{runs,positions:continuousMixed?.positions??[]}]):null
  const grouped=mixed?(mixedGrouped as Array<{runs:Run[];positions:RunPosition[]}>).map(item=>item.runs):splitLayers?groupThreeLayers(runs,width):[runs]
  const boardWidth=splitLayers?width:mixed?(continuousMixed?.width??width):Math.max(10,runs.length*2+2)
  const layers:BlueprintPlan[]=[]
  let entry:Corner={x:firstFold==='right'?'left':'right',y:'bottom'}
  grouped.forEach((layerRuns,index)=>{
    const routePlan=mixed
      ?renderMixedLayer((mixedGrouped as Array<{runs:Run[];positions:RunPosition[]}>)[index],boardWidth,routeHeight,entry,index,timeline.firstStep,timeline.lastStep,instruments)
      :renderThreeLayer(layerRuns,boardWidth,routeHeight,entry,index,timeline.firstStep,timeline.lastStep,instruments)
    const aligned=routeHeight===height?routePlan:alignRouteToBoard(routePlan,height,entry)
    const plan={...aligned,columnCountDirection:entry.x==='right'?'left' as const:'right' as const}
    layers.push(plan)
    // A new layer begins at the same board corner where the previous layer
    // ended. This preserves both the horizontal side and the vertical band;
    // e.g. a right/top exit continues from right/top instead of resetting to
    // the bottom edge.
    entry=layerEntryFromExit(aligned.exit,boardWidth,height,entry)
  })
  return{layers:addLayerNavigation(layers),firstStep:timeline.firstStep,lastStep:timeline.lastStep,size:Math.max(boardWidth,height)}
}

export function generateCompactBlueprintRect(project:Project,instruments:readonly BlueprintInstrument[],width:number,height:number,includeSilentEdges=true,firstFold:'right'|'left'='right',splitLayers=true){
  return generate(project,instruments,Math.max(10,Math.round(width)),Math.max(10,Math.round(height)),includeSilentEdges,firstFold,splitLayers)
}

export function generateCompactBlueprint(project:Project,instruments:readonly BlueprintInstrument[],size=50,includeSilentEdges=true,firstFold:'right'|'left'='right',splitLayers=true){
  const side=Math.max(16,Math.min(96,Math.round(size)))
  return generate(project,instruments,side,side,includeSilentEdges,firstFold,splitLayers)
}
