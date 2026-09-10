import {describe,expect,it} from 'vitest'
import type {BlueprintCell,BlueprintInstrument} from './blueprint'
import type {Project,Track} from './types'
import {generateCompactBlueprint} from './compactBlueprint'

const instruments:BlueprintInstrument[]=[{id:'Harp',ja:'ハープ',en:'Harp',blockJa:'土など',blockEn:'Dirt, etc.',texture:'earth'}]
const directions={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]} as const

function everyOtherStepProject(polyphony:number):Project{
  const steps=256
  const tracks:Track[]=Array.from({length:polyphony},(_,track)=>({
    id:`track-${track}`,name:`Track ${track+1}`,instrument:'Harp',volume:1,pan:0,color:'#fff',muted:false,solo:false,ghostEnabled:true,
    notes:Array.from({length:steps/2},(_,index)=>({step:index*2,pitch:track})),
  }))
  return{format:'oto-blogic',version:1,title:'COMPACT SINGLE ENTRY TEST',edition:'both',tickRate:20,delayUnit:1,steps,tracks}
}

const key=(x:number,y:number)=>`${x},${y}`
const neighbor=(cell:BlueprintCell,direction:BlueprintCell['direction'],cellsByPosition:Map<string,BlueprintCell>)=>{
  if(!direction)return undefined
  const [dx,dy]=directions[direction]
  return cellsByPosition.get(key(cell.x+dx,cell.y+dy))
}

function assertNoCollisions(cells:BlueprintCell[]){
  expect(new Set(cells.map(cell=>key(cell.x,cell.y))).size).toBe(cells.length)
}

describe('compact single entry continuation layers',()=>{
  it.each([1,2,3])('keeps the single-lane entry topology for %i-note layers at odd/even sizes and both folds',(polyphony)=>{
    for(const size of [16,17,21,22])for(const fold of ['right','left'] as const){
      const input=everyOtherStepProject(polyphony)
      const compact=generateCompactBlueprint(input,instruments,size,false,fold,true)
      expect(compact.layers.length,`${polyphony}-note size ${size} fold ${fold}`).toBeGreaterThan(1)
      const cells=compact.layers.flatMap(layer=>layer.cells)
      const notes=cells.filter(cell=>cell.type==='note')
      expect(notes).toHaveLength(polyphony*128)
      expect(notes.map(cell=>cell.step).sort((a,b)=>(a??0)-(b??0))).toEqual(
        Array.from({length:128*polyphony},(_,index)=>Math.floor(index/polyphony)*2),
      )

      for(const [index,layer] of compact.layers.entries()){
        assertNoCollisions(layer.cells)
        const byPosition=new Map(layer.cells.map(cell=>[key(cell.x,cell.y),cell]))
        const source=layer.cells.find(cell=>cell.groupId===`source-${index}`&&(cell.type==='source'||cell.type==='layer-link'))
        expect(source,`source-${index}`).toBeDefined()
        if(!source)continue
        expect([0,layer.height-1]).toContain(source.y)
        const inward=source.y===0?'down':'up'
        const sourceInput=neighbor(source,inward,byPosition)
        expect(sourceInput,`source-${index} input`).toBeDefined()
        if(!sourceInput)continue
        if(index===0){
          expect(sourceInput).toMatchObject({type:'repeater',delay:1})
        }else{
          expect(sourceInput).toMatchObject({type:'repeater',direction:inward})
          expect(sourceInput.groupId).toMatch(/^delay-/)
          expect(layer.cells.some(cell=>cell.groupId?.startsWith('entry-'))).toBe(false)
          expect(layer.cells.filter(cell=>cell.groupId===`source-${index}`)).toHaveLength(1)

        }
      }

      const eventSteps=Array.from({length:128},(_,index)=>index*2)
      for(const [index,step] of eventSteps.entries()){
        const next=eventSteps[index+1]
        if(next===undefined)continue
        const delayPrefix=`delay-${step}-${next}-`
        const repeaters=cells.filter(cell=>cell.type==='repeater'&&cell.groupId?.startsWith(delayPrefix))
        expect(repeaters.length,`${delayPrefix} repeaters`).toBeGreaterThan(0)
        expect(repeaters.reduce((sum,cell)=>sum+(cell.delay??0),0),`${delayPrefix} total`).toBe(next-step)
      }
    }
  })
})
