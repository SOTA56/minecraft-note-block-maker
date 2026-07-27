import './home.css'
import {BuyMeCoffeeButton} from './BuyMeCoffee'
import type {ReactNode} from 'react'

type Props={language:string;setLanguage:(language:string)=>void;onStart:()=>void;onCreators:()=>void;onResourcePack:()=>void;onTerms:()=>void;onPrivacy:()=>void}

const notes=[
  {x:2,y:2,c:'#35a9ec'},{x:5,y:3,c:'#35a9ec'},{x:8,y:4,c:'#f4ca3e'},
  {x:11,y:5,c:'#f4ca3e'},{x:7,y:7,c:'#65c98f'},{x:10,y:8,c:'#65c98f'},
  {x:4,y:10,c:'#f06d55'},{x:7,y:11,c:'#f06d55'},{x:12,y:12,c:'#a982dc'},
]

const heroFacts:Record<string,[string,string][]>= {
  ja:[['インストール不要','ブラウザですぐ開始'],['自動保存','作業を端末に保持'],['両エディション','Java / Bedrock']],
  en:[['NO INSTALL','Start in your browser'],['AUTO SAVE','Kept on this device'],['BOTH EDITIONS','Java / Bedrock']],
  es:[['SIN INSTALAR','Empieza en el navegador'],['AUTOGUARDADO','Guardado en el dispositivo'],['DOS EDICIONES','Java / Bedrock']],
  fr:[['SANS INSTALLATION','Directement dans le navigateur'],['SAUVEGARDE AUTO','Conservé sur cet appareil'],['DEUX ÉDITIONS','Java / Bedrock']],
  de:[['OHNE INSTALLATION','Direkt im Browser'],['AUTOSPEICHERN','Auf diesem Gerät'],['BEIDE EDITIONEN','Java / Bedrock']],
  zh:[['无需安装','打开浏览器即可使用'],['自动保存','保存在此设备'],['双版本支持','Java / Bedrock']],
  'zh-tw':[['免安裝','開啟瀏覽器即可使用'],['自動儲存','保存在此裝置'],['雙版本支援','Java / Bedrock']],
  ko:[['설치 불필요','브라우저에서 바로 시작'],['자동 저장','이 기기에 보관'],['두 에디션 지원','Java / Bedrock']],
  id:[['TANPA INSTALASI','Langsung di browser'],['SIMPAN OTOMATIS','Tersimpan di perangkat'],['DUA EDISI','Java / Bedrock']],
}

type HomeTipKey='compose'|'open'|'x'|'resourcePack'|'creators'|'matMaker'

