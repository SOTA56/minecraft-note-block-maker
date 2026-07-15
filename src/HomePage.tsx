import './home.css'

type Props={language:string;onStart:()=>void}

const notes=[
  {x:2,y:2,c:'#35a9ec'},{x:5,y:3,c:'#35a9ec'},{x:8,y:4,c:'#f4ca3e'},
  {x:11,y:5,c:'#f4ca3e'},{x:7,y:7,c:'#65c98f'},{x:10,y:8,c:'#65c98f'},
  {x:4,y:10,c:'#f06d55'},{x:7,y:11,c:'#f06d55'},{x:12,y:12,c:'#a982dc'},
]

function MiniRoll(){return <div className="home-roll" aria-hidden="true"><div className="home-keys">{Array.from({length:13},(_,index)=><i key={index} className={[1,3,6,8,10].includes(index)?'black':''}/>)}</div><div className="home-grid">{notes.map((note,index)=><i key={index} style={{'--x':note.x,'--y':note.y,'--c':note.c} as React.CSSProperties}/>)}</div><span className="home-playhead"/></div>}

function CircuitMark({kind}:{kind:'easy'|'packed'|'fishbone'}){return <div className={`circuit-mark ${kind}`} aria-hidden="true"><i className="source">S</i>{Array.from({length:kind==='fishbone'?15:11},(_,index)=><i key={index} className={index%3===1?'repeater':index%3===2?'block':'dust'} style={{'--i':index} as React.CSSProperties}/>)}</div>}

export default function HomePage({language,onStart}:Props){
  const ja=language==='ja'
  return <main className="home-page">
    <header className="home-header">
      <a className="home-brand" href="#top" aria-label="OTO BLOGIC"><img src="/assets/branding/oto-blogic-icon.svg" alt=""/><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/></a>
      <button className="home-open-small" onClick={onStart}>{ja?'ツールを開く':'OPEN TOOL'}<span>↗</span></button>
    </header>

    <section className="home-hero" id="top">
      <div className="hero-kicker"><i/>NOTE BLOCK SEQUENCER <b>＋</b> CIRCUIT BLUEPRINT</div>
      <h1>{ja?<><span>音を</span>組む。<br/><span>回路が</span>生まれる。</>:<>COMPOSE SOUND.<br/><span>BUILD THE LOGIC.</span></>}</h1>
      <p>{ja?'スマホで音符ブロックの曲をつくり、そのままMinecraftで組める回路設計図へ。音楽に詳しくなくても、音を置くところから始められます。':'Compose note-block music on your phone, then turn it into a circuit blueprint ready to build.'}</p>
      <button className="hero-cta" onClick={onStart}><span>{ja?'曲をつくる':'START COMPOSING'}</span><b>→</b></button>
      <div className="hero-meta"><span>NO INSTALL</span><span>AUTO SAVE</span><span>JAVA / BEDROCK</span></div>
      <div className="hero-visual">
        <div className="visual-label"><b>01</b><span>COMPOSE<br/><small>{ja?'縦型ピアノロール':'VERTICAL PIANO ROLL'}</small></span></div>
        <MiniRoll/>
        <div className="logic-flow" aria-hidden="true"><i/><i/><i/><b>→</b></div>
        <div className="visual-blueprint"><span>BLUEPRINT / 01</span><CircuitMark kind="easy"/></div>
      </div>
    </section>

    <section className="home-statement">
      <span>PLACE</span><i>♪</i><span>PLAY</span><i>▶</i><span>BUILD</span><i>▦</i>
    </section>

    <section className="home-features">
      <header><small>WHY OTO BLOGIC</small><h2>{ja?'わかる形で、\n音楽をつくる。':'MUSIC, MADE\nVISIBLE.'}</h2></header>
      <article><b>01</b><div><h3>{ja?'音の高さが見える':'SEE EVERY PITCH'}</h3><p>{ja?'ドレミ表示とクリック数表示を切り替え。鍵盤を触れば、置く前に音を確かめられます。':'Switch between note names and click counts, and audition every pitch.'}</p></div><span className="feature-glyph pitch-glyph">♯</span></article>
      <article><b>02</b><div><h3>{ja?'20トラック、20の音色':'20 TRACKS. 20 TIMBRES.'}</h3><p>{ja?'ハープから4種類のトランペットまで。和音、音量、PAN、ゴースト表示にも対応します。':'Layer chords, instruments, volume, pan, and ghost notes.'}</p></div><span className="feature-glyph track-glyph">Ⅱ</span></article>
      <article><b>03</b><div><h3>{ja?'回路まで、自動で':'FROM NOTES TO BLOCKS'}</h3><p>{ja?'かんたん、詰め詰め、フィッシュボーン。目的に合う3種類の設計図を生成できます。':'Generate Easy, Compact, or Fishbone construction plans.'}</p></div><span className="feature-glyph block-glyph">▦</span></article>
    </section>

    <section className="home-circuits">
      <header><small>THREE WAYS TO BUILD</small><h2>{ja?'つくり方まで、\n選べる。':'CHOOSE YOUR\nCIRCUIT.'}</h2></header>
      <div className="circuit-card"><span>01 / EASY</span><h3>{ja?'かんたん回路':'EASY CIRCUIT'}</h3><p>{ja?'仕組みが見えて、組みやすい。':'Readable and beginner-friendly.'}</p><CircuitMark kind="easy"/></div>
      <div className="circuit-card featured"><span>02 / COMPACT</span><h3>{ja?'詰め詰め回路':'COMPACT CIRCUIT'}</h3><p>{ja?'長い曲を、限られた空間へ。':'Long arrangements in less space.'}</p><CircuitMark kind="packed"/></div>
      <div className="circuit-card"><span>03 / FISHBONE</span><h3>{ja?'フィッシュボーン':'FISHBONE'}</h3><p>{ja?'演奏を追いかけながら聴く。':'Built for a moving performance.'}</p><CircuitMark kind="fishbone"/></div>
    </section>

    <section className="home-final">
      <img src="/assets/branding/oto-blogic-icon.svg" alt=""/>
      <small>YOUR SOUND. YOUR LOGIC.</small>
      <h2>{ja?'最初の1音を、\n置いてみよう。':'PLACE YOUR\nFIRST NOTE.'}</h2>
      <button onClick={onStart}>{ja?'OTO BLOGICを開く':'OPEN OTO BLOGIC'}<b>→</b></button>
    </section>

    <footer className="home-footer"><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/><span>© 2026 · POWERED BY SOTA56</span></footer>
  </main>
}
