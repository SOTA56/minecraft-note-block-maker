import {describe,expect,it} from 'vitest'
import type {BlueprintCell,BlueprintInstrument} from './blueprint'
import type {Project,Track} from './types'
import {generateCompactBlueprintRect} from './compactBlueprint'

const instruments:BlueprintInstrument[]=[{id:'Harp',ja:'ハープ',en:'Harp',blockJa:'土など',blockEn:'Dirt, etc.',texture:'earth'}]
const directions={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]} as const

function mixedProject(polyphony:(step:number)=>number,steps:number):Project{
  const tracks:Track[]=Array.from({length:6},(_,track)=>({
    id:`track-${track}`,name:`Track ${track+1}`,instrument:'Harp',volume:1,pan:0,color:'#fff',muted:false,solo:false,ghostEnabled:true,
    notes:Array.from({length:steps},(_,step)=>step).filter(step=>track<polyphony(step)).map(step=>({step,pitch:track})),
  }))
  return{format:'oto-blogic',version:1,title:'COMPACT LAYER ENTRY TEST',edition:'both',tickRate:20,delayUnit:1,steps,tracks}
}

function occupied(cells:BlueprintCell[]){return new Map(cells.map(cell=>[`${cell.x},${cell.y}`,cell]))}

function assertDustConnectionsHaveEndpoints(cells:BlueprintCell[],selectedDust=cells.filter(cell=>cell.type==='dust')){
  const byPosition=occupied(cells)
  const dust=selectedDust
  expect(dust.length).toBeGreaterThan(0)
  dust.forEach(cell=>cell.connections?.forEach(direction=>{
    const [dx,dy]=directions[direction]
    expect(byPosition.has(`${cell.x+dx},${cell.y+dy}`),`dangling ${direction} connection at ${cell.x},${cell.y}`).toBe(true)
  }))
  expect(dust.some(cell=>cell.connections?.some(direction=>{
    const [dx,dy]=directions[direction],neighbor=byPosition.get(`${cell.x+dx},${cell.y+dy}`)
    return neighbor!==undefined&&neighbor.type!=='dust'
  }))).toBe(true)
}

function assertNoCollisions(plan:{cells:BlueprintCell[]}){
  expect(new Set(plan.cells.map(cell=>`${cell.x},${cell.y}`)).size).toBe(plan.cells.length)
}

describe('compact mixed layer entries',()=>{
  it.each([4,5,6])('keeps source delay repeaters only on the first layer for %i-note runs',(polyphony)=>{
    const compact=generateCompactBlueprintRect(mixedProject(()=>polyphony,240),instruments,16,16,false,'right',true)
    expect(compact.layers.length).toBeGreaterThan(1)
    compact.layers.forEach((layer,index)=>{
      const sourceGroup=layer.cells.filter(cell=>cell.groupId===`source-${index}`)
      expect(sourceGroup.some(cell=>cell.type==='dust')).toBe(true)
      expect(sourceGroup.filter(cell=>cell.type==='repeater'&&cell.delay===1),`source-${index} entry repeaters`).toHaveLength(index===0?polyphony>3?2:1:0)
      assertNoCollisions(layer)
      assertDustConnectionsHaveEndpoints(layer.cells)
    })
    const noteCount=compact.layers.flatMap(layer=>layer.cells).filter(cell=>cell.type==='note').length
    expect(noteCount).toBe(polyphony*240)
  })

  it.each(['right','left'] as const)('preserves timeline delay repeaters and fold dust when folding %s',(fold)=>{
    const input=mixedProject(step=>step%12<4?6:step%12<8?4:step%12<10?5:0,240)
    const compact=generateCompactBlueprintRect(input,instruments,16,16,false,fold,true)
    expect(compact.layers.length).toBeGreaterThan(1)
    const cells=compact.layers.flatMap(layer=>layer.cells)
    const delayRepeaters=cells.filter(cell=>cell.type==='repeater'&&cell.groupId?.startsWith('delay-'))
    expect(delayRepeaters.length).toBeGreaterThan(0)
    expect(delayRepeaters.every(cell=>[1,2,3,4].includes(cell.delay??0))).toBe(true)
    const foldDust=cells.filter(cell=>cell.type==='dust'&&cell.groupId?.startsWith('fold-'))
    expect(foldDust.length).toBeGreaterThan(0)
    compact.layers.forEach((layer,index)=>{
      assertNoCollisions(layer)
      assertDustConnectionsHaveEndpoints(layer.cells,layer.cells.filter(cell=>cell.type==='dust'&&cell.groupId===`source-${index}`))
    })
    expect(cells.filter(cell=>cell.type==='note')).toHaveLength(input.tracks.reduce((sum,track)=>sum+track.notes.length,0))
  })

  it('handles a sparse mixed sequence with a narrow continuation entry',()=>{
    const input=mixedProject(step=>step<6?6:step<120&&step%16===15?2:step>=120&&step%16===15?5:0,240)
    const compact=generateCompactBlueprintRect(input,instruments,10,16,false,'right',true)
    expect(compact.layers.length).toBeGreaterThan(1)
    const cells=compact.layers.flatMap(layer=>layer.cells)
    expect(cells.filter(cell=>cell.type==='note')).toHaveLength(input.tracks.reduce((sum,track)=>sum+track.notes.length,0))
    expect(cells.some(cell=>cell.type==='repeater'&&cell.groupId?.startsWith('delay-'))).toBe(true)
    const continuationSpans=compact.layers.slice(1).map((layer,index)=>new Set(
      layer.cells.filter(cell=>cell.groupId===`source-${index+1}`).map(cell=>cell.x),
    ).size)
    expect(continuationSpans,'continuation source x spans').toContain(1)
    const eventSteps=[...new Set(input.tracks.flatMap(track=>track.notes.map(note=>note.step)))].sort((a,b)=>a-b)
    eventSteps.slice(0,-1).forEach((step,index)=>{
      const next=eventSteps[index+1],delayId=`delay-${step}-${next}-`
      const groups=new Map<string,number>()
      cells.filter(cell=>cell.type==='repeater'&&cell.groupId?.startsWith(delayId)).forEach(cell=>groups.set(cell.groupId as string,cell.delay??0))
      const total=[...groups.values()].reduce((sum,delay)=>sum+delay,0)
      expect(total,`${delayId} timing`).toBe(next-step)
    })
    compact.layers.forEach((layer,index)=>{
      const sourceGroup=layer.cells.filter(cell=>cell.groupId===`source-${index}`)
      expect(sourceGroup.filter(cell=>cell.type==='repeater'&&cell.delay===1)).toHaveLength(index===0?2:0)
      assertNoCollisions(layer)
      assertDustConnectionsHaveEndpoints(layer.cells)
    })
  })
})
