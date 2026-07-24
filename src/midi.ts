export type MidiNoteEvent = { tick: number; midi: number }
export type MidiTrackData = { name: string; notes: MidiNoteEvent[] }
export type ParsedMidi = { ppq: number; bpm: number; tracks: MidiTrackData[] }

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

export function parseMidi(buffer: ArrayBuffer): ParsedMidi {
  const bytes = new Uint8Array(buffer)
  let offset = 0
  const read = (count: number) => { if (offset + count > bytes.length) throw new Error('MIDIファイルが途中で終わっています。'); const value = bytes.slice(offset, offset + count); offset += count; return value }
  const u16 = () => { const b = read(2); return (b[0] << 8) | b[1] }
  const u32 = () => { const b = read(4); return (b[0] * 0x1000000) + (b[1] << 16) + (b[2] << 8) + b[3] }
  const vlq = () => { let value = 0, count = 0; while (true) { const byte = read(1)[0]; value = (value << 7) | (byte & 0x7f); if (!(byte & 0x80)) return value; if (++count > 4) throw new Error('MIDIの可変長値を読み取れません。') } }
  if (text(read(4)) !== 'MThd') throw new Error('標準MIDIファイル（.mid/.midi）を選択してください。')
  const headerLength = u32(); if (headerLength < 6) throw new Error('MIDIヘッダーが不正です。')
  const format = u16(); const trackCount = u16(); const division = u16();
  if (headerLength > 6) read(headerLength - 6)
  if (division & 0x8000) throw new Error('SMPTE形式のMIDIには対応していません。')
  const ppq = division & 0x7fff
  if (!ppq) throw new Error('MIDIの分解能が不正です。')
  const tracks: MidiTrackData[] = []; let tempo = 500000
  for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
    if (text(read(4)) !== 'MTrk') throw new Error('MIDIトラックが不正です。')
    const length = u32(); const end = offset + length; if (end > bytes.length) throw new Error('MIDIトラックが途中で終わっています。')
    let tick = 0, running = 0, name = `TRACK ${String(trackIndex + 1).padStart(2, '0')}`; const notes: MidiNoteEvent[] = []
    while (offset < end) {
      tick += vlq(); let status = read(1)[0]
      if (status < 0x80) { if (!running) throw new Error('MIDIのランニングステータスが不正です。'); offset--; status = running } else if (status < 0xf0) running = status
      if (status === 0xff) {
        const type = read(1)[0]; const size = vlq(); const data = read(size)
        if (type === 0x03 && data.length) name = text(data).replace(/\0/g, '').trim() || name
        if (type === 0x51 && data.length === 3) tempo = (data[0] << 16) | (data[1] << 8) | data[2]
        if (type === 0x2f) { offset = end; break }
      } else if (status === 0xf0 || status === 0xf7) read(vlq())
      else {
        const command = status & 0xf0; const first = read(1)[0]; const second = command === 0xc0 || command === 0xd0 ? undefined : read(1)[0]
        if (command === 0x90 && second !== undefined && second > 0) notes.push({ tick, midi: first })
      }
    }
    offset = end
    if (notes.length) tracks.push({ name, notes })
  }
  if (format === 0 && tracks.length > 1) tracks.splice(1)
  return { ppq, bpm: Math.max(1, Math.round(60000000 / tempo)), tracks }
}
