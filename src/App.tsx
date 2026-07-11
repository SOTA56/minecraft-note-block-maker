import { useEffect, useMemo, useRef, useState } from 'react'
import { playProject, stopPlayback } from './audio'
import type { Project, Track } from './types'

const COLORS = ['#ef5b3d', '#e9b949', '#68c3a3', '#58a6d6', '#a78bca', '#ef83ad', '#8ec45b', '#e68245']
const INSTRUMENTS = ['Harp', 'Bass', 'Bell', 'Pling', 'Flute', 'Chime', 'Guitar', 'Xylophone']
const PITCHES = Array.from({ length: 25 }, (_, i) => i)
const makeTrack = (i: number): Track => ({ id: crypto.randomUUID(), name: `TRACK ${String(i + 1).padStart(2, '0')}`, instrument: INSTRUMENTS[i], volume: .8, color: COLORS[i], muted: false, solo: false, notes: [] })
const INITIAL: Project = { format: 'note-block-maker', version: 1, title: 'NEW CIRCUIT', edition: 'both', tickRate: 20, steps: 64, tracks: Array.from({ length: 8 }, (_, i) => makeTrack(i)) }
const STORAGE = 'note-block-maker:autosave:v1'

function App() {
  const [project, setProject] = useState<Project>(() => { try { return JSON.parse(localStorage.getItem(STORAGE) || '') } catch { return INITIAL } })
  const [activeId, setActiveId] = useState(project.tracks[0].id)
  const [ghosts, setGhosts] = useState(true)
  const [playingStep, setPlayingStep] = useState(-1)
  const [panel, setPanel] = useState<'tracks' | 'settings' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const active = project.tracks.find(t => t.id === activeId) ?? project.tracks[0]

  useEffect(() => { const id = window.setTimeout(() => localStorage.setItem(STORAGE, JSON.stringify(project)), 250); return () => clearTimeout(id) }, [project])
  useEffect(() => () => stopPlayback(), [])

  const polyphony = useMemo(() => {
    const counts = new Map<number, number>()
    project.tracks.forEach(t => t.notes.forEach(n => counts.set(n.step, (counts.get(n.step) ?? 0) + 1)))
    return Math.max(0, ...counts.values())
  }, [project])

  const updateTrack = (patch: Partial<Track>) => setProject(p => ({ ...p, tracks: p.tracks.map(t => t.id === activeId ? { ...t, ...patch } : t) }))
  const toggleNote = (step: number, pitch: number) => updateTrack({ notes: active.notes.some(n => n.step === step && n.pitch === pitch) ? active.notes.filter(n => n.step !== step || n.pitch !== pitch) : [...active.notes, { step, pitch }] })
  const togglePlay = async () => { if (playingStep >= 0) { stopPlayback(); setPlayingStep(-1) } else await playProject(project, 0, setPlayingStep) }
  const save = () => { const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${project.title || 'untitled'}.nbm`; a.click(); URL.revokeObjectURL(a.href) }
  const load = async (file?: File) => { if (!file) return; const data = JSON.parse(await file.text()); if (data.format !== 'note-block-maker' || data.version !== 1) throw new Error('対応していない.nbmファイルです'); setProject(data); setActiveId(data.tracks[0].id) }

  return <main className="app">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">♪</span><div><small>REDSTONE SEQUENCER</small><input value={project.title} onChange={e => setProject(p => ({ ...p, title: e.target.value.toUpperCase() }))} aria-label="曲名" /></div></div>
      <div className="status"><span className="live-dot" /> AUTOSAVED</div>
    </header>

    <section className="transport">
      <button className="play" onClick={togglePlay} aria-label={playingStep >= 0 ? '停止' : '再生'}>{playingStep >= 0 ? '■' : '▶'}</button>
      <button onClick={() => { stopPlayback(); setPlayingStep(-1) }} aria-label="先頭へ">┃◀</button>
      <div className="meter"><small>DELAY</small><strong>1 RT</strong><span>{(2 / project.tickRate).toFixed(3)} SEC</span></div>
      <label className="tick"><small>TICK RATE</small><input type="number" min="1" max="1000" value={project.tickRate} onChange={e => setProject(p => ({ ...p, tickRate: Math.max(1, +e.target.value) }))} /><span>TPS</span></label>
      <div className={`poly ${polyphony > 9 ? 'warn' : ''}`}><small>MAX POLY</small><strong>{polyphony}</strong><span>NOTES</span></div>
    </section>

    <section className="track-strip" style={{ '--track': active.color } as React.CSSProperties}>
      <button className="track-main" onClick={() => setPanel(panel === 'tracks' ? null : 'tracks')}><span className="track-number">{String(project.tracks.indexOf(active) + 1).padStart(2, '0')}</span><span><small>ACTIVE TRACK</small><strong>{active.name}</strong></span><b>⌄</b></button>
      <button onClick={() => setPanel(panel === 'settings' ? null : 'settings')}><span>♫</span><small>{active.instrument}</small></button>
      <button className={ghosts ? 'on' : ''} onClick={() => setGhosts(!ghosts)}><span>◉</span><small>GHOST</small></button>
    </section>

    {panel === 'tracks' && <div className="drawer track-list">{project.tracks.map((track, i) => <button key={track.id} className={track.id === activeId ? 'selected' : ''} onClick={() => { setActiveId(track.id); setPanel(null) }}><i style={{ background: track.color }} /> <b>{String(i + 1).padStart(2, '0')}</b><span>{track.name}</span><small>{track.notes.length} NOTES</small></button>)}</div>}
    {panel === 'settings' && <div className="drawer settings"><label>TRACK NAME<input value={active.name} onChange={e => updateTrack({ name: e.target.value.toUpperCase() })} /></label><label>INSTRUMENT<select value={active.instrument} onChange={e => updateTrack({ instrument: e.target.value })}>{INSTRUMENTS.map(x => <option key={x}>{x}</option>)}</select></label><label>VOLUME <b>{Math.round(active.volume * 100)}</b><input type="range" min="0" max="1" step=".01" value={active.volume} onChange={e => updateTrack({ volume: +e.target.value })} /></label></div>}

    <div className="pitch-head"><span>TIME</span>{PITCHES.map(p => <b key={p}>{p % 12 === 0 ? p === 0 ? 'F♯3' : p === 12 ? 'F♯4' : 'F♯5' : '·'}</b>)}</div>
    <section className="roll" aria-label="縦方向ピアノロール">
      {Array.from({ length: project.steps }, (_, step) => <div className={`step ${step % 16 === 0 ? 'bar' : step % 4 === 0 ? 'beat' : ''} ${playingStep === step ? 'playing' : ''}`} key={step}>
        <span className="step-label">{step % 16 === 0 ? `${step / 16 + 1}` : step % 4 === 0 ? '•' : ''}</span>
        {PITCHES.map(pitch => {
          const own = active.notes.some(n => n.step === step && n.pitch === pitch)
          const ghost = ghosts && project.tracks.find(t => t.id !== activeId && t.notes.some(n => n.step === step && n.pitch === pitch))
          return <button key={pitch} onClick={() => toggleNote(step, pitch)} className={own ? 'note' : ghost ? 'ghost' : ''} style={own ? { '--note': active.color } as React.CSSProperties : ghost ? { '--note': ghost.color } as React.CSSProperties : undefined} aria-label={`step ${step + 1}, pitch ${pitch}`} />
        })}
      </div>)}
    </section>

    <footer className="dock">
      <button aria-label="元に戻す" disabled>↶<small>UNDO</small></button><button aria-label="やり直す" disabled>↷<small>REDO</small></button>
      <button onClick={save}>⇩<small>SAVE .NBM</small></button><button onClick={() => fileRef.current?.click()}>⇧<small>OPEN</small></button>
      <button onClick={() => updateTrack({ muted: !active.muted })} className={active.muted ? 'danger' : ''}>{active.muted ? '×' : '●'}<small>MUTE</small></button>
      <input ref={fileRef} hidden type="file" accept=".nbm,application/json" onChange={e => load(e.target.files?.[0]).catch(err => alert(err.message))} />
    </footer>
  </main>
}
export default App
