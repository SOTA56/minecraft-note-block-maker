import './home.css'

type Props={language:string;setLanguage:(language:string)=>void;onStart:()=>void}

const notes=[
  {x:2,y:2,c:'#35a9ec'},{x:5,y:3,c:'#35a9ec'},{x:8,y:4,c:'#f4ca3e'},
  {x:11,y:5,c:'#f4ca3e'},{x:7,y:7,c:'#65c98f'},{x:10,y:8,c:'#65c98f'},
  {x:4,y:10,c:'#f06d55'},{x:7,y:11,c:'#f06d55'},{x:12,y:12,c:'#a982dc'},
]

function MiniRoll(){return <div className="home-roll" aria-hidden="true"><div className="home-keys">{Array.from({length:13},(_,index)=><i key={index} className={[1,3,6,8,10].includes(index)?'black':''}/>)}</div><div className="home-grid">{notes.map((note,index)=><i key={index} style={{'--x':note.x,'--y':note.y,'--c':note.c} as React.CSSProperties}/>)}</div><span className="home-playhead"/></div>}

export default function HomePage({language,setLanguage,onStart}:Props){
  const ja=language==='ja'
  return <main className="home-page">
    <header className="home-header">
      <a className="home-brand" href="#top" aria-label="OTO BLOGIC"><img src="/assets/branding/oto-blogic-icon.svg" alt=""/><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/></a>
      <select className="home-language" value={language} onChange={event=>setLanguage(event.target.value)} aria-label="Language"><option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="zh">中文</option><option value="ko">한국어</option></select>
    </header>

    <section className="home-hero" id="top">
      <div className="hero-kicker"><i/>NOTE BLOCK SEQUENCER <b>＋</b> CIRCUIT BLUEPRINT</div>
      <h1>{ja?<><span className="hero-blue">音を置く</span>だけで、<br/><span className="hero-yellow">回路は完成</span>しています。</>:<><span className="hero-blue">PLACE THE NOTES.</span><br/><span className="hero-yellow">THE CIRCUIT IS DONE.</span></>}</h1>
      <p>{ja?'簡単操作で音を並べて曲作り。Minecraftで組める設計図を自動生成します。子どもから大人まで、初心者から上級者まで。':'Arrange notes with simple controls, then automatically generate a blueprint ready to build in Minecraft.'}</p>
      <button className="hero-cta" onClick={onStart}><span>{ja?'曲をつくる':'START COMPOSING'}</span><b>→</b></button>
      <div className="hero-meta"><span>NO INSTALL</span><span>AUTO SAVE</span><span>JAVA / BEDROCK</span></div>
      <div className="hero-visual">
        <div className="visual-label"><span>{ja?'ピアノロール':'PIANO ROLL'}</span></div>
        <MiniRoll/>
        <p>{ja?'直感的に使えつつ機能も充実。スマートフォンでは画面を広く使える縦スクロール式を採用。':'Intuitive yet fully featured, with a mobile-first vertical workflow that makes the most of your screen.'}</p>
      </div>
    </section>

    <section className="home-features">
      <header><small>WHY OTO BLOGIC</small><h2>{ja?'音が見えるから\nもう迷わない。':'SEE THE SOUND.\nNEVER GET LOST.'}</h2></header>
      <article><b>01</b><div><h3>{ja?'音の高さと位置が見える':'SEE EVERY PITCH AND POSITION'}</h3><p>{ja?'ドレミ表示とクリック数表示を切り替え。鍵盤を触れば、置く前に音を確かめられます。':'Switch between note names and click counts, and audition every pitch.'}</p></div><span className="feature-glyph pitch-glyph">♯</span></article>
      <article><b>02</b><div><h3>{ja?'20トラック、20の音色':'20 TRACKS. 20 TIMBRES.'}</h3><p>{ja?'ハープから4種類のトランペットまで。和音、音量、PAN、ゴースト表示にも対応します。':'Layer chords, instruments, volume, pan, and ghost notes.'}</p></div><span className="feature-glyph track-glyph">Ⅱ</span></article>
      <article><b>03</b><div><h3>{ja?'回路まで、自動で':'FROM NOTES TO BLOCKS'}</h3><p>{ja?'かんたん、詰め詰め、フィッシュボーン。目的に合う3種類の設計図を生成できます。':'Generate Easy, Compact, or Fishbone construction plans.'}</p></div><span className="feature-glyph block-glyph">▦</span></article>
    </section>

    <section className="home-circuits">
      <header><small>THREE WAYS TO BUILD</small><h2>{ja?'目的に合わせて\n回路を選べる':'CHOOSE A CIRCUIT\nFOR YOUR GOAL.'}</h2></header>
      <div className="circuit-card"><span>01 / EASY</span><h3>{ja?'かんたん回路':'EASY CIRCUIT'}</h3><p>{ja?'仕組みが見えて、組みやすい。':'Readable and beginner-friendly.'}</p><img src="/assets/home/circuit-easy.png" alt={ja?'かんたん回路の設計図':'Easy circuit blueprint'}/></div>
      <div className="circuit-card featured"><span>02 / COMPACT</span><h3>{ja?'詰め詰め回路':'COMPACT CIRCUIT'}</h3><p>{ja?'長い曲を、限られた空間へ。':'Long arrangements in less space.'}</p><img src="/assets/home/circuit-compact.png" alt={ja?'詰め詰め回路の設計図':'Compact circuit blueprint'}/></div>
      <div className="circuit-card"><span>03 / FISHBONE</span><h3>{ja?'フィッシュボーン':'FISHBONE'}</h3><p>{ja?'演奏を追いかけながら聴く。':'Built for a moving performance.'}</p><img src="/assets/home/circuit-fishbone.png" alt={ja?'フィッシュボーン回路の設計図':'Fishbone circuit blueprint'}/></div>
    </section>

    <section className="home-final">
      <img src="/assets/branding/oto-blogic-icon.svg" alt=""/>
      <small>YOUR SOUND. YOUR LOGIC.</small>
      <h2>{ja?'最初の1音を、\n置いてみよう。':'PLACE YOUR\nFIRST NOTE.'}</h2>
      <button onClick={onStart}>{ja?'OTO BLOGICを開く':'OPEN OTO BLOGIC'}<b>→</b></button>
    </section>

    <section className="home-video">
      <header><small>{ja?'RELATED VIDEO':'RELATED VIDEO'}</small><h2>{ja?'関連動画':'WATCH & LEARN'}</h2></header>
      <div className="home-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/9JO9FiLHzGo" title={ja?'OTO BLOGIC 関連動画':'OTO BLOGIC related video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy"/></div>
    </section>

    <footer className="home-footer"><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/><span>© 2026 · POWERED BY SOTA56</span></footer>
  </main>
}
