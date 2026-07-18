import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { playProject, previewTone, stopPlayback } from './audio'
import type { Project, Track } from './types'
import BlueprintView, { type BlueprintViewState } from './BlueprintView'
import HomePage from './HomePage'
import CreatorsPage from './CreatorsPage'
import EditorGuidePage from './EditorGuidePage'
import {instrumentBlockName} from './localization'

type AppView='home'|'editor'|'blueprint'|'creators'|'guide'
const viewFromPath=(path:string):AppView=>path==='/creators'?'creators':path==='/editor'?'editor':path==='/blueprint'?'blueprint':path==='/guide'?'guide':'home'
const pathFromView=(view:AppView)=>view==='home'?'/':`/${view}`

const COLORS = ['#ef5b3d','#e9b949','#68c3a3','#58a6d6','#a78bca','#ef83ad','#8ec45b','#e68245','#55c7c2','#d66fa8','#9bb95e','#cb765f','#6f9ed8','#c3a457','#67b97a','#d57cce','#6bb3df','#d99a62','#8e86d5','#b6b86a']
const INSTRUMENTS = [
  { id: 'Harp', ja: 'ハープ', en: 'Harp', blockJa: '土など', blockEn: 'Dirt, etc.', texture: 'earth' },
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
  { id: 'Pling', ja: 'プリング', en: 'Pling', blockJa: 'グロウストーン', blockEn: 'Glowstone', texture: 'glow' },
  { id: 'Trumpet', ja: 'トランペット（銅）', en: 'Trumpet (copper)', blockJa: '銅ブロック', blockEn: 'Copper block', texture: 'copper' },
  { id: 'Trumpet Exposed', ja: 'トランペット（風化）', en: 'Trumpet (exposed)', blockJa: '風化した銅ブロック', blockEn: 'Exposed copper block', texture: 'copper-exposed' },
  { id: 'Trumpet Weathered', ja: 'トランペット（錆び）', en: 'Trumpet (weathered)', blockJa: '錆びた銅ブロック', blockEn: 'Weathered copper block', texture: 'copper-weathered' },
  { id: 'Trumpet Oxidized', ja: 'トランペット（酸化）', en: 'Trumpet (oxidized)', blockJa: '酸化した銅ブロック', blockEn: 'Oxidized copper block', texture: 'copper-oxidized' },
] as const
const PITCHES = Array.from({ length: 25 }, (_, i) => i)
const makeTrack = (i: number): Track => ({ id: crypto.randomUUID(), name: `TRACK ${String(i + 1).padStart(2, '0')}`, instrument: 'Harp', volume: 1, pan: 0, color: COLORS[i % COLORS.length], muted: false, solo: false, ghostEnabled: true, notes: [] })
const createInitialProject = ():Project => ({ format: 'oto-blogic', version: 1, title: 'SONG TITLE', edition: 'both', tickRate: 20, delayUnit:1, steps: 64, tracks: Array.from({ length: 20 }, (_, i) => makeTrack(i)), blueprint:{runLength:16,compactSize:50,fold:'right',compactFold:'right',includeSilentEdges:true,repeaterDisplay:'delay',fishboneMode:'auto',fishboneManual:{},fishbonePackColumns:false,fishboneSpatialAudio:false,fishbonePlayerHeight:5} })
const INITIAL = createInitialProject()
const STORAGE = 'note-block-maker:autosave:v1'
const LANGUAGE_STORAGE='oto-blogic:language'
const SUPPORTED_LANGUAGES=['ja','en','es','fr','de','zh','zh-tw','ko','id'] as const
const initialLanguage=()=>{const saved=localStorage.getItem(LANGUAGE_STORAGE);if(saved&&SUPPORTED_LANGUAGES.includes(saved as typeof SUPPORTED_LANGUAGES[number]))return saved;const browser=navigator.language.toLowerCase();if(browser.startsWith('zh-tw')||browser.startsWith('zh-hk')||browser.startsWith('zh-hant'))return'zh-tw';const base=browser.split('-')[0];return SUPPORTED_LANGUAGES.includes(base as typeof SUPPORTED_LANGUAGES[number])?base:'en'}
const DEFAULT_BLUEPRINT_VIEW:BlueprintViewState={kind:'easy',layerIndex:0,zoom:1,scrollLeft:0,scrollTop:0}
const normalizeProject = (source:Project):Project => {
  const tracks = source.tracks.map((track:Partial<Track>) => ({...track, pan:track.pan ?? 0, ghostEnabled:track.ghostEnabled ?? true})) as Track[]
  const title = source.title === 'NEW CIRCUIT' || source.title === 'TITLE' ? 'SONG TITLE' : source.title
  const delayUnit:1|2|4=source.delayUnit===2||source.delayUnit===4?source.delayUnit:1
  const knownTrackIds=new Set(tracks.map(track=>track.id))
  const fishboneManual=Object.fromEntries(Object.entries(source.blueprint?.fishboneManual??{}).flatMap(([trackId,lanes])=>knownTrackIds.has(trackId)&&Array.isArray(lanes)?[[trackId,[...new Set(lanes.filter(lane=>Number.isInteger(lane)&&lane>0))]]]:[]))
  const rawFishbonePlayerHeight=Number(source.blueprint?.fishbonePlayerHeight??5),fishbonePlayerHeight=Number.isFinite(rawFishbonePlayerHeight)?Math.max(0,Math.min(48,Math.round(rawFishbonePlayerHeight))):5
  return {...source, format:'oto-blogic', title, delayUnit, blueprint:{runLength:source.blueprint?.runLength??16,compactSize:source.blueprint?.compactSize??50,fold:source.blueprint?.fold??'right',compactFold:source.blueprint?.compactFold==='left'?'left':'right',includeSilentEdges:source.blueprint?.includeSilentEdges??true,theme:source.blueprint?.theme,repeaterDisplay:source.blueprint?.repeaterDisplay==='clicks'?'clicks':'delay',fishboneMode:source.blueprint?.fishboneMode==='manual'?'manual':'auto',fishboneManual,fishbonePackColumns:source.blueprint?.fishbonePackColumns===true,fishboneSpatialAudio:source.blueprint?.fishboneSpatialAudio===true,fishbonePlayerHeight}, tracks:[...tracks, ...Array.from({length:Math.max(0,20-tracks.length)},(_,i)=>makeTrack(tracks.length+i))].slice(0,20)}
}
const GhostIcon = () => <span className="ghost-icon" aria-hidden="true"><i /></span>

