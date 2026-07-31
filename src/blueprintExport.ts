import {blueprintColumnNumber,blueprintRowNumber,type BlueprintCell,type BlueprintPlan} from './blueprint'
import type {RepeaterDisplay} from './types'

type Plan=Pick<BlueprintPlan,'cells'|'width'|'height'|'columnCountDirection'>
export type ExportLegendBlock={texture:string;label:string;name:string}
export type BlueprintExportKind='easy'|'packed'|'fishbone'
export type BlueprintExportProgress={phase:'preparing'|'rendering'|'encoding'|'downloading';completed:number;total:number}
export type BlueprintExportOptions={kind?:BlueprintExportKind;onProgress?:(progress:BlueprintExportProgress)=>void}
type Slice={x:number;y:number;width:number;height:number;index:number;total:number}
const textureFiles:Record<string,string>={earth:'grass_block_side.png',wood:'oak_planks.png',stone:'cobblestone.png',sand:'sand.png',glass:'glass.png',wool:'pink_wool.png',clay:'clay.png',gold:'gold_block.png',ice:'ice.png',bone:'bone_block_side.png',iron:'iron_block.png',soul:'soul_sand.png',pumpkin:'pumpkin_side.png',emerald:'emerald_block.png',hay:'hay_block_side.png',glow:'glowstone.png',copper:'copper_block.png','copper-exposed':'exposed_copper.png','copper-weathered':'weathered_copper.png','copper-oxidized':'oxidized_copper.png',placeholder:'light_blue_concrete.png','center-placeholder':'magenta_concrete.png'}
const copperColors:Record<string,string>={copper:'#963247','copper-exposed':'#8a5427','copper-weathered':'#2f6f67','copper-oxidized':'#2946a3'}

const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src})
const safeName=(title:string)=>title.trim().replace(/[\\/:*?"<>|]/g,'_')||'OTO-BLOGIC'
const CELL=40,AXIS=42,FOOTER=34,SIDE_WIDTH=280
// Keep each temporary canvas comfortably below Chromium's practical memory
// ceiling. A page is discarded before the next page is rendered.
const MAX_PAGE_PIXELS=10_000_000,MAX_PAGE_EDGE=4_096,MAX_PAGE_SPAN=64
const yieldToBrowser=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))

function slicesFor(plan:Plan,kind:BlueprintExportKind):Slice[]{
  if(kind==='packed')return[{x:0,y:0,width:plan.width,height:plan.height,index:0,total:1}]
  if(kind==='easy'){
    const canvasHeight=AXIS*2+plan.height*CELL+FOOTER
    const pixelSpan=Math.floor((Math.min(MAX_PAGE_EDGE,Math.floor(MAX_PAGE_PIXELS/Math.max(1,canvasHeight)))-AXIS*2-SIDE_WIDTH)/CELL)
    const span=Math.max(1,Math.min(MAX_PAGE_SPAN,pixelSpan)),parts=[] as Omit<Slice,'total'>[]
    for(let x=0;x<plan.width;x+=span)parts.push({x,y:0,width:Math.min(span,plan.width-x),height:plan.height,index:parts.length})
    return parts.map(part=>({...part,total:parts.length}))
  }
  const canvasWidth=AXIS*2+plan.width*CELL+SIDE_WIDTH
  const pixelSpan=Math.floor((Math.min(MAX_PAGE_EDGE,Math.floor(MAX_PAGE_PIXELS/Math.max(1,canvasWidth)))-AXIS*2-FOOTER)/CELL)
  const span=Math.max(1,Math.min(MAX_PAGE_SPAN,pixelSpan)),parts=[] as Omit<Slice,'total'>[]
  // Fishbone pages follow the construction flow requested by the UI: bottom,
  // middle, then top. Coordinates remain those of the complete blueprint.
  for(let end=plan.height;end>0;){const y=Math.max(0,end-span);parts.push({x:0,y,width:plan.width,height:end-y,index:parts.length});end=y}
  return parts.map(part=>({...part,total:parts.length}))
}

// Exported as a small, DOM-free preflight helper so page direction and count
// stay testable without allocating a canvas.
export function planBlueprintExportPages(plan:Plan,kind:BlueprintExportKind){
  return slicesFor(plan,kind).map(({x,y,width,height,index,total})=>({x,y,width,height,index,total}))
}