const homeTips:Record<string,Record<HomeTipKey,string>>={
  ja:{
    compose:'ピアノロールを開いて、曲づくりを始めます。',
    open:'打ち込み画面を開いて、音符ブロックの曲を作ります。',
    x:'OTO BLOGIC公式Xで、更新情報やお知らせを確認します。',
    resourcePack:'音程やリピーターを読みやすくするJava版リソースパックをダウンロードします。',
    creators:'OTO BLOGICの制作者・監修者・改善協力者を紹介します。',
    matMaker:'ぽこあポケモン向け「おんぷマットメーカー」を開きます。',
  },
  en:{
    compose:'Open the piano roll and start composing.',
    open:'Open the editor and create a Minecraft note-block song.',
    x:'See OTO BLOGIC news and updates on X.',
    resourcePack:'Download the Java resource pack that makes pitches and repeaters easier to read.',
    creators:'Meet the creators, supervisor, and contributors behind OTO BLOGIC.',
    matMaker:'Open Music Mat Maker for Pokémon Pokopia.',
  },
  es:{
    compose:'Abre el piano roll y empieza a componer.',
    open:'Abre el editor y crea una canción con bloques musicales.',
    x:'Consulta las noticias y novedades de OTO BLOGIC en X.',
    resourcePack:'Descarga el pack de Java que facilita leer notas y repetidores.',
    creators:'Conoce a los creadores, la supervisora y colaboradores de OTO BLOGIC.',
    matMaker:'Abre Music Mat Maker para Pokémon Pokopia.',
  },
  fr:{
    compose:'Ouvrez le piano roll et commencez à composer.',
    open:'Ouvrez l’éditeur et créez un morceau avec des blocs musicaux.',
    x:'Consultez les actualités d’OTO BLOGIC sur X.',
    resourcePack:'Téléchargez le pack Java qui facilite la lecture des notes et répéteurs.',
    creators:'Découvrez les créateurs, la superviseuse et les contributeurs d’OTO BLOGIC.',
    matMaker:'Ouvrez Music Mat Maker pour Pokémon Pokopia.',
  },
  de:{
    compose:'Öffne die Piano-Roll und beginne zu komponieren.',
    open:'Öffne den Editor und erstelle einen Song mit Notenblöcken.',
    x:'Neuigkeiten und Updates zu OTO BLOGIC auf X ansehen.',
    resourcePack:'Lade das Java-Ressourcenpaket für besser lesbare Töne und Repeater herunter.',
    creators:'Lerne die Entwickler, Aufsicht und Mitwirkenden von OTO BLOGIC kennen.',
    matMaker:'Öffne Music Mat Maker für Pokémon Pokopia.',
  },
  zh:{
    compose:'打开钢琴卷帘，开始编曲。',
    open:'打开编辑器，制作 Minecraft 音符盒音乐。',
    x:'在 X 查看 OTO BLOGIC 的更新与公告。',
    resourcePack:'下载让音高和中继器更易读的 Java 版资源包。',
    creators:'了解 OTO BLOGIC 的制作者、监修者与改进协作者。',
    matMaker:'打开面向《宝可梦 Pokopia》的音符地垫制作器。',
  },
  'zh-tw':{
    compose:'開啟鋼琴捲軸，開始編曲。',
    open:'開啟編輯器，製作 Minecraft 音階盒音樂。',
    x:'在 X 查看 OTO BLOGIC 的更新與公告。',
    resourcePack:'下載讓音高和中繼器更容易閱讀的 Java 版資源包。',
    creators:'認識 OTO BLOGIC 的製作者、監修者與改善協作者。',
    matMaker:'開啟《寶可夢 Pokopia》用的音符墊製作器。',
  },
  ko:{
    compose:'피아노 롤을 열고 작곡을 시작합니다.',
    open:'편집 화면을 열어 Minecraft 노트 블록 곡을 만듭니다.',
    x:'X에서 OTO BLOGIC 업데이트와 공지를 확인합니다.',
    resourcePack:'음높이와 리피터를 읽기 쉽게 하는 Java 리소스 팩을 다운로드합니다.',
    creators:'OTO BLOGIC의 제작자, 감수자와 개선 협력자를 소개합니다.',
    matMaker:'Pokémon Pokopia용 Music Mat Maker를 엽니다.',
  },
  id:{
    compose:'Buka piano roll dan mulai membuat musik.',
    open:'Buka editor dan buat lagu note block Minecraft.',
    x:'Lihat berita dan pembaruan OTO BLOGIC di X.',
    resourcePack:'Unduh resource pack Java agar nada dan repeater lebih mudah dibaca.',
    creators:'Kenali pembuat, pengawas, dan kontributor OTO BLOGIC.',
    matMaker:'Buka Music Mat Maker untuk Pokémon Pokopia.',
  },
}

function HomeTip({id,text,className='',children}:{id:string;text:string;className?:string;children:ReactNode}){
  return <span className={`home-tip ${className}`}>
    {children}
    <span className="home-tip-copy" id={id} role="tooltip">{text}</span>
  </span>
}

function MiniRoll(){return <div className="home-roll" aria-hidden="true"><div className="home-keys">{Array.from({length:13},(_,index)=><i key={index} className={[1,3,6,8,10].includes(index)?'black':''}/>)}</div><div className="home-grid">{notes.map((note,index)=><i key={index} style={{'--x':note.x,'--y':note.y,'--c':note.c} as React.CSSProperties}/>)}</div><span className="home-playhead"/></div>}

