import {describe,expect,it} from 'vitest'
import {allocateFishboneAuto,allocateFishboneManual,generateFishboneBlueprint} from './fishboneBlueprint'
import type {BlueprintInstrument} from './blueprint'
import type {Project,Track} from './types'

const instruments:BlueprintInstrument[]=[{id:'Harp',ja:'ハープ',en:'Harp',blockJa:'土',blockEn:'Dirt',texture:'earth'}]
const track=(id:string,notes:Array<[number,number]>):Track=>({id,name:id,instrument:'Harp',volume:1,pan:0,color:'#fff',muted:false,solo:false,ghostEnabled:true,notes:notes.map(([step,pitch])=>({step,pitch}))})
const project=(tracks:Track[],steps=128):Project=>({format:'oto-blogic',version:1,title:'TEST',edition:'both',tickRate:20,delayUnit:1,steps,tracks})

describe('fishbone allocation',()=>{
  it('pairs two monophonic tracks in fixed A and B rows',()=>{
    const value=allocateFishboneAuto(project([track('one',[[0,3],[2,5]]),track('two',[[1,8],[3,9]])]))
    expect(value.lanes).toHaveLength(1)
    expect(value.assignments).toEqual({one:[1],two:[1]})
    expect(value.lanes[0].slots.get(0)?.A?.trackId).toBe('one')
    expect(value.lanes[0].slots.get(1)?.B?.trackId).toBe('two')
  })

  it('gives polyphonic tracks exclusive lanes and never drops a note',()=>{
    const chord=track('chord',Array.from({length:5},(_,pitch)=>[0,pitch] as [number,number]))
    const mono=track('mono',[[0,12]])
    const value=allocateFishboneAuto(project([mono,chord]))
    expect(value.assignments.chord).toEqual([1,2,3])
    expect(value.assignments.mono).toEqual([4])
    expect(value.statuses.every(status=>status.remainingNotes===0)).toBe(true)
    expect(value.lanes.flatMap(lane=>[...lane.slots.values()].flatMap(slot=>[slot.A,slot.B].filter(Boolean)))).toHaveLength(6)
  })

  it('fills every available A row before using B rows',()=>{
    const value=allocateFishboneAuto(project([track('chord',[[0,1],[0,2],[0,3]])]))
    expect(value.lanes[0].slots.get(0)?.A?.pitch).toBe(1)
    expect(value.lanes[1].slots.get(0)?.A?.pitch).toBe(2)
    expect(value.lanes[0].slots.get(0)?.B?.pitch).toBe(3)
    expect(value.lanes[1].slots.get(0)?.B).toBeUndefined()
  })

  it('packs manual lanes in track order and reports residual notes',()=>{
    const first=track('first',[[0,1],[0,2]]),second=track('second',[[0,3],[0,4],[0,5]])
    const oneLane=allocateFishboneManual(project([first,second]),{first:[1],second:[1]})
    expect(oneLane.statuses.find(status=>status.trackId==='second')?.remainingNotes).toBe(3)
    const twoLanes=allocateFishboneManual(project([first,second]),{first:[1],second:[1,2]})
    expect(twoLanes.statuses.find(status=>status.trackId==='second')?.remainingNotes).toBe(1)
    const threeLanes=allocateFishboneManual(project([first,second]),{first:[1],second:[1,2,3]})
    expect(threeLanes.remainingNotes).toBe(0)
  })

  it('keeps two manually shared monophonic tracks on stable rows',()=>{
    const value=allocateFishboneManual(project([track('a',[[0,1],[4,2]]),track('b',[[1,3],[5,4]])]),{a:[2],b:[2]})
    expect(value.lanes[1].slots.get(4)?.A?.trackId).toBe('a')
    expect(value.lanes[1].slots.get(1)?.B?.trackId).toBe('b')
  })

  it('also gives A rows priority when manually packing across lanes',()=>{
    const value=allocateFishboneManual(project([track('chord',[[0,1],[0,2],[0,3]])]),{chord:[1,2]})
    expect(value.lanes[0].slots.get(0)?.A?.pitch).toBe(1)
    expect(value.lanes[1].slots.get(0)?.A?.pitch).toBe(2)
    expect(value.lanes[0].slots.get(0)?.B?.pitch).toBe(3)
  })
})

