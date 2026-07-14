import {describe,expect,it} from 'vitest'
import type {Project,Track} from './types'
import {generateCompactBlueprint,generateCompactBlueprintRect,splitCompactDelay} from './compactBlueprint'
import type {BlueprintCell,BlueprintInstrument} from './blueprint'

const instruments:BlueprintInstrument[]=[{id:'Harp',ja:'ハープ',en:'Harp',blockJa:'その他',blockEn:'Other',texture:'earth'}]

function project(polyphony:(step:number)=>number,steps:number):Project{
  const tracks:Track[]=Array.from({length:6},(_,track)=>({
    id:`track-${track}`,name:`Track ${track+1}`,instrument:'Harp',volume:1,pan:0,color:'#fff',muted:false,solo:false,ghostEnabled:true,
    notes:Array.from({length:steps},(_,step)=>step).filter(step=>track<polyphony(step)).map(step=>({step,pitch:track})),
  }))
  return{format:'oto-blogic',version:1,title:'TEST',edition:'both',tickRate:20,delayUnit:1,steps,tracks}
}

function sparseProject(noteSteps:number[],steps=Math.max(...noteSteps,0)+1):Project{
  const input=project(()=>0,steps)
  input.tracks[0].notes=noteSteps.map((step,index)=>({step,pitch:index%25}))
  return input
}

const at=(cells:BlueprintCell[],x:number,y:number)=>cells.find(cell=>cell.x===x&&cell.y===y)
const directions={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]} as const

function foldEndpoints(cells:BlueprintCell[],groupId:string){
  const byPosition=new Map(cells.map(cell=>[`${cell.x},${cell.y}`,cell]))
  const endpoints=new Map<string,BlueprintCell>()
  cells.filter(cell=>cell.type==='dust'&&cell.groupId===groupId).forEach(dust=>dust.connections?.forEach(direction=>{
    const [dx,dy]=directions[direction],neighbor=byPosition.get(`${dust.x+dx},${dust.y+dy}`)
    if(neighbor&&neighbor.type!=='dust')endpoints.set(`${neighbor.x},${neighbor.y}`,neighbor)
  }))
  return[...endpoints.values()]
}

function expectFoldTopology(plan:{cells:BlueprintCell[];runCount:number}){
  const foldIds=new Set(plan.cells.filter(cell=>cell.type==='dust'&&cell.groupId?.startsWith('fold-')).map(cell=>cell.groupId))
  expect(foldIds.size).toBe(plan.runCount-1)
  for(let index=0;index<plan.runCount-1;index++){
    const groupId=`fold-${index}`,endpoints=foldEndpoints(plan.cells,groupId)
    const blocks=endpoints.filter(cell=>cell.type==='note'||cell.type==='rest')
    const repeaters=endpoints.filter(cell=>cell.type==='repeater')
    expect(blocks.length,`${groupId} must leave the old column from a block`).toBeGreaterThan(0)
    expect(repeaters.length,`${groupId} must enter the next column through a repeater`).toBeGreaterThan(0)
    expect(repeaters.every(cell=>cell.direction===(index%2===0?'down':'up')),`${groupId} repeater direction`).toBe(true)
    const blockGroup=plan.cells.filter(cell=>cell.groupId===blocks[0].groupId&&(cell.type==='note'||cell.type==='rest'))
    const repeaterGroup=plan.cells.filter(cell=>cell.groupId===repeaters[0].groupId&&cell.type==='repeater')
    expect(Math.max(...blockGroup.map(cell=>cell.y))-Math.min(...blockGroup.map(cell=>cell.y)),`${groupId} block stagger`).toBeLessThanOrEqual(1)
    expect(Math.max(...repeaterGroup.map(cell=>cell.y))-Math.min(...repeaterGroup.map(cell=>cell.y)),`${groupId} repeater stagger`).toBeLessThanOrEqual(1)
  }
}

