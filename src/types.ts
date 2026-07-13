export type Note = { step: number; pitch: number }
export type Track = { id: string; name: string; instrument: string; volume: number; pan: number; color: string; muted: boolean; solo: boolean; ghostEnabled: boolean; notes: Note[] }
export type BlueprintSettings = { runLength:number; compactSize?:number; fold:'right'|'left'; includeSilentEdges:boolean; theme?:'dark'|'light' }
export type Project = { format: 'oto-blogic' | 'note-block-maker'; version: 1; title: string; edition: 'both'; tickRate: number; delayUnit:1|2|4; steps: number; tracks: Track[]; blueprint?:BlueprintSettings }
