import {useState} from 'react'
import './resource-pack.css'

type Props={language:string;setLanguage:(language:string)=>void;onHome:()=>void}

const languageOptions=[
  ['ja','日本語'],['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],
  ['zh','简体中文'],['zh-tw','繁體中文'],['ko','한국어'],['id','Bahasa Indonesia'],
]

const packs:{version:string;file:string;size:string;latest?:boolean}[]=[
  {version:'26.1–26.2',file:'OTO_BLOGIC_VISUALS_26.1-26.2.zip',size:'420 KB',latest:true},
  {version:'1.21.9–26.0',file:'OTO_BLOGIC_VISUALS_1.21.9-26.0.zip',size:'356 KB'},
  {version:'1.20.2–1.21.8',file:'OTO_BLOGIC_VISUALS_1.20.2-1.21.8.zip',size:'356 KB'},
  {version:'1.20–1.20.1',file:'OTO_BLOGIC_VISUALS_1.20-1.20.1.zip',size:'356 KB'},
  {version:'1.19.4',file:'OTO_BLOGIC_VISUALS_1.19.4.zip',size:'356 KB'},
  {version:'1.19.3',file:'OTO_BLOGIC_VISUALS_1.19.3.zip',size:'356 KB'},
  {version:'1.19–1.19.2',file:'OTO_BLOGIC_VISUALS_1.19-1.19.2.zip',size:'356 KB'},
  {version:'1.18–1.18.2',file:'OTO_BLOGIC_VISUALS_1.18-1.18.2.zip',size:'356 KB'},
  {version:'1.17–1.17.1',file:'OTO_BLOGIC_VISUALS_1.17-1.17.1.zip',size:'356 KB'},
  {version:'1.16.2–1.16.5',file:'OTO_BLOGIC_VISUALS_1.16.2-1.16.5.zip',size:'356 KB'},
  {version:'1.16–1.16.1',file:'OTO_BLOGIC_VISUALS_1.16-1.16.1.zip',size:'356 KB'},
  {version:'1.15–1.15.2',file:'OTO_BLOGIC_VISUALS_1.15-1.15.2.zip',size:'356 KB'},
  {version:'1.13–1.14.4',file:'OTO_BLOGIC_VISUALS_1.13-1.14.4.zip',size:'356 KB'},
  {version:'1.12–1.12.2',file:'OTO_BLOGIC_VISUALS_1.12-1.12.2.zip',size:'356 KB'},
]

const copy:Record<string,{title:string;lead:string;edition:string;choose:string;latest:string;download:string;direct:string;what:string;whatText:string;features:string[];install:string;steps:string[];notes:string;noteItems:string[];home:string;version:string}>= {
  ja:{title:'OTO BLOGIC VISUALS',lead:'Minecraftの音符ブロックとリピーターを、もっと読み取りやすくするリソースパックです。',edition:'MINECRAFT JAVA EDITION',choose:'使っているバージョン',latest:'最新',download:'ZIPをダウンロード',direct:'GitHubからすぐにダウンロードします。GitHubの画面は開きません。',what:'何が見やすくなる？',whatText:'音符ブロックの音程・音の種類と、リピーターの向き・遅延を見た目で確認しやすくします。',features:['音符ブロックの音程','下のブロックで決まる音の種類','リピーターの向きと遅延'],install:'入れ方',steps:['自分のMinecraftに合うZIPを選んでダウンロードします。','ZIPを解凍せず、Minecraftの resourcepacks フォルダーに入れます。','Minecraftの「設定 → リソースパック」から OTO BLOGIC VISUALS を有効にします。'],notes:'対応について',noteItems:['Java版専用です。Bedrock版では使用できません。','1.12ではMinecraftの仕組み上、音程とリピーターのみを表示します。','ゾンビなどの頭部で鳴る音は対象外です。'],home:'ホームへ',version:'Minecraft Java'},
  en:{title:'OTO BLOGIC VISUALS',lead:'A resource pack that makes Minecraft note blocks and repeaters easier to read at a glance.',edition:'MINECRAFT JAVA EDITION',choose:'Choose your version',latest:'LATEST',download:'DOWNLOAD ZIP',direct:'Downloads directly from GitHub without opening a GitHub page.',what:'WHAT DOES IT SHOW?',whatText:'See note-block pitch and instrument, plus repeater direction and delay, directly on the blocks.',features:['Note-block pitch','Instrument set by the block below','Repeater direction and delay'],install:'HOW TO INSTALL',steps:['Choose the ZIP that matches your Minecraft version.','Do not unzip it. Put the ZIP in the Minecraft resourcepacks folder.','Enable OTO BLOGIC VISUALS in Options → Resource Packs.'],notes:'COMPATIBILITY',noteItems:['For Java Edition only. It does not work in Bedrock Edition.','Minecraft 1.12 can show pitch and repeaters, but not the instrument under each note block.','Sounds produced by mob heads are not included.'],home:'HOME',version:'Minecraft Java'},
  es:{title:'OTO BLOGIC VISUALS',lead:'Un paquete de recursos que facilita la lectura de bloques musicales y repetidores.',edition:'MINECRAFT JAVA EDITION',choose:'Elige tu versión',latest:'MÁS RECIENTE',download:'DESCARGAR ZIP',direct:'Descarga directa desde GitHub, sin abrir su página.',what:'¿QUÉ MUESTRA?',whatText:'Muestra la altura y el instrumento del bloque musical, además de la dirección y el retardo del repetidor.',features:['Altura del bloque musical','Instrumento según el bloque inferior','Dirección y retardo del repetidor'],install:'INSTALACIÓN',steps:['Elige el ZIP para tu versión de Minecraft.','No lo descomprimas. Colócalo en la carpeta resourcepacks.','Activa OTO BLOGIC VISUALS en Opciones → Paquetes de recursos.'],notes:'COMPATIBILIDAD',noteItems:['Solo para Java Edition.','En 1.12 se muestran la altura y los repetidores, pero no el instrumento.','No incluye sonidos producidos por cabezas de criaturas.'],home:'INICIO',version:'Minecraft Java'},
  fr:{title:'OTO BLOGIC VISUALS',lead:'Un pack de ressources qui rend les blocs musicaux et les répéteurs plus faciles à lire.',edition:'MINECRAFT JAVA EDITION',choose:'Choisissez votre version',latest:'RÉCENT',download:'TÉLÉCHARGER LE ZIP',direct:'Téléchargement direct depuis GitHub, sans ouvrir sa page.',what:'QUE MONTRE-T-IL ?',whatText:'Affiche la hauteur et l’instrument du bloc musical, ainsi que la direction et le délai du répéteur.',features:['Hauteur du bloc musical','Instrument selon le bloc placé dessous','Direction et délai du répéteur'],install:'INSTALLATION',steps:['Choisissez le ZIP adapté à votre version.','Ne le décompressez pas. Placez-le dans le dossier resourcepacks.','Activez OTO BLOGIC VISUALS dans Options → Packs de ressources.'],notes:'COMPATIBILITÉ',noteItems:['Uniquement pour Java Edition.','En 1.12, la hauteur et les répéteurs sont visibles, mais pas l’instrument.','Les sons produits par les têtes de créatures ne sont pas inclus.'],home:'ACCUEIL',version:'Minecraft Java'},
  de:{title:'OTO BLOGIC VISUALS',lead:'Ein Ressourcenpaket, das Notenblöcke und Repeater leichter lesbar macht.',edition:'MINECRAFT JAVA EDITION',choose:'Version auswählen',latest:'NEUESTE',download:'ZIP HERUNTERLADEN',direct:'Direkter Download von GitHub, ohne eine GitHub-Seite zu öffnen.',what:'WAS WIRD ANGEZEIGT?',whatText:'Tonhöhe und Instrument des Notenblocks sowie Richtung und Verzögerung des Repeaters werden sichtbar.',features:['Tonhöhe des Notenblocks','Instrument durch den Block darunter','Repeater-Richtung und Verzögerung'],install:'INSTALLATION',steps:['Wähle das ZIP für deine Minecraft-Version.','Nicht entpacken. Lege das ZIP in den Ordner resourcepacks.','Aktiviere OTO BLOGIC VISUALS unter Optionen → Ressourcenpakete.'],notes:'KOMPATIBILITÄT',noteItems:['Nur für Java Edition.','In 1.12 werden Tonhöhe und Repeater angezeigt, aber nicht das Instrument.','Klänge von Kreaturenköpfen sind nicht enthalten.'],home:'STARTSEITE',version:'Minecraft Java'},
  zh:{title:'OTO BLOGIC VISUALS',lead:'让 Minecraft 音符盒和红石中继器更容易识别的资源包。',edition:'MINECRAFT JAVA EDITION',choose:'选择你的版本',latest:'最新',download:'下载 ZIP',direct:'直接从 GitHub 下载，不会打开 GitHub 页面。',what:'可以看清什么？',whatText:'直接查看音符盒的音高与乐器，以及中继器的方向与延迟。',features:['音符盒的音高','由下方方块决定的乐器','中继器方向与延迟'],install:'安装方法',steps:['选择与你的 Minecraft 版本相符的 ZIP。','不要解压，将 ZIP 放入 Minecraft 的 resourcepacks 文件夹。','在“选项 → 资源包”中启用 OTO BLOGIC VISUALS。'],notes:'兼容性',noteItems:['仅适用于 Java 版。','1.12 只能显示音高和中继器，不能显示乐器。','不包含生物头颅发出的声音。'],home:'首页',version:'Minecraft Java'},
  'zh-tw':{title:'OTO BLOGIC VISUALS',lead:'讓 Minecraft 音階盒與紅石中繼器更容易辨識的資源包。',edition:'MINECRAFT JAVA EDITION',choose:'選擇你的版本',latest:'最新',download:'下載 ZIP',direct:'直接從 GitHub 下載，不會開啟 GitHub 頁面。',what:'可以看清什麼？',whatText:'直接查看音階盒的音高與樂器，以及中繼器的方向與延遲。',features:['音階盒的音高','由下方方塊決定的樂器','中繼器方向與延遲'],install:'安裝方法',steps:['選擇與你的 Minecraft 版本相符的 ZIP。','不要解壓縮，將 ZIP 放入 Minecraft 的 resourcepacks 資料夾。','在「選項 → 資源包」中啟用 OTO BLOGIC VISUALS。'],notes:'相容性',noteItems:['僅適用於 Java 版。','1.12 只能顯示音高與中繼器，無法顯示樂器。','不包含生物頭顱發出的聲音。'],home:'首頁',version:'Minecraft Java'},
  ko:{title:'OTO BLOGIC VISUALS',lead:'Minecraft 소리 블록과 중계기를 더 쉽게 읽을 수 있게 해 주는 리소스 팩입니다.',edition:'MINECRAFT JAVA EDITION',choose:'버전 선택',latest:'최신',download:'ZIP 다운로드',direct:'GitHub 화면을 열지 않고 바로 다운로드합니다.',what:'무엇을 보여 주나요?',whatText:'소리 블록의 음높이와 악기, 중계기의 방향과 지연을 바로 확인합니다.',features:['소리 블록 음높이','아래 블록으로 결정되는 악기','중계기 방향과 지연'],install:'설치 방법',steps:['Minecraft 버전에 맞는 ZIP을 선택합니다.','압축을 풀지 말고 ZIP을 resourcepacks 폴더에 넣습니다.','설정 → 리소스 팩에서 OTO BLOGIC VISUALS를 활성화합니다.'],notes:'호환성',noteItems:['Java Edition 전용입니다.','1.12에서는 음높이와 중계기만 표시됩니다.','몽 머리에서 나는 소리는 포함하지 않습니다.'],home:'홈',version:'Minecraft Java'},
  id:{title:'OTO BLOGIC VISUALS',lead:'Paket resource agar note block dan repeater Minecraft lebih mudah dibaca.',edition:'MINECRAFT JAVA EDITION',choose:'Pilih versi',latest:'TERBARU',download:'UNDUH ZIP',direct:'Unduh langsung dari GitHub tanpa membuka halaman GitHub.',what:'APA YANG DITAMPILKAN?',whatText:'Lihat nada dan instrumen note block, serta arah dan delay repeater langsung pada blok.',features:['Nada note block','Instrumen dari blok di bawahnya','Arah dan delay repeater'],install:'CARA MEMASANG',steps:['Pilih ZIP yang sesuai dengan versi Minecraft.','Jangan diekstrak. Masukkan ZIP ke folder resourcepacks.','Aktifkan OTO BLOGIC VISUALS di Options → Resource Packs.'],notes:'KOMPATIBILITAS',noteItems:['Khusus Java Edition.','Di 1.12, nada dan repeater terlihat tetapi instrumen tidak.','Suara dari kepala mob tidak termasuk.'],home:'BERANDA',version:'Minecraft Java'},
}

const downloadBase='https://raw.githubusercontent.com/SOTA56/OTO_BLOGIC_VISUALS/main/dist/'
const previewCopy:Record<string,string>={
  ja:'音符ブロックの音程と音の種類、リピーターの向きと遅延をゲーム内で確認できます。Minecraft Java版専用です。',
  en:'Read note-block pitches and sound types, plus repeater direction and delay, directly in the game. For Minecraft Java Edition only.',
  es:'Consulta las notas, los tipos de sonido y los ajustes del repetidor directamente en el juego. Solo para Minecraft Java Edition.',
  fr:'Repérez les hauteurs, les types de son et les réglages des répéteurs directement dans le jeu. Uniquement pour Minecraft Java Edition.',
  de:'Erkenne Tonhöhen, Klangarten und Repeater-Einstellungen direkt im Spiel. Nur für Minecraft Java Edition.',
  zh:'直接在游戏中查看音符盒的音高、声音种类和中继器设置。仅适用于 Minecraft Java 版。',
  'zh-tw':'直接在遊戲中查看音階盒的音高、聲音種類與中繼器設定。僅適用於 Minecraft Java 版。',
  ko:'게임 안에서 소리 블록의 음높이와 소리 종류, 중계기 설정을 확인할 수 있습니다. Minecraft Java Edition 전용입니다.',
  id:'Lihat nada, jenis suara, serta arah dan delay repeater langsung di dalam game. Khusus Minecraft Java Edition.',
}

export default function ResourcePackPage({language,setLanguage,onHome}:Props){
  const t=copy[language]??copy.en
  const [selectedFile,setSelectedFile]=useState<string>(packs[0].file)
  const selected=packs.find(pack=>pack.file===selectedFile)??packs[0]
  return <main className="resource-pack-page">
    <header className="resource-pack-header">
      <button className="resource-pack-brand" onClick={onHome} aria-label={t.home}><img src="/assets/branding/oto-blogic-icon.svg" alt=""/><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/></button>
      <div><button className="resource-pack-home" onClick={onHome}>← {t.home}</button><select value={language} onChange={event=>setLanguage(event.target.value)} aria-label="Language">{languageOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
    </header>
    <section className="resource-pack-hero">
      <small>OFFICIAL RESOURCE PACK</small><h1>{t.title}</h1><p>{t.lead}</p><b>{t.edition}</b>
    </section>
    <div className="resource-pack-content">
      <section className="resource-pack-download">
        <div className="resource-pack-number">01</div><div><h2>{t.choose}</h2><label><span>{t.version}</span><select value={selectedFile} onChange={event=>setSelectedFile(event.target.value)}>{packs.map(pack=><option value={pack.file} key={pack.file}>{pack.version}{pack.latest?` — ${t.latest}`:''}</option>)}</select></label><a href={`${downloadBase}${selected.file}`} download={selected.file} className="resource-pack-download-button" aria-label={`${t.download} — Minecraft Java ${selected.version}`}><span>{t.download}</span><b>⇩</b></a></div>
      </section>
      <section className="resource-pack-explainer"><div><small>READ THE CIRCUIT</small><h2>{t.what}</h2><p>{t.whatText}</p></div><ol>{t.features.map((feature,index)=><li key={feature}><b>{String(index+1).padStart(2,'0')}</b><span>{feature}</span></li>)}</ol><figure className="resource-pack-preview"><img src="/assets/resource-pack/visuals-in-game.jpg" alt="OTO BLOGIC VISUALS in Minecraft Java Edition"/><figcaption>{previewCopy[language]??previewCopy.en}</figcaption></figure></section>
      <section className="resource-pack-install"><header><small>THREE STEPS</small><h2>{t.install}</h2></header><ol>{t.steps.map((step,index)=><li key={step}><b>{index+1}</b><p>{step}</p></li>)}</ol></section>
      <section className="resource-pack-notes"><h2>{t.notes}</h2><ul>{t.noteItems.map(item=><li key={item}>{item}</li>)}</ul></section>
    </div>
    <footer className="resource-pack-footer"><button onClick={onHome}>← {t.home}</button><span>© 2026 OTO BLOGIC · Powered by SOTA56</span></footer>
  </main>
}
