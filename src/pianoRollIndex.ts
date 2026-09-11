import type {Track} from './types'

export type RollStepNotes = {ownMask:number; ghosts:Map<number,string>; polyphony:number}

// Build once when notes/track visibility change, rather than scanning every
// track's full note list for every empty cell on every playback update.
export function createRollIndex(tracks:Track[],activeId:string,showGhosts:boolean) {
  const index=new Map<number,RollStepNotes>()
  for(const track of tracks)for(const note of track.notes){
    let row=index.get(note.step)
    if(!row){row={ownMask:0,ghosts:new Map(),polyphony:0};index.set(note.step,row)}
    row.polyphony++
    if(track.id===activeId)row.ownMask|=1<<note.pitch
    else if(showGhosts&&track.ghostEnabled!==false&&!row.ghosts.has(note.pitch))row.ghosts.set(note.pitch,track.color)
  }
  return index
}

export type RollWindow={start:number;end:number}

// Keep two screens ready on either side, rounded to chunks to avoid updating
// React for each scroll pixel. The native scroll handler refills this buffer
// synchronously, including scrollbar jumps and fast Magic Mouse gestures.
export function rollWindow(total:number,cellSize:number,offset:number,viewportSize:number):RollWindow {
  const screen=Math.max(1,Math.ceil(viewportSize/cellSize))
  const buffer=Math.max(32,screen*2)
  const first=Math.max(0,Math.floor(offset/cellSize))
  return {
    start:Math.min(total,Math.max(0,Math.floor((first-buffer)/16)*16)),
    end:Math.min(total,Math.ceil((first+screen+buffer)/16)*16),
  }
}
