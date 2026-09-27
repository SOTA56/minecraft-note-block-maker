import {Mp3Encoder} from '@breezystack/lamejs'

type Request =
  | {type:'init'; channels:1|2; sampleRate:number; gain:number}
  | {type:'chunk'; samples:Float32Array[]}
  | {type:'finish'}

let encoder:Mp3Encoder|undefined
let channels:1|2=1
let gain=1
let pending:Float32Array[]=[]
let encoded:Uint8Array[]=[]
const frameSize=1152

const encode=(length:number)=>{
  if(!encoder)return
  const pcm=pending.map(data=>{
    const result=new Int16Array(length)
    for(let index=0;index<length;index++)result[index]=Math.round(Math.max(-1,Math.min(1,data[index]*gain))*32767)
    return result
  })
  const bytes=encoder.encodeBuffer(pcm[0],channels===2?pcm[1]:undefined)
  if(bytes.length)encoded.push(new Uint8Array(bytes))
  pending=pending.map(data=>data.slice(length))
}

self.onmessage=(event:MessageEvent<Request>)=>{
  try{
    const message=event.data
    if(message.type==='init'){
      channels=message.channels
      gain=message.gain
      encoder=new Mp3Encoder(channels,message.sampleRate,channels===1?192:256)
      pending=Array.from({length:channels},()=>new Float32Array(0))
      encoded=[]
      self.postMessage({type:'ready'})
    }else if(message.type==='chunk'){
      if(!encoder||message.samples.length!==channels)throw new Error('Invalid MP3 chunk')
      pending=pending.map((old,index)=>{
        const next=new Float32Array(old.length+message.samples[index].length)
        next.set(old)
        next.set(message.samples[index],old.length)
        return next
      })
      while(pending[0].length>=frameSize)encode(frameSize)
      self.postMessage({type:'ready'})
    }else{
      if(!encoder)throw new Error('MP3 encoder is not ready')
      if(pending[0].length)encode(pending[0].length)
      const tail=encoder.flush()
      if(tail.length)encoded.push(new Uint8Array(tail))
      const file=new Blob(encoded.map(bytes=>bytes.slice().buffer as ArrayBuffer),{type:'audio/mpeg'})
      self.postMessage({type:'done',file})
      encoder=undefined
      encoded=[]
      pending=[]
    }
  }catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:String(error)})}
}
