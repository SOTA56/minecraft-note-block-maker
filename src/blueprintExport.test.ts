import {describe,expect,it} from 'vitest'
import {planBlueprintExportPages} from './blueprintExport'

const plan=(width:number,height:number)=>({cells:[],width,height,columnCountDirection:'right' as const})

describe('blueprint export pagination',()=>{
  it('splits a long easy circuit from left to right without changing its height',()=>{
    const pages=planBlueprintExportPages(plan(190,18),'easy')
    expect(pages.length).toBeGreaterThan(1)
    expect(pages.every(page=>page.y===0&&page.height===18)).toBe(true)
    expect(pages[0].x).toBe(0)
    expect(pages.at(-1)!.x+pages.at(-1)!.width).toBe(190)
    expect(pages.reduce((sum,page)=>sum+page.width,0)).toBe(190)
    expect(pages.every((page,index)=>index===0||page.x===pages[index-1].x+pages[index-1].width)).toBe(true)
  })

  it('splits a tall fishbone circuit from bottom to top without changing its width',()=>{
    const pages=planBlueprintExportPages(plan(22,190),'fishbone')
    expect(pages.length).toBeGreaterThan(1)
    expect(pages.every(page=>page.x===0&&page.width===22)).toBe(true)
    expect(pages[0].y).toBeGreaterThan(pages.at(-1)!.y)
    expect(pages[0].y+pages[0].height).toBe(190)
    expect(pages.at(-1)!.y).toBe(0)
    expect(pages.reduce((sum,page)=>sum+page.height,0)).toBe(190)
    expect(pages.every((page,index)=>index===0||page.y+page.height===pages[index-1].y)).toBe(true)
  })

  it('keeps each packed layer on exactly one page',()=>{
    expect(planBlueprintExportPages(plan(96,96),'packed')).toEqual([
      {x:0,y:0,width:96,height:96,index:0,total:1},
    ])
  })

  it('does not split a circuit that fits on one page',()=>{
    expect(planBlueprintExportPages(plan(24,24),'easy')).toHaveLength(1)
    expect(planBlueprintExportPages(plan(24,24),'fishbone')).toHaveLength(1)
  })
})
