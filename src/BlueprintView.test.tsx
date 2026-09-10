import {describe,expect,it,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import type {Project} from './types'
import BlueprintView from './BlueprintView'
import {generateCompactBlueprint,generateEasyBlueprint,generateFishboneBlueprint} from './blueprint'

vi.mock('./blueprint',async importOriginal=>{
  const actual=await importOriginal<typeof import('./blueprint')>()
  return{...actual,generateCompactBlueprint:vi.fn(actual.generateCompactBlueprint),generateEasyBlueprint:vi.fn(actual.generateEasyBlueprint),generateFishboneBlueprint:vi.fn(actual.generateFishboneBlueprint)}
})
const song:Project={format:'oto-blogic',version:1,title:'Recovery',edition:'java',tickRate:20,steps:16,delayUnit:1,tracks:[]}
function render(kind:'easy'|'packed'|'fishbone'){
  return renderToStaticMarkup(<BlueprintView project={song} instruments={[]} language="ja" initialViewState={{kind,layerIndex:0,zoom:1,scrollLeft:0,scrollTop:0}} onBack={()=>{}} onHome={()=>{}} onSettingsChange={()=>{}}/>)
}

describe('blueprint generation recovery',()=>{
  it.each(['easy','packed','fishbone'] as const)('keeps navigation and an explanation when %s generation fails',kind=>{
    const generator=kind==='easy'?generateEasyBlueprint:kind==='packed'?generateCompactBlueprint:generateFishboneBlueprint
    vi.mocked(generator).mockImplementationOnce(()=>{throw new Error('Invalid imported layout')})
    const html=render(kind)
    expect(html).toContain('role="alert"')
    expect(html).toContain('曲データは保持されています')
    expect(html).toContain('打ち込み画面へ戻る')
    expect(html).toContain('詰め詰め')
    expect(render(kind)).not.toContain('role="alert"')
  })
  it('does not generate a hidden compact layout while viewing the easy circuit',()=>{
    vi.mocked(generateCompactBlueprint).mockClear()
    expect(render('easy')).not.toContain('role="alert"')
    expect(generateCompactBlueprint).not.toHaveBeenCalled()
  })
})
