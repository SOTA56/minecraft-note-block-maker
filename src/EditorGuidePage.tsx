import './editorGuide.css'

type Props={language:string;setLanguage:(language:string)=>void;onBack:()=>void;onHome:()=>void}
type GuideItem={icon:string;title:string;body:string;image?:string;invert?:boolean;danger?:boolean}

const jaSections:{title:string;intro:string;items:GuideItem[]}[]=[
  {title:'再生と曲の設定',intro:'曲全体の速さと長さを決め、再生しながら音を確かめます。',items:[
    {icon:'',image:'/assets/icons/play.svg',invert:true,title:'再生／停止',body:'再生ヘッドの位置から演奏します。再生中に押すと音も含めてすぐ停止します。'},
    {icon:'',image:'/assets/icons/cue.svg',invert:true,title:'頭出し',body:'再生ヘッドを曲の先頭へ戻します。'},
    {icon:'150',title:'BPM',body:'曲のテンポを設定します。Minecraftのティックレート換算値も表示します。'},
    {icon:'▥',title:'小節数',body:'曲の長さを小節単位で変更します。数字の直接入力と▲▼の長押しに対応します。'},
    {icon:'≋',title:'最大同時発音数',body:'同じタイミングに鳴るノートの最大数です。生成できる音符ブロック回路を判断する目安になります。'},
  ]},
  {title:'トラックと音色',intro:'20トラックを使い分け、音色・音量・PANを組み合わせられます。',items:[
    {icon:'01',title:'選択中のトラック',body:'トラック一覧を開きます。各トラックのゴースト、ミュート、ソロ、音量も変更できます。'},
    {icon:'',image:'/assets/icons/settings.svg',title:'トラック設定',body:'トラック名、音色、音量、ミュート、ソロ、PANをまとめて設定します。'},
    {icon:'◉',title:'ゴースト',body:'他トラックのノートを色付きの枠線で表示します。ゴーストは参照用で編集されません。'},
  ]},
  {title:'ノートの入力と編集',intro:'ピアノロールをタップして音を置き、ドラッグや範囲操作で整えます。',items:[
    {icon:'✎',title:'入力',body:'空のマスを短くタップするとノートを設置します。ノートをドラッグすると移動し、短くタップすると削除します。'},
    {icon:'▧',title:'範囲選択',body:'ドラッグした長方形の範囲を選択します。範囲内のノートを掴むと、まとめて移動できます。'},
    {icon:'⧉',title:'コピー',body:'選択範囲内のノートを一時保存します。コピーできるとアイコンがチェック表示に変わります。'},
    {icon:'⎘',title:'貼付',body:'コピーしたノートを再生ヘッドの位置へ貼り付け、再生ヘッドを貼付範囲の末尾へ進めます。'},
    {icon:'⌫',danger:true,title:'削除',body:'範囲選択したノートをまとめて削除します。'},
    {icon:'− ＋',title:'小節幅の縮小／拡大',body:'1ステップの縦幅を調整し、曲全体の確認や細かな編集をしやすくします。'},
  ]},
  {title:'ピアノロールの操作',intro:'時間は縦方向へ進み、横方向に低音から高音まで25音を配置しています。',items:[
    {icon:'ド',title:'鍵盤と音名',body:'上部の鍵盤で音を試聴できます。右端のボタンでドレミと音符ブロックのクリック数を切り替えます。'},
    {icon:'│',title:'再生ヘッド',body:'小節番号列の横線をタップすると再生位置を移動します。ダブルタップするとそこから再生します。'},
    {icon:'↕',title:'スクロール',body:'ノートのない打ち込み領域をスワイプして移動します。範囲選択中は小節番号列でもスクロールできます。'},
  ]},
  {title:'履歴・遅延・ファイル',intro:'下部メニューから編集履歴、Minecraft向けの遅延単位、保存や設計図生成を操作します。',items:[
    {icon:'↶ ↷',title:'UNDO／REDO',body:'直前の編集を元に戻す、またはやり直します。'},
    {icon:'',image:'/assets/icons/delay-mode.svg',invert:true,title:'遅延モード',body:'グリッド1目盛りを1・2・4遅延から選びます。ゆっくりした曲では回路を短くできます。'},
    {icon:'•••',title:'メニュー',body:'設計図生成、.OBGファイルの保存・読み込み、ホーム、全削除などを開きます。'},
  ]},
]

