import type { AudioEdition, Note, Project, Track } from './types'

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

const createContext = () => new AudioContext({ latencyHint: 'interactive' })

const clearAudioCache = () => {
  buffers.clear()
  loading.clear()
}

const resumeExistingContext = () => {
  const active = context
  if (!active || active.state === 'running' || active.state === 'closed') return
  // Safari can interrupt Web Audio after the tab, browser, or audio device loses focus.
  // A later user gesture still performs the guaranteed recovery path in getContext().
  void active.resume().catch(() => undefined)
}

const getContext = async () => {
  if (!context || context.state === 'closed') {
    context = createContext()
    clearAudioCache()
  }
  let active = context
  if (active.state !== 'running') {
    try { await active.resume() } catch { /* Recover with a fresh context below. */ }
  }
  if (active.state !== 'running') {
    try { await active.close() } catch { /* Safari may already have discarded it. */ }
    if (context === active) {
      context = createContext()
      clearAudioCache()
    }
    active = context
    try { await active.resume() } catch { /* The next direct user gesture can try again. */ }
  }
  return active
}

if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', resumeExistingContext)
  window.addEventListener('focus', resumeExistingContext)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resumeExistingContext()
  })
}

const projectEdition = (edition:Project['edition']):AudioEdition => edition === 'bedrock' ? 'bedrock' : 'java'

const loadBuffer = async (ctx: AudioContext, instrument: string, edition:AudioEdition) => {
  const cacheKey = `${edition}:${instrument}`
  const cached = buffers.get(cacheKey)
  if (cached) return cached
  const pending = loading.get(cacheKey)
  if (pending) return pending
  const file = SOUND_FILES[instrument] ?? SOUND_FILES.Harp
  const path = edition === 'bedrock'
    ? `/assets/note-block-sounds-bedrock/${file}.wav`
    : `/assets/note-block-sounds/${file}.mp3`
  const request = fetch(path)
    .then(response => { if (!response.ok) throw new Error(`Sound load failed: ${file}`); return response.arrayBuffer() })
    .then(data => ctx.decodeAudioData(data))
    .then(buffer => { buffers.set(cacheKey, buffer); loading.delete(cacheKey); return buffer })
    .catch(error => { loading.delete(cacheKey); throw error })
  loading.set(cacheKey, request)
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

export async function previewTone(pitch: number, volume: number, instrument: string, pan=0, edition:Project['edition']='java') {
  const ctx = await getContext()
  const buffer = await loadBuffer(ctx, instrument, projectEdition(edition))
  playTone(ctx, buffer, pitch, ctx.currentTime + 0.008, volume, pan)
}

const schedulePlaybackTimer = (callback: () => void, delay: number) => {
  const timer = window.setTimeout(() => {
    playbackTimers.delete(timer)
    callback()
  }, delay)
  playbackTimers.add(timer)
}

export async function playProject(project: Project, fromStep = 0, onStep?: (step: number) => void, options?:{usePan?:boolean;toStep?:number;noteMix?:(track:Track,note:Note)=>{volume:number;pan:number};getProject?:()=>Project}) {
  const token = ++stopAt
  const ctx = await getContext()
  if (stopAt !== token) return
  const dynamicMix = Boolean(options?.getProject)
  const audible = project.tracks.filter(track => !track.muted && (!project.tracks.some(item => item.solo) || track.solo))
  // Live mute/solo changes may make any track audible after playback begins, so preload every
  // instrument used by this project once. Static blueprint playback retains its smaller preload.
  const instruments = dynamicMix ? project.tracks.map(track => track.instrument) : audible.map(track => track.instrument)
  const edition=projectEdition(project.edition)
  const loaded = new Map(await Promise.all([...new Set(instruments)].map(async instrument => [instrument, await loadBuffer(ctx, instrument, edition)] as const)))
  if (stopAt !== token) return
  const firstStep = Math.max(0, Math.min(project.steps - 1, Math.round(fromStep)))
  const lastStep = Math.max(firstStep, Math.min(project.steps - 1, Math.round(options?.toStep ?? project.steps - 1)))
  const stepSeconds = 2 / project.tickRate
  const start = ctx.currentTime + 0.08
  // Do not create every source node for a large song at once. Keeping a short
  // rolling look-ahead makes dense MIDI playback much less likely to glitch,
  // while still allowing live mute/solo changes to take effect quickly.
  const lookAheadSeconds = 0.25
  let scheduledThrough = firstStep
  const scheduleAudioWindow = () => {
    if (stopAt !== token) return
    const liveProject = dynamicMix ? options?.getProject?.() : project
    const liveTracks = liveProject?.tracks ?? []
    const hasSolo = liveTracks.some(track => track.solo)
    const audibleTracks = liveTracks.filter(track => !track.muted && (!hasSolo || track.solo))
    const horizon = ctx.currentTime + lookAheadSeconds
    const maxStep = Math.min(lastStep + 1, Math.ceil((horizon - start) / stepSeconds) + firstStep)
    for (let step = scheduledThrough; step < maxStep; step += 1) {
      const at = start + (step - firstStep) * stepSeconds
      audibleTracks.forEach(track => track.notes.filter(note => note.step === step).forEach(note => {
        const mix=options?.noteMix?.(track,note)
        playTone(ctx, loaded.get(track.instrument)!, note.pitch, Math.max(at, ctx.currentTime + 0.01), mix?.volume??track.volume, mix?.pan??(options?.usePan===false?0:track.pan??0), true)
      }))
    }
    scheduledThrough = Math.max(scheduledThrough, maxStep)
    if (scheduledThrough <= lastStep) schedulePlaybackTimer(scheduleAudioWindow, Math.max(40, lookAheadSeconds * 500))
  }
  scheduleAudioWindow()
  for (let step = firstStep; step <= lastStep; step += 1) {
    schedulePlaybackTimer(() => {
      if (stopAt !== token) return
      onStep?.(step)
    }, 80 + (step - firstStep) * stepSeconds * 1000)
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
