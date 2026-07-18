import {describe,expect,it} from 'vitest'
import {blueprintColumnNumber,blueprintRowNumber} from './blueprint'

describe('blueprint coordinate numbering',()=>{
  it('counts rows upward from the bottom',()=>{
    const plan={height:12}
    expect(blueprintRowNumber(plan,0)).toBe(12)
    expect(blueprintRowNumber(plan,11)).toBe(1)
  })

  it('counts columns toward the right by default',()=>{
    const plan={width:8}
    expect(blueprintColumnNumber(plan,0)).toBe(1)
    expect(blueprintColumnNumber(plan,7)).toBe(8)
  })

  it('counts easy-circuit columns toward the left when requested',()=>{
    const plan={width:8,columnCountDirection:'left' as const}
    expect(blueprintColumnNumber(plan,0)).toBe(8)
    expect(blueprintColumnNumber(plan,7)).toBe(1)
  })
})
