import type { Note, Project, Track } from './types'

let context: AudioContext | null = null
let stopAt = 0
const buffers = new Map<string, AudioBuffer>()
const loading = new Map<string, Promise<AudioBuffer>>()
const playbackSources = new Set<AudioBufferSourceNode>()
const playbackTimers = new Set<number>()

const SOUND_FILES: Record<string, string> = {
  Harp: 'harp', Bass: 'bass', 'Bass Drum': 'bd', Snare: 'snare', Hat: 'hat', Guitar: 'guitar',
  Flute: 'flute', Bell: 'bell', Chime: 'icechime', Xylophone: 'xylobone', 'Iron Xylophone': 'iron_xylophone',
  'Cow Bell': 'cow_bell', Didgeridoo: 'didgeridoo', Bit: 'bit', Banjo: 'banjo', Pling: 'pling',
  Trumpet: 'trumpet', 'Trumpet Exposed': 'trumpet_exposed', 'Trumpet Weathered': 'trumpet_weathered',
  'Trumpet Oxidized': 'trumpet_oxidized',
}

const getContext = async () => {
  context ??= new AudioContext({ latencyHint: 'interactive' })
  if (context.state !== 'running') await context.resume()
  return context
}

const loadBuffer = async (ctx: AudioContext, instrument: string) => {
  const cached = buffers.get(instrument)
  if (cached) return cached
  const pending = loading.get(instrument)
  if (pending) return pending
  const file = SOUND_FILES[instrument] ?? SOUND_FILES.Harp
  const request = fetch(`/assets/note-block-sounds/${file}.mp3`)
    .then(response => { if (!response.ok) throw new Error(`Sound load failed: ${file}`); return response.arrayBuffer() })
    .then(data => ctx.decodeAudioData(data))
    .then(buffer => { buffers.set(instrument, buffer); loading.delete(instrument); return buffer })
  loading.set(instrument, request)
  return request
}

const playTone = (ctx: AudioContext, buffer: AudioBuffer, pitch: number, at: number, volume: number, pan = 0, playback = false) => {
  const source = ctx.createBufferSource()
  const gain = ctx.createGain()
  const panner = ctx.createStereoPanner()
  source.buffer = buffer
  source.playbackRate.value = 2 ** ((pitch - 12) / 12)
  gain.gain.value = volume
  panner.pan.value = pan
  source.connect(gain).connect(panner).connect(ctx.destination)
  if (playback) {
    playbackSources.add(source)
    source.addEventListener('ended', () => playbackSources.delete(source), { once: true })
  }
  source.start(at)
}

export async function previewTone(pitch: number, volume: number, instrument: string, pan=0) {
  const ctx = await getContext()
  const buffer = await loadBuffer(ctx, instrument)
  playTone(ctx, buffer, pitch, ctx.currentTime + 0.008, volume, pan)
}

const schedulePlaybackTimer = (callback: () => void, delay: number) => {
  const timer = window.setTimeout(() => {
    playbackTimers.delete(timer)
    callback()
  }, delay)
  playbackTimers.add(timer)
}

export async function playProject(project: Project, fromStep = 0, onStep?: (step: number) => void, options?:{usePan?:boolean;toStep?:number;noteMix?:(track:Track,note:Note)=>{volume:number;pan:number}}) {
  const token = ++stopAt
  const ctx = await getContext()
  if (stopAt !== token) return
  const audible = project.tracks.filter(track => !track.muted && (!project.tracks.some(item => item.solo) || track.solo))
  const loaded = new Map(await Promise.all([...new Set(audible.map(track => track.instrument))].map(async instrument => [instrument, await loadBuffer(ctx, instrument)] as const)))
  if (stopAt !== token) return
  const firstStep = Math.max(0, Math.min(project.steps - 1, Math.round(fromStep)))
  const lastStep = Math.max(firstStep, Math.min(project.steps - 1, Math.round(options?.toStep ?? project.steps - 1)))
  const stepSeconds = 2 / project.tickRate
  const start = ctx.currentTime + 0.08
  audible.forEach(track => track.notes.filter(note => note.step >= firstStep && note.step <= lastStep).forEach(note => {
    const mix=options?.noteMix?.(track,note)
    playTone(ctx, loaded.get(track.instrument)!, note.pitch, start + (note.step - firstStep) * stepSeconds, mix?.volume??track.volume, mix?.pan??(options?.usePan===false?0:track.pan??0), true)
  }))
  for (let step = firstStep; step <= lastStep; step += 1) {
    schedulePlaybackTimer(() => { if (stopAt === token) onStep?.(step) }, 80 + (step - firstStep) * stepSeconds * 1000)
  }
  schedulePlaybackTimer(() => { if (stopAt === token) onStep?.(-1) }, 90 + (lastStep - firstStep + 1) * stepSeconds * 1000)
}

export function stopPlayback() {
  stopAt += 1
  playbackTimers.forEach(timer => window.clearTimeout(timer))
  playbackTimers.clear()
  playbackSources.forEach(source => {
    try { source.stop(0) } catch { /* Already ended or stopped. */ }
    try { source.disconnect() } catch { /* Already disconnected. */ }
  })
  playbackSources.clear()
}
