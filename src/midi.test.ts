import {describe,expect,it} from 'vitest'
import {decodeMidiText} from './midi'

describe('MIDI track-name decoding',()=>{
  it('keeps UTF-8 names',()=>{
    expect(decodeMidiText(new TextEncoder().encode('ピアノ'))).toBe('ピアノ')
  })

  it('falls back to Shift_JIS names used by Japanese DAWs',()=>{
    // 「テスト」 in Shift_JIS / Windows-31J.
    expect(decodeMidiText(new Uint8Array([0x83,0x65,0x83,0x58,0x83,0x67]))).toBe('テスト')
  })
})
