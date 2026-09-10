import {describe,expect,it} from 'vitest'
import type {Project} from './types'
import {generateCompactBlueprint} from './compactBlueprint'

function input(polyphony:number,gapStart=152,gapEnd=160):Project{
  return{format:'oto-blogic',version:1,title:'Layer parity regression',edition:'java',tickRate:20,delayUnit:1,steps:256,
    tracks:Array.from({length:polyphony},(_,pitch)=>({id:String(pitch),name:'Test',instrument:'Harp',volume:1,pan:0,color:'#fff',muted:false,solo:false,ghostEnabled:true,
      notes:Array.from({length:128},(_,i)=>i*2).filter(step=>step<gapStart||step>=gapEnd).map(step=>({step,pitch})),
    })),
  }
}

describe('single-lane continuation-layer parity',()=>{
  it('regenerates a saved 22-block layout at 21 blocks without overlapping banks',()=>{
    // Minimal synthetic reproduction of the reported 22 -> 21 failure:
    // an eight-step gap after a continuation layer begins during a delay.
    const song=input(3,178,186)
    for(const size of [22,21]){
      const result=generateCompactBlueprint(song,[],size,false)
      expect(result.layers.flatMap(layer=>layer.cells).filter(cell=>cell.type==='note')).toHaveLength(372)
      result.layers.forEach(layer=>expect(new Set(layer.cells.map(cell=>`${cell.x},${cell.y}`)).size).toBe(layer.cells.length))
    }
  })

  it.each([1,2,3])('keeps %i-note banks on alternating rows after a layer starts during a delay',polyphony=>{
    const song=input(polyphony)
    for(const size of [16,17,20,21,22,23,32,50,96])for(const fold of ['left','right'] as const)for(const split of [true,false]){
      const result=generateCompactBlueprint(song,[],size,false,fold,split)
      const cells=result.layers.flatMap(layer=>layer.cells)
      expect(cells.filter(cell=>cell.type==='note')).toHaveLength(song.tracks.reduce((sum,track)=>sum+track.notes.length,0))
      // Every musical interval remains intact, including intervals split at
      // folds/layers. Source repeaters are not part of musical timing.
      expect(cells.filter(cell=>cell.type==='repeater'&&cell.groupId?.startsWith('delay-')).reduce((sum,cell)=>sum+(cell.delay??0),0)).toBe(254)
      result.layers.forEach(layer=>{
        expect(new Set(layer.cells.map(cell=>`${cell.x},${cell.y}`)).size).toBe(layer.cells.length)
        for(const cell of layer.cells){
          expect(cell.x).toBeGreaterThanOrEqual(0);expect(cell.x).toBeLessThan(layer.width)
          expect(cell.y).toBeGreaterThanOrEqual(0);expect(cell.y).toBeLessThan(layer.height)
        }
        const banks=new Map<number,number>()
        layer.cells.filter(cell=>cell.type==='note').forEach(cell=>{
          // The bank center is carried by pitch zero. Full bank width must
          // keep its parity even when only one or two notes are occupied.
          if(cell.label==='0'){
            const old=banks.get(cell.x)
            if(old!==undefined)expect(cell.y%2).toBe(old)
            banks.set(cell.x,cell.y%2)
          }
        })
        const columns=[...banks].sort((a,b)=>a[0]-b[0])
        columns.slice(1).forEach(([x,parity],i)=>{
          if(x-columns[i][0]===2)expect(parity).not.toBe(columns[i][1])
        })
      })
    }
  })
})