describe('splitCompactDelay',()=>{
  const cases:[number,(number|'rest')[]][]=[
    [1,[1]],[2,[2]],[3,[3]],[4,[4]],[5,[4,'rest',1]],[6,[4,'rest',2]],[7,[4,'rest',3]],[8,[4,'rest',4]],
    [9,[4,4,1]],[10,[4,4,2]],[11,[4,4,3]],[12,[4,4,4]],[13,[4,4,4,'rest',1]],[14,[4,4,4,'rest',2]],
    [15,[4,4,4,'rest',3]],[16,[4,4,4,'rest',4]],[17,[4,4,4,4,1]],
    [18,[4,4,4,4,2]],[19,[4,4,4,4,3]],[20,[4,4,4,4,4]],[21,[4,4,4,4,4,'rest',1]],
    [32,[4,4,4,4,4,4,4,'rest',4]],[33,[4,4,4,4,4,4,4,4,1]],
  ]
  it.each(cases)('splits %i delays exactly', (total,expected)=>expect(splitCompactDelay(total)).toEqual(expected))
  it('preserves total delay and always uses an odd physical length',()=>{
    for(let total=1;total<=128;total++){
      const result=splitCompactDelay(total)
      expect(result.filter((part):part is number=>part!=='rest').reduce((sum,value)=>sum+value,0)).toBe(total)
      expect(result.length%2).toBe(1)
      expect(result.every(part=>part==='rest'||(part>=1&&part<=4))).toBe(true)
    }
  })
})

describe('three-note PDF geometry',()=>{
  const plan=generateCompactBlueprintRect(project(()=>3,32),instruments,10,18,false).layers[0]
  it('uses the single-line source and alternating block/repeater rows',()=>{
    expect(at(plan.cells,2,17)?.type).toBe('source')
    expect(at(plan.cells,2,16)?.type).toBe('dust')
    expect([1,2,3].map(x=>at(plan.cells,x,15)?.type)).toEqual(['note','note','note'])
    expect(at(plan.cells,2,14)).toMatchObject({type:'repeater',direction:'up',delay:1})
    expect([3,4,5].map(x=>at(plan.cells,x,2)?.type)).toEqual(['note','note','note'])
    expect(at(plan.cells,4,1)).toMatchObject({type:'repeater',direction:'down',delay:1})
  })
  it('matches the three-cell top and bottom folds',()=>{
    expect([2,3,4].map(x=>at(plan.cells,x,0)?.type)).toEqual(['dust','dust','dust'])
    expect([4,5,6].map(x=>at(plan.cells,x,17)?.type)).toEqual(['dust','dust','dust'])
  })
})

describe('mixed six-note PDF geometry',()=>{
  const widths=[6,6,6,3,6,6,3,6]
  const plan=generateCompactBlueprintRect(project(step=>widths[Math.floor(step/8)]??3,64),instruments,30,21,false).layers[0]
  it('uses the PDF run sequence 2,2,2,1,2,2,1,2',()=>{
    expect(plan.runCount).toBe(8)
    expect(at(plan.cells,2,20)?.type).toBe('source')
    expect([0,1,2].map(x=>at(plan.cells,x,17)?.type)).toEqual(['note','note','note'])
    expect([2,3,4].map(x=>at(plan.cells,x,16)?.type)).toEqual(['note','note','note'])
    expect(at(plan.cells,13,2)).toMatchObject({type:'repeater',direction:'down'})
    expect(at(plan.cells,23,17)).toMatchObject({type:'repeater',direction:'up'})
  })
  it('groups the two staggered repeaters and all six note blocks',()=>{
    const firstNotes=plan.cells.filter(cell=>cell.type==='note'&&cell.step===0)
    expect(firstNotes).toHaveLength(6)
    expect(new Set(firstNotes.map(cell=>cell.groupId))).toEqual(new Set(['event-0']))
    const paired=plan.cells.filter(cell=>cell.type==='repeater'&&cell.step===1&&cell.groupId==='delay-0-1-0')
    expect(paired).toHaveLength(2)
  })
  it('matches wide/narrow fold widths and T branches',()=>{
    expect([3,4,5,6,7].map(x=>at(plan.cells,x,0)?.type)).toEqual(['dust','dust','dust','dust','dust'])
    expect([11,12,13].map(x=>at(plan.cells,x,0)?.type)).toEqual(['dust','dust','dust'])
    expect([13,14,15,16,17].map(x=>at(plan.cells,x,19)?.type)).toEqual(['dust','dust','dust','dust','dust'])
    expect([21,22,23].map(x=>at(plan.cells,x,19)?.type)).toEqual(['dust','dust','dust'])
    expectFoldTopology(plan)
  })
  it('never drops or duplicates note cells',()=>{
    const expected=Array.from({length:64},(_,step)=>widths[Math.floor(step/8)]).reduce((sum,value)=>sum+value,0)
    expect(plan.cells.filter(cell=>cell.type==='note')).toHaveLength(expected)
  })

  it.each([16,17,21,50,51,96])('keeps fold %i column ends as blocks and the next starts as repeaters',(height)=>{
    const value=generateCompactBlueprintRect(project(()=>6,140),instruments,50,height,false).layers[0]
    expectFoldTopology(value)
  })
})

