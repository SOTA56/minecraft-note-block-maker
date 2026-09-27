import {describe,expect,it} from 'vitest'
import {fishboneNoteMixes,peakNormalizationGain} from './mp3Export'
import {createFishboneDistanceTable} from './fishboneAudio'
import type {FishboneResult} from './blueprint'

describe('MP3 export mix',()=>{
  it('normalizes a nonzero peak to -1.0 dB without amplifying silence',()=>{
    expect(20*Math.log10(.4*peakNormalizationGain(.4))).toBeCloseTo(-1,8)
    expect(peakNormalizationGain(0)).toBe(1)
  })

  it('uses the FISHBONE source and note positions for each note mix',()=>{
    const result={plan:{cells:[
      {type:'source',x:5,y:0},
      {type:'note',x:8,y:1,trackId:'a',step:4,label:'12'},
      {type:'note',x:2,y:1,trackId:'b',step:4,label:'16'},
    ]}} as FishboneResult
    const mixes=fishboneNoteMixes(result,5)
    const distance=createFishboneDistanceTable(5)[3]
    expect(mixes.get('a:4:12')).toEqual({volume:distance.gain,pan:distance.pan})
    expect(mixes.get('b:4:16')).toEqual({volume:distance.gain,pan:-distance.pan})
  })
})
