import {describe,expect,it} from 'vitest'
import {bufferedBoardBounds,indexBlueprintCells,visibleBlueprintIndices} from './blueprintViewport'
import type {BlueprintCell} from './blueprint'

describe('blueprint visible cells',()=>{
  const cells=Array.from({length:10000},(_,i)=>({x:i%100,y:Math.floor(i/100),type:'dust' as const}))
  it('retains every on-screen cell at different zooms and scroll positions in source order',()=>{
    const buckets=indexBlueprintCells(cells)
    for(const zoom of [.3,.5,1,2.4])for(const [x,y] of [[0,0],[40,10],[80,80]]){
      const vw=20/zoom,vh=15/zoom,bounds=bufferedBoardBounds(100,100,x,y,vw,vh)
      const indices=visibleBlueprintIndices(buckets,bounds),set=new Set(indices)
      cells.forEach((c,i)=>{if(c.x>=x&&c.x<x+vw&&c.y>=y&&c.y<y+vh)expect(set.has(i)).toBe(true)})
      expect(indices).toEqual([...indices].sort((a,b)=>a-b))
      expect(set.size).toBe(indices.length)
    }
  })
  it('preserves indices of overlapping cells and keeps the full plan intact',()=>{
    const overlap:BlueprintCell[]=[{type:'dust',x:17,y:17},{type:'repeater',x:17,y:17,delay:2,direction:'up'},{type:'dust',x:100,y:100}]
    expect(visibleBlueprintIndices(indexBlueprintCells(overlap),{left:16,right:32,top:16,bottom:32})).toEqual([0,1])
    expect(overlap).toHaveLength(3)
  })
  it('bounds the rendered region for a long continuous circuit',()=>{
    const long=Array.from({length:100000},(_,i)=>({type:'dust' as const,x:i,y:0}))
    const bounds=bufferedBoardBounds(100000,1,50000,0,25,20)
    expect(visibleBlueprintIndices(indexBlueprintCells(long),bounds).length).toBeLessThan(160)
  })
})
