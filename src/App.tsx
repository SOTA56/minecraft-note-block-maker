import { useEffect, useMemo, useRef, useState } from 'react'
import { playProject, previewTone, stopPlayback } from './audio'
import type { Project, Track } from './types'

const COLORS = ['#ef5b3d', '#e9b949', '#68c3a3', '#58a6d6', '#a78bca', '#ef83ad', '#8ec45b', '#e68245']
const INSTRUMENTS = [
  { id: 'Harp', ja: 'ハープ', en: 'Harp', blockJa: 'その他', blockEn: 'Other blocks', texture: 'earth' },
  { id: 'Bass', ja: 'ベース', en: 'Bass', blockJa: '木材', blockEn: 'Wood', texture: 'wood' },
  { id: 'Bass Drum', ja: 'バスドラム', en: 'Bass drum', blockJa: '石', blockEn: 'Stone', texture: 'stone' },
  { id: 'Snare', ja: 'スネア', en: 'Snare', blockJa: '砂', blockEn: 'Sand', texture: 'sand' },
  { id: 'Hat', ja: 'ハイハット', en: 'Hi-hat', blockJa: 'ガラス', blockEn: 'Glass', texture: 'glass' },
  { id: 'Guitar', ja: 'ギター', en: 'Guitar', blockJa: '羊毛', blockEn: 'Wool', texture: 'wool' },
  { id: 'Flute', ja: 'フルート', en: 'Flute', blockJa: '粘土', blockEn: 'Clay', texture: 'clay' },
  { id: 'Bell', ja: 'ベル', en: 'Bell', blockJa: '金ブロック', blockEn: 'Gold block', texture: 'gold' },
  { id: 'Chime', ja: 'チャイム', en: 'Chime', blockJa: '氷塊', blockEn: 'Packed ice', texture: 'ice' },
  { id: 'Xylophone', ja: 'シロフォン', en: 'Xylophone', blockJa: '骨ブロック', blockEn: 'Bone block', texture: 'bone' },
  { id: 'Iron Xylophone', ja: '鉄琴', en: 'Iron xylophone', blockJa: '鉄ブロック', blockEn: 'Iron block', texture: 'iron' },
  { id: 'Cow Bell', ja: 'カウベル', en: 'Cow bell', blockJa: 'ソウルサンド', blockEn: 'Soul sand', texture: 'soul' },
  { id: 'Didgeridoo', ja: 'ディジェリドゥ', en: 'Didgeridoo', blockJa: 'カボチャ', blockEn: 'Pumpkin', texture: 'pumpkin' },
  { id: 'Bit', ja: 'ビット', en: 'Bit', blockJa: 'エメラルド', blockEn: 'Emerald block', texture: 'emerald' },
  { id: 'Banjo', ja: 'バンジョー', en: 'Banjo', blockJa: '干し草の俵', blockEn: 'Hay bale', texture: 'hay' },
  { id: 'Pling', ja: 'プリン', en: 'Pling', blockJa: 'グロウストーン', blockEn: 'Glowstone', texture: 'glow' },
  { id: 'Trumpet', ja: 'トランペット', en: 'Trumpet', blockJa: '銅ブロック', blockEn: 'Copper block', texture: 'copper' },
] as const
const PITCHES = Array.from({ length: 25 }, (_, i) => i)
const makeTrack = (i: number): Track => ({ id: crypto.randomUUID(), name: `TRACK ${String(i + 1).padStart(2, '0')}`, instrument: INSTRUMENTS[i].id, volume: .8, color: COLORS[i], muted: false, solo: false, notes: [] })
const INITIAL: Project = { format: 'note-block-maker', version: 1, title: 'NEW CIRCUIT', edition: 'both', tickRate: 20, steps: 64, tracks: Array.from({ length: 8 }, (_, i) => makeTrack(i)) }
const STORAGE = 'note-block-maker:autosave:v1'

