import {describe,expect,it} from 'vitest'
import {createRollIndex,rollWindow} from './pianoRollIndex'
import type {Track} from './types'

const track=(id:string,notes:Track['notes'],patch:Partial<Track>={}):Track=>({id,name:id,notes,instrument:'Harp',volume:1,pan:0,color:id,muted:false,solo:false,ghostEnabled:true,...patch})

describe('piano roll note lookup',()=>{
  it('matches the original lookup including overlapping ghosts, duplicate notes and muted tracks',()=>{
    const tracks=[track('a',[{step:0,pitch:0},{step:0,pitch:24},{step:0,pitch:24}]),track('b',[{step:0,pitch:0},{step:4,pitch:12}],{muted:true}),track('c',[{step:4,pitch:12},{step:8,pitch:24}]),track('d',[{step:8,pitch:0}],{ghostEnabled:false})]
    for(const active of tracks)for(const ghosts of [false,true]){
      const index=createRollIndex(tracks,active.id,ghosts)
      for(let step=0;step<16;step++)for(let pitch=0;pitch<25;pitch++){
        const row=index.get(step)
        expect(Boolean((row?.ownMask??0)&(1<<pitch))).toBe(active.notes.some(n=>n.step===step&&n.pitch===pitch))
        expect(row?.ghosts.get(pitch)).toBe(ghosts?tracks.find(t=>t.id!==active.id&&t.ghostEnabled!==false&&t.notes.some(n=>n.step===step&&n.pitch===pitch))?.color:undefined)
        expect(row?.polyphony??0).toBe(tracks.flatMap(t=>t.notes).filter(n=>n.step===step).length)
      }
    }
  })
  it('rebuilds correctly after an immutable edit without changing the old index',()=>{
    const original=[track('a',[{step:0,pitch:1}])]
    const before=createRollIndex(original,'a',true)
    const after=createRollIndex([{...original[0],notes:[{step:8,pitch:24}]}],'a',true)
    expect(before.get(0)?.ownMask).toBe(2)
    expect(after.has(0)).toBe(false)
    expect(after.get(8)?.ownMask).toBe(1<<24)
  })
})

describe('piano roll buffered window',()=>{
  it('covers the entire visible interval at all zooms and delay units, including scrollbar jumps',()=>{
    for(const unit of [1,2,4])for(const size of [8,14,30,48])for(const viewport of [320,900,1920]){
      const total=2048/unit
      for(const offset of [0,1,500,3000,Math.max(0,total*size-viewport)]){
        const clamped=Math.min(offset,Math.max(0,total*size-viewport))
        const range=rollWindow(total,size,clamped,viewport)
        expect(range.start).toBeLessThanOrEqual(Math.floor(clamped/size))
        expect(range.end).toBeGreaterThanOrEqual(Math.min(total,Math.ceil((clamped+viewport)/size)))
        expect(range.start).toBeGreaterThanOrEqual(0)
        expect(range.end).toBeLessThanOrEqual(total)
      }
    }
  })
  it('keeps two screens ready and bounds long-song DOM size',()=>{
    const range=rollWindow(16384,30,12000,900)
    expect(range.start).toBeLessThanOrEqual(400-60)
    expect(range.end).toBeGreaterThanOrEqual(400+30+60)
    expect(range.end-range.start).toBeLessThanOrEqual(180)
  })
  it('handles empty and short songs and offsets left over after shortening',()=>{
    expect(rollWindow(0,30,0,900)).toEqual({start:0,end:0})
    expect(rollWindow(16,30,0,900)).toEqual({start:0,end:16})
    expect(rollWindow(16,30,6000,900)).toEqual({start:16,end:16})
  })
})
