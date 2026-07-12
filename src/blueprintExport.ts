import type { BlueprintCell } from './blueprint'

type Plan={cells:BlueprintCell[];width:number;height:number}
const textureFiles:Record<string,string>={earth:'grass_block_side.png',wood:'oak_planks.png',stone:'cobblestone.png',sand:'sand.png',glass:'glass.png',wool:'pink_wool.png',clay:'clay.png',gold:'gold_block.png',ice:'ice.png',bone:'bone_block_side.png',iron:'iron_block.png',soul:'soul_sand.png',pumpkin:'pumpkin_side.png',emerald:'emerald_block.png',hay:'hay_block_side.png',glow:'glowstone.png',copper:'copper_block.png','copper-exposed':'exposed_copper.png','copper-weathered':'weathered_copper.png','copper-oxidized':'oxidized_copper.png',placeholder:'light_blue_concrete.png'}

const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src})
const safeName=(title:string)=>title.trim().replace(/[\\/:*?"<>|]/g,'_')||'OTO-BLOGIC'

async function render(plan:Plan){
  const cell=40,axis=42,footer=34,width=axis*2+plan.width*cell,height=axis*2+plan.height*cell+footer
  if(width>16384||height>16384||width*height>120_000_000)throw new Error('設計図が大きすぎます。折り返しまでのマス数を調整するか、前後の無音を省いてください。')
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  const context=canvas.getContext('2d');if(!context)throw new Error('画像を作成できませんでした。')
  context.fillStyle='#fff';context.fillRect(0,0,width,height)
  context.strokeStyle='#b8b8b8';context.lineWidth=.75
  for(let x=0;x<=plan.width;x++){const px=axis+x*cell+.5;context.beginPath();context.moveTo(px,axis);context.lineTo(px,axis+plan.height*cell);context.stroke()}
  for(let y=0;y<=plan.height;y++){const py=axis+y*cell+.5;context.beginPath();context.moveTo(axis,py);context.lineTo(axis+plan.width*cell,py);context.stroke()}
  context.fillStyle='#111';context.font='bold 15px sans-serif';context.textAlign='center';context.textBaseline='middle'
  for(let x=0;x<plan.width;x++){const px=axis+x*cell+cell/2;context.fillText(String(x+1),px,axis/2);context.fillText(String(x+1),px,axis+plan.height*cell+axis/2)}
  for(let y=0;y<plan.height;y++){const py=axis+y*cell+cell/2;context.fillText(String(y+1),axis/2,py);context.fillText(String(y+1),axis+plan.width*cell+axis/2,py)}
  const textures=new Map<string,HTMLImageElement>()
  await Promise.all([...new Set(plan.cells.map(item=>item.texture).filter(Boolean) as string[])].map(async key=>{const file=textureFiles[key];if(file)textures.set(key,await loadImage(`/assets/block-textures/${file}`))}))
  for(const item of plan.cells){const x=axis+item.x*cell,y=axis+item.y*cell,cx=x+cell/2,cy=y+cell/2
    if(item.type==='note'||item.type==='rest'){const image=textures.get(item.texture??'placeholder');if(image)context.drawImage(image,x+1,y+1,cell-2,cell-2);context.strokeStyle='#000';context.lineWidth=2;context.strokeRect(x+2,y+2,cell-4,cell-4);if(item.type==='note'){context.fillStyle='#fff';context.font='bold 22px sans-serif';context.lineWidth=4;context.strokeStyle='#000';context.strokeText(item.label??'',cx,cy);context.fillText(item.label??'',cx,cy)}}
    else if(item.type==='source'){context.fillStyle='#fff';context.fillRect(x+1,y+1,cell-2,cell-2);context.fillStyle='#e51d24';context.font='bold 26px sans-serif';context.fillText('S',cx,cy)}
    else if(item.type==='repeater'){context.save();context.translate(cx,cy);if(item.direction==='up')context.rotate(Math.PI);context.fillStyle='#ed171c';context.beginPath();context.moveTo(-15,-16);context.lineTo(15,-16);context.lineTo(15,7);context.lineTo(0,16);context.lineTo(-15,7);context.closePath();context.fill();if(item.direction==='up')context.rotate(-Math.PI);context.fillStyle='#fff';context.font='bold 21px sans-serif';context.fillText(String(item.delay??1),0,item.direction==='up'?6:-6);context.restore()}
    else if(item.type==='dust'){context.strokeStyle='#e51d24';context.fillStyle='#e51d24';context.lineWidth=5;for(const direction of item.connections??[]){context.beginPath();context.moveTo(cx,cy);context.lineTo(cx+(direction==='right'?cell/2:direction==='left'?-cell/2:0),cy+(direction==='down'?cell/2:direction==='up'?-cell/2:0));context.stroke()}context.beginPath();context.arc(cx,cy,6,0,Math.PI*2);context.fill()}
  }
  context.fillStyle='#333';context.font='12px sans-serif';context.textAlign='right';context.fillText('OTO BLOGIC  Powered by SOTA56',width-axis,axis+plan.height*cell+axis+footer/2)
  return canvas
}

export async function exportBlueprint(plan:Plan,format:'png'|'pdf',title:string){
  const canvas=await render(plan),name=safeName(title)
  if(format==='png'){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNGを作成できませんでした。');const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${name}-blueprint.png`;link.click();URL.revokeObjectURL(url);return}
  const {jsPDF}=await import('jspdf');const pdf=new jsPDF({orientation:canvas.width>=canvas.height?'landscape':'portrait',unit:'px',format:[canvas.width,canvas.height],compress:true});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,canvas.width,canvas.height);pdf.save(`${name}-blueprint.pdf`)
}
