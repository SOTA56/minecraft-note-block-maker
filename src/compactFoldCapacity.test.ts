import {describe,expect,it} from 'vitest'
import type {BlueprintCell,BlueprintInstrument} from './blueprint'
import {generateCompactBlueprintRect} from './compactBlueprint'
import type {Project,Track} from './types'

const instruments:BlueprintInstrument[]=[{id:'Harp',ja:'ハープ',en:'Harp',blockJa:'土など',blockEn:'Dirt, etc.',texture:'earth'}]
const suppliedSteps=[0,4,8,10,12,14,16,20,24,26,28,30,32,38,40,42,44,46,48,52,56,60]

function song(steps:number[],polyphony=1):Project{
  const last=Math.max(...steps,0)
  const tracks:Track[]=Array.from({length:polyphony},(_,track)=>({
    id:`harp-${track}`,name:`Harp ${track+1}`,instrument:'Harp',volume:1,pan:0,color:'#fff',muted:false,solo:false,ghostEnabled:true,
    notes:steps.map(step=>({step,pitch:track})),
  }))
  return{format:'oto-blogic',version:1,title:'Compact fold capacity regression',edition:'both',tickRate:20,delayUnit:1,steps:last+1,tracks}
}

function cell(cells:BlueprintCell[],x:number,y:number){return cells.find(item=>item.x===x&&item.y===y)}

function musicalDelays(plan:{cells:BlueprintCell[]}){
  const groups=new Map<string,{step:number;delay:number}>()
  plan.cells.filter(item=>item.type==='repeater'&&item.groupId?.startsWith('delay-')).forEach(item=>{
    // A single musical interval can have several physical repeaters.  The
    // trailing index identifies the repeater within its delay chain.
    const id=(item.groupId as string).replace(/-\d+$/,'')
    const old=groups.get(id)
    groups.set(id,{step:Math.max(item.step??0,old?.step??0),delay:(old?.delay??0)+(item.delay??0)})
  })
  return groups
}

function assertSafePlan(result:{layers:{cells:BlueprintCell[];width:number;height:number}[]},input:Project){
  const cells=result.layers.flatMap(layer=>layer.cells)
  expect(cells.filter(item=>item.type==='note')).toHaveLength(input.tracks.reduce((sum,track)=>sum+track.notes.length,0))
  result.layers.forEach(layer=>{
    expect(new Set(layer.cells.map(item=>`${item.x},${item.y}`)).size).toBe(layer.cells.length)
    layer.cells.forEach(item=>{
      expect(item.x).toBeGreaterThanOrEqual(0);expect(item.x).toBeLessThan(layer.width)
      expect(item.y).toBeGreaterThanOrEqual(0);expect(item.y).toBeLessThan(layer.height)
    })
  })
  const expected=[...new Set(input.tracks.flatMap(track=>track.notes.map(note=>note.step)))].sort((a,b)=>a-b)
  const delays=musicalDelays({cells})
  expect(delays.size).toBe(expected.length-1)
  expected.slice(0,-1).forEach((step,index)=>{
    const next=expected[index+1],matches=[...delays.values()].filter(value=>value.step===next)
    expect(matches,`delay ending at step ${next}`).toHaveLength(1)
    expect(matches[0].delay,`delay ${step}->${next}`).toBe(next-step)
  })
}

function horizontalMirror(cell:BlueprintCell,width:number):BlueprintCell{
  const flip=(direction:NonNullable<BlueprintCell['direction']>)=>direction==='left'?'right':direction==='right'?'left':direction
  return{...cell,x:width-1-cell.x,direction:cell.direction?flip(cell.direction):undefined,connections:cell.connections?.map(flip).sort()}
}

