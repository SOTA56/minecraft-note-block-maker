export type Note = { step: number; pitch: number }
export type Track = { id: string; name: string; instrument: string; volume: number; color: string; muted: boolean; solo: boolean; notes: Note[] }
export type Project = { format: 'note-block-maker'; version: 1; title: string; edition: 'both'; tickRate: number; steps: number; tracks: Track[] }
