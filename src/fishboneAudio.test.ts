import {describe,expect,it} from 'vitest'
import {createFishboneDistanceTable} from './fishboneAudio'

describe('fishbone distance audio',()=>{
  it('precomputes deterministic gain and pan values from zero through 48 blocks',()=>{
    const table=createFishboneDistanceTable(5)
    expect(table).toHaveLength(49)
    expect(table[0].gain).toBeCloseTo(1-5/48)
    expect(table[0].pan).toBe(0)
    expect(table[8].pan).toBeCloseTo(8/Math.hypot(8,5))
    expect(table[48].gain).toBe(0)
    expect(table[48].db).toBe(Number.NEGATIVE_INFINITY)
  })

  it('clamps player height to the audible range',()=>{
    expect(createFishboneDistanceTable(-4)[0].gain).toBe(1)
    expect(createFishboneDistanceTable(99)[0].gain).toBe(0)
  })
})

