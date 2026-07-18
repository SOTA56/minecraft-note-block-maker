import './placement.css'

type Props={language:string;onBack:()=>void;onHome:()=>void}

const copy={
  ja:{back:'設計図へ戻る',title:'ブロックの設置方法',lead:'設計図を見ながら、Minecraftの中で音符ブロック回路を組み立てる手順をまとめました。まずは同じ高さに並べることから始めましょう。',basic:'基本の置き方',basicText:'音符ブロック、音色を決めるブロック、リピーター、レッドストーンダストは、基本的に同じ高さに置きます。音符ブロックの真下に置くブロックで音色が決まります。',flat:'平面に直接置く',flatText:'音符ブロックや回路を地面に直接置き、音色ブロックだけを1マス掘って埋める方法です。回路をすばやく組みたいときに向いています。',raised:'1段積み上げる',raisedText:'土台用のブロックを1段置き、その上に音符ブロックと回路を並べます。音色ブロックが見えるので、音色を確認しながら作れます。',repeater:'リピーターの向きと遅延数',repeaterText:'写真はすべて右向きに設置したリピーターです。赤い五角形に白数字で表示される数字は遅延数です。クリック数表示では、白地に黒い枠と赤い数字で表示します。',delay:'遅延',clicks:'クリック数',start:'スタートの作り方',startText:'スタート地点には石のボタンや木のボタンがおすすめです。ボタンを押すと回路へ信号が送られ、演奏が始まります。',layers:'詰め詰め回路のレイヤー',layersText:'レイヤーを重ねるときは、下の音符ブロックから1マス以上あけて土台を置きます。土台と土台の間は2マス以上あけてください。レイヤー同士をつなぐときは、階段状にブロックを置き、側面や上面にダストをつなぎます。'}
}

export default function PlacementGuidePage({language,onBack,onHome}:Props){
  const t=copy.ja
  return <main className="placement-page">
    <header className="placement-header"><button className="placement-brand" onClick={onHome} aria-label="トップページへ"><img src="/assets/branding/oto-blogic-icon.svg" alt=""/><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/></button><button className="placement-back" onClick={onBack}>{t.back}</button></header>
    <section className="placement-hero"><small>HOW TO BUILD</small><h1>{t.title}</h1><p>{t.lead}</p></section>
    <div className="placement-content">
      <section className="placement-section"><h2>{t.basic}</h2><p>{t.basicText}</p><div className="placement-image-grid"><figure><img src="/assets/placement/flat-placement.png" alt="平面に直接置いた音符ブロック回路"/><figcaption><b>{t.flat}</b><span>{t.flatText}</span></figcaption></figure><figure><img src="/assets/placement/raised-placement.png" alt="土台を一段積み上げた音符ブロック回路"/><figcaption><b>{t.raised}</b><span>{t.raisedText}</span></figcaption></figure></div></section>
      <section className="placement-section"><h2>音符ブロックの音程</h2><p>音符ブロックは右クリックした回数で音程が変わります。設計図の数字は、その音にするためのクリック数です。クリック回数は見た目では分からないので、分からなくなったときは一度壊して置き直すのがおすすめです。</p><figure className="wide-image"><img src="/assets/placement/note-block-clicks.png" alt="音符ブロックを右クリックして音程を変えている様子"/><figcaption>右クリックするたびに、音符ブロックの音程が半音ずつ上がります。</figcaption></figure></section>
      <section className="placement-section"><h2>{t.repeater}</h2><p>{t.repeaterText}</p><div className="repeater-examples">{[1,2,3,4].map(n=><figure key={n}><img src={`/assets/placement/repeater-delay-${n}.png`} alt={`右向きリピーター ${n}遅延`}/><figcaption><span className="repeater-label"><i className="placement-repeater delay-mark right"><b>{n}</b></i><b>{t.delay} {n}</b></span><span className="repeater-label"><i className="placement-repeater click-mark right"><b>{n-1}</b></i><b>{t.clicks} {n-1}</b></span></figcaption></figure>)}</div><div className="repeater-legend"><span><i className="delay-mark">1</i>{t.delay}表示（赤地・白数字）</span><span><i className="click-mark">0</i>{t.clicks}表示（白地・赤数字）</span></div><p className="repeater-operation">リピーターは設置したときに0遅延です。右クリックを1回すると1クリック・2遅延になり、遅延数が変わります。設計図では、遅延数表示とクリック数表示を選択できるので、お好きな表示を選んでください。</p></section>
      <section className="placement-section"><h2>{t.start}</h2><p>{t.startText}</p><figure className="wide-image"><img src="/assets/placement/start-button.png" alt="石や木のボタンを使ったスタート地点"/><figcaption>{t.startText}</figcaption></figure></section>
      <section className="placement-section"><h2>{t.layers}</h2><p>{t.layersText}</p><div className="placement-image-grid"><figure><img src="/assets/placement/compact-layer-stack.png" alt="詰め詰め回路のレイヤーを重ねた例"/><figcaption>{t.layersText}</figcaption></figure><figure><img src="/assets/placement/compact-layer-connect.png" alt="階段状にレイヤーをつないだ例"/><figcaption>階段状にブロックをつなぎ、レッドストーンダストで信号を送ります。</figcaption></figure></div></section>
    </div>
    <footer className="placement-footer"><button onClick={onBack}>{t.back} →</button><span>© 2026 OTO BLOGIC · Powered by SOTA56</span></footer>
  </main>
}