async function render(plan:Plan,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean,repeaterDisplay:RepeaterDisplay,slice:Slice={x:0,y:0,width:plan.width,height:plan.height,index:0,total:1}){
  const cell=CELL,axis=AXIS,footer=FOOTER,gridWidth=axis*2+slice.width*cell,gridHeight=axis*2+slice.height*cell
  const hasSource=plan.cells.some(item=>item.type==='source'),hasLayerLink=plan.cells.some(item=>item.type==='layer-link'),hasCenterPlaceholder=plan.cells.some(item=>item.type==='rest'&&item.texture==='center-placeholder')
  const legendItems=legendBlocks.length+3+(hasCenterPlaceholder?1:0)+(hasSource?1:0)+(hasLayerLink?1:0),sideWidth=280,sideLegendHeight=28+legendItems*52
  const width=gridWidth+sideWidth,height=Math.max(gridHeight,axis+sideLegendHeight)+footer
  const legendColumns=1,legendTop=axis,legendLeft=gridWidth+18
  // Packed circuits must remain one layer per page. If that page is too large
  // for a low-memory browser, reduce its raster scale instead of allocating an
  // oversized canvas or rejecting the export.
  const rasterScale=Math.min(1,MAX_PAGE_EDGE/width,MAX_PAGE_EDGE/height,Math.sqrt(MAX_PAGE_PIXELS/(width*height)))
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(width*rasterScale));canvas.height=Math.max(1,Math.floor(height*rasterScale))
  const context=canvas.getContext('2d');if(!context)throw new Error('画像を作成できませんでした。')
  context.scale(rasterScale,rasterScale)
  await document.fonts.load('400 22px "Archivo Black"');await document.fonts.ready
  const dark=theme==='dark',background=dark?'#111713':'#fff',foreground=dark?'#eef2ed':'#111',grid=dark?'rgba(255,255,255,.78)':'#b8b8b8'
  context.fillStyle=background;context.fillRect(0,0,width,height)
  context.fillStyle=foreground;context.font='15px "Archivo Black"';context.textAlign='center';context.textBaseline='middle'
  for(let x=0;x<slice.width;x++){const originalX=slice.x+x,px=axis+x*cell+cell/2,label=String(blueprintColumnNumber(plan,originalX));context.fillText(label,px,axis/2);context.fillText(label,px,axis+slice.height*cell+axis/2)}
  for(let y=0;y<slice.height;y++){const originalY=slice.y+y,py=axis+y*cell+cell/2,label=String(blueprintRowNumber(plan,originalY));context.fillText(label,axis/2,py);context.fillText(label,axis+slice.width*cell+axis/2,py)}
  const textures=new Map<string,HTMLImageElement>()
  await Promise.all([...new Set(plan.cells.map(item=>item.texture).filter(Boolean) as string[])].map(async key=>{const file=textureFiles[key];if(file)textures.set(key,await loadImage(`/assets/block-textures/${file}`))}))
  const visibleCells=plan.cells.filter(item=>item.x>=slice.x&&item.x<slice.x+slice.width&&item.y>=slice.y&&item.y<slice.y+slice.height)
  for(let cellIndex=0;cellIndex<visibleCells.length;cellIndex++){const item=visibleCells[cellIndex],x=axis+(item.x-slice.x)*cell,y=axis+(item.y-slice.y)*cell,cx=x+cell/2,cy=y+cell/2
    if(item.type==='note'||item.type==='rest'){const image=textures.get(item.texture??'placeholder');if(item.texture==='glass'){context.fillStyle=dark?'#79989b':'#cae6e8';context.fillRect(x+1,y+1,cell-2,cell-2)}if(image)context.drawImage(image,x+1,y+1,cell-2,cell-2);const copper=item.type==='note'?copperColors[item.texture??'']:undefined;context.strokeStyle=copper??'#000';context.lineWidth=copper?3:2;context.strokeRect(x+2,y+2,cell-4,cell-4);if(item.type==='note'){context.fillStyle='#fff';context.font='400 22px "Archivo Black"';context.lineJoin='round';context.lineWidth=3;context.strokeStyle=copper??'#000';context.strokeText(item.label??'',cx,cy);context.fillText(item.label??'',cx,cy)}}
    else if(item.type==='source'){context.fillStyle='#fff';context.fillRect(x+1,y+1,cell-2,cell-2);context.fillStyle='#e51d24';context.font='26px "Archivo Black"';context.fillText('S',cx,cy)}
    else if(item.type==='repeater'){const clicks=repeaterDisplay==='clicks';context.save();context.translate(cx,cy);const angle=item.direction==='up'?Math.PI:item.direction==='left'?Math.PI/2:item.direction==='right'?-Math.PI/2:0;context.rotate(angle);context.fillStyle=clicks?'#fff':'#ed171c';context.strokeStyle='#080b09';context.lineWidth=2;context.beginPath();context.moveTo(-15,-16);context.lineTo(15,-16);context.lineTo(15,7);context.lineTo(0,16);context.lineTo(-15,7);context.closePath();context.fill();if(clicks)context.stroke();context.rotate(-angle);context.fillStyle=clicks?'#ed171c':'#fff';context.font='21px "Archivo Black"';const textX=item.direction==='left'?3:item.direction==='right'?-3:0,textY=item.direction==='up'?3:item.direction==='down'?-3:0;context.fillText(String(clicks?Math.max(0,(item.delay??1)-1):(item.delay??1)),textX,textY);context.restore()}
    else if(item.type==='dust'){context.strokeStyle='#e51d24';context.fillStyle='#e51d24';context.lineWidth=5;for(const direction of item.connections??[]){context.beginPath();context.moveTo(cx,cy);context.lineTo(cx+(direction==='right'?cell/2:direction==='left'?-cell/2:0),cy+(direction==='down'?cell/2:direction==='up'?-cell/2:0));context.stroke()}context.beginPath();context.arc(cx,cy,6,0,Math.PI*2);context.fill()}
    else if(item.type==='layer-link'){context.strokeStyle='#35a9ec';context.lineWidth=2;context.strokeRect(x+2,y+2,cell-4,cell-4);context.fillStyle='#35a9ec';context.font='30px "Archivo Black"';context.fillText(item.label??(item.direction==='up'?'↑':'↓'),cx,cy)}
    if(cellIndex>0&&cellIndex%800===0)await yieldToBrowser()
  }
  // Draw the construction grid once, above every cell.  Drawing borders on
  // individual occupied cells makes shared edges appear twice as thick.
  context.strokeStyle=grid;context.lineWidth=.75
  for(let x=0;x<=slice.width;x++){const px=axis+x*cell+.5;context.beginPath();context.moveTo(px,axis);context.lineTo(px,axis+slice.height*cell);context.stroke()}
  for(let y=0;y<=slice.height;y++){const py=axis+y*cell+.5;context.beginPath();context.moveTo(axis,py);context.lineTo(axis+slice.width*cell,py);context.stroke()}
  context.textAlign='left';context.textBaseline='middle';context.fillStyle=foreground;context.font='14px "Archivo Black"';context.fillText(ja?'図の説明':'LEGEND',legendLeft,legendTop+10)
  const allLegend:Array<({kind:'block'}&ExportLegendBlock)|{kind:'repeater'|'placeholder'|'center-placeholder'|'dust'|'source'|'layer-link';name:string}>=[...legendBlocks.map(block=>({kind:'block' as const,...block})),{kind:'repeater',name:repeaterDisplay==='clicks'?(ja?'リピーターの向きとクリック数':'Repeater direction and clicks'):(ja?'リピーターの向きと遅延数':'Repeater direction and delay')},{kind:'placeholder',name:ja?'任意の不透過ブロック':'Any solid opaque block'},...(hasCenterPlaceholder?[{kind:'center-placeholder' as const,name:ja?'任意の不透過ブロック':'Any solid opaque block'}]:[]),{kind:'dust',name:ja?'レッドストーンダスト':'Redstone dust'},...(hasSource?[{kind:'source' as const,name:ja?'スタート':'Start'}]:[]),...(hasLayerLink?[{kind:'layer-link' as const,name:ja?'レイヤー移動':'Layer link'}]:[])]
  const itemWidth=sideWidth-36
  allLegend.forEach((item,index)=>{const column=index%legendColumns,row=Math.floor(index/legendColumns),x=legendLeft+column*itemWidth,y=legendTop+28+row*52,iconX=x+16,iconY=y+16
    if(item.kind==='block'){const image=textures.get(item.texture);if(item.texture==='glass'){context.fillStyle=dark?'#79989b':'#cae6e8';context.fillRect(x,y,32,32)}if(image)context.drawImage(image,x,y,32,32);const copper=copperColors[item.texture];context.strokeStyle=copper??'#000';context.lineWidth=copper?3:2;context.strokeRect(x+1,y+1,30,30);context.textAlign='center';context.font='400 18px "Archivo Black"';context.fillStyle='#fff';context.strokeStyle=copper??'#000';context.lineJoin='round';context.lineWidth=3;context.strokeText(item.label,iconX,iconY);context.fillText(item.label,iconX,iconY)}
    else if(item.kind==='placeholder'||item.kind==='center-placeholder'){context.fillStyle=item.kind==='placeholder'?'#48b9dc':'#d91c83';context.fillRect(x,y,32,32);const image=textures.get(item.kind);if(image)context.drawImage(image,x,y,32,32);context.strokeStyle='#000';context.lineWidth=2;context.strokeRect(x+1,y+1,30,30)}
    else if(item.kind==='dust'){context.fillStyle='#e51d24';context.beginPath();context.arc(iconX,iconY,6,0,Math.PI*2);context.fill()}
    else if(item.kind==='source'){context.fillStyle='#fff';context.fillRect(x,y,32,32);context.fillStyle='#e51d24';context.textAlign='center';context.font='22px "Archivo Black"';context.fillText('S',iconX,iconY)}
    else if(item.kind==='layer-link'){context.strokeStyle='#35a9ec';context.lineWidth=2;context.strokeRect(x,y,32,32);context.fillStyle='#35a9ec';context.textAlign='center';context.font='25px "Archivo Black"';context.fillText('↑',iconX,iconY)}
    else {const clicks=repeaterDisplay==='clicks';context.save();context.translate(iconX,iconY);context.fillStyle=clicks?'#fff':'#ed171c';context.strokeStyle='#080b09';context.lineWidth=2;context.beginPath();context.moveTo(-12,-14);context.lineTo(12,-14);context.lineTo(12,6);context.lineTo(0,14);context.lineTo(-12,6);context.closePath();context.fill();if(clicks)context.stroke();context.fillStyle=clicks?'#ed171c':'#fff';context.textAlign='center';context.font='18px "Archivo Black"';context.fillText(clicks?'0':'1',0,-2);context.restore()}
    context.textAlign='left';context.fillStyle=foreground;context.font='11px "Archivo Black"';context.fillText(item.name,x+40,y+11)
  })
  context.fillStyle=dark?'#c7cec8':'#333';context.font='12px "Archivo Black"';context.textAlign='right';const page= slice.total>1?`  ${slice.index+1} / ${slice.total}`:'';context.fillText(`OTO BLOGIC  Powered by SOTA56${page}`,width-axis,height-footer/2)
  return canvas
}