function App() {
  const [project, setProject] = useState<Project>(() => { try { return JSON.parse(localStorage.getItem(STORAGE) || '') } catch { return INITIAL } })
  const [activeId, setActiveId] = useState(project.tracks[0].id)
  const [ghosts, setGhosts] = useState(true)
  const [playingStep, setPlayingStep] = useState(-1)
  const [panel, setPanel] = useState<'tracks' | 'settings' | null>(null)
  const [language, setLanguage] = useState(() => navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en')
  const [stepHeight, setStepHeight] = useState(30)
  const [controlsOpen, setControlsOpen] = useState(true)
  const [editMode, setEditMode] = useState<'input' | 'select'>('input')
  const [selection, setSelection] = useState<{ startStep: number; endStep: number; startPitch: number; endPitch: number } | null>(null)
  const [copiedNotes, setCopiedNotes] = useState<{ step: number; pitch: number }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ originStep: number; originPitch: number; step: number; pitch: number; moved: boolean; existed: boolean; selecting?: boolean; group?: boolean; baseNotes?: Track['notes']; baseSelection?: NonNullable<typeof selection> } | null>(null)
  const active = project.tracks.find(t => t.id === activeId) ?? project.tracks[0]
  const instrument = INSTRUMENTS.find(item => item.id === active.instrument) ?? INSTRUMENTS[0]
  const t = language === 'ja' ? {
    autosaved: '自動保存済み', delay: '遅延', tickRate: 'ティックレート', maxPoly: '最大同時発音', notes: '音', activeTrack: '選択中のトラック', ghost: 'ゴースト', trackName: 'トラック名', instrument: '音色', volume: '音量', block: '下に置くブロック', bar: '小節'
  } : {
    autosaved: 'AUTOSAVED', delay: 'DELAY', tickRate: 'TICK RATE', maxPoly: 'MAX POLY', notes: 'NOTES', activeTrack: 'ACTIVE TRACK', ghost: 'GHOST', trackName: 'TRACK NAME', instrument: 'INSTRUMENT', volume: 'VOLUME', block: 'BLOCK BELOW', bar: 'BAR'
  }

  useEffect(() => { const id = window.setTimeout(() => localStorage.setItem(STORAGE, JSON.stringify(project)), 250); return () => clearTimeout(id) }, [project])
  useEffect(() => () => stopPlayback(), [])

  const polyphony = useMemo(() => {
    const counts = new Map<number, number>()
    project.tracks.forEach(t => t.notes.forEach(n => counts.set(n.step, (counts.get(n.step) ?? 0) + 1)))
    return Math.max(0, ...counts.values())
  }, [project])

  const updateTrack = (patch: Partial<Track>) => setProject(p => ({ ...p, tracks: p.tracks.map(t => t.id === activeId ? { ...t, ...patch } : t) }))
  const changeActiveNotes = (change: (notes: Track['notes']) => Track['notes']) => setProject(p => ({ ...p, tracks: p.tracks.map(track => track.id === activeId ? { ...track, notes: change(track.notes) } : track) }))
  const setDraggedNote = (fromStep: number, fromPitch: number, step: number, pitch: number) => changeActiveNotes(notes => [...notes.filter(n => !(n.step === fromStep && n.pitch === fromPitch) && !(n.step === step && n.pitch === pitch)), { step, pitch }])
  const normalizedSelection = selection && { minStep: Math.min(selection.startStep, selection.endStep), maxStep: Math.max(selection.startStep, selection.endStep), minPitch: Math.min(selection.startPitch, selection.endPitch), maxPitch: Math.max(selection.startPitch, selection.endPitch) }
  const isSelected = (step: number, pitch: number) => Boolean(normalizedSelection && step >= normalizedSelection.minStep && step <= normalizedSelection.maxStep && pitch >= normalizedSelection.minPitch && pitch <= normalizedSelection.maxPitch)
  const handlePointerDown = (event: React.PointerEvent, step: number, pitch: number) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    if (editMode === 'select') {
      if (selection && isSelected(step, pitch) && active.notes.some(n => n.step === step && n.pitch === pitch)) {
        dragRef.current = { originStep: step, originPitch: pitch, step, pitch, moved: false, existed: true, group: true, baseNotes: active.notes.filter(n => isSelected(n.step, n.pitch)), baseSelection: selection }
        return
      }
      setSelection({ startStep: step, endStep: step, startPitch: pitch, endPitch: pitch })
      dragRef.current = { originStep: step, originPitch: pitch, step, pitch, moved: false, existed: false, selecting: true }
      return
    }
    const existed = active.notes.some(n => n.step === step && n.pitch === pitch)
    dragRef.current = { originStep: step, originPitch: pitch, step, pitch, moved: false, existed }
    if (!existed) setDraggedNote(step, pitch, step, pitch)
    previewTone(pitch, active.volume, active.instrument)
  }
  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-step][data-pitch]')
    if (!target) return
    const step = Number(target.dataset.step)
    const pitch = Number(target.dataset.pitch)
    if (step === drag.step && pitch === drag.pitch) return
    if (drag.group && drag.baseNotes && drag.baseSelection) {
      const ds = step - drag.originStep
      const dp = pitch - drag.originPitch
      const original = drag.baseNotes
      changeActiveNotes(notes => [...notes.filter(n => !original.some(o => o.step === n.step && o.pitch === n.pitch)), ...original.map(n => ({ step: Math.max(0, Math.min(project.steps - 1, n.step + ds)), pitch: Math.max(0, Math.min(24, n.pitch + dp)) }))])
      const base = drag.baseSelection
      setSelection({ startStep: base.startStep + ds, endStep: base.endStep + ds, startPitch: base.startPitch + dp, endPitch: base.endPitch + dp })
      if (pitch !== drag.pitch) previewTone(pitch, active.volume, active.instrument)
      drag.moved = true; drag.step = step; drag.pitch = pitch
      return
    }
    if (drag.selecting) {
      drag.moved = true; drag.step = step; drag.pitch = pitch
      setSelection(current => current ? { ...current, endStep: step, endPitch: pitch } : current)
      return
    }
    drag.moved = true
    setDraggedNote(drag.step, drag.pitch, step, pitch)
    if (pitch !== drag.pitch) previewTone(pitch, active.volume, active.instrument)
    drag.step = step; drag.pitch = pitch
  }
  const handlePointerUp = () => {
    const drag = dragRef.current
    if (drag?.existed && !drag.moved && !drag.selecting) changeActiveNotes(notes => notes.filter(n => n.step !== drag.originStep || n.pitch !== drag.originPitch))
    dragRef.current = null
  }
  const copySelection = () => {
    if (!normalizedSelection) return
    setCopiedNotes(active.notes.filter(n => isSelected(n.step, n.pitch)).map(n => ({ step: n.step - normalizedSelection.minStep, pitch: n.pitch - normalizedSelection.minPitch })))
  }
  const pasteSelection = () => {
    if (!normalizedSelection || !copiedNotes.length) return
    changeActiveNotes(notes => [...notes, ...copiedNotes.map(n => ({ step: Math.min(project.steps - 1, normalizedSelection.minStep + n.step), pitch: Math.min(24, normalizedSelection.minPitch + n.pitch) }))])
  }
  const deleteSelection = () => normalizedSelection && changeActiveNotes(notes => notes.filter(n => !isSelected(n.step, n.pitch)))
  const pitchNames = language === 'ja'
    ? ['ファ♯3','ソ3','ソ♯3','ラ3','ラ♯3','シ3','ド4','ド♯4','レ4','レ♯4','ミ4','ファ4','ファ♯4','ソ4','ソ♯4','ラ4','ラ♯4','シ4','ド5','ド♯5','レ5','レ♯5','ミ5','ファ5','ファ♯5']
    : ['F♯3','G3','G♯3','A3','A♯3','B3','C4','C♯4','D4','D♯4','E4','F4','F♯4','G4','G♯4','A4','A♯4','B4','C5','C♯5','D5','D♯5','E5','F5','F♯5']
  const isBlack = (pitch: number) => [0, 2, 4, 7, 9].includes(pitch % 12)
  const isDo = (pitch: number) => pitch % 12 === 6
  const togglePlay = async () => { if (playingStep >= 0) { stopPlayback(); setPlayingStep(-1) } else await playProject(project, 0, setPlayingStep) }
  const save = () => { const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${project.title || 'untitled'}.nbm`; a.click(); URL.revokeObjectURL(a.href) }
  const load = async (file?: File) => { if (!file) return; const data = JSON.parse(await file.text()); if (data.format !== 'note-block-maker' || data.version !== 1) throw new Error('対応していない.nbmファイルです'); setProject(data); setActiveId(data.tracks[0].id) }

  return <main className="app">
    <div className={`control-panel ${controlsOpen ? '' : 'collapsed'}`}>
    <header className="topbar">
      <div className="brand"><span className="brand-mark">♪</span><div><small>REDSTONE SEQUENCER</small><input value={project.title} onChange={e => setProject(p => ({ ...p, title: e.target.value.toUpperCase() }))} aria-label="曲名" /></div></div>
      <div className="top-actions"><select className="language" value={language} onChange={e => setLanguage(e.target.value)} aria-label="Language"><option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="zh">中文</option><option value="ko">한국어</option></select><div className="status"><span className="live-dot" /> {t.autosaved}</div></div>
    </header>

    <section className="transport">
      <button className="play" onClick={togglePlay} aria-label={playingStep >= 0 ? '停止' : '再生'}>{playingStep >= 0 ? '■' : '▶'}</button>
      <button onClick={() => { stopPlayback(); setPlayingStep(-1) }} aria-label="先頭へ">┃◀</button>
      <label className="tick"><small>{t.tickRate}</small><input type="number" min="1" max="1000" value={project.tickRate} onChange={e => setProject(p => ({ ...p, tickRate: Math.max(1, +e.target.value) }))} /><span>TPS</span></label>
      <div className={`poly ${polyphony > 9 ? 'warn' : ''}`}><small>{t.maxPoly}</small><strong>{polyphony}<em>{t.notes}</em></strong></div>
    </section>

    <section className="track-strip" style={{ '--track': active.color } as React.CSSProperties}>
      <button className="track-main" onClick={() => setPanel(panel === 'tracks' ? null : 'tracks')}><span className={`block-chip ${instrument.texture}`}>{String(project.tracks.indexOf(active) + 1).padStart(2, '0')}</span><span><small>{t.activeTrack}</small><strong>{active.name}</strong></span><b>⌄</b></button>
      <button onClick={() => setPanel(panel === 'settings' ? null : 'settings')}><span>♫</span><small>{language === 'ja' ? instrument.ja : instrument.en}</small></button>
      <button className={ghosts ? 'on' : ''} onClick={() => setGhosts(!ghosts)}><span>◉</span><small>{t.ghost}</small></button>
    </section>

    {panel === 'tracks' && <div className="drawer track-list">{project.tracks.map((track, i) => <button key={track.id} className={track.id === activeId ? 'selected' : ''} onClick={() => { setActiveId(track.id); setPanel(null) }}><i style={{ background: track.color }} /> <b>{String(i + 1).padStart(2, '0')}</b><span>{track.name}</span><small>{track.notes.length} NOTES</small></button>)}</div>}
    {panel === 'settings' && <div className="drawer settings"><label>{t.trackName}<input value={active.name} onChange={e => updateTrack({ name: e.target.value.toUpperCase() })} /></label><label>{t.instrument}<select value={active.instrument} onChange={e => updateTrack({ instrument: e.target.value })}>{INSTRUMENTS.map(x => <option key={x.id} value={x.id}>{language === 'ja' ? x.ja : x.en} — {language === 'ja' ? x.blockJa : x.blockEn}</option>)}</select></label><div className="block-guide"><i className={`block-preview ${instrument.texture}`} /><span><small>{t.block}</small><b>{language === 'ja' ? instrument.blockJa : instrument.blockEn}</b></span></div><label>{t.volume} <b>{Math.round(active.volume * 100)}</b><input type="range" min="0" max="1" step=".01" value={active.volume} onChange={e => updateTrack({ volume: +e.target.value })} /></label></div>}
    <button className="panel-toggle" onClick={() => setControlsOpen(!controlsOpen)} aria-label={controlsOpen ? '操作パネルを収納' : '操作パネルを表示'}>{controlsOpen ? '⌃' : '⌄'}</button>
    <nav className="edit-tools">
      <button className={editMode === 'input' ? 'active' : ''} onClick={() => setEditMode('input')}>✎<small>{language === 'ja' ? '入力' : 'DRAW'}</small></button>
      <button className={editMode === 'select' ? 'active' : ''} onClick={() => setEditMode('select')}>▧<small>{language === 'ja' ? '範囲' : 'SELECT'}</small></button>
      <button onClick={copySelection} disabled={!normalizedSelection}>⧉<small>{language === 'ja' ? 'コピー' : 'COPY'}</small></button>
      <button onClick={pasteSelection} disabled={!copiedNotes.length || !normalizedSelection}>⎘<small>{language === 'ja' ? '貼付' : 'PASTE'}</small></button>
      <button onClick={deleteSelection} disabled={!normalizedSelection}>⌫<small>{language === 'ja' ? '削除' : 'DELETE'}</small></button>
      <button onClick={() => setStepHeight(h => Math.max(22, h - 4))}>−<small>{language === 'ja' ? '縮小' : 'ZOOM'}</small></button>
      <button onClick={() => setStepHeight(h => Math.min(64, h + 4))}>+<small>{language === 'ja' ? '拡大' : 'ZOOM'}</small></button>
    </nav>

    <div className="pitch-head">{PITCHES.map(p => <b key={p} className={`${isBlack(p) ? 'black' : 'white'} ${isDo(p) ? 'do' : ''}`}>{pitchNames[p]}</b>)}<span>{t.bar}</span></div>
    </div>
    <section className={`roll ${editMode}`} aria-label="縦方向ピアノロール" style={{ '--step-height': `${stepHeight}px` } as React.CSSProperties} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
      {Array.from({ length: project.steps }, (_, step) => <div className={`step ${step % 16 === 0 ? 'bar' : step % 4 === 0 ? 'beat' : ''} ${playingStep === step ? 'playing' : ''}`} key={step}>
        {PITCHES.map(pitch => {
          const own = active.notes.some(n => n.step === step && n.pitch === pitch)
          const ghost = ghosts && project.tracks.find(t => t.id !== activeId && t.notes.some(n => n.step === step && n.pitch === pitch))
          return <button key={pitch} data-step={step} data-pitch={pitch} onPointerDown={e => handlePointerDown(e, step, pitch)} className={`${isBlack(pitch) ? 'black-key' : 'white-key'} ${isDo(pitch) ? 'do' : ''} ${own ? 'note' : ghost ? 'ghost' : ''} ${isSelected(step,pitch) ? 'selected-cell' : ''}`} style={own ? { '--note': active.color } as React.CSSProperties : ghost ? { '--note': ghost.color } as React.CSSProperties : undefined} aria-label={`${pitchNames[pitch]}, ${t.bar} ${Math.floor(step / 16) + 1}`} />
        })}
        <span className="step-label">{step % 16 === 0 ? `${step / 16 + 1}` : step % 4 === 0 ? '•' : ''}</span>
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