function App() {
  const [project, setProject] = useState<Project>(() => { try { return normalizeProject(JSON.parse(localStorage.getItem(STORAGE) || '')) } catch { return INITIAL } })
  const [activeId, setActiveId] = useState(project.tracks[0].id)
  const [ghosts, setGhosts] = useState(true)
  const [playingStep, setPlayingStep] = useState(-1)
  const [playhead, setPlayhead] = useState(0)
  const [panel, setPanel] = useState<'tracks' | 'settings' | null>(null)
  const [language, setLanguage] = useState(initialLanguage)
  const [stepHeight, setStepHeight] = useState(30)
  const [controlsOpen, setControlsOpen] = useState(true)
  const [editMode, setEditMode] = useState<'input' | 'select'>('input')
  const [dragPreview,setDragPreview]=useState<{originStep:number;originPitch:number;step:number;pitch:number}|null>(null)
  const [selection, setSelection] = useState<{ startStep: number; endStep: number; startPitch: number; endPitch: number } | null>(null)
  const [copiedNotes, setCopiedNotes] = useState<{ notes:{step:number;pitch:number}[]; width:number; delayUnit:1|2|4 } | null>(null)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [pitchDisplay, setPitchDisplay] = useState<'name' | 'clicks'>('name')
  const [menuOpen, setMenuOpen] = useState(false)
  const [delayMenuOpen,setDelayMenuOpen]=useState(false)
  const [view,setView] = useState<AppView>(()=>viewFromPath(window.location.pathname))
  const [blueprintViewState,setBlueprintViewState]=useState<BlueprintViewState>(DEFAULT_BLUEPRINT_VIEW)
  const [previewPitches,setPreviewPitches]=useState<number[]>([])
  const [playbackPitches,setPlaybackPitches]=useState<number[]>([])
  const [barsDraft, setBarsDraft] = useState(() => String(project.steps / 16))
  const [bpmDraft, setBpmDraft] = useState(() => String(Math.round(project.tickRate * 7.5)))
  const [titleDraft,setTitleDraft] = useState(project.title)
  const [followPlayback, setFollowPlayback] = useState(false)
  const [followRun, setFollowRun] = useState<{id:number;step:number} | null>(null)
  const desktopMedia='(min-width: 900px), (min-width: 700px) and (hover: hover) and (pointer: fine)'
  const [desktopLayout,setDesktopLayout]=useState(()=>window.matchMedia(desktopMedia).matches)
  const [activeVolumeTrackId,setActiveVolumeTrackId]=useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const rollRef = useRef<HTMLElement>(null)
  const rollViewportRef=useRef<HTMLDivElement>(null)
  const playbackCursorRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ originStep: number; originPitch: number; step: number; pitch: number; moved: boolean; existed: boolean; startX: number; startY: number; selecting?: boolean; group?: boolean; baseNotes?: Track['notes']; baseAllNotes?: Track['notes']; baseSelection?: NonNullable<typeof selection>; baseProject?: Project } | null>(null)
  const edgeScrollRef = useRef<{ x:number; y:number; frame:number }>({x:0,y:0,frame:0})
  const playbackSwipeRef = useRef<{pointerId:number;x:number;y:number} | null>(null)

  useEffect(()=>{
    const handlePopState=()=>setView(viewFromPath(window.location.pathname))
    window.addEventListener('popstate',handlePopState)
    return()=>window.removeEventListener('popstate',handlePopState)
  },[])

  useEffect(()=>{
    document.body.classList.toggle('editor-viewport-locked',view==='editor')
    return()=>document.body.classList.remove('editor-viewport-locked')
  },[view])

  useEffect(()=>{
    if(view==='creators')window.scrollTo(0,0)
  },[view])

  useEffect(()=>{
    if(!activeVolumeTrackId)return
    const releaseVolumeFader=()=>setActiveVolumeTrackId(null)
    window.addEventListener('pointerup',releaseVolumeFader)
    window.addEventListener('pointercancel',releaseVolumeFader)
    window.addEventListener('blur',releaseVolumeFader)
    return()=>{
      window.removeEventListener('pointerup',releaseVolumeFader)
      window.removeEventListener('pointercancel',releaseVolumeFader)
      window.removeEventListener('blur',releaseVolumeFader)
    }
  },[activeVolumeTrackId])

  const openView=(next:AppView,replace=false)=>{
    const path=pathFromView(next)
    if(window.location.pathname!==path)window.history[replace?'replaceState':'pushState']({},'',path)
    setView(next)
  }
  const toggleTrackPanel=(next:'tracks'|'settings')=>{
    setPanel(current=>current===next?null:next)
    setMenuOpen(false)
    setDelayMenuOpen(false)
  }
  const labelGestureRef = useRef<{pointerId:number;x:number;y:number;moved:boolean} | null>(null)
  const followIdRef = useRef(0)
  const followPlaybackRef = useRef(false)
  const historyRef = useRef<{past:Project[];future:Project[]}>({past:[],future:[]})
  const copyFeedbackTimerRef = useRef(0)
  const copiedModeRef=useRef(project.delayUnit)
  const barsValueRef = useRef(project.steps / 16)
  const barsHoldRef = useRef<{delay:number;repeat:number}>({delay:0,repeat:0})
  const pitchFlashTimersRef=useRef(new Map<number,number>())
  const projectRef=useRef(project)
  const activeIdRef=useRef(activeId)
  projectRef.current=project
  activeIdRef.current=activeId
  const active = project.tracks.find(t => t.id === activeId) ?? project.tracks[0]
  const instrument = INSTRUMENTS.find(item => item.id === active.instrument) ?? INSTRUMENTS[0]
  const copy = {
    ja: ['自動保存済み','BPM','最大同時発音','音','選択中のトラック','ゴースト','トラック名','音色','音量','下に置くブロック','入力','範囲','コピー','貼付','削除','縮小','拡大','メニュー','全削除','ミュート'],
    en: ['AUTOSAVED','BPM','MAX POLY','NOTES','ACTIVE TRACK','GHOST','TRACK NAME','INSTRUMENT','VOLUME','BLOCK BELOW','DRAW','SELECT','COPY','PASTE','DELETE','ZOOM OUT','ZOOM IN','MENU','CLEAR ALL','MUTE'],
    es: ['GUARDADO','BPM','POLIFONÍA','NOTAS','PISTA ACTIVA','FANTASMA','NOMBRE','INSTRUMENTO','VOLUMEN','BLOQUE INFERIOR','DIBUJAR','SELECCIÓN','COPIAR','PEGAR','BORRAR','ALEJAR','ACERCAR','MENÚ','BORRAR TODO','SILENCIAR'],
    fr: ['ENREGISTRÉ','BPM','POLYPHONIE','NOTES','PISTE ACTIVE','FANTÔME','NOM','INSTRUMENT','VOLUME','BLOC INFÉRIEUR','DESSINER','SÉLECTION','COPIER','COLLER','SUPPRIMER','RÉDUIRE','AGRANDIR','MENU','TOUT EFFACER','MUET'],
    de: ['GESPEICHERT','BPM','POLYPHONIE','NOTEN','AKTIVE SPUR','GHOST','SPURNAME','INSTRUMENT','LAUTSTÄRKE','BLOCK DARUNTER','ZEICHNEN','AUSWAHL','KOPIEREN','EINFÜGEN','LÖSCHEN','VERKLEINERN','VERGRÖSSERN','MENÜ','ALLES LÖSCHEN','STUMM'],
    zh: ['已自动保存','BPM','最大复音数','音符','当前音轨','重影','音轨名称','音色','音量','下方方块','输入','选择','复制','粘贴','删除','缩小','放大','菜单','全部清除','静音'],
    ko: ['자동 저장됨','BPM','최대 동시 발음','음','선택 트랙','고스트','트랙 이름','악기','음량','아래 블록','입력','선택','복사','붙여넣기','삭제','축소','확대','메뉴','전체 삭제','음소거'],
  }[language] ?? null
  const c = copy ?? ['AUTOSAVED','BPM','MAX POLY','NOTES','ACTIVE TRACK','GHOST','TRACK NAME','INSTRUMENT','VOLUME','BLOCK BELOW','DRAW','SELECT','COPY','PASTE','DELETE','ZOOM OUT','ZOOM IN','MENU','CLEAR ALL','MUTE']
  const t = { autosaved:c[0], bpm:c[1], maxPoly:c[2], notes:c[3], activeTrack:c[4], ghost:c[5], trackName:c[6], instrument:c[7], volume:c[8], block:c[9] }

  useEffect(() => { const id = window.setTimeout(() => localStorage.setItem(STORAGE, JSON.stringify(project)), 250); return () => clearTimeout(id) }, [project])
  useEffect(()=>{localStorage.setItem(LANGUAGE_STORAGE,language);document.documentElement.lang=language},[language])
  useEffect(()=>{const media=window.matchMedia(desktopMedia),sync=()=>setDesktopLayout(media.matches);media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[])
  useEffect(()=>{if(desktopLayout){setControlsOpen(true);setPanel(current=>current==='tracks'?null:current)}},[desktopLayout,view])
  useEffect(() => () => stopPlayback(), [])
  useEffect(()=>{barsValueRef.current=project.steps/16;setBarsDraft(String(project.steps/16))},[project.steps])
  useEffect(()=>()=>{window.clearTimeout(barsHoldRef.current.delay);window.clearInterval(barsHoldRef.current.repeat)},[])
  useEffect(()=>()=>pitchFlashTimersRef.current.forEach(window.clearTimeout),[])
  useEffect(()=>{followPlaybackRef.current=followPlayback},[followPlayback])
  useEffect(()=>{if(copiedModeRef.current!==project.delayUnit){setCopiedNotes(null);setCopyFeedback(false);window.clearTimeout(copyFeedbackTimerRef.current)}copiedModeRef.current=project.delayUnit},[project.delayUnit])
  useEffect(() => {
    const viewport=rollViewportRef.current
    if (!followRun || !rollRef.current || !playbackCursorRef.current || !viewport) return
    const startedAt = performance.now()+80
    const stepMs = 2000/project.tickRate
    const renderStep = (step:number) => {
      const position=step/project.delayUnit*stepHeight
      playbackCursorRef.current?.style.setProperty('transform',desktopLayout?`translateX(${position}px)`:`translateY(${position}px)`)
      if(followPlaybackRef.current){if(desktopLayout)viewport.scrollLeft=Math.max(0,position-viewport.clientWidth/2);else viewport.scrollTop=Math.max(0,position-viewport.clientHeight/2)}
    }
    renderStep(followRun.step)
    let frame = 0
    const follow = (now:number) => {
      const step = Math.min(project.steps-1,followRun.step+Math.max(0,now-startedAt)/stepMs)
      renderStep(step)
      frame = window.requestAnimationFrame(follow)
    }
    frame = window.requestAnimationFrame(follow)
    return ()=>window.cancelAnimationFrame(frame)
  },[followRun,project.steps,project.tickRate,project.delayUnit,stepHeight,desktopLayout])

  const polyphony = useMemo(() => {
    const counts = new Map<number, number>()
    project.tracks.forEach(t => t.notes.forEach(n => counts.set(n.step, (counts.get(n.step) ?? 0) + 1)))
    return Math.max(0, ...counts.values())
  }, [project])
  const polyphonyByStep=useMemo(()=>{const counts=new Map<number,number>();project.tracks.forEach(track=>track.notes.forEach(note=>counts.set(note.step,(counts.get(note.step)??0)+1)));return counts},[project.tracks])

  const flashPitch=(pitch:number)=>{
    setPreviewPitches(current=>current.includes(pitch)?current:[...current,pitch])
    const previous=pitchFlashTimersRef.current.get(pitch)
    if(previous)window.clearTimeout(previous)
    const timer=window.setTimeout(()=>{pitchFlashTimersRef.current.delete(pitch);setPreviewPitches(current=>current.filter(value=>value!==pitch))},240)
    pitchFlashTimersRef.current.set(pitch,timer)
  }
  const auditionPitch=(pitch:number)=>{void previewTone(pitch,active.volume,active.instrument).then(()=>flashPitch(pitch)).catch(error=>console.error('Pitch preview failed.',error))}
  const currentTrackPitchesAt=(step:number)=>{
    const current=projectRef.current,track=current.tracks.find(value=>value.id===activeIdRef.current)
    if(!track||track.muted||(current.tracks.some(value=>value.solo)&&!track.solo))return []
    return [...new Set(track.notes.filter(note=>note.step===step).map(note=>note.pitch))]
  }
  const soundingPitches=useMemo(()=>new Set([...previewPitches,...playbackPitches]),[previewPitches,playbackPitches])

  const commitProject = (change:(current:Project)=>Project) => setProject(current=>{
    const next = change(current)
    if (next === current) return current
    historyRef.current.past.push(current)
    if (historyRef.current.past.length > 100) historyRef.current.past.shift()
    historyRef.current.future = []
    return next
  })
  const syncProjectControls = (next:Project) => {
    if (!next.tracks.some(track=>track.id===activeId)) setActiveId(next.tracks[0].id)
    setBarsDraft(String(next.steps/16));setBpmDraft(String(Math.round(next.tickRate*7.5)));setTitleDraft(next.title)
  }
  const undo = () => {
    const previous = historyRef.current.past.pop()
    if (!previous) return
    historyRef.current.future.push(project);setProject(previous);syncProjectControls(previous)
  }
  const redo = () => {
    const next = historyRef.current.future.pop()
    if (!next) return
    historyRef.current.past.push(project);setProject(next);syncProjectControls(next)
  }
  const updateTrack = (patch: Partial<Track>) => commitProject(p => ({ ...p, tracks: p.tracks.map(t => t.id === activeId ? { ...t, ...patch } : t) }))
  const changeActiveNotes = (change: (notes: Track['notes']) => Track['notes']) => commitProject(p => ({ ...p, tracks: p.tracks.map(track => track.id === activeId ? { ...track, notes: change(track.notes) } : track) }))
  const setDraggedNote = (fromStep: number, fromPitch: number, step: number, pitch: number) => changeActiveNotes(notes => [...notes.filter(n => !(n.step === fromStep && n.pitch === fromPitch) && !(n.step === step && n.pitch === pitch)), { step, pitch }])
  const normalizedSelection = selection && { minStep: Math.min(selection.startStep, selection.endStep), maxStep: Math.max(selection.startStep, selection.endStep), minPitch: Math.min(selection.startPitch, selection.endPitch), maxPitch: Math.max(selection.startPitch, selection.endPitch) }
  const isSelected = (step: number, pitch: number) => Boolean(normalizedSelection && step >= normalizedSelection.minStep && step <= normalizedSelection.maxStep && pitch >= normalizedSelection.minPitch && pitch <= normalizedSelection.maxPitch)
  const updateSelectionEndAt = (x:number,y:number) => {
    const target = document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-step][data-pitch]')
    if (!target || !dragRef.current?.selecting) return
    const step = Number(target.dataset.step)
    const pitch = Number(target.dataset.pitch)
    dragRef.current.moved = true; dragRef.current.step = step; dragRef.current.pitch = pitch
    setSelection(current => current ? {...current,endStep:step,endPitch:pitch}:current)
  }
  const runEdgeScroll = () => {
    edgeScrollRef.current.frame = 0
    const viewport=rollViewportRef.current
    if (!dragRef.current?.selecting||!viewport) return
    const rect=viewport.getBoundingClientRect()
    const zone = 56
    const pointer=desktopLayout?edgeScrollRef.current.x:edgeScrollRef.current.y
    const start=desktopLayout?rect.left:rect.top,end=desktopLayout?rect.right:rect.bottom
    const speed = pointer < start+zone ? -Math.min(14,(start+zone-pointer)/4) : pointer > end-zone ? Math.min(14,(pointer-(end-zone))/4) : 0
    if (!speed) return
    if(desktopLayout)viewport.scrollLeft+=speed;else viewport.scrollTop+=speed
    updateSelectionEndAt(Math.max(rect.left+2,Math.min(rect.right-2,edgeScrollRef.current.x)),Math.max(rect.top+2,Math.min(rect.bottom-2,edgeScrollRef.current.y)))
    edgeScrollRef.current.frame = window.requestAnimationFrame(runEdgeScroll)
  }
  const handlePlaybackSwipeDown = (event:React.PointerEvent<HTMLElement>) => {
    if (playingStep >= 0 && event.isPrimary) playbackSwipeRef.current = {pointerId:event.pointerId,x:event.clientX,y:event.clientY}
  }
  const handlePlaybackSwipeMove = (event:React.PointerEvent<HTMLElement>) => {
    const start = playbackSwipeRef.current
    if (!start || start.pointerId !== event.pointerId) return
    if (Math.hypot(event.clientX-start.x,event.clientY-start.y) > 10) {
      setFollowPlayback(false)
      playbackSwipeRef.current = null
    }
  }
  const handlePlaybackSwipeEnd = (event:React.PointerEvent<HTMLElement>) => {
    if (playbackSwipeRef.current?.pointerId === event.pointerId) playbackSwipeRef.current = null
  }
  const handlePointerDown = (event: React.PointerEvent, step: number, pitch: number) => {
    if (editMode === 'select') {
      event.currentTarget.setPointerCapture(event.pointerId)
      if (selection && isSelected(step, pitch) && active.notes.some(n => n.step === step && n.pitch === pitch)) {
        dragRef.current = { originStep: step, originPitch: pitch, step, pitch, moved: false, existed: true, startX:event.clientX, startY:event.clientY, group: true, baseNotes: active.notes.filter(n => isSelected(n.step, n.pitch)), baseAllNotes:active.notes, baseSelection: selection, baseProject:project }
        return
      }
      setSelection({ startStep: step, endStep: step, startPitch: pitch, endPitch: pitch })
      dragRef.current = { originStep: step, originPitch: pitch, step, pitch, moved: false, existed: false, startX:event.clientX, startY:event.clientY, selecting: true }
      return
    }
    const existed = active.notes.some(n => n.step === step && n.pitch === pitch)
    if (existed) event.currentTarget.setPointerCapture(event.pointerId)
    if(existed)setDragPreview({originStep:step,originPitch:pitch,step,pitch})
    dragRef.current = { originStep: step, originPitch: pitch, step, pitch, moved: false, existed, startX:event.clientX, startY:event.clientY }
  }
  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    if (drag.selecting) {
      edgeScrollRef.current.x = event.clientX; edgeScrollRef.current.y = event.clientY
      if (!edgeScrollRef.current.frame) edgeScrollRef.current.frame = window.requestAnimationFrame(runEdgeScroll)
    }
    if (!drag.existed && !drag.selecting && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 7) { drag.moved = true; return }
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-step][data-pitch]')
    if (!target) return
    const step = Number(target.dataset.step)
    const pitch = Number(target.dataset.pitch)
    if (step === drag.step && pitch === drag.pitch) return
    if (drag.group && drag.baseNotes && drag.baseAllNotes && drag.baseSelection) {
      const base = drag.baseSelection
      const minStep=Math.min(base.startStep,base.endStep),maxStep=Math.max(base.startStep,base.endStep)
      const minPitch=Math.min(base.startPitch,base.endPitch),maxPitch=Math.max(base.startPitch,base.endPitch)
      const ds = Math.max(-minStep,Math.min(project.steps-1-maxStep,step-drag.originStep))
      const dp = Math.max(-minPitch,Math.min(24-maxPitch,pitch-drag.originPitch))
      if(drag.step===drag.originStep+ds&&drag.pitch===drag.originPitch+dp)return
      const original = drag.baseNotes
      const moved=original.map(n=>({step:n.step+ds,pitch:n.pitch+dp}))
      const remaining=drag.baseAllNotes.filter(n=>!original.some(o=>o.step===n.step&&o.pitch===n.pitch)&&!moved.some(item=>item.step===n.step&&item.pitch===n.pitch))
      setProject(p=>({...p,tracks:p.tracks.map(track=>track.id===activeId?{...track,notes:[...remaining,...moved]}:track)}))
      setSelection({ startStep: base.startStep + ds, endStep: base.endStep + ds, startPitch: base.startPitch + dp, endPitch: base.endPitch + dp })
      if (drag.originPitch+dp !== drag.pitch) auditionPitch(drag.originPitch+dp)
      drag.moved = true; drag.step = drag.originStep+ds; drag.pitch = drag.originPitch+dp
      return
    }
    if (drag.selecting) {
      drag.moved = true; drag.step = step; drag.pitch = pitch
      setSelection(current => current ? { ...current, endStep: step, endPitch: pitch } : current)
      return
    }
    drag.moved = true
    if(drag.existed)setDragPreview({originStep:drag.originStep,originPitch:drag.originPitch,step,pitch})
    if (pitch !== drag.pitch) auditionPitch(pitch)
    drag.step = step; drag.pitch = pitch
  }
  const handlePointerUp = () => {
    if (edgeScrollRef.current.frame) window.cancelAnimationFrame(edgeScrollRef.current.frame)
    edgeScrollRef.current.frame = 0
    const drag = dragRef.current
    if (drag?.group&&drag.moved&&drag.baseProject){historyRef.current.past.push(drag.baseProject);if(historyRef.current.past.length>100)historyRef.current.past.shift();historyRef.current.future=[]}
    if (drag?.existed && !drag.moved && !drag.selecting && !drag.group) changeActiveNotes(notes => notes.filter(n => n.step !== drag.originStep || n.pitch !== drag.originPitch))
    if (drag?.existed && drag.moved && !drag.selecting && !drag.group) setDraggedNote(drag.originStep,drag.originPitch,drag.step,drag.pitch)
    if (drag && !drag.existed && !drag.moved && !drag.selecting) {
      setDraggedNote(drag.originStep, drag.originPitch, drag.originStep, drag.originPitch)
      auditionPitch(drag.originPitch)
    }
    setDragPreview(null);dragRef.current = null
  }
  const copySelection = () => {
    if (!normalizedSelection) return
    setCopiedNotes({notes:active.notes.filter(n => isSelected(n.step,n.pitch)).map(n=>({step:n.step-normalizedSelection.minStep,pitch:n.pitch})),width:normalizedSelection.maxStep-normalizedSelection.minStep+project.delayUnit,delayUnit:project.delayUnit})
    setCopyFeedback(true)
    window.clearTimeout(copyFeedbackTimerRef.current)
    copyFeedbackTimerRef.current=window.setTimeout(()=>setCopyFeedback(false),700)
  }
  const pasteSelection = () => {
    if (!copiedNotes?.notes.length||copiedNotes.delayUnit!==project.delayUnit) return
    const pasted = copiedNotes.notes.map(note=>({step:playhead+note.step,pitch:note.pitch})).filter(note=>note.step<project.steps&&note.step%project.delayUnit===0)
    changeActiveNotes(notes=>[...notes.filter(note=>!pasted.some(item=>item.step===note.step&&item.pitch===note.pitch)),...pasted])
    const nextBoundary=Math.ceil((playhead+copiedNotes.width)/project.delayUnit)*project.delayUnit
    setPlayhead(Math.min(project.steps-project.delayUnit,nextBoundary))
  }
  const deleteSelection = () => normalizedSelection && changeActiveNotes(notes => notes.filter(n => !isSelected(n.step, n.pitch)))
  const cutSelection = () => {
    if (!normalizedSelection) return
    copySelection()
    deleteSelection()
  }
  const pitchSets = {
    ja:['ファ♯','ソ','ソ♯','ラ','ラ♯','シ','ド','ド♯','レ','レ♯','ミ','ファ'],
    abc:['F♯','G','G♯','A','A♯','B','C','C♯','D','D♯','E','F'],
  }
  const pitchBase = language === 'ja' ? pitchSets.ja : pitchSets.abc
  const pitchNames = PITCHES.map(p => pitchBase[p % 12])
  const pitchLabel = (name:string) => { const [base, sharp] = name.split('♯'); return <>{base}{sharp !== undefined && <span className="sharp">♯</span>}</> }
  const isBlack = (pitch: number) => [0, 2, 4, 7, 9].includes(pitch % 12)
  const isDo = (pitch: number) => pitch % 12 === 6
  const playFrom = async (step:number) => {
    stopPlayback(); setPlaybackPitches([]); setPlayingStep(step); setFollowPlayback(true); setFollowRun({id:++followIdRef.current,step}); setPlayhead(step)
    await playProject(project,step,value=>{setPlayingStep(value);if(value<0){setPlaybackPitches([]);setFollowPlayback(false);setFollowRun(null)}else setPlaybackPitches(currentTrackPitchesAt(value))})
  }
  const togglePlay = async () => { if (playingStep >= 0) { stopPlayback(); setPlayingStep(-1); setPlaybackPitches([]); setFollowPlayback(false); setFollowRun(null) } else await playFrom(playhead) }
  const seekFromLabel = (event: React.PointerEvent | React.MouseEvent, step:number, play=false) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const after=desktopLayout?event.clientX-rect.left>rect.width/2:event.clientY-rect.top>rect.height/2
    const boundary = Math.min(project.steps - project.delayUnit, step + (after ? project.delayUnit : 0))
    setPlayhead(boundary)
    if (play || playingStep >= 0) void playFrom(boundary)
  }
  const handleLabelDown = (event:React.PointerEvent) => {labelGestureRef.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,moved:false}}
  const handleLabelMove = (event:React.PointerEvent) => {const gesture=labelGestureRef.current;if(gesture?.pointerId===event.pointerId&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8)gesture.moved=true}
  const handleLabelUp = (event:React.PointerEvent,step:number) => {const gesture=labelGestureRef.current;labelGestureRef.current=null;if(gesture?.pointerId===event.pointerId&&!gesture.moved)seekFromLabel(event,step)}
  const save = () => { const exportProject={...project,format:'oto-blogic'};const blob = new Blob([JSON.stringify(exportProject, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${project.title || 'untitled'}.obg`; a.click(); URL.revokeObjectURL(a.href) }
  const load = async (file?: File) => { if (!file) return; const data = JSON.parse(await file.text()); if (!['oto-blogic','note-block-maker'].includes(data.format) || data.version !== 1) throw new Error('対応していない.obg/.nbmファイルです'); const migrated = normalizeProject(data);commitProject(()=>migrated);setActiveId(migrated.tracks[0].id);setBarsDraft(String(migrated.steps/16));setBpmDraft(String(Math.round(migrated.tickRate*7.5))) }
  const clearAll = () => {
    const saveFirst = window.confirm(language === 'ja' ? '全削除の前に現在のデータを保存しますか？\n「キャンセル」で保存せず次へ進みます。' : 'Save the current data before clearing?\nCancel continues without saving.')
    if (saveFirst) save()
    if (!window.confirm(language === 'ja' ? 'すべてのノートを削除します。この操作は取り消せません。よろしいですか？' : 'Delete every note? This cannot be undone.')) return
    stopPlayback(); setFollowPlayback(false); setFollowRun(null); setPlaybackPitches([]); setPreviewPitches([])
    const fresh = createInitialProject()
    historyRef.current={past:[],future:[]};setProject(fresh); setActiveId(fresh.tracks[0].id); setSelection(null); setCopiedNotes(null); setPlayhead(0); setPlayingStep(-1); setStepHeight(30); setGhosts(true); setEditMode('input'); setPanel(null); setBarsDraft('4'); setBpmDraft('150'); setTitleDraft(fresh.title); setMenuOpen(false);setBlueprintViewState(DEFAULT_BLUEPRINT_VIEW)
  }
  const applyBars = (raw = barsDraft) => {
    const requested = Number(raw)
    if (!Number.isFinite(requested) || requested < 1) { setBarsDraft(String(project.steps / 16)); return }
    const bars = Math.max(1, Math.min(999, Math.round(requested)))
    const nextSteps = bars * 16
    const outside = project.tracks.reduce((count,track) => count + track.notes.filter(note => note.step >= nextSteps).length, 0)
    if (outside && !window.confirm(language === 'ja' ? `${bars}小節へ短縮すると、範囲外のノート${outside}個が削除されます。続行しますか？` : `Shortening to ${bars} bars will delete ${outside} notes outside the new range. Continue?`)) { setBarsDraft(String(project.steps / 16)); return }
    barsValueRef.current=bars
    commitProject(p => ({...p,steps:nextSteps,tracks:p.tracks.map(track=>({...track,notes:track.notes.filter(note=>note.step<nextSteps)}))}))
    setPlayhead(step => Math.min(step,nextSteps-1)); setBarsDraft(String(bars))
  }
  const stopBarsHold = () => {window.clearTimeout(barsHoldRef.current.delay);window.clearInterval(barsHoldRef.current.repeat);barsHoldRef.current={delay:0,repeat:0}}
  const adjustBars = (delta:number) => {const next=Math.max(1,Math.min(999,barsValueRef.current+delta));if(next!==barsValueRef.current)applyBars(String(next))}
  const startBarsHold = (delta:number,event:React.PointerEvent<HTMLButtonElement>) => {event.preventDefault();stopBarsHold();adjustBars(delta);barsHoldRef.current.delay=window.setTimeout(()=>{barsHoldRef.current.repeat=window.setInterval(()=>adjustBars(delta),125)},450)}
  const applyDelayMode = (next:1|2|4) => {
    if(next===project.delayUnit){setDelayMenuOpen(false);return}
    const invalid=project.tracks.reduce((count,track)=>count+track.notes.filter(note=>note.step%next!==0).length,0)
    if(invalid){
      window.alert(language==='ja'
        ? `${next}遅延モードでは、${next}目盛ごとの位置にだけノートを置けます。\n現在のノート${invalid}個がその位置に合わないため、切り替えませんでした。`
        : `${next}-delay mode only accepts notes on every ${next}th base step.\n${invalid} existing note(s) do not align, so the mode was not changed.`)
      return
    }
    stopPlayback();setPlayingStep(-1);setPlaybackPitches([]);setFollowPlayback(false);setFollowRun(null)
    commitProject(current=>({...current,delayUnit:next}))
    setPlayhead(value=>Math.floor(value/next)*next);setSelection(null);setDragPreview(null);setDelayMenuOpen(false)
  }
  const commitBpm = (raw = bpmDraft) => {
    const requested = Number(raw)
    if (!Number.isFinite(requested) || requested < 8) { setBpmDraft(String(bpm)); return }
    const next = Math.min(7500, Math.round(requested))
    commitProject(p => ({...p,tickRate:next / 7.5})); setBpmDraft(String(next))
  }
  const zoomSteps = (delta:number) => {
    const next = Math.max(6,Math.min(30,stepHeight+delta))
    if (next === stepHeight) return
    const viewport=rollViewportRef.current
    const anchor=viewport?(desktopLayout?viewport.scrollLeft+viewport.clientWidth/2:viewport.scrollTop+viewport.clientHeight/2):0
    const stepAtAnchor=anchor/stepHeight
    flushSync(() => setStepHeight(next))
    if(viewport){if(desktopLayout)viewport.scrollLeft=Math.max(0,stepAtAnchor*next-viewport.clientWidth/2);else viewport.scrollTop=Math.max(0,stepAtAnchor*next-viewport.clientHeight/2)}
  }
  const handleRollWheel=(event:React.WheelEvent<HTMLDivElement>)=>{
    if(!desktopLayout)return
    if(event.ctrlKey||event.metaKey){event.preventDefault();zoomSteps(event.deltaY<0?2:-2);return}
    if(Math.abs(event.deltaY)>Math.abs(event.deltaX)){event.preventDefault();event.currentTarget.scrollLeft+=event.deltaY}
  }
  const bpm = Math.round(project.tickRate * 7.5)

  useEffect(()=>{
    if(!desktopLayout||view!=='editor')return
    const handleShortcut=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null
      if(target&&(target.matches('input,textarea,select')||target.isContentEditable))return
      const key=event.key.toLowerCase(),command=event.ctrlKey||event.metaKey
      if(command&&key==='c'&&normalizedSelection){event.preventDefault();copySelection();return}
      if(command&&key==='x'&&normalizedSelection){event.preventDefault();cutSelection();return}
      if(command&&key==='v'&&copiedNotes?.notes.length){event.preventDefault();pasteSelection();return}
      if(command&&key==='z'){event.preventDefault();event.shiftKey?redo():undo();return}
      if((event.key==='Backspace'||event.key==='Delete')&&normalizedSelection){event.preventDefault();deleteSelection()}
    }
    window.addEventListener('keydown',handleShortcut)
    return()=>window.removeEventListener('keydown',handleShortcut)
  },[desktopLayout,view,normalizedSelection,copiedNotes,project,activeId,playhead])

  if(view==='home')return <HomePage language={language} setLanguage={setLanguage} onStart={()=>openView('editor')} onCreators={()=>openView('creators')}/>
  if(view==='creators')return <CreatorsPage language={language} setLanguage={setLanguage} onBack={()=>openView('home')} onStart={()=>openView('editor')}/>
  if(view==='guide')return <EditorGuidePage language={language} setLanguage={setLanguage} onBack={()=>openView('editor')} onHome={()=>openView('home')}/>
  if(view==='blueprint')return <BlueprintView project={project} instruments={INSTRUMENTS} language={language} initialViewState={blueprintViewState} onBack={state=>{setBlueprintViewState(state);openView('editor',true)}} onHome={()=>openView('home')} onSettingsChange={blueprint=>commitProject(current=>({...current,blueprint}))}/>

  return <main className="app">
    <div className={`control-panel ${controlsOpen ? '' : 'collapsed'}`}>
    <header className="topbar">
      <div className="brand"><button className="brand-home" onClick={()=>openView('home')} aria-label={language==='ja'?'トップページへ':'Go to home'}><img className="brand-icon" src="/assets/branding/oto-blogic-icon.svg" alt="" /></button><div><img className="brand-logo" src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC" /><input value={titleDraft} onChange={e=>setTitleDraft(e.target.value)} onBlur={e=>{const title=e.currentTarget.value.trim()||project.title;setTitleDraft(title);if(title!==project.title)commitProject(p=>({...p,title}))}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}} aria-label="曲名" /></div></div>
      <div className="top-actions"><button className="editor-guide-trigger" onClick={()=>openView('guide')}>{language==='ja'?'使い方':'GUIDE'}</button><select className="language" value={language} onChange={e => setLanguage(e.target.value)} aria-label="Language"><option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="zh">简体中文</option><option value="zh-tw">繁體中文</option><option value="ko">한국어</option><option value="id">Bahasa Indonesia</option></select></div>
    </header>

    <section className="transport">
      <button className="play" onClick={togglePlay} aria-label={playingStep >= 0 ? '停止' : '再生'}><img className="transport-icon" src={playingStep >= 0 ? '/assets/icons/stop.svg' : '/assets/icons/play.svg'} alt="" aria-hidden="true" /></button>
      <button className="cue" onClick={() => { stopPlayback(); setPlayingStep(-1); setPlaybackPitches([]); setFollowPlayback(false); setFollowRun(null); setPlayhead(0) }} aria-label="先頭へ"><img className="transport-icon" src="/assets/icons/cue.svg" alt="" aria-hidden="true" /></button>
      <label className={`tick bpm ${bpm < 150 ? 'slow' : bpm > 150 ? 'fast' : 'standard'}`}><small>{t.bpm}</small><input type="text" inputMode="numeric" value={bpmDraft} onChange={e => setBpmDraft(e.target.value.replace(/[^0-9]/g,''))} onBlur={e => commitBpm(e.currentTarget.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} /><span>≒ {(Math.round(project.tickRate * 10) / 10).toFixed(1)} TPS</span></label>
      <div className={`poly ${polyphony > 9 ? 'warn' : ''}`}><small>{t.maxPoly}</small><strong>{polyphony}<em>{t.notes}</em></strong></div>
      <div className="tick bars"><small>{language === 'ja' ? '小節数' : 'BARS'}</small><div className="number-stepper"><input aria-label={language==='ja'?'小節数を入力':'Enter bars'} type="text" inputMode="numeric" value={barsDraft} onChange={event=>setBarsDraft(event.target.value.replace(/[^0-9]/g,''))} onBlur={event=>applyBars(event.currentTarget.value)} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur()}}/><span>{language === 'ja' ? '小節' : 'BARS'}</span><div><button aria-label={language==='ja'?'小節数を増やす':'Increase bars'} onPointerDown={event=>startBarsHold(1,event)} onPointerUp={stopBarsHold} onPointerLeave={stopBarsHold} onPointerCancel={stopBarsHold} onClick={event=>{if(event.detail===0)adjustBars(1)}}>▲</button><button aria-label={language==='ja'?'小節数を減らす':'Decrease bars'} onPointerDown={event=>startBarsHold(-1,event)} onPointerUp={stopBarsHold} onPointerLeave={stopBarsHold} onPointerCancel={stopBarsHold} onClick={event=>{if(event.detail===0)adjustBars(-1)}}>▼</button></div></div></div>
      <button className="desktop-transport-menu" onClick={()=>{setMenuOpen(!menuOpen);setDelayMenuOpen(false);setPanel(null)}} aria-label={c[17]}><span className="hamburger-icon" aria-hidden="true"/></button>
    </section>

    <section className="track-strip" style={{ '--track': active.color } as React.CSSProperties}>
      <button className="track-main" onClick={() => toggleTrackPanel('tracks')}><span className={`block-chip ${instrument.texture}`}>{String(project.tracks.indexOf(active) + 1).padStart(2, '0')}</span><span><small>{t.activeTrack}</small><strong>{active.name}</strong></span><b>{panel === 'tracks' ? '⌃' : '⌄'}</b></button>
      <button className="track-settings-trigger" onClick={() => toggleTrackPanel('settings')}><img src="/assets/icons/settings.svg" alt="" aria-hidden="true" /><small>{language === 'ja' ? 'トラック設定' : 'TRACK SET'}</small></button>
      <button className={ghosts ? 'on' : ''} onClick={() => setGhosts(!ghosts)}><GhostIcon /><small>{t.ghost}</small></button>
    </section>

    {panel === 'tracks' && <div className="drawer mixer-list">{project.tracks.map((track, i) => {
      const trackInstrument = INSTRUMENTS.find(item => item.id === track.instrument) ?? INSTRUMENTS[0]
      const patchTrack = (patch:Partial<Track>) => commitProject(p => ({...p, tracks:p.tracks.map(item => item.id === track.id ? {...item,...patch}:item)}))
      return <div key={track.id} className={`track-row ${track.id === activeId ? 'selected' : ''}`} style={{'--row-color':track.color} as React.CSSProperties}>
        <button className="track-select" onClick={() => setActiveId(track.id)}><b className={`track-number ${trackInstrument.texture} ${track.notes.length?'':'empty'}`}>{String(i + 1).padStart(2, '0')}</b><span><strong>{track.name}</strong><small>{language === 'ja' ? trackInstrument.ja : trackInstrument.en}</small></span></button>
        <div className="track-switches"><button className={track.ghostEnabled ? 'on' : ''} onClick={() => patchTrack({ghostEnabled:!track.ghostEnabled})} title="Ghost"><GhostIcon /></button><button className={track.muted ? 'danger' : ''} onClick={() => patchTrack({muted:!track.muted})} title="Mute">M</button><button className={track.solo ? 'solo' : ''} onClick={() => patchTrack({solo:!track.solo})} title="Solo">S</button></div>
        <label className="track-volume"><span>VOL</span><input type="range" min="0" max="1" step=".01" value={track.volume} onChange={e => patchTrack({volume:+e.target.value})} /><b>{Math.round(track.volume*100)}</b></label>
      </div>
    })}</div>}
    {panel === 'settings' && <div className="drawer settings"><label>{t.trackName}<input value={active.name} onChange={e => updateTrack({ name: e.target.value.toUpperCase() })} /></label><label>{t.instrument}<select value={active.instrument} onChange={e => updateTrack({ instrument: e.target.value })}>{INSTRUMENTS.map(x => <option key={x.id} value={x.id}>{language === 'ja' ? x.ja : x.en} — {instrumentBlockName(x,language)}</option>)}</select></label><div className="block-guide"><i className={`block-preview ${instrument.texture}`} /><span><small>{t.block}</small><b>{instrumentBlockName(instrument,language)}</b></span></div><label>{t.volume} <b>{Math.round(active.volume * 100)}</b><input type="range" min="0" max="1" step=".01" value={active.volume} onChange={e => updateTrack({ volume: +e.target.value })} /></label><label>PAN <b>{Math.round(active.pan * 100)}</b><input type="range" min="-1" max="1" step=".01" value={active.pan} onChange={e => updateTrack({ pan: +e.target.value })} /></label><div className="setting-switches"><button className={active.muted ? 'danger' : ''} onClick={() => updateTrack({muted:!active.muted})}>M {c[19]}</button><button className={active.solo ? 'solo' : ''} onClick={() => updateTrack({solo:!active.solo})}>S SOLO</button></div></div>}
    <button className="panel-toggle" onClick={() => setControlsOpen(!controlsOpen)} aria-label={controlsOpen ? '操作パネルを収納' : '操作パネルを表示'}>{controlsOpen ? '⌃' : '⌄'}</button>
    <nav className="edit-tools">
      <button className={editMode === 'input' ? 'active' : ''} onClick={() => { setEditMode('input'); setSelection(null) }}><span className="tool-icon">✎</span><small>{c[10]}</small></button>
      <button className={editMode === 'select' ? 'active' : ''} onClick={() => setEditMode('select')}><span className="tool-icon tool-select">▧</span><small>{c[11]}</small></button>
      <button className={copyFeedback?'copied':''} onClick={copySelection} disabled={!normalizedSelection}><span className="tool-icon">{copyFeedback?'✓':'⧉'}</span><small>{c[12]}</small></button>
      <button className="cut-tool" onClick={cutSelection} disabled={!normalizedSelection}><span className="tool-icon">✂</span><small>{language==='ja'?'カット':'CUT'}</small></button>
      <button onClick={pasteSelection} disabled={!copiedNotes?.notes.length}><span className="tool-icon tool-paste">⎘</span><small>{c[13]}</small></button>
      <button className="delete-tool" onClick={deleteSelection} disabled={!normalizedSelection}><span className="tool-icon">⌫</span><small>{c[14]}</small></button>
      <button className="desktop-utility" aria-label="元に戻す" onClick={undo} disabled={!historyRef.current.past.length}><span className="tool-icon">↶</span><small>UNDO</small></button>
      <button className="desktop-utility" aria-label="やり直す" onClick={redo} disabled={!historyRef.current.future.length}><span className="tool-icon">↷</span><small>REDO</small></button>
      <button className={`desktop-utility delay-mode-button ${delayMenuOpen?'active':''}`} onClick={()=>{setDelayMenuOpen(value=>!value);setMenuOpen(false);setPanel(null)}}><span className="tool-icon delay-mode-icon"><b>{project.delayUnit}</b></span><small>{language==='ja'?'モード':'MODE'}</small></button>
      <button className={`desktop-utility desktop-track-settings ${panel==='settings'?'active':''}`} onClick={()=>toggleTrackPanel('settings')}><img className="tool-icon" src="/assets/icons/settings.svg" alt="" aria-hidden="true"/><small>{language==='ja'?'トラック設定':'TRACK SET'}</small></button>
      <button className={`desktop-utility desktop-ghost-toggle ${ghosts?'active':''}`} onClick={()=>setGhosts(!ghosts)}><GhostIcon/><small>{t.ghost}</small></button>
      <button className="desktop-utility desktop-menu" onClick={()=>{setMenuOpen(!menuOpen);setDelayMenuOpen(false);setPanel(null)}}><span className="tool-icon">•••</span><small>{c[17]}</small></button>
      <button className="zoom-out" onClick={() => zoomSteps(-4)}><span className="tool-icon">−</span><small>{c[15]}</small></button>
      <button className="zoom-in" onClick={() => zoomSteps(4)}><span className="tool-icon">+</span><small>{c[16]}</small></button>
    </nav>

    <div className="pitch-head">{PITCHES.map(p => <b key={p} role="button" tabIndex={0} onPointerDown={event=>{if(event.isPrimary&&event.button===0)auditionPitch(p)}} onClick={event=>{if(event.detail===0)auditionPitch(p)}} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); auditionPitch(p) } }} aria-label={`${pitchNames[p]}を試聴`} className={`${isBlack(p) ? 'black' : 'white'} ${isDo(p) ? 'do' : ''} ${soundingPitches.has(p)?'sounding':''}`}>{pitchDisplay === 'name' ? pitchLabel(pitchNames[p]) : p}</b>)}<button className="pitch-toggle" onClick={() => setPitchDisplay(v => v === 'name' ? 'clicks' : 'name')} aria-label="音名とクリック数を切替"><span>↻</span>{pitchDisplay === 'name' ? '012' : language === 'ja' ? 'ドレミ' : 'ABC'}</button></div>
    </div>
    <div className="roll-stage">
      <aside className="desktop-track-sidebar" aria-label={language==='ja'?'トラック一覧':'Track list'}><div className="desktop-track-scroll">{project.tracks.map((track,i)=>{
        const trackInstrument=INSTRUMENTS.find(item=>item.id===track.instrument)??INSTRUMENTS[0]
        const patchTrack=(patch:Partial<Track>)=>commitProject(current=>({...current,tracks:current.tracks.map(item=>item.id===track.id?{...item,...patch}:item)}))
        return <article key={track.id} className={track.id===activeId?'selected':''} style={{'--row-color':track.color} as React.CSSProperties}>
          <button className="desktop-track-select" onClick={()=>setActiveId(track.id)}><b className={`desktop-track-texture ${trackInstrument.texture} ${track.notes.length?'':'empty'}`}>{String(i+1).padStart(2,'0')}</b><span><strong>{track.name}</strong><small>{language==='ja'?trackInstrument.ja:trackInstrument.en}</small></span></button>
          <div className="desktop-track-controls"><button className={track.ghostEnabled?'on':''} onClick={()=>patchTrack({ghostEnabled:!track.ghostEnabled})} title="Ghost"><GhostIcon/></button><button className={track.muted?'danger':''} onClick={()=>patchTrack({muted:!track.muted})} title="Mute">M</button><button className={track.solo?'solo':''} onClick={()=>patchTrack({solo:!track.solo})} title="Solo">S</button><label className="desktop-track-fader" style={{'--volume':track.volume} as React.CSSProperties}><input aria-label={`${track.name} volume`} type="range" min="0" max="1" step=".01" value={track.volume} onPointerDown={()=>setActiveVolumeTrackId(track.id)} onPointerUp={()=>setActiveVolumeTrackId(null)} onPointerCancel={()=>setActiveVolumeTrackId(null)} onBlur={()=>setActiveVolumeTrackId(null)} onChange={event=>patchTrack({volume:+event.target.value})}/>{activeVolumeTrackId===track.id&&<output>{Math.round(track.volume*100)}</output>}</label></div>
        </article>
      })}</div></aside>
      <div className="pc-pitch-head">{[...PITCHES].reverse().map(p => <b key={p} role="button" tabIndex={0} onPointerDown={event=>{if(event.isPrimary&&event.button===0)auditionPitch(p)}} onClick={event=>{if(event.detail===0)auditionPitch(p)}} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); auditionPitch(p) } }} aria-label={`${pitchNames[p]}を試聴`} className={`${isBlack(p) ? 'black' : 'white'} ${isDo(p) ? 'do' : ''} ${soundingPitches.has(p)?'sounding':''}`}>{pitchDisplay === 'name' ? pitchLabel(pitchNames[p]) : p}</b>)}<button className="pitch-toggle" onClick={() => setPitchDisplay(v => v === 'name' ? 'clicks' : 'name')} aria-label="音名とクリック数を切替"><span>↻</span>{pitchDisplay === 'name' ? '012' : language === 'ja' ? 'ドレミ' : 'ABC'}</button></div>
      <div ref={rollViewportRef} className="roll-viewport" onWheel={handleRollWheel}>
    <section ref={rollRef} className={`roll ${editMode} ${followRun ? 'is-playing' : ''}`} aria-label={desktopLayout ? '横方向ピアノロール' : '縦方向ピアノロール'} style={{ '--step-height': `${stepHeight}px` } as React.CSSProperties} onPointerDownCapture={handlePlaybackSwipeDown} onPointerMoveCapture={handlePlaybackSwipeMove} onPointerUpCapture={handlePlaybackSwipeEnd} onPointerCancelCapture={handlePlaybackSwipeEnd} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
      {followRun && <div ref={playbackCursorRef} className="playback-cursor" aria-hidden="true" />}
      {Array.from({ length: project.steps }, (_, step) => step).filter(step=>step%project.delayUnit===0).map(step => {const stepPolyphony=polyphonyByStep.get(step)??0;return <div data-roll-step={step} className={`step ${step === 0 ? 'first-step' : ''} ${(step+project.delayUnit)%16===0 ? 'bar-end' : (step+project.delayUnit)%4===0 ? 'beat-end' : ''} ${stepPolyphony>=7?'poly-over-6':stepPolyphony>=4?'poly-over-3':''} ${playhead === step ? 'playhead' : ''}`} key={step}>
        {(desktopLayout ? [...PITCHES].reverse() : PITCHES).map(pitch => {
          const storedOwn = active.notes.some(n => n.step === step && n.pitch === pitch)
          const previewOrigin=Boolean(dragPreview&&dragPreview.originStep===step&&dragPreview.originPitch===pitch)
          const previewTarget=Boolean(dragPreview&&dragPreview.step===step&&dragPreview.pitch===pitch)
          const own = (storedOwn&&!previewOrigin)||previewTarget
          const ghost = ghosts && project.tracks.find(t => t.id !== activeId && t.ghostEnabled !== false && t.notes.some(n => n.step === step && n.pitch === pitch))
          const selected = isSelected(step,pitch)
          const edges = selected && normalizedSelection && !desktopLayout ? `${step === normalizedSelection.minStep ? ' selection-top' : ''}${step === normalizedSelection.maxStep ? ' selection-bottom' : ''}${pitch === normalizedSelection.minPitch ? ' selection-left' : ''}${pitch === normalizedSelection.maxPitch ? ' selection-right' : ''}` : ''
          return <button key={pitch} data-step={step} data-pitch={pitch} onPointerDown={e => handlePointerDown(e, step, pitch)} className={`${isBlack(pitch) ? 'black-key' : 'white-key'} ${isDo(pitch) ? 'do' : ''} ${own ? 'note' : ghost ? 'ghost' : ''} ${selected ? `selected-cell${edges}` : ''}`} style={own ? { '--note': active.color } as React.CSSProperties : ghost ? { '--note': ghost.color } as React.CSSProperties : undefined} aria-label={`${pitchNames[pitch]}, ${language === 'ja' ? '小節' : 'bar'} ${Math.floor(step / 16) + 1}`} />
        })}
        {desktopLayout && normalizedSelection && step >= normalizedSelection.minStep && step <= normalizedSelection.maxStep && <span
          className={`desktop-selection-outline ${step === normalizedSelection.minStep ? 'selection-start' : ''} ${step === normalizedSelection.maxStep ? 'selection-end' : ''}`}
          style={{gridRow:`${2 + (24-normalizedSelection.maxPitch)} / ${3 + (24-normalizedSelection.minPitch)}`} as React.CSSProperties}
          aria-hidden="true"
        />}
        <button className="step-label" title={stepPolyphony>=7?(language==='ja'?`${stepPolyphony}音：6和音超`:`${stepPolyphony} notes: over 6`):stepPolyphony>=4?(language==='ja'?`${stepPolyphony}音：3和音超`:`${stepPolyphony} notes: over 3`):undefined} onPointerDown={handleLabelDown} onPointerMove={handleLabelMove} onPointerUp={e=>handleLabelUp(e,step)} onPointerCancel={()=>{labelGestureRef.current=null}} onDoubleClick={e => seekFromLabel(e, step, true)}>{step % 16 === 0 ? `${step / 16 + 1}` : ''}</button>
      </div>})}
    </section>
      </div>
    </div>

    <footer className="dock">
      <button aria-label="元に戻す" onClick={undo} disabled={!historyRef.current.past.length}><span className="dock-icon">↶</span><small>UNDO</small></button><button aria-label="やり直す" onClick={redo} disabled={!historyRef.current.future.length}><span className="dock-icon">↷</span><small>REDO</small></button>
      <button className={`delay-mode-button ${delayMenuOpen?'active':''}`} onClick={()=>{setDelayMenuOpen(value=>!value);setMenuOpen(false);setPanel(null)}} aria-label={`${project.delayUnit}遅延モード。選択肢を開く`} aria-expanded={delayMenuOpen}><span className="dock-icon delay-mode-icon"><b>{project.delayUnit}</b></span><small>{language==='ja'?'モード':'MODE'}</small></button>
      <button className="dock-menu" onClick={() => {setMenuOpen(!menuOpen);setDelayMenuOpen(false);setPanel(null)}}><span className="dock-icon">•••</span><small>{c[17]}</small></button>
      <input ref={fileRef} hidden type="file" accept=".obg,.nbm,application/json" onChange={e => load(e.target.files?.[0]).catch(err => alert(err.message))} />
      <div className="copyright">© 2026 OTO BLOGIC · Powered by SOTA56</div>
    </footer>
    {delayMenuOpen&&<div className="delay-mode-menu" role="group" aria-label={language==='ja'?'遅延モードを選択':'Select delay mode'}>{([1,2,4] as const).map(value=><button key={value} className={project.delayUnit===value?'active':''} onClick={()=>applyDelayMode(value)}><b>{value}</b><small>{language==='ja'?'遅延':'DELAY'}</small></button>)}</div>}
    {menuOpen && <div className="more-menu">
      <div className="menu-section"><button className="blueprint-menu" onClick={()=>{stopPlayback();setPlayingStep(-1);setPlaybackPitches([]);setFollowPlayback(false);setFollowRun(null);openView('blueprint');setMenuOpen(false)}}><b className="menu-icon">▦</b><span>{language==='ja'?'設計図生成':'GENERATE BLUEPRINT'}</span><small>OPEN</small></button><button className="file-menu" onClick={()=>{save();setMenuOpen(false)}}><b className="menu-icon">⇩</b><span>SAVE .OBG</span></button><button className="file-menu" onClick={()=>{fileRef.current?.click();setMenuOpen(false)}}><b className="menu-icon">⇧</b><span>OPEN</span></button></div>
      <div className="menu-section future"><button onClick={()=>{stopPlayback();setPlayingStep(-1);setMenuOpen(false);openView('home')}}><b className="menu-icon">⌂</b><span>{language==='ja'?'ホーム':'HOME'}</span><small>OPEN</small></button><button disabled><b className="menu-icon">♫</b><span>{language==='ja'?'プリセット':'PRESETS'}</span><small>{language==='ja'?'準備中':'COMING SOON'}</small></button><button onClick={()=>{setMenuOpen(false);window.open('https://x.com/goro56pika','_blank','noopener,noreferrer')}}><b className="menu-icon">𝕏</b><span>X</span><small>OPEN</small></button><button onClick={()=>{stopPlayback();setPlayingStep(-1);setMenuOpen(false);openView('creators')}}><b className="menu-icon">◎</b><span>{language==='ja'?'制作者・監修者':'CREATORS'}</span><small>OPEN</small></button></div>
      <div className="menu-section"><button className="danger" onClick={clearAll}><b className="menu-icon trash-icon" aria-hidden="true"/><span>{c[18]}</span></button></div>
    </div>}
  </main>
}
export default App
