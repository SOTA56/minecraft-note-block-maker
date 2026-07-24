import type { AudioEdition, Note, Project, Track } from './types'

let context: AudioContext | null = null
let stopAt = 0
const buffers = new Map<string, AudioBuffer>()
const loading = new Map<string, Promise<AudioBuffer>>()
const playbackSources = new Set<AudioBufferSourceNode>()
const playbackTimers = new Set<number>()
const playbackOutputs = new Map<AudioEdition, GainNode>()

// Keep the Java / Bedrock balance intact while leaving enough headroom for
// dense chords. The compressor only catches the combined peak of many notes;
// it does not alter individual instrument balances at ordinary volumes.
// A further conservative ~3 dB reduction leaves quiet passages usable while
// giving dense chords a little more headroom.
const MASTER_PLAYBACK_GAIN = 0.39
// Bedrock samples are quieter after the shared headroom reduction; bring only
// this edition up by roughly 3 dB while leaving Java unchanged.
const BEDROCK_PLAYBACK_RATIO = 0.424

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
  playbackOutputs.forEach(output => {
    try { output.disconnect() } catch { /* The old context may already be closed. */ }
  })
  playbackOutputs.clear()
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

const playbackOutput = (ctx: AudioContext, edition: Project['edition']) => {
  const normalizedEdition = projectEdition(edition)
  const cached = playbackOutputs.get(normalizedEdition)
  if (cached) return cached
  const output = ctx.createGain()
  output.gain.value = MASTER_PLAYBACK_GAIN * (normalizedEdition === 'bedrock' ? BEDROCK_PLAYBACK_RATIO : 1)
  const peakGuard = ctx.createDynamicsCompressor()
  peakGuard.threshold.value = -12
  peakGuard.knee.value = 18
  peakGuard.ratio.value = 3
  peakGuard.attack.value = 0.003
  peakGuard.release.value = 0.15
  output.connect(peakGuard).connect(ctx.destination)
  playbackOutputs.set(normalizedEdition, output)
  return output
}

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

const playTone = (ctx: AudioContext, buffer: AudioBuffer, pitch: number, at: number, volume: number, pan = 0, playback = false, output: AudioNode = ctx.destination) => {
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.playbackRate.value = 2 ** ((pitch - 12) / 12)
  const needsGain = volume !== 1
  const needsPanner = pan !== 0
  if (!needsGain && !needsPanner) {
    source.connect(output)
  } else if (needsGain && !needsPanner) {
    const gain = ctx.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(output)
  } else if (!needsGain && needsPanner) {
    const panner = ctx.createStereoPanner()
    panner.pan.value = pan
    source.connect(panner).connect(output)
  } else {
    const gain = ctx.createGain()
    const panner = ctx.createStereoPanner()
    gain.gain.value = volume
    panner.pan.value = pan
    source.connect(gain).connect(panner).connect(output)
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
  const output = playbackOutput(ctx, edition)
  playTone(ctx, buffer, pitch, ctx.currentTime + 0.008, volume, pan, false, output)
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

const noteIndexCache = new WeakMap<Note[], Map<number, Note[]>>()

const notesAtStep = (track: Track, step: number) => {
  let index = noteIndexCache.get(track.notes)
  if (!index) {
    index = new Map()
    track.notes.forEach(note => {
      const notes = index?.get(note.step)
      if (notes) notes.push(note)
      else index?.set(note.step, [note])
    })
    noteIndexCache.set(track.notes, index)
  }
  return index.get(step) ?? []
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
  const start = ctx.currentTime + 0.08
  // Bedrock samples have less usable headroom when many notes are summed.
  // Keep the relative instrument balance intact and attenuate the edition as a whole.
  const output = playbackOutput(ctx, edition)
  // Schedule the original samples directly instead of rendering a new audio file
  // for every beat. A one-beat editor look-ahead leaves enough time for dense
  // passages while allowing live mute/solo changes to reach the next beat.
  const lookAheadSeconds = dynamicMix
    ? Math.max(0.25, stepSeconds * 4)
    : Math.max(0.5, stepSeconds * 4)
  let scheduledThrough = firstStep
  const scheduleAudioWindow = () => {
    if (stopAt !== token) return
    const liveProject = dynamicMix ? options?.getProject?.() ?? project : project
    const hasSolo = liveProject.tracks.some(track => track.solo)
    const audibleTracks = liveProject.tracks.filter(track => !track.muted && (!hasSolo || track.solo))
    const horizon = ctx.currentTime + lookAheadSeconds
    const maxStep = Math.min(
      lastStep + 1,
      Math.max(firstStep, Math.ceil((horizon - start) / stepSeconds) + firstStep),
    )
    for (let step = scheduledThrough; step < maxStep; step += 1) {
      const at = start + (step - firstStep) * stepSeconds
      audibleTracks.forEach(track => {
        const buffer = loaded.get(track.instrument)
        if (!buffer) return
        notesAtStep(track, step).forEach(note => {
          const mix = options?.noteMix?.(track, note)
          playTone(
            ctx,
            buffer,
            note.pitch,
            Math.max(at, ctx.currentTime + 0.01),
            mix?.volume ?? track.volume,
            mix?.pan ?? (options?.usePan === false ? 0 : track.pan ?? 0),
            true,
            output,
          )
        })
      })
    }
    scheduledThrough = Math.max(scheduledThrough, maxStep)
    if (scheduledThrough <= lastStep) {
      const nextCheckMs = Math.min(120, Math.max(40, lookAheadSeconds * 250))
      schedulePlaybackTimer(scheduleAudioWindow, nextCheckMs)
    }
  }
  scheduleAudioWindow()
  scheduleStepIndicator(ctx, token, start, firstStep, lastStep, stepSeconds, onStep)
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
