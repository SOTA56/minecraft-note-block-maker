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
  source.buffer = buffer
  source.playbackRate.value = 2 ** ((pitch - 12) / 12)
  const needsGain = volume !== 1
  const needsPanner = pan !== 0
  if (!needsGain && !needsPanner) {
    source.connect(ctx.destination)
  } else if (needsGain && !needsPanner) {
    const gain = ctx.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(ctx.destination)
  } else if (!needsGain && needsPanner) {
    const panner = ctx.createStereoPanner()
    panner.pan.value = pan
    source.connect(panner).connect(ctx.destination)
  } else {
    const gain = ctx.createGain()
    const panner = ctx.createStereoPanner()
    gain.gain.value = volume
    panner.pan.value = pan
    source.connect(gain).connect(panner).connect(ctx.destination)
  }
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

type PlaybackOptions = {
  usePan?: boolean
  toStep?: number
  noteMix?: (track: Track, note: Note) => {volume: number; pan: number}
  getProject?: () => Project
}

const renderTone = (
  offline: OfflineAudioContext,
  buffer: AudioBuffer,
  pitch: number,
  at: number,
  volume: number,
  pan: number,
) => {
  const source = offline.createBufferSource()
  source.buffer = buffer
  source.playbackRate.value = 2 ** ((pitch - 12) / 12)
  const needsGain = volume !== 1
  const needsPanner = pan !== 0
  if (!needsGain && !needsPanner) {
    source.connect(offline.destination)
  } else if (needsGain && !needsPanner) {
    const gain = offline.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(offline.destination)
  } else if (!needsGain && needsPanner) {
    const panner = offline.createStereoPanner()
    panner.pan.value = pan
    source.connect(panner).connect(offline.destination)
  } else {
    const gain = offline.createGain()
    const panner = offline.createStereoPanner()
    gain.gain.value = volume
    panner.pan.value = pan
    source.connect(gain).connect(panner).connect(offline.destination)
  }
  source.start(at)
}

const renderPlaybackChunk = async (
  project: Project,
  loaded: Map<string, AudioBuffer>,
  fromStep: number,
  toStep: number,
  stepSeconds: number,
  sampleRate: number,
  options?: PlaybackOptions,
) => {
  const hasSolo = project.tracks.some(track => track.solo)
  const tracks = project.tracks.filter(track => !track.muted && (!hasSolo || track.solo))
  const events = tracks.flatMap(track => track.notes
    .filter(note => note.step >= fromStep && note.step < toStep)
    .map(note => ({track, note, buffer: loaded.get(track.instrument)})))
    .filter((event): event is {track: Track; note: Note; buffer: AudioBuffer} => Boolean(event.buffer))
  if (events.length === 0) return null
  const chunkSeconds = Math.max(stepSeconds, (toStep - fromStep) * stepSeconds)
  const tailSeconds = events.reduce((longest, event) => {
    const rate = 2 ** ((event.note.pitch - 12) / 12)
    return Math.max(longest, event.buffer.duration / rate)
  }, 0)
  const frameCount = Math.max(1, Math.ceil((chunkSeconds + tailSeconds + 0.02) * sampleRate))
  const offline = new OfflineAudioContext(2, frameCount, sampleRate)
  events.forEach(({track, note, buffer}) => {
    const mix = options?.noteMix?.(track, note)
    renderTone(
      offline,
      buffer,
      note.pitch,
      (note.step - fromStep) * stepSeconds,
      mix?.volume ?? track.volume,
      mix?.pan ?? (options?.usePan === false ? 0 : track.pan ?? 0),
    )
  })
  return offline.startRendering()
}

const playRenderedChunk = (ctx: AudioContext, buffer: AudioBuffer, at: number) => {
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  playbackSources.add(source)
  source.addEventListener('ended', () => playbackSources.delete(source), {once: true})
  const now = ctx.currentTime + 0.01
  const offset = Math.max(0, now - at)
  if (offset < buffer.duration) source.start(Math.max(at, now), offset)
  else playbackSources.delete(source)
}

const scheduleStepIndicator = (
  ctx: AudioContext,
  token: number,
  start: number,
  firstStep: number,
  lastStep: number,
  stepSeconds: number,
  onStep?: (step: number) => void,
) => {
  let reportedStep = firstStep - 1
  const update = () => {
    if (stopAt !== token) return
    const elapsed = ctx.currentTime - start
    const step = firstStep + Math.max(0, Math.floor(elapsed / stepSeconds))
    if (elapsed >= 0 && step <= lastStep && step !== reportedStep) {
      reportedStep = step
      onStep?.(step)
    }
    if (step > lastStep) {
      onStep?.(-1)
      return
    }
    const nextBoundary = start + (reportedStep - firstStep + 1) * stepSeconds
    schedulePlaybackTimer(update, Math.max(8, (nextBoundary - ctx.currentTime) * 1000))
  }
  schedulePlaybackTimer(update, Math.max(0, (start - ctx.currentTime) * 1000))
}

export async function playProject(project: Project, fromStep = 0, onStep?: (step: number) => void, options?:PlaybackOptions) {
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
  const chunkSteps = dynamicMix ? 4 : 16
  const renderChunk = (chunkStart: number) => {
    const liveProject = dynamicMix ? options?.getProject?.() ?? project : project
    return renderPlaybackChunk(
      liveProject,
      loaded,
      chunkStart,
      Math.min(lastStep + 1, chunkStart + chunkSteps),
      stepSeconds,
      ctx.sampleRate,
      options,
    )
  }
  const firstBuffer = await renderChunk(firstStep)
  if (stopAt !== token) return
  const start = ctx.currentTime + 0.08
  if (firstBuffer) playRenderedChunk(ctx, firstBuffer, start)
  scheduleStepIndicator(ctx, token, start, firstStep, lastStep, stepSeconds, onStep)
  let nextChunkStart = Math.min(lastStep + 1, firstStep + chunkSteps)
  const renderNextChunk = async () => {
    if (stopAt !== token) return
    if (nextChunkStart > lastStep) return
    const chunkStart = nextChunkStart
    const target = start + (chunkStart - firstStep) * stepSeconds
    const chunkSeconds = Math.min(chunkSteps, lastStep + 1 - chunkStart) * stepSeconds
    // Editor chunks are rendered shortly before the next beat so live M/S,
    // volume and PAN changes reach the next unrendered beat. Static blueprint
    // chunks can be prepared earlier because their mix does not change.
    const renderLead = dynamicMix ? Math.min(0.2, chunkSeconds * 0.5) : Math.min(1, chunkSeconds)
    const wait = target - renderLead - ctx.currentTime
    if (wait > 0) {
      schedulePlaybackTimer(() => { void renderNextChunk() }, wait * 1000)
      return
    }
    const rendered = await renderChunk(chunkStart)
    if (stopAt !== token) return
    if (rendered) playRenderedChunk(ctx, rendered, target)
    nextChunkStart = Math.min(lastStep + 1, chunkStart + chunkSteps)
    void renderNextChunk()
  }
  void renderNextChunk()
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
