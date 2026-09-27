import type {AudioEdition,Project} from './types'
import {BEDROCK_PLAYBACK_RATIO,MASTER_PLAYBACK_GAIN,noteSoundPath} from './audio'
import {createFishboneDistanceTable,FISHBONE_AUDIBLE_DISTANCE} from './fishboneAudio'
import {generateFishboneBlueprint,type BlueprintInstrument,type FishboneResult} from './blueprint'

export type Mp3Mode='editor'|'fishbone'
export type Mp3Progress={phase:'loading'|'analyzing'|'encoding';percent:number}
type Mix={volume:number;pan:number}
type SoundEvent={at:number;duration:number;pitch:number;buffer:AudioBuffer;mix:Mix}

export function fishboneNoteMixes(result:FishboneResult,height:number){
  const sourceX=result.plan.cells.find(cell=>cell.type==='source')?.x??0
  const table=createFishboneDistanceTable(height)
  const mixes=new Map<string,Mix>()
  result.plan.cells.forEach(cell=>{
    if(cell.type!=='note'||cell.trackId===undefined||cell.step===undefined||cell.label===undefined)return
    const offset=cell.x-sourceX
    const distance=Math.min(FISHBONE_AUDIBLE_DISTANCE,Math.abs(offset))
    const mix=table[distance]
    mixes.set(`${cell.trackId}:${cell.step}:${cell.label}`,{volume:mix.gain,pan:Math.sign(offset)*mix.pan})
  })
  return mixes
}

const sampleRate=44100
const chunkSeconds=15
const targetPeak=10**(-1/20)
export const peakNormalizationGain=(peak:number)=>peak>0?targetPeak/peak:1

const renderChunk=async(events:SoundEvent[],channels:1|2,start:number,seconds:number,edition:AudioEdition)=>{
  // Render a little before each boundary so the playback compressor keeps its
  // attack/release state across chunks without storing the entire song in RAM.
  const preRoll=Math.min(.5,start)
  const renderStart=start-preRoll
  const frames=Math.max(1,Math.ceil(seconds*sampleRate))
  const preRollFrames=Math.round(preRoll*sampleRate)
  const ctx=new OfflineAudioContext(channels,frames+preRollFrames,sampleRate)
  const master=ctx.createGain()
  master.gain.value=MASTER_PLAYBACK_GAIN*(edition==='bedrock'?BEDROCK_PLAYBACK_RATIO:1)
  const compressor=ctx.createDynamicsCompressor()
  compressor.threshold.value=-12
  compressor.knee.value=18
  compressor.ratio.value=3
  compressor.attack.value=.003
  compressor.release.value=.15
  master.connect(compressor).connect(ctx.destination)
  for(const note of events){
    if(note.at>=start+seconds||note.at+note.duration<=renderStart)continue
    const source=ctx.createBufferSource()
    source.buffer=note.buffer
    const rate=2**((note.pitch-12)/12)
    source.playbackRate.value=rate
    let output:AudioNode=source
    if(note.mix.volume!==1){const volume=ctx.createGain();volume.gain.value=note.mix.volume;output.connect(volume);output=volume}
    if(channels===2&&note.mix.pan!==0){const pan=ctx.createStereoPanner();pan.pan.value=note.mix.pan;output.connect(pan);output=pan}
    output.connect(master)
    const local=note.at-renderStart
    source.start(Math.max(0,local),Math.max(0,-local)*rate)
  }
  const rendered=await ctx.startRendering()
  return Array.from({length:channels},(_,channel)=>rendered.getChannelData(channel).slice(preRollFrames,preRollFrames+frames))
}

const waitForWorker=(worker:Worker,message:unknown,transfer:Transferable[]=[]):Promise<{type:string;file?:Blob;message?:string}>=>new Promise((resolve,reject)=>{
  const onMessage=(event:MessageEvent)=>{
    cleanup()
    const result=event.data as {type:string;file?:Blob;message?:string}
    if(result.type==='error')reject(new Error(result.message??'MP3 encoding failed'))
    else resolve(result)
  }
  const onError=(event:ErrorEvent)=>{cleanup();reject(new Error(event.message||'MP3 worker failed'))}
  const cleanup=()=>{worker.removeEventListener('message',onMessage);worker.removeEventListener('error',onError)}
  worker.addEventListener('message',onMessage)
  worker.addEventListener('error',onError)
  worker.postMessage(message,transfer)
})