describe('compact fold capacity regression',()=>{
  it('keeps the final repeater and feeds the fold with a zero-delay block',()=>{
    const result=generateCompactBlueprintRect(song(suppliedSteps),instruments,17,17,false,'right',true)
    const plan=result.layers[0]
    expect(cell(plan.cells,4,14)).toMatchObject({type:'repeater',delay:4,direction:'down',step:36})
    expect(cell(plan.cells,4,15)).toMatchObject({type:'rest',step:36})
    expect(cell(plan.cells,6,15)).toMatchObject({type:'repeater',delay:2,direction:'up',step:38})
    expect(cell(plan.cells,6,16)?.type).toBe('dust')
    assertSafePlan(result,song(suppliedSteps))
  })

  it.each([5,6,7,8])('retains notes and exact timing when the boundary gap is %i',gap=>{
    const pivot=suppliedSteps.indexOf(38)
    const steps=suppliedSteps.map((step,index)=>index>=pivot?step+(gap-6):step)
    const input=song(steps)
    for(const size of [16,17])for(const fold of ['right','left'] as const)for(const polyphony of [1,2,3]){
      const result=generateCompactBlueprintRect(song(steps,polyphony),instruments,size,size,false,fold,true)
      const plan=result.layers[0],y=size===17?14:13,foldX=fold==='right'?4:size-1-4,nextX=fold==='right'?6:size-1-6
      expect(cell(plan.cells,foldX,y)).toMatchObject({type:'repeater',delay:4,direction:'down',step:36})
      expect(cell(plan.cells,foldX,y+1)).toMatchObject({type:'rest',step:36})
      expect(cell(plan.cells,nextX,y+1)).toMatchObject({type:'repeater',delay:gap-4,direction:'up',step:32+gap})
      expect(cell(plan.cells,nextX,size-1)?.type).toBe('dust')
      assertSafePlan(result,song(steps,polyphony))
    }
    expect(input.tracks[0].notes.map(note=>note.step)).toEqual(steps)
  })

  it.each([1,2,3])('mirrors the %i-note route horizontally while preserving vertical directions',polyphony=>{
    const input=song(suppliedSteps,polyphony)
    const right=generateCompactBlueprintRect(input,instruments,17,17,false,'right',true).layers[0]
    const left=generateCompactBlueprintRect(input,instruments,17,17,false,'left',true).layers[0]
    const signature=(cells:BlueprintCell[])=>cells.map(item=>({...item,connections:item.connections?.slice().sort()})).sort((a,b)=>a.y-b.y||a.x-b.x||a.type.localeCompare(b.type))
    expect(signature(left.cells)).toEqual(signature(right.cells.map(item=>horizontalMirror(item,17))))
  })

  it.each([16,17])('keeps %i-row routes inside the board with the expected entry edge',size=>{
    for(const polyphony of [1,2,3]){
      const input=song(suppliedSteps,polyphony)
      const result=generateCompactBlueprintRect(input,instruments,size,size,false,'right',true)
      assertSafePlan(result,input)
      result.layers.forEach((layer,index)=>{
        const entry=layer.cells.find(item=>item.groupId===`source-${index}`&&(item.type==='source'||item.type==='layer-link'))
        expect([0,size-1]).toContain(entry?.y)
        const route=layer.cells.filter(item=>!item.groupId?.startsWith('layer-exit-')&&item.type!=='dust')
        expect(route.some(item=>item.y===(entry?.y===0?size-1:0))).toBe(false)
      })
    }
  })

  it.each([9,10,11,12,15,16,17,20,24,28,32])('preserves timing and geometry for a long %i-tick gap',gap=>{
    const steps=[0,4,8,10,12,14,16,20,24,26,28,30,32,32+gap,34+gap,38+gap,42+gap,46+gap]
    const input=song(steps,2)
    const result=generateCompactBlueprintRect(input,instruments,16,17,false,'right',true)
    assertSafePlan(result,input)
    expect(result.layers.flatMap(layer=>layer.cells).filter(item=>item.type==='note')).toHaveLength(steps.length*2)
  })
})
