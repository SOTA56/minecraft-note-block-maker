import type {BlueprintCell} from './blueprint'

export type BoardBounds={left:number;right:number;top:number;bottom:number}
const bucketSize=16
export function indexBlueprintCells(cells:BlueprintCell[]){
  const buckets=new Map<string,number[]>()
  cells.forEach((cell,index)=>{
    const key=`${Math.floor(cell.x/bucketSize)}:${Math.floor(cell.y/bucketSize)}`
    const bucket=buckets.get(key)
    if(bucket)bucket.push(index);else buckets.set(key,[index])
  })
  return buckets
}
export function bufferedBoardBounds(width:number,height:number,x:number,y:number,visibleWidth:number,visibleHeight:number):BoardBounds{
  const padX=Math.max(16,visibleWidth*2),padY=Math.max(16,visibleHeight*2)
  return {
    left:Math.max(0,Math.floor((x-padX)/bucketSize)*bucketSize),
    right:Math.min(width,Math.ceil((x+visibleWidth+padX)/bucketSize)*bucketSize),
    top:Math.max(0,Math.floor((y-padY)/bucketSize)*bucketSize),
    bottom:Math.min(height,Math.ceil((y+visibleHeight+padY)/bucketSize)*bucketSize),
  }
}
export function visibleBlueprintIndices(buckets:Map<string,number[]>,bounds:BoardBounds){
  const indices:number[]=[]
  for(let y=Math.floor(bounds.top/bucketSize);y<Math.ceil(bounds.bottom/bucketSize);y++)
    for(let x=Math.floor(bounds.left/bucketSize);x<Math.ceil(bounds.right/bucketSize);x++){
      const bucket=buckets.get(`${x}:${y}`)
      if(bucket)indices.push(...bucket)
    }
  // Retain source order for overlapping elements and the data-cell contract.
  return indices.sort((a,b)=>a-b)
}