const canvasBlob=(canvas:HTMLCanvasElement)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNGを作成できませんでした。')),'image/png'))
const releaseCanvas=(canvas:HTMLCanvasElement)=>{canvas.width=1;canvas.height=1}
const downloadBlob=(blob:Blob,filename:string)=>{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.hidden=true;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60_000)}
const report=(options:BlueprintExportOptions|undefined,phase:BlueprintExportProgress['phase'],completed:number,total:number)=>options?.onProgress?.({phase,completed,total})

async function renderSlices(plan:Plan,kind:BlueprintExportKind,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean,repeaterDisplay:RepeaterDisplay,options:BlueprintExportOptions,consume:(canvas:HTMLCanvasElement,slice:Slice)=>Promise<void>){
  const slices=slicesFor(plan,kind)
  for(let index=0;index<slices.length;index++){
    report(options,'rendering',index,slices.length)
    await yieldToBrowser()
    const canvas=await render(plan,theme,legendBlocks,ja,repeaterDisplay,slices[index])
    try{await consume(canvas,slices[index])}finally{releaseCanvas(canvas)}
    report(options,'rendering',index+1,slices.length)
    await yieldToBrowser()
  }
  return slices.length
}

export async function exportBlueprint(plan:Plan,format:'png'|'pdf',title:string,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean,repeaterDisplay:RepeaterDisplay='delay',options:BlueprintExportOptions={}){
  const kind=options.kind??'easy',name=safeName(title),slices=slicesFor(plan,kind)
  report(options,'preparing',0,slices.length)
  await yieldToBrowser()
  if(format==='png'){
    if(slices.length===1){let output:Blob|undefined;await renderSlices(plan,kind,theme,legendBlocks,ja,repeaterDisplay,options,async canvas=>{report(options,'encoding',0,1);output=await canvasBlob(canvas);report(options,'encoding',1,1)});if(!output)throw new Error('PNGを作成できませんでした。');report(options,'downloading',0,1);downloadBlob(output,`${name}-blueprint.png`);report(options,'downloading',1,1);return}
    const {default:JSZip}=await import('jszip'),zip=new JSZip()
    await renderSlices(plan,kind,theme,legendBlocks,ja,repeaterDisplay,options,async(canvas,slice)=>{zip.file(`${name}-part-${String(slice.index+1).padStart(2,'0')}.png`,await canvasBlob(canvas))})
    report(options,'encoding',0,100)
    const blob=await zip.generateAsync({type:'blob'},metadata=>report(options,'encoding',Math.round(metadata.percent),100))
    report(options,'downloading',0,1);downloadBlob(blob,`${name}-blueprint-parts.zip`);report(options,'downloading',1,1);return
  }
  const {jsPDF}=await import('jspdf');let pdf:InstanceType<typeof jsPDF>|undefined
  await renderSlices(plan,kind,theme,legendBlocks,ja,repeaterDisplay,options,async canvas=>{const orientation=canvas.width>=canvas.height?'landscape':'portrait',bytes=new Uint8Array(await(await canvasBlob(canvas)).arrayBuffer());if(!pdf)pdf=new jsPDF({orientation,unit:'px',format:[canvas.width,canvas.height],compress:true});else pdf.addPage([canvas.width,canvas.height],orientation);pdf.addImage(bytes,'PNG',0,0,canvas.width,canvas.height)})
  if(!pdf)throw new Error('PDFを作成できませんでした。')
  report(options,'encoding',0,1);const blob=pdf.output('blob');report(options,'encoding',1,1);report(options,'downloading',0,1);downloadBlob(blob,`${name}-blueprint.pdf`);report(options,'downloading',1,1)
}

