import type { BlueprintCell } from './blueprint'

type Plan={cells:BlueprintCell[];width:number;height:number}
export type ExportLegendBlock={texture:string;label:string;name:string}
const textureFiles:Record<string,string>={earth:'grass_block_side.png',wood:'oak_planks.png',stone:'cobblestone.png',sand:'sand.png',glass:'glass.png',wool:'pink_wool.png',clay:'clay.png',gold:'gold_block.png',ice:'ice.png',bone:'bone_block_side.png',iron:'iron_block.png',soul:'soul_sand.png',pumpkin:'pumpkin_side.png',emerald:'emerald_block.png',hay:'hay_block_side.png',glow:'glowstone.png',copper:'copper_block.png','copper-exposed':'exposed_copper.png','copper-weathered':'weathered_copper.png','copper-oxidized':'oxidized_copper.png',placeholder:'light_blue_concrete.png'}
const copperColors:Record<string,string>={copper:'#963247','copper-exposed':'#8a5427','copper-weathered':'#2f6f67','copper-oxidized':'#2946a3'}

const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src})
const safeName=(title:string)=>title.trim().replace(/[\\/:*?"<>|]/g,'_')||'OTO-BLOGIC'

async function render(plan:Plan,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean){
  const cell=40,axis=42,footer=34,width=axis*2+plan.width*cell
  const legendItems=legendBlocks.length+4,legendColumns=Math.max(1,Math.floor((width-axis*2)/210)),legendRows=Math.ceil(legendItems/legendColumns),legendHeight=28+legendRows*52
  const height=axis*2+plan.height*cell+legendHeight+footer
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
    else if(item.type==='repeater'){context.save();context.translate(cx,cy);if(item.direction==='up')context.rotate(Math.PI);context.fillStyle='#ed171c';context.beginPath();context.moveTo(-15,-16);context.lineTo(15,-16);context.lineTo(15,7);context.lineTo(0,16);context.lineTo(-15,7);context.closePath();context.fill();if(item.direction==='up')context.rotate(-Math.PI);context.fillStyle='#fff';context.font='21px "Archivo Black"';context.fillText(String(item.delay??1),0,item.direction==='up'?3:-3);context.restore()}
    else if(item.type==='dust'){context.strokeStyle='#e51d24';context.fillStyle='#e51d24';context.lineWidth=5;for(const direction of item.connections??[]){context.beginPath();context.moveTo(cx,cy);context.lineTo(cx+(direction==='right'?cell/2:direction==='left'?-cell/2:0),cy+(direction==='down'?cell/2:direction==='up'?-cell/2:0));context.stroke()}context.beginPath();context.arc(cx,cy,6,0,Math.PI*2);context.fill()}
  }
  const legendTop=axis+plan.height*cell+axis
  context.textAlign='left';context.textBaseline='middle';context.fillStyle=foreground;context.font='14px "Archivo Black"';context.fillText(ja?'図の説明':'LEGEND',axis,legendTop+10)
  const allLegend:Array<({kind:'block'}&ExportLegendBlock)|{kind:'repeater'|'placeholder'|'dust'|'source';name:string}>=[...legendBlocks.map(block=>({kind:'block' as const,...block})),{kind:'repeater',name:ja?'リピーターの向きと遅延数':'Repeater direction and delay'},{kind:'placeholder',name:ja?'仮ブロック：任意の不透過ブロック':'Placeholder: any solid opaque block'},{kind:'dust',name:ja?'レッドストーンダスト':'Redstone dust'},{kind:'source',name:ja?'スタート':'Start'}]
  const itemWidth=(width-axis*2)/legendColumns
  allLegend.forEach((item,index)=>{const column=index%legendColumns,row=Math.floor(index/legendColumns),x=axis+column*itemWidth,y=legendTop+28+row*52,iconX=x+16,iconY=y+16
    if(item.kind==='block'){const image=textures.get(item.texture);if(item.texture==='glass'){context.fillStyle=dark?'#79989b':'#cae6e8';context.fillRect(x,y,32,32)}if(image)context.drawImage(image,x,y,32,32);const copper=copperColors[item.texture];context.strokeStyle=copper??'#000';context.lineWidth=copper?3:2;context.strokeRect(x+1,y+1,30,30);context.textAlign='center';context.font='18px "Archivo Black"';context.fillStyle='#fff';context.strokeStyle=copper??'#000';context.lineWidth=4;context.strokeText(item.label,iconX,iconY);context.fillText(item.label,iconX,iconY)}
    else if(item.kind==='placeholder'){context.fillStyle='#48b9dc';context.fillRect(x,y,32,32);context.strokeStyle='#000';context.lineWidth=2;context.strokeRect(x+1,y+1,30,30)}
    else if(item.kind==='dust'){context.fillStyle='#e51d24';context.beginPath();context.arc(iconX,iconY,6,0,Math.PI*2);context.fill()}
    else if(item.kind==='source'){context.fillStyle='#fff';context.fillRect(x,y,32,32);context.fillStyle='#e51d24';context.textAlign='center';context.font='22px "Archivo Black"';context.fillText('S',iconX,iconY)}
    else {context.save();context.translate(iconX,iconY);context.fillStyle='#ed171c';context.beginPath();context.moveTo(-12,-14);context.lineTo(12,-14);context.lineTo(12,6);context.lineTo(0,14);context.lineTo(-12,6);context.closePath();context.fill();context.fillStyle='#fff';context.textAlign='center';context.font='18px "Archivo Black"';context.fillText('1',0,-2);context.restore()}
    context.textAlign='left';context.fillStyle=foreground;context.font='11px "Archivo Black"';context.fillText(item.name,x+40,y+11)
    if(item.kind==='repeater'){context.fillStyle=dark?'#818b83':'#555';context.font='9px "Archivo Black"';context.fillText(ja?'クリック数 0→1、1→2、2→3、3→4':'Clicks 0→1, 1→2, 2→3, 3→4',x+40,y+27)}
  })
  context.fillStyle=dark?'#c7cec8':'#333';context.font='12px "Archivo Black"';context.textAlign='right';context.fillText('OTO BLOGIC  Powered by SOTA56',width-axis,height-footer/2)
  return canvas
}

export async function exportBlueprint(plan:Plan,format:'png'|'pdf',title:string,theme:'dark'|'light',legendBlocks:ExportLegendBlock[],ja:boolean){
  const canvas=await render(plan,theme,legendBlocks,ja),name=safeName(title)
  if(format==='png'){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNGを作成できませんでした。');const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${name}-blueprint.png`;link.click();URL.revokeObjectURL(url);return}
  const {jsPDF}=await import('jspdf');const pdf=new jsPDF({orientation:canvas.width>=canvas.height?'landscape':'portrait',unit:'px',format:[canvas.width,canvas.height],compress:true});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,canvas.width,canvas.height);pdf.save(`${name}-blueprint.pdf`)
}