export async function createMp3(project:Project,instruments:readonly BlueprintInstrument[],mode:Mp3Mode,onProgress:(progress:Mp3Progress)=>void):Promise<Blob>{
  if(typeof OfflineAudioContext==='undefined'||typeof Worker==='undefined')throw new Error('This browser does not support local MP3 export')
  const audible=project.tracks.filter(track=>!track.muted&&(!project.tracks.some(item=>item.solo)||track.solo))
  const notes=audible.flatMap(track=>track.notes.filter(note=>note.step>=0&&note.step<project.steps).map(note=>({track,note})))
  if(!notes.length)throw new Error('No audible notes to export')
  onProgress({phase:'loading',percent:0})
  const edition:AudioEdition=project.edition==='bedrock'?'bedrock':'java'
  const decoder=new OfflineAudioContext(1,1,sampleRate)
  const buffers=new Map(await Promise.all([...new Set(audible.map(track=>track.instrument))].map(async instrument=>{
    const response=await fetch(noteSoundPath(instrument,edition))
    if(!response.ok)throw new Error(`Sound load failed: ${instrument}`)
    return [instrument,await decoder.decodeAudioData(await response.arrayBuffer())] as const
  })))
  let mixes:Map<string,Mix>|undefined
  if(mode==='fishbone'){
    const settings=project.blueprint
    const result=generateFishboneBlueprint(project,instruments,settings?.fishboneMode??'auto',settings?.fishboneManual??{},settings?.fishbonePackColumns===true)
    if(result.remainingNotes)throw new Error('Fishbone lane assignment is incomplete')
    mixes=fishboneNoteMixes(result,settings?.fishbonePlayerHeight??5)
  }
  const stepSeconds=2/project.tickRate
  const events:SoundEvent[]=notes.map(({track,note})=>{
    const buffer=buffers.get(track.instrument)!
    const rate=2**((note.pitch-12)/12)
    return {at:note.step*stepSeconds,duration:buffer.duration/rate,pitch:note.pitch,buffer,mix:mode==='editor'?{volume:track.volume,pan:track.pan??0}:mixes?.get(`${track.id}:${note.step}:${note.pitch}`)??{volume:1,pan:0}}
  })
  const duration=events.reduce((end,note)=>Math.max(end,note.at+note.duration+.1),project.steps*stepSeconds)
  const channels:1|2=2
  const chunks=Math.ceil(duration/chunkSeconds)
  let peak=0
  for(let index=0;index<chunks;index++){
    const start=index*chunkSeconds
    const rendered=await renderChunk(events,channels,start,Math.min(chunkSeconds,duration-start),edition)
    for(let channel=0;channel<channels;channel++){
      const data=rendered[channel]
      for(let sample=0;sample<data.length;sample++)peak=Math.max(peak,Math.abs(data[sample]))
    }
    onProgress({phase:'analyzing',percent:Math.round((index+1)/chunks*48)})
  }
  const worker=new Worker(new URL('./mp3Worker.ts',import.meta.url),{type:'module'})
  try{
    await waitForWorker(worker,{type:'init',channels,sampleRate,gain:peakNormalizationGain(peak)})
    for(let index=0;index<chunks;index++){
      const start=index*chunkSeconds
      const samples=await renderChunk(events,channels,start,Math.min(chunkSeconds,duration-start),edition)
      await waitForWorker(worker,{type:'chunk',samples},samples.map(channel=>channel.buffer))
      onProgress({phase:'encoding',percent:48+Math.round((index+1)/chunks*51)})
    }
    const answer=await waitForWorker(worker,{type:'finish'})
    if(!answer.file)throw new Error('MP3 encoding failed')
    onProgress({phase:'encoding',percent:100})
    return answer.file
  }finally{worker.terminate()}
}

export function downloadMp3(file:Blob,title:string,mode:Mp3Mode){
  const safe=title.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim()||'OTO BLOGIC'
  const url=URL.createObjectURL(file)
  const link=document.createElement('a')
  link.href=url
  link.download=`${safe}${mode==='fishbone'?' - FISHBONE':''}.mp3`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url),60_000)
}
