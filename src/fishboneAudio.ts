export type FishboneDistanceMix={gain:number;pan:number;db:number}

export const FISHBONE_AUDIBLE_DISTANCE=48

export function createFishboneDistanceTable(playerHeight:number):FishboneDistanceMix[]{
  const height=Math.max(0,Math.min(FISHBONE_AUDIBLE_DISTANCE,Math.round(playerHeight)))
  return Array.from({length:FISHBONE_AUDIBLE_DISTANCE+1},(_,horizontalDistance)=>{
    const distance=Math.hypot(horizontalDistance,height)
    const gain=Math.max(0,1-distance/FISHBONE_AUDIBLE_DISTANCE)
    return {gain,pan:distance===0?0:Math.min(1,horizontalDistance/distance),db:gain===0?Number.NEGATIVE_INFINITY:20*Math.log10(gain)}
  })
}