const homeLocales:Record<string,string[]>={
  en:['CREATORS','MUSIC MAT MAKER','PLACE THE NOTES.','THE CIRCUIT IS DONE.','Arrange notes with simple controls, then automatically generate a blueprint ready to build in Minecraft. For beginners and experts, children and adults.','START COMPOSING','PIANO ROLL','Intuitive yet fully featured. The mobile layout scrolls vertically to use the screen efficiently.','SEE THE SOUND.\nNEVER GET LOST.','SEE EVERY PITCH AND POSITION','Switch between note names and click counts, and audition every pitch before placing it.','20 TRACKS. 20 TIMBRES.','Layer chords, instruments, volume, PAN, and ghost notes.','FROM NOTES TO BLOCKS','Generate Easy, Compact, or Fishbone construction plans.','CHOOSE A CIRCUIT\nFOR YOUR GOAL.','EASY CIRCUIT','Readable and beginner-friendly.','COMPACT CIRCUIT','Long arrangements in less space.','FISHBONE','Built for a moving performance.','PLACE YOUR\nFIRST NOTE.','OPEN OTO BLOGIC','WATCH & LEARN'],
  es:['CREADORES','ONPU MAT MAKER','COLOCA LAS NOTAS.','EL CIRCUITO ESTÁ LISTO.','Crea una canción con controles sencillos y genera un plano listo para construir en Minecraft. Para principiantes y expertos, niños y adultos.','EMPEZAR A COMPONER','PIANO ROLL','Intuitivo y completo. En móvil, el desplazamiento vertical aprovecha mejor la pantalla.','VE EL SONIDO.\nSIN PERDERTE.','ALTURA Y POSICIÓN VISIBLES','Cambia entre nombres y clics, y escucha cada altura antes de colocarla.','20 PISTAS. 20 TIMBRES.','Combina acordes, instrumentos, volumen, PAN y notas fantasma.','DE NOTAS A BLOQUES','Genera planos Fácil, Compacto o Fishbone.','ELIGE EL CIRCUITO\nSEGÚN TU OBJETIVO.','CIRCUITO FÁCIL','Claro y sencillo de construir.','CIRCUITO COMPACTO','Canciones largas en menos espacio.','FISHBONE','Pensado para escuchar en movimiento.','COLOCA TU\nPRIMERA NOTA.','ABRIR OTO BLOGIC','VÍDEO RELACIONADO'],
  fr:['CRÉATEURS','ONPU MAT MAKER','PLACEZ LES NOTES.','LE CIRCUIT EST PRÊT.','Composez simplement, puis générez un plan prêt à construire dans Minecraft. Pour débutants et experts, enfants et adultes.','COMMENCER','PIANO ROLL','Intuitif et complet. Sur mobile, le défilement vertical exploite mieux l’écran.','VOYEZ LE SON.\nNE VOUS PERDEZ PLUS.','HAUTEUR ET POSITION VISIBLES','Alternez noms et clics, puis écoutez chaque hauteur avant de la placer.','20 PISTES. 20 TIMBRES.','Combinez accords, instruments, volume, PAN et notes fantômes.','DES NOTES AUX BLOCS','Générez un plan Facile, Compact ou Fishbone.','CHOISISSEZ LE CIRCUIT\nADAPTÉ À VOTRE BUT.','CIRCUIT FACILE','Clair et simple à construire.','CIRCUIT COMPACT','De longs morceaux dans moins d’espace.','FISHBONE','Conçu pour une écoute en mouvement.','PLACEZ VOTRE\nPREMIÈRE NOTE.','OUVRIR OTO BLOGIC','VIDÉO ASSOCIÉE'],
  de:['ERSTELLER','ONPU MAT MAKER','NOTEN SETZEN.','SCHALTUNG FERTIG.','Einfach Noten anordnen und einen Minecraft-Bauplan automatisch erzeugen. Für Anfänger und Profis, Kinder und Erwachsene.','KOMPONIEREN','PIANO-ROLL','Intuitiv und leistungsfähig. Mobil nutzt vertikales Scrollen den Bildschirm optimal.','KLANG SEHEN.\nNICHTS VERLIEREN.','TONHÖHE UND POSITION SEHEN','Zwischen Notennamen und Klickzahlen wechseln und jeden Ton vorher anhören.','20 SPUREN. 20 KLÄNGE.','Akkorde, Instrumente, Lautstärke, PAN und Ghost-Noten kombinieren.','VON NOTEN ZU BLÖCKEN','Baupläne als Einfach, Kompakt oder Fishbone erzeugen.','DIE PASSENDE SCHALTUNG\nFÜR DEIN ZIEL.','EINFACHE SCHALTUNG','Übersichtlich und leicht zu bauen.','KOMPAKTE SCHALTUNG','Lange Songs auf wenig Raum.','FISHBONE','Für Wiedergabe in Bewegung.','SETZE DEINE\nERSTE NOTE.','OTO BLOGIC ÖFFNEN','PASSENDES VIDEO'],
  zh:['制作者','音符地垫制作器','只需放置音符，','电路即可完成。','用简单操作编曲，并自动生成可在 Minecraft 中搭建的蓝图。适合初学者与高手、儿童与成人。','开始编曲','钢琴卷帘','直观且功能完整。手机采用纵向滚动，充分利用屏幕空间。','看见声音，\n不再迷路。','看清音高与位置','切换音名和点击次数，放置前即可试听。','20条音轨，20种音色','支持和弦、音色、音量、PAN与重影音符。','从音符到方块','生成简单、紧凑或Fishbone三种蓝图。','按目的选择\n合适的电路','简单电路','清晰易懂，方便搭建。','紧凑电路','让长曲占用更少空间。','FISHBONE','适合边移动边聆听。','放下你的\n第一个音符。','打开 OTO BLOGIC','相关视频'],
  ko:['제작자','온푸 매트 메이커','노트를 놓으면,','회로가 완성됩니다.','간단히 곡을 만들고 Minecraft에서 지을 수 있는 설계도를 자동 생성합니다. 초보자와 숙련자, 어린이와 어른 모두를 위한 도구입니다.','작곡 시작','피아노 롤','직관적이면서 기능도 충실합니다. 모바일은 세로 스크롤로 화면을 넓게 씁니다.','소리가 보이면\n헤매지 않습니다.','음높이와 위치를 확인','음이름과 클릭 수를 바꾸고 놓기 전에 소리를 들을 수 있습니다.','20트랙, 20가지 음색','화음, 악기, 음량, PAN과 고스트 노트를 지원합니다.','노트에서 블록까지','간단, 컴팩트, Fishbone 설계도를 생성합니다.','목적에 맞는\n회로를 선택','간단 회로','원리가 보이고 만들기 쉽습니다.','컴팩트 회로','긴 곡을 더 작은 공간에.','FISHBONE','이동하며 듣는 연주에 적합합니다.','첫 노트를\n놓아 보세요.','OTO BLOGIC 열기','관련 동영상']
  ,'zh-tw':['製作者','音符墊製作器','只要放置音符，','電路就完成。','用簡單操作編曲，並自動產生可在 Minecraft 中搭建的藍圖。適合初學者與高手、兒童與成人。','開始編曲','鋼琴捲軸','直覺且功能完整。手機採用縱向捲動，充分利用螢幕空間。','看見聲音，\n不再迷路。','看清音高與位置','切換音名和點擊次數，放置前即可試聽。','20軌，20種音色','支援和弦、音色、音量、PAN與重影音符。','從音符到方塊','產生簡單、緊湊或Fishbone三種藍圖。','依目的選擇\n合適的電路','簡單電路','清楚易懂，方便搭建。','緊湊電路','讓長曲占用更少空間。','FISHBONE','適合邊移動邊聆聽。','放下你的\n第一個音符。','開啟 OTO BLOGIC','相關影片'],
  id:['KREATOR','ONPU MAT MAKER','LETAKKAN NOT.', 'RANGKAIAN SELESAI.','Susun not dengan mudah lalu buat denah rangkaian Minecraft secara otomatis. Untuk pemula dan mahir, anak-anak dan dewasa.','MULAI MEMBUAT MUSIK','PIANO ROLL','Intuitif dan lengkap. Di ponsel, gulir vertikal memaksimalkan ruang layar.','LIHAT SUARANYA.\nTAK PERLU BINGUNG.','TINGGI DAN POSISI TERLIHAT','Ganti nama not dan jumlah klik, lalu dengarkan sebelum meletakkan not.','20 TRACK. 20 WARNA SUARA.','Gabungkan akor, instrumen, volume, PAN, dan ghost note.','DARI NOT KE BLOK','Buat denah Easy, Compact, atau Fishbone.','PILIH RANGKAIAN\nSESUAI TUJUAN.','RANGKAIAN EASY','Jelas dan mudah dibangun.','RANGKAIAN COMPACT','Lagu panjang dalam ruang lebih kecil.','FISHBONE','Untuk pertunjukan sambil bergerak.','LETAKKAN\nNOT PERTAMA.','BUKA OTO BLOGIC','VIDEO TERKAIT']
}