const enSections:{title:string;intro:string;items:GuideItem[]}[]=jaSections.map((section,index)=>({title:['PLAYBACK & SONG','TRACKS & INSTRUMENTS','NOTE ENTRY & EDITING','PIANO ROLL','HISTORY, DELAY & FILES'][index],intro:['Set the song speed and length, then audition your arrangement.','Arrange up to 20 tracks with individual instruments, volume, and pan.','Place notes, then refine them with drag and selection tools.','Time moves vertically while 25 pitches run from low to high.','Use the bottom dock for history, delay units, files, and blueprints.'][index],items:section.items.map((item,itemIndex)=>({...item,title:[['PLAY / STOP','RETURN TO START','BPM','BARS','MAX POLYPHONY'],['ACTIVE TRACK','TRACK SETTINGS','GHOST NOTES'],['DRAW','SELECT','COPY','PASTE','DELETE','GRID ZOOM'],['KEYS & PITCHES','PLAYHEAD','SCROLL'],['UNDO / REDO','DELAY MODE','MENU']][index][itemIndex],body:[['Starts at the playhead. Press again to stop immediately.','Moves the playhead to the beginning.','Sets tempo and shows the Minecraft tick-rate equivalent.','Changes song length by typing or holding the arrows.','Shows the highest number of simultaneous notes.'],['Opens the track list and its ghost, mute, solo, and volume controls.','Edits track name, instrument, volume, mute, solo, and pan.','Shows other tracks as non-editable colored outlines.'],['Tap to add a note. Drag a note to move it, or tap it to delete it.','Drag a rectangle to select notes, then drag a selected note to move the group.','Copies the selected notes. A check mark confirms the action.','Pastes at the playhead and moves it to the phrase end.','Deletes every note in the selection.','Changes row height for overview or precision.'],['Tap keys to audition pitches and switch between names and click counts.','Tap the bar-number column to seek, or double-tap to play.','Swipe empty roll space to scroll.'],['Undo or redo the latest editing operation.','Sets each grid step to 1, 2, or 4 repeater delay units.','Opens blueprints, .OBG files, home, and clear-all actions.']][index][itemIndex]}))}))

export default function EditorGuidePage({language,setLanguage,onBack,onHome}:Props){const ja=language==='ja',sections=ja?jaSections:enSections;return <main className="editor-guide-page"><header className="editor-guide-topbar"><button className="editor-guide-brand" onClick={onHome} aria-label={ja?'トップページへ':'Go home'}><img src="/assets/branding/oto-blogic-icon.svg" alt=""/><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/></button><div><button className="editor-guide-back" onClick={onBack}>← {ja?'打ち込みへ':'EDITOR'}</button><select value={language} onChange={event=>setLanguage(event.target.value)} aria-label="Language"><option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="zh">中文</option><option value="ko">한국어</option></select></div></header><section className="editor-guide-hero"><small>EDITOR GUIDE</small><h1>{ja?'打ち込み画面の使い方':'HOW TO USE THE EDITOR'}</h1><p>{ja?'OTO BLOGICのピアノロールでMinecraftの音符ブロック演奏を作曲するための操作ガイドです。各ボタンや入力方法を確認しながら、最初の1音から回路設計図の生成まで進められます。':'A complete guide to composing Minecraft note-block music in the OTO BLOGIC piano-roll editor.'}</p></section><div className="editor-guide-content">{sections.map((section,index)=><section className="editor-guide-section" key={section.title}><header><b>{String(index+1).padStart(2,'0')}</b><div><h2>{section.title}</h2><p>{section.intro}</p></div></header><div className="editor-guide-grid">{section.items.map(item=><article key={item.title}><span className={`editor-guide-icon ${item.invert?'invert':''} ${item.danger?'danger':''}`}>{item.image?<img src={item.image} alt=""/>:item.icon}</span><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div></section>)}</div><footer className="editor-guide-footer"><button onClick={onBack}>{ja?'打ち込み画面へ戻る':'BACK TO EDITOR'} →</button><span>© 2026 OTO BLOGIC · Powered by SOTA56</span></footer></main>}