export async function saveBlueprintForX(plan:Plan,title:string,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean,repeaterDisplay:RepeaterDisplay='delay'){
  const canvas=await render(plan,theme,legendBlocks,ja,repeaterDisplay),blob=await canvasBlob(canvas),name=`${safeName(title)}-blueprint.png`
  downloadBlob(blob,name)
}

export async function exportBlueprintLayers(plans:BlueprintPlan[],format:'png'|'pdf',title:string,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean,repeaterDisplay:RepeaterDisplay='delay',options:BlueprintExportOptions={}){
  if(plans.length<=1)return exportBlueprint(plans[0],format,title,theme,legendBlocks,ja,repeaterDisplay,{...options,kind:'packed'})
  const name=safeName(title)
  report(options,'preparing',0,plans.length);await yieldToBrowser()
  if(format==='png'){
    const {default:JSZip}=await import('jszip'),zip=new JSZip()
    for(let index=0;index<plans.length;index++){report(options,'rendering',index,plans.length);await yieldToBrowser();const canvas=await render(plans[index],theme,legendBlocks,ja,repeaterDisplay);try{zip.file(`${name}-layer-${String(index+1).padStart(2,'0')}.png`,await canvasBlob(canvas))}finally{releaseCanvas(canvas)}report(options,'rendering',index+1,plans.length)}
    report(options,'encoding',0,100);const blob=await zip.generateAsync({type:'blob'},metadata=>report(options,'encoding',Math.round(metadata.percent),100));report(options,'downloading',0,1);downloadBlob(blob,`${name}-blueprint-layers.zip`);report(options,'downloading',1,1);return
  }
  const {jsPDF}=await import('jspdf');let pdf:InstanceType<typeof jsPDF>|undefined
  for(let index=0;index<plans.length;index++){report(options,'rendering',index,plans.length);await yieldToBrowser();const canvas=await render(plans[index],theme,legendBlocks,ja,repeaterDisplay);try{const orientation=canvas.width>=canvas.height?'landscape':'portrait',bytes=new Uint8Array(await(await canvasBlob(canvas)).arrayBuffer());if(!pdf)pdf=new jsPDF({orientation,unit:'px',format:[canvas.width,canvas.height],compress:true});else pdf.addPage([canvas.width,canvas.height],orientation);pdf.addImage(bytes,'PNG',0,0,canvas.width,canvas.height)}finally{releaseCanvas(canvas)}report(options,'rendering',index+1,plans.length)}
  if(!pdf)throw new Error('PDFを作成できませんでした。')
  report(options,'encoding',0,1);const blob=pdf.output('blob');report(options,'encoding',1,1);report(options,'downloading',0,1);downloadBlob(blob,`${name}-blueprint-layers.pdf`);report(options,'downloading',1,1)
}