describe('fishbone geometry',()=>{
  it('continues beyond the 24-step PDF example in four-delay bands',()=>{
    const input=project([track('long',[[0,1],[24,2],[40,3]])],48)
    const {plan}=generateFishboneBlueprint(input,instruments)
    const notes=plan.cells.filter(cell=>cell.type==='note')
    expect(notes.map(cell=>cell.step).sort((a,b)=>a!-b!)).toEqual([0,24,40])
    expect(plan.height).toBeGreaterThan(24)
    expect(plan.lastStep).toBe(40)
  })

  it('uses the exact center-outward lane offsets and prunes after the last slot',()=>{
    const {plan}=generateFishboneBlueprint(project([track('lane',[[0,1],[2,2]])]),instruments)
    const center=plan.cells.find(cell=>cell.texture==='center-placeholder')!
    expect(plan.cells.some(cell=>cell.type==='note'&&cell.x===center.x-2&&cell.step===0)).toBe(true)
    expect(plan.cells.some(cell=>cell.type==='note'&&cell.x===center.x-6&&cell.step===2)).toBe(true)
    expect(plan.cells.some(cell=>cell.type==='repeater'&&cell.x===center.x-3&&cell.direction==='left')).toBe(true)
    expect(plan.cells.some(cell=>cell.type==='repeater'&&cell.x===center.x-5&&cell.direction==='left')).toBe(true)
    expect(plan.cells.some(cell=>cell.x===center.x-7&&cell.y===center.y)).toBe(false)
    expect(plan.cells.some(cell=>cell.x===center.x-8&&cell.y===center.y)).toBe(false)
  })

  it('marks repeaters with the signal direction on both sides of a center',()=>{
    const left=track('left',[[0,1],[2,2]]),right=track('right',[[0,3],[2,4]])
    const {plan}=generateFishboneBlueprint(project([left,right]),instruments,'manual',{left:[1],right:[2]})
    expect(plan.cells.some(cell=>cell.type==='repeater'&&cell.direction==='left')).toBe(true)
    expect(plan.cells.some(cell=>cell.type==='repeater'&&cell.direction==='right')).toBe(true)
  })

  it('places a cyan carrier under a B-only note',()=>{
    const {plan}=generateFishboneBlueprint(project([track('a',[[1,1]]),track('b',[[0,2]])]),instruments)
    const upper=plan.cells.find(cell=>cell.type==='note'&&cell.label==='2')!
    expect(plan.cells.find(cell=>cell.x===upper.x&&cell.y===upper.y+1)?.texture).toBe('placeholder')
  })

  it('builds magenta center carriers and delay-4 spine repeaters only while needed',()=>{
    const {plan}=generateFishboneBlueprint(project([track('lane',[[0,1],[4,2],[8,3]])]),instruments)
    expect(plan.cells.filter(cell=>cell.texture==='center-placeholder')).toHaveLength(3)
    expect(plan.cells.filter(cell=>cell.type==='repeater'&&cell.direction==='up'&&cell.delay===4)).toHaveLength(2)
  })

  it('centers S and equalizes startup delays for six lanes',()=>{
    const tracks=Array.from({length:6},(_,index)=>track(`t${index}`,[[0,index]]))
    const result=generateFishboneBlueprint(project(tracks),instruments,'manual',Object.fromEntries(tracks.map((item,index)=>[item.id,[index+1]])))
    const source=result.plan.cells.find(cell=>cell.type==='source')!
    expect(Math.abs(source.x-(result.plan.width-1)/2)).toBeLessThanOrEqual(1)
    expect(result.connected).toBe(true)
    const startRepeaters=result.plan.cells.filter(cell=>cell.type==='repeater'&&cell.groupId==='fishbone-start-distribution')
    expect(startRepeaters.filter(cell=>cell.direction==='left'||cell.direction==='right')).toHaveLength(2)
    const centers=result.plan.cells.filter(cell=>cell.texture==='center-placeholder'&&cell.step===0).map(cell=>cell.x).sort((a,b)=>a-b)
    const horizontal=startRepeaters.filter(cell=>cell.direction==='left'||cell.direction==='right')
    const vertical=startRepeaters.filter(cell=>cell.direction==='up')
    const totals=centers.map(center=>horizontal.filter(cell=>cell.x>Math.min(center,source.x)&&cell.x<Math.max(center,source.x)).length+vertical.filter(cell=>cell.x===center).length)
    expect(new Set(totals).size).toBe(1)
  })

  it('keeps every S-to-center dust run within fifteen blocks for eight lanes',()=>{
    const tracks=Array.from({length:8},(_,index)=>track(`t${index}`,[[0,index]]))
    const result=generateFishboneBlueprint(project(tracks),instruments,'manual',Object.fromEntries(tracks.map((item,index)=>[item.id,[index+1]])))
    const source=result.plan.cells.find(cell=>cell.type==='source')!
    const horizontal=result.plan.cells.filter(cell=>cell.type==='repeater'&&(cell.direction==='left'||cell.direction==='right')&&cell.groupId==='fishbone-start-distribution')
    const centers=result.plan.cells.filter(cell=>cell.texture==='center-placeholder'&&cell.step===0).map(cell=>cell.x).sort((a,b)=>a-b)
    const busY=horizontal[0].y,bus=result.plan.cells.filter(cell=>cell.y===busY&&cell.x>=centers[0]&&cell.x<=centers.at(-1)!&&(cell.type==='dust'||cell.type==='repeater'))
    expect(bus).toHaveLength(centers.at(-1)!-centers[0]+1)
    for(const center of centers){
      const points=[source.x,...horizontal.filter(cell=>cell.x>Math.min(center,source.x)&&cell.x<Math.max(center,source.x)).map(cell=>cell.x),center].sort((a,b)=>center<source.x?b-a:a-b)
      expect(Math.max(...points.slice(1).map((point,index)=>Math.abs(point-points[index])))).toBeLessThanOrEqual(14)
    }
    const vertical=result.plan.cells.filter(cell=>cell.type==='repeater'&&cell.direction==='up'&&cell.groupId==='fishbone-start-distribution')
    const totals=centers.map(center=>horizontal.filter(cell=>cell.x>Math.min(center,source.x)&&cell.x<Math.max(center,source.x)).length+vertical.filter(cell=>cell.x===center).length)
    expect(new Set(totals).size).toBe(1)
  })

  it('omits physical startup wiring above eight lanes but keeps every note and centered S',()=>{
    const chord=track('huge',Array.from({length:18},(_,pitch)=>[0,pitch] as [number,number]))
    const result=generateFishboneBlueprint(project([chord]),instruments)
    expect(result.laneCount).toBe(9)
    expect(result.connected).toBe(false)
    expect(result.plan.cells.filter(cell=>cell.type==='note')).toHaveLength(18)
    expect(result.plan.cells.some(cell=>cell.groupId==='fishbone-start-distribution')).toBe(false)
    const source=result.plan.cells.find(cell=>cell.type==='source')!
    expect(Math.abs(source.x-(result.plan.width-1)/2)).toBeLessThanOrEqual(1)
  })
})