export default function HomePage({language,setLanguage,onStart,onCreators,onResourcePack,onTerms,onPrivacy}:Props){
  const ja=language==='ja'
  const x=homeLocales[language]??homeLocales.en
  const facts=heroFacts[language]??heroFacts.en
  const tips=homeTips[language]??homeTips.en
  return <main className="home-page">
    <header className="home-header">
      <a className="home-brand" href="#top" aria-label="OTO BLOGIC"><img src="/assets/branding/oto-blogic-icon-04.png" alt=""/><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/></a>
      <div className="home-header-actions">
        <BuyMeCoffeeButton className="header-buy-me-coffee"/>
        <nav className="home-related-links" aria-label={ja?'関連ページ':'Related pages'}>
          <HomeTip id="home-tip-x" text={tips.x} className="home-tip--header"><a className="home-x-link" href="https://x.com/OTOBLOGIC" target="_blank" rel="noreferrer" aria-label="OTO BLOGIC on X" aria-describedby="home-tip-x"><span aria-hidden="true">𝕏</span></a></HomeTip>
          <i aria-hidden="true"/>
          <HomeTip id="home-tip-resource" text={tips.resourcePack} className="home-tip--header"><a href="/resource-pack" aria-describedby="home-tip-resource" onClick={event=>{event.preventDefault();onResourcePack()}}>{ja?'リソースパック':'RESOURCE PACK'}</a></HomeTip>
          <i aria-hidden="true"/>
          <HomeTip id="home-tip-creators" text={tips.creators} className="home-tip--header"><a href="/creators" aria-describedby="home-tip-creators" onClick={event=>{event.preventDefault();onCreators()}}>{ja?'制作者':x[0]}</a></HomeTip>
          <i aria-hidden="true"/>
          <HomeTip id="home-tip-mat-maker" text={tips.matMaker} className="home-tip--header home-tip--align-right"><a href="https://matmaker.sota56.com" target="_blank" rel="noreferrer" aria-describedby="home-tip-mat-maker">{ja?'おんぷマットメーカー':x[1]}</a></HomeTip>
        </nav>
        <select className="home-language" value={language} onChange={event=>setLanguage(event.target.value)} aria-label="Language"><option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="zh">简体中文</option><option value="zh-tw">繁體中文</option><option value="ko">한국어</option><option value="id">Bahasa Indonesia</option></select>
      </div>
    </header>

    <section className="home-hero" id="top">
      <div className="hero-kicker"><i/>NOTE BLOCK SEQUENCER <b>＋</b> CIRCUIT BLUEPRINT</div>
      <h1>{ja?<><span className="hero-blue">音を置く</span>だけで、<br/><span className="hero-yellow">回路が完成</span>する。</>:<><span className="hero-blue">{x[2]}</span><br/><span className="hero-yellow">{x[3]}</span></>}</h1>
      <p>{ja?'簡単操作で音を並べて曲作り。Minecraftで組める設計図を自動生成します。初心者から上級者まで、子どもから大人まで。':x[4]}</p>
      <HomeTip id="home-tip-compose" text={tips.compose} className="home-tip--cta"><button className="hero-cta" onClick={onStart} aria-describedby="home-tip-compose"><span>{ja?'曲をつくる':x[5]}</span><b>→</b></button></HomeTip>
      <div className="hero-meta">{facts.map(([title,detail])=><article key={title}><span><strong>{title}</strong><small>{detail}</small></span></article>)}</div>
      <div className="hero-visual">
        <div className="visual-label"><span>{ja?'ピアノロール形式':x[6]}</span></div>
        <p>{ja?'直感的に使えつつ機能も充実。スマートフォンでは画面を広く使える縦スクロール式を採用。':x[7]}</p>
        <MiniRoll/>
      </div>
    </section>

    <section className="home-features">
      <header><small>WHY OTO BLOGIC</small><h2>{ja?'音が見えるから\nもう迷わない。':x[8]}</h2></header>
      <article><b>01</b><div><h3>{ja?'音の高さと位置が見える':x[9]}</h3><p>{ja?'ドレミ表示とクリック数表示を切り替え。鍵盤を触れば、置く前に音を確かめられます。':x[10]}</p></div><span className="feature-glyph pitch-glyph">♯</span></article>
      <article><b>02</b><div><h3>{ja?'20トラック、20の音色':x[11]}</h3><p>{ja?'ハープから4種類のトランペットまで。和音、音量、PAN、ゴースト表示にも対応します。':x[12]}</p></div><span className="feature-glyph track-glyph">Ⅱ</span></article>
      <article><b>03</b><div><h3>{ja?'回路まで、自動で':x[13]}</h3><p>{ja?'かんたん、詰め詰め、フィッシュボーン。目的に合う3種類の設計図を生成できます。':x[14]}</p></div><span className="feature-glyph block-glyph">▦</span></article>
    </section>

    <section className="home-circuits">
      <header><small>THREE WAYS TO BUILD</small><h2>{ja?'目的に合わせて\n回路を選べる':x[15]}</h2></header>
      <div className="circuit-card"><span>01 / EASY</span><h3>{ja?'かんたん回路':x[16]}</h3><p>{ja?'仕組みが見えて、組みやすい。':x[17]}</p><img src="/assets/home/circuit-easy.png" alt={ja?'かんたん回路の設計図':x[16]}/></div>
      <div className="circuit-card featured"><span>02 / COMPACT</span><h3>{ja?'詰め詰め回路':x[18]}</h3><p>{ja?'長い曲を、限られた空間へ。':x[19]}</p><img src="/assets/home/circuit-compact.png" alt={ja?'詰め詰め回路の設計図':x[18]}/></div>
      <div className="circuit-card"><span>03 / FISHBONE</span><h3>{ja?'フィッシュボーン':x[20]}</h3><p>{ja?'演奏を追いかけながら聴く。':x[21]}</p><img src="/assets/home/circuit-fishbone.png" alt={ja?'フィッシュボーン回路の設計図':x[20]}/></div>
    </section>

    <section className="home-final">
      <img src="/assets/branding/oto-blogic-icon-04.png" alt=""/>
      <small>YOUR SOUND. YOUR LOGIC.</small>
      <h2>{ja?'最初の1音を、\n置いてみよう。':x[22]}</h2>
      <HomeTip id="home-tip-open" text={tips.open} className="home-tip--cta home-tip--above"><button onClick={onStart} aria-describedby="home-tip-open">{ja?'OTO BLOGICを開く':x[23]}<b>→</b></button></HomeTip>
    </section>

    <section className="home-video">
      <header><small>RELATED VIDEO</small><h2>{ja?'関連動画':x[24]}</h2></header>
      <div className="home-video-grid"><div className="home-video-frame home-video-placeholder" aria-label={ja?'関連動画は準備中です':'Related videos are coming soon'}><span>COMING SOON</span></div></div>
    </section>

    <aside className="home-unofficial">NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.</aside>
    <nav className="home-legal-links"><a href="/terms" onClick={event=>{event.preventDefault();onTerms()}}>{ja?'利用規約':'TERMS'}</a><i/><a href="/privacy" onClick={event=>{event.preventDefault();onPrivacy()}}>{ja?'プライバシーポリシー':'PRIVACY'}</a></nav>
    <footer className="home-footer"><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/><span>© 2026 · POWERED BY SOTA56</span></footer>
  </main>
}