describe('compact routing edge cases',()=>{
  it.each([[15,16],[25,26],[49,50],[95,96]])('keeps the %i-row mixed route shape inside an even %i-row board',(oddHeight,evenHeight)=>{
    const input=project(()=>6,240)
    const odd=generateCompactBlueprintRect(input,instruments,16,oddHeight,false)
    const even=generateCompactBlueprintRect(input,instruments,16,evenHeight,false)
    expect(even.layers).toHaveLength(odd.layers.length)
    even.layers.forEach((layer,index)=>{
      const oddLayer=odd.layers[index],source=layer.cells.find(cell=>cell.type==='source')
      expect([0,evenHeight-1]).toContain(source?.y)
      const offset=source?.y===evenHeight-1?1:0
      expect(layer.cells.map(cell=>offset?{...cell,y:cell.y-offset}:cell)).toEqual(oddLayer.cells)
      expect(layer.height).toBe(evenHeight)
      expect(layer.cells.some(cell=>cell.y===(offset?0:evenHeight-1))).toBe(false)
    })
  })

  it.each([16,26,50,96])('keeps an even %i square while using the preceding odd vertical route height',(size)=>{
    const compact=generateCompactBlueprint(project(()=>6,240),instruments,size,false)
    compact.layers.forEach(layer=>{
      const source=layer.cells.find(cell=>cell.type==='source')
      expect([0,size-1]).toContain(source?.y)
      expect(layer.width).toBe(size)
      expect(layer.height).toBe(size)
      expect(layer.cells.some(cell=>cell.y===(source?.y===0?size-1:0))).toBe(false)
    })
  })

  it('collapses a paired run to its carrier after the last four-note event',()=>{
    const plan=generateCompactBlueprintRect(project(step=>step===0?6:3,11),instruments,30,21,false).layers[0]
    expect(plan.cells.filter(cell=>cell.type==='note'&&cell.step===0)).toHaveLength(6)
    expect(plan.cells.filter(cell=>cell.type==='repeater'&&cell.step===1)).toHaveLength(1)
    expect(plan.cells.filter(cell=>cell.type==='note'&&cell.step===1)).toHaveLength(3)
  })

  it('moves a boundary repeater to the next run and leaves a fold block behind',()=>{
    const sparse=project(step=>step===0||step===100?3:0,101)
    const plan=generateCompactBlueprintRect(sparse,instruments,16,16,false).layers[0]
    expect(at(plan.cells,2,1)).toMatchObject({type:'rest',groupId:'fold-0'})
    expect(at(plan.cells,4,1)?.type).toBe('repeater')
  })

  it('adds a fold block only when a long delay chain itself crosses the fold',()=>{
    const compact=generateCompactBlueprintRect(sparseProject([0,5,18,27,32,45,46]),instruments,16,16,false)
    const foldBlocks=compact.layers.flatMap(layer=>layer.cells).filter(cell=>cell.type==='rest'&&cell.groupId?.startsWith('fold-'))
    expect(foldBlocks).toHaveLength(1)
  })

  it('moves an ordinary boundary repeater without adding a fold block',()=>{
    const compact=generateCompactBlueprintRect(sparseProject([0,4,8,12,16,20,24,28,32,36,40,44,48]),instruments,16,16,false)
    const foldBlocks=compact.layers.flatMap(layer=>layer.cells).filter(cell=>cell.type==='rest'&&cell.groupId?.startsWith('fold-'))
    expect(foldBlocks).toHaveLength(0)
  })

  it('keeps each layer playback range local to that layer',()=>{
    const compact=generateCompactBlueprintRect(project(()=>3,240),instruments,16,16,false)
    expect(compact.layers.length).toBeGreaterThan(1)
    compact.layers.forEach((layer,index)=>{
      const steps=layer.cells.flatMap(cell=>cell.step===undefined?[]:[cell.step])
      expect(layer.firstStep).toBe(Math.min(...steps))
      expect(layer.lastStep).toBe(Math.max(...steps))
      if(index)expect(layer.firstStep).toBeGreaterThanOrEqual(compact.layers[index-1].lastStep)
    })
  })

  it.each([
    ['single-line',project(()=>3,240)],
    ['paired',project(()=>6,240)],
  ])('gives every %s layer its own source and adjacent start dust',(_,input)=>{
    const compact=generateCompactBlueprintRect(input,instruments,16,16,false)
    expect(compact.layers.length).toBeGreaterThan(1)
    compact.layers.forEach((layer,index)=>{
      const sources=layer.cells.filter(cell=>cell.type==='source')
      expect(sources).toHaveLength(1)
      const source=sources[0]
      expect(source).toMatchObject({step:layer.firstStep,groupId:`source-${index}`})
      expect(layer.cells.some(cell=>cell.type==='dust'&&cell.groupId===source.groupId&&Math.abs(cell.x-source.x)+Math.abs(cell.y-source.y)===1)).toBe(true)
      expect(layer.cells.some(cell=>cell.groupId?.startsWith('source-')&&cell.groupId!==`source-${index}`)).toBe(false)
    })
  })

  it('fills the fold-side bank first and its repeater center before side cells',()=>{
    const plan=generateCompactBlueprintRect(project(step=>step===0?4:1,2),instruments,16,21,false).layers[0]
    const notes=plan.cells.filter(cell=>cell.type==='note'&&cell.step===0)
    const centers=notes.filter(cell=>cell.x===1||cell.x===3)
    expect(centers.map(cell=>[cell.x,cell.label])).toEqual([[3,'0'],[1,'3']])
    expect(notes.filter(cell=>cell.y===16).map(cell=>cell.label).sort()).toEqual(['0','1','2'])
  })

  it('does not lose notes or place cells outside the board across deterministic mixed patterns',()=>{
    let seed=0x5eed1234
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/0x1_0000_0000}
    for(const side of [16,17,21,32,50]){
      for(let sample=0;sample<12;sample++){
        const poly=Array.from({length:96},()=>random()<0.3?0:1+Math.floor(random()*6))
        if(!poly.some(Boolean))poly[0]=1
        const input=project(step=>poly[step]??0,poly.length)
        let compact
        try{compact=generateCompactBlueprintRect(input,instruments,side,side,false)}
        catch(error){throw new Error(`side=${side} sample=${sample} poly=${poly.join(',')}\n${String(error)}`)}
        const cells=compact.layers.flatMap(layer=>layer.cells)
        expect(cells.filter(cell=>cell.type==='note')).toHaveLength(poly.reduce((sum,value)=>sum+value,0))
        compact.layers.forEach(layer=>layer.cells.forEach(cell=>{
          expect(cell.x).toBeGreaterThanOrEqual(0);expect(cell.x).toBeLessThan(layer.width)
          expect(cell.y).toBeGreaterThanOrEqual(0);expect(cell.y).toBeLessThan(layer.height)
        }))
      }
    }
  })
})
