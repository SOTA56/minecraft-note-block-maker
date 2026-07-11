import type { Project } from './types'

let context: AudioContext | null = null
let stopAt = 0

const getContext = async () => {
  context ??= new AudioContext({ latencyHint: 'interactive' })
  if (context.state !== 'running') await context.resume()
  return context
}

const playTone = (ctx: AudioContext, pitch: number, at: number, volume: number, instrument: string, pan = 0) => {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = instrument === 'Bass' ? 'square' : instrument === 'Bell' ? 'sine' : 'triangle'
  oscillator.frequency.value = 185 * 2 ** (pitch / 12)
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(volume * 0.13, at + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22)
  const panner = ctx.createStereoPanner()
  panner.pan.value = pan
  oscillator.connect(gain).connect(panner).connect(ctx.destination)
  oscillator.start(at)
  oscillator.stop(at + 0.24)
}

export async function previewTone(pitch: number, volume: number, instrument: string) {
  const ctx = await getContext()
  playTone(ctx, pitch, ctx.currentTime + 0.008, volume, instrument)
}

export async function playProject(project: Project, fromStep = 0, onStep?: (step: number) => void) {
  const ctx = await getContext()
  const token = ++stopAt
  const stepSeconds = 2 / project.tickRate
  const start = ctx.currentTime + 0.08
  const soloed = project.tracks.some((track) => track.solo)
  project.tracks.forEach((track) => {
    if (track.muted || (soloed && !track.solo)) return
    track.notes.filter((note) => note.step >= fromStep).forEach((note) =>
      playTone(ctx, note.pitch, start + (note.step - fromStep) * stepSeconds, track.volume, track.instrument, track.pan ?? 0))
  })
  for (let step = fromStep; step < project.steps; step += 1) {
    window.setTimeout(() => { if (stopAt === token) onStep?.(step) }, 80 + (step - fromStep) * stepSeconds * 1000)
  }
  window.setTimeout(() => { if (stopAt === token) onStep?.(-1) }, 90 + (project.steps - fromStep) * stepSeconds * 1000)
}

export function stopPlayback() { stopAt += 1 }
