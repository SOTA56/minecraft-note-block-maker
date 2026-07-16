import type { BlueprintCell,BlueprintPlan } from './blueprint'
import type {RepeaterDisplay} from './types'

type Plan={cells:BlueprintCell[];width:number;height:number}
export type ExportLegendBlock={texture:string;label:string;name:string}
const textureFiles:Record<string,string>={earth:'grass_block_side.png',wood:'oak_planks.png',stone:'cobblestone.png',sand:'sand.png',glass:'glass.png',wool:'pink_wool.png',clay:'clay.png',gold:'gold_block.png',ice:'ice.png',bone:'bone_block_side.png',iron:'iron_block.png',soul:'soul_sand.png',pumpkin:'pumpkin_side.png',emerald:'emerald_block.png',hay:'hay_block_side.png',glow:'glowstone.png',copper:'copper_block.png','copper-exposed':'exposed_copper.png','copper-weathered':'weathered_copper.png','copper-oxidized':'oxidized_copper.png',placeholder:'light_blue_concrete.png','center-placeholder':'magenta_concrete.png'}
const copperColors:Record<string,string>={copper:'#963247','copper-exposed':'#8a5427','copper-weathered':'#2f6f67','copper-oxidized':'#2946a3'}

const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src})
const safeName=(title:string)=>title.trim().replace(/[\\/:*?"<>|]/g,'_')||'OTO-BLOGIC'

async function render(plan:Plan,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean,repeaterDisplay:RepeaterDisplay){
  const cell=40,axis=42,footer=34,gridWidth=axis*2+plan.width*cell,gridHeight=axis*2+plan.height*cell
  const hasSource=plan.cells.some(item=>item.type==='source'),hasLayerLink=plan.cells.some(item=>item.type==='layer-link'),hasCenterPlaceholder=plan.cells.some(item=>item.type==='rest'&&item.texture==='center-placeholder')
  const legendItems=legendBlocks.length+3+(hasCenterPlaceholder?1:0)+(hasSource?1:0)+(hasLayerLink?1:0),sideWidth=280,sideLegendHeight=28+legendItems*52
  const width=gridWidth+sideWidth,height=Math.max(gridHeight,axis+sideLegendHeight)+footer
  const legendColumns=1,legendTop=axis,legendLeft=gridWidth+18
  if(width>16384||height>16384||width*height>120_000_000)throw new Error('設計図が大きすぎます。折り返しまでのマス数を調整するか、前後の無音を省いてください。')
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  const context=canvas.getContext('2d');if(!context)throw new Error('画像を作成できませんでした。')
  await document.fonts.load('22px "Archivo Black"');await document.fonts.ready
  const dark=theme==='dark',background=dark?'#111713':'#fff',foreground=dark?'#eef2ed':'#111',grid=dark?'rgba(255,255,255,.78)':'#b8b8b8'
  context.fillStyle=background;context.fillRect(0,0,width,height)
  context.strokeStyle=grid;context.lineWidth=.75
  for(let x=0;x<=plan.width;x++){const px=axis+x*cell+.5;context.beginPath();context.moveTo(px,axis);context.lineTo(px,axis+plan.height*cell);context.stroke()}
  for(let y=0;y<=plan.height;y++){const py=axis+y*cell+.5;context.beginPath();context.moveTo(axis,py);context.lineTo(axis+plan.width*cell,py);context.stroke()}
  context.fillStyle=foreground;context.font='15px "Archivo Black"';context.textAlign='center';context.textBaseline='middle'
  for(let x=0;x<plan.width;x++){const px=axis+x*cell+cell/2;context.fillText(String(x+1),px,axis/2);context.fillText(String(x+1),px,axis+plan.height*cell+axis/2)}
  for(let y=0;y<plan.height;y++){const py=axis+y*cell+cell/2;context.fillText(String(y+1),axis/2,py);context.fillText(String(y+1),axis+plan.width*cell+axis/2,py)}
  const textures=new Map<string,HTMLImageElement>()
  await Promise.all([...new Set(plan.cells.map(item=>item.texture).filter(Boolean) as string[])].map(async key=>{const file=textureFiles[key];if(file)textures.set(key,await loadImage(`/assets/block-textures/${file}`))}))
  for(const item of plan.cells){const x=axis+item.x*cell,y=axis+item.y*cell,cx=x+cell/2,cy=y+cell/2
    if(item.type==='note'||item.type==='rest'){const image=textures.get(item.texture??'placeholder');if(item.texture==='glass'){context.fillStyle=dark?'#79989b':'#cae6e8';context.fillRect(x+1,y+1,cell-2,cell-2)}if(image)context.drawImage(image,x+1,y+1,cell-2,cell-2);const copper=item.type==='note'?copperColors[item.texture??'']:undefined;context.strokeStyle=copper??'#000';context.lineWidth=copper?3:2;context.strokeRect(x+2,y+2,cell-4,cell-4);if(item.type==='note'){context.fillStyle='#fff';context.font='22px "Archivo Black"';context.lineWidth=4;context.strokeStyle=copper??'#000';context.strokeText(item.label??'',cx,cy);context.fillText(item.label??'',cx,cy)}}
    else if(item.type==='source'){context.fillStyle='#fff';context.fillRect(x+1,y+1,cell-2,cell-2);context.fillStyle='#e51d24';context.font='26px "Archivo Black"';context.fillText('S',cx,cy)}
    else if(item.type==='repeater'){const clicks=repeaterDisplay==='clicks';context.save();context.translate(cx,cy);const angle=item.direction==='up'?Math.PI:item.direction==='left'?Math.PI/2:item.direction==='right'?-Math.PI/2:0;context.rotate(angle);context.fillStyle=clicks?'#fff':'#ed171c';context.strokeStyle='#080b09';context.lineWidth=2;context.beginPath();context.moveTo(-15,-16);context.lineTo(15,-16);context.lineTo(15,7);context.lineTo(0,16);context.lineTo(-15,7);context.closePath();context.fill();if(clicks)context.stroke();context.rotate(-angle);context.fillStyle=clicks?'#ed171c':'#fff';context.font='21px "Archivo Black"';const textX=item.direction==='left'?3:item.direction==='right'?-3:0,textY=item.direction==='up'?3:item.direction==='down'?-3:0;context.fillText(String(clicks?Math.max(0,(item.delay??1)-1):(item.delay??1)),textX,textY);context.restore()}
    else if(item.type==='dust'){context.strokeStyle='#e51d24';context.fillStyle='#e51d24';context.lineWidth=5;for(const direction of item.connections??[]){context.beginPath();context.moveTo(cx,cy);context.lineTo(cx+(direction==='right'?cell/2:direction==='left'?-cell/2:0),cy+(direction==='down'?cell/2:direction==='up'?-cell/2:0));context.stroke()}context.beginPath();context.arc(cx,cy,6,0,Math.PI*2);context.fill()}
    else if(item.type==='layer-link'){context.strokeStyle='#35a9ec';context.lineWidth=2;context.strokeRect(x+2,y+2,cell-4,cell-4);context.fillStyle='#35a9ec';context.font='30px "Archivo Black"';context.fillText(item.label??(item.direction==='up'?'↑':'↓'),cx,cy)}
  }
  context.textAlign='left';context.textBaseline='middle';context.fillStyle=foreground;context.font='14px "Archivo Black"';context.fillText(ja?'図の説明':'LEGEND',legendLeft,legendTop+10)
  const allLegend:Array<({kind:'block'}&ExportLegendBlock)|{kind:'repeater'|'placeholder'|'center-placeholder'|'dust'|'source'|'layer-link';name:string}>=[...legendBlocks.map(block=>({kind:'block' as const,...block})),{kind:'repeater',name:repeaterDisplay==='clicks'?(ja?'リピーターの向きとクリック数':'Repeater direction and clicks'):(ja?'リピーターの向きと遅延数':'Repeater direction and delay')},{kind:'placeholder',name:ja?'任意の不透過ブロック':'Any solid opaque block'},...(hasCenterPlaceholder?[{kind:'center-placeholder' as const,name:ja?'任意の不透過ブロック':'Any solid opaque block'}]:[]),{kind:'dust',name:ja?'レッドストーンダスト':'Redstone dust'},...(hasSource?[{kind:'source' as const,name:ja?'スタート':'Start'}]:[]),...(hasLayerLink?[{kind:'layer-link' as const,name:ja?'レイヤー移動':'Layer link'}]:[])]
  const itemWidth=sideWidth-36
  allLegend.forEach((item,index)=>{const column=index%legendColumns,row=Math.floor(index/legendColumns),x=legendLeft+column*itemWidth,y=legendTop+28+row*52,iconX=x+16,iconY=y+16
    if(item.kind==='block'){const image=textures.get(item.texture);if(item.texture==='glass'){context.fillStyle=dark?'#79989b':'#cae6e8';context.fillRect(x,y,32,32)}if(image)context.drawImage(image,x,y,32,32);const copper=copperColors[item.texture];context.strokeStyle=copper??'#000';context.lineWidth=copper?3:2;context.strokeRect(x+1,y+1,30,30);context.textAlign='center';context.font='18px "Archivo Black"';context.fillStyle='#fff';context.strokeStyle=copper??'#000';context.lineWidth=4;context.strokeText(item.label,iconX,iconY);context.fillText(item.label,iconX,iconY)}
    else if(item.kind==='placeholder'||item.kind==='center-placeholder'){context.fillStyle=item.kind==='placeholder'?'#48b9dc':'#d91c83';context.fillRect(x,y,32,32);const image=textures.get(item.kind);if(image)context.drawImage(image,x,y,32,32);context.strokeStyle='#000';context.lineWidth=2;context.strokeRect(x+1,y+1,30,30)}
    else if(item.kind==='dust'){context.fillStyle='#e51d24';context.beginPath();context.arc(iconX,iconY,6,0,Math.PI*2);context.fill()}
    else if(item.kind==='source'){context.fillStyle='#fff';context.fillRect(x,y,32,32);context.fillStyle='#e51d24';context.textAlign='center';context.font='22px "Archivo Black"';context.fillText('S',iconX,iconY)}
    else if(item.kind==='layer-link'){context.strokeStyle='#35a9ec';context.lineWidth=2;context.strokeRect(x,y,32,32);context.fillStyle='#35a9ec';context.textAlign='center';context.font='25px "Archivo Black"';context.fillText('↑',iconX,iconY)}
    else {const clicks=repeaterDisplay==='clicks';context.save();context.translate(iconX,iconY);context.fillStyle=clicks?'#fff':'#ed171c';context.strokeStyle='#080b09';context.lineWidth=2;context.beginPath();context.moveTo(-12,-14);context.lineTo(12,-14);context.lineTo(12,6);context.lineTo(0,14);context.lineTo(-12,6);context.closePath();context.fill();if(clicks)context.stroke();context.fillStyle=clicks?'#ed171c':'#fff';context.textAlign='center';context.font='18px "Archivo Black"';context.fillText(clicks?'0':'1',0,-2);context.restore()}
    context.textAlign='left';context.fillStyle=foreground;context.font='11px "Archivo Black"';context.fillText(item.name,x+40,y+11)
  })
  context.fillStyle=dark?'#c7cec8':'#333';context.font='12px "Archivo Black"';context.textAlign='right';context.fillText('OTO BLOGIC  Powered by SOTA56',width-axis,height-footer/2)
  return canvas
}

const canvasBlob=(canvas:HTMLCanvasElement)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNGを作成できませんでした。')),'image/png'))

export async function exportBlueprint(plan:Plan,format:'png'|'pdf',title:string,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean,repeaterDisplay:RepeaterDisplay='delay'){
  const canvas=await render(plan,theme,legendBlocks,ja,repeaterDisplay),name=safeName(title)
  if(format==='png'){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNGを作成できませんでした。');const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${name}-blueprint.png`;link.click();URL.revokeObjectURL(url);return}
  const {jsPDF}=await import('jspdf');const pdf=new jsPDF({orientation:canvas.width>=canvas.height?'landscape':'portrait',unit:'px',format:[canvas.width,canvas.height],compress:true});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,canvas.width,canvas.height);pdf.save(`${name}-blueprint.pdf`)
}

export async function shareBlueprintToX(plan:Plan,title:string,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean,text:string,repeaterDisplay:RepeaterDisplay='delay'){
  const supportsFileShare='share' in navigator&&typeof navigator.canShare==='function'&&navigator.canShare({files:[new File([''],'oto-blogic.png',{type:'image/png'})]}),popup=supportsFileShare?null:window.open('about:blank','_blank')
  if(popup)popup.opener=null
  const canvas=await render(plan,theme,legendBlocks,ja,repeaterDisplay),blob=await canvasBlob(canvas),name=`${safeName(title)}-blueprint.png`,file=new File([blob],name,{type:'image/png'})
  if(supportsFileShare){
    try{await navigator.share({files:[file],text});return}catch(error){if(error instanceof DOMException&&error.name==='AbortError')return}
  }
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)
  const intent=`https://x.com/intent/post?text=${encodeURIComponent(text)}`;if(popup)popup.location.href=intent;else window.open(intent,'_blank','noopener,noreferrer')
}

export async function exportBlueprintLayers(plans:BlueprintPlan[],format:'png'|'pdf',title:string,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean,repeaterDisplay:RepeaterDisplay='delay'){
  if(plans.length<=1)return exportBlueprint(plans[0],format,title,theme,legendBlocks,ja,repeaterDisplay)
  const canvases=[] as HTMLCanvasElement[]
  for(const plan of plans)canvases.push(await render(plan,theme,legendBlocks,ja,repeaterDisplay))
  const name=safeName(title)
  if(format==='png'){
    const {default:JSZip}=await import('jszip'),zip=new JSZip()
    for(let index=0;index<canvases.length;index++)zip.file(`${name}-layer-${String(index+1).padStart(2,'0')}.png`,await canvasBlob(canvases[index]))
    const blob=await zip.generateAsync({type:'blob'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${name}-blueprint-layers.zip`;link.click();URL.revokeObjectURL(url);return
  }
  const {jsPDF}=await import('jspdf'),first=canvases[0],pdf=new jsPDF({orientation:first.width>=first.height?'landscape':'portrait',unit:'px',format:[first.width,first.height],compress:true})
  canvases.forEach((canvas,index)=>{if(index)pdf.addPage([canvas.width,canvas.height],canvas.width>=canvas.height?'landscape':'portrait');pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,canvas.width,canvas.height)})
  pdf.save(`${name}-blueprint-layers.pdf`)
}
