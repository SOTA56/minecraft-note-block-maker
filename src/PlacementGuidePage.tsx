import './placement.css'

type Props={language:string;setLanguage:(language:string)=>void;onBack:()=>void;onHome:()=>void;onResourcePack:()=>void}

const languageOptions=[
  ['ja','日本語'],['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],
  ['zh','简体中文'],['zh-tw','繁體中文'],['ko','한국어'],['id','Bahasa Indonesia']
] as const

const copy={
  ja:{
    back:'設計図へ戻る',backShort:'設計図',home:'トップページへ',title:'ブロックの設置方法',lead:'設計図を見ながら、Minecraftの中で音符ブロック回路を組み立てる手順をまとめました。',
    basic:'基本の置き方',basicText:'音符ブロック、リピーター、レッドストーンダストは、基本的に同じ高さに置きます。音符ブロックの真下に置くブロックで音の種類が決まります。',flat:'平面に直接置く',flatText:'音符ブロックや回路を地面に直接置き、音の種類を決めるブロックだけを1マス掘って埋める方法です。回路をすばやく組みたいときに向いています。',raised:'1段積み上げる',raisedText:'土台用のブロックを1段置き、その上に音符ブロックと回路を並べます。音の種類を決めるブロックが見えるので、確認しながら作れます。',
    pitch:'音符ブロックの音程',pitchText:'音符ブロックは右クリックした回数で音程が変わります。設計図の数字は、その音にするためのクリック数です。クリック回数は見た目では分からないので、分からなくなったときは一度壊して置き直すのがおすすめです。',pitchCaption:'右クリックするたびに、音符ブロックの音程が半音（打ち込みページでいうと、ひとつ上の鍵盤）ずつ上がります。',
    repeater:'リピーターの向きと遅延数',repeaterText:'写真はすべて右向きに設置したリピーターです。赤い五角形に白数字で表示される数字は遅延数です。クリック数表示では、白地に黒い枠と赤い数字で表示します。',delay:'遅延',clicks:'クリック数',repeaterOperation:'リピーターは設置したときに1遅延です。右クリックを1回すると2遅延、2回クリックで3遅延、3回クリックで4遅延と遅延数が変わります。設計図では、遅延数表示とクリック数表示を選択できるので、お好きな表示を選んでください。',
    start:'スタートの作り方',startText:'スタート地点には石のボタンや木のボタンがおすすめです。ボタンを押すと回路へ信号が送られ、演奏が始まります。',layers:'詰め詰め回路のレイヤー',layersText:'レイヤーを重ねるときは、下の音符ブロックから1マス以上あけて土台を置きます。土台と土台の間は2マス以上あけてください。レイヤー同士をつなぐときは、階段状にブロックを置き、前のレイヤーの終わりから次のレイヤーの始まりにレッドストーンダストをつなぎます。',layerConnect:'階段状にブロックをつなぎ、前のレイヤーの終わりから次のレイヤーの始まりへレッドストーンダストをつなぎます。'
  },
  en:{
    back:'Back to blueprint',backShort:'Blueprint',home:'Go to home page',title:'How to place blocks',lead:'This guide shows how to build a Minecraft note-block circuit from an OTO BLOGIC blueprint.',
    basic:'Basic layout',basicText:'Place note blocks, repeaters, and redstone dust at the same level. The block directly below each note block determines its sound type.',flat:'Build at ground level',flatText:'Place the note blocks and circuit on the ground, then dig down one block only where a sound-type block is needed. This is a quick way to build the circuit.',raised:'Build one block higher',raisedText:'Place one layer of support blocks, then build the note blocks and circuit on top. The sound-type blocks stay visible, so they are easier to check.',
    pitch:'Setting note-block pitch',pitchText:'A note block changes pitch according to how many times you right-click it. The blueprint number is the required number of clicks. The click count cannot be seen on the block, so if you lose track, break it and place it again.',pitchCaption:'Each right-click raises the pitch by one semitone—one key higher in the editor.',
    repeater:'Repeater direction and delay',repeaterText:'Every repeater in these photos faces right. A red pentagon with a white number shows the delay. Click-count mode uses a white pentagon with a black outline and red number.',delay:'Delay',clicks:'Clicks',repeaterOperation:'A newly placed repeater has 1 delay. Right-click once for 2 delay, twice for 3 delay, or three times for 4 delay. The blueprint can show either delay values or click counts, so choose whichever is easier for you.',
    start:'Making the start',startText:'A stone or wooden button is recommended at the start. Pressing it sends a signal into the circuit and starts the performance.',layers:'Compact-circuit layers',layersText:'When stacking layers, leave at least one empty block above the note blocks below before placing the next support layer. Keep at least two blocks between support layers. To connect layers, build a staircase and run redstone dust from the end of one layer to the start of the next.',layerConnect:'Build a staircase and run redstone dust from the end of one layer to the start of the next.'
  },
  es:{
    back:'Volver al plano',backShort:'Plano',home:'Ir a la página principal',title:'Cómo colocar los bloques',lead:'Esta guía explica cómo construir en Minecraft un circuito de bloques musicales siguiendo un plano de OTO BLOGIC.',
    basic:'Colocación básica',basicText:'Coloca los bloques musicales, repetidores y polvo de redstone a la misma altura. El bloque justo debajo de cada bloque musical determina el tipo de sonido.',flat:'Construir sobre el suelo',flatText:'Coloca los bloques musicales y el circuito sobre el suelo y cava un bloque solo donde vaya un bloque que determine el sonido. Es la forma más rápida de construir.',raised:'Construir un bloque más alto',raisedText:'Coloca una capa de bloques de apoyo y construye encima los bloques musicales y el circuito. Así podrás ver y comprobar los bloques que determinan el sonido.',
    pitch:'Cambiar la altura del sonido',pitchText:'La altura de un bloque musical depende de cuántas veces hagas clic derecho. El número del plano indica los clics necesarios. Como el bloque no muestra ese número, si pierdes la cuenta, rómpelo y colócalo de nuevo.',pitchCaption:'Cada clic derecho sube un semitono: una tecla más arriba en el editor.',
    repeater:'Dirección y retardo del repetidor',repeaterText:'Todos los repetidores de las fotos apuntan a la derecha. El pentágono rojo con número blanco muestra el retardo. El modo de clics usa fondo blanco, borde negro y número rojo.',delay:'Retardo',clicks:'Clics',repeaterOperation:'Un repetidor recién colocado tiene retardo 1. Haz clic derecho una vez para retardo 2, dos veces para retardo 3 y tres veces para retardo 4. En el plano puedes elegir entre ver el retardo o el número de clics.',
    start:'Cómo iniciar el circuito',startText:'Recomendamos un botón de piedra o madera en el inicio. Al pulsarlo, la señal entra en el circuito y comienza la música.',layers:'Capas del circuito compacto',layersText:'Al apilar capas, deja al menos un bloque de aire sobre los bloques musicales inferiores antes de poner la siguiente base. Deja al menos dos bloques entre bases. Para unirlas, crea una escalera y lleva el polvo de redstone desde el final de una capa hasta el inicio de la siguiente.',layerConnect:'Crea una escalera y lleva el polvo de redstone desde el final de una capa hasta el inicio de la siguiente.'
  },
  fr:{
    back:'Retour au plan',backShort:'Plan',home:"Aller à l'accueil",title:'Comment placer les blocs',lead:'Ce guide explique comment construire dans Minecraft un circuit de blocs musicaux à partir d’un plan OTO BLOGIC.',
    basic:'Placement de base',basicText:'Placez les blocs musicaux, les répéteurs et la poudre de redstone au même niveau. Le bloc juste sous chaque bloc musical détermine son type de son.',flat:'Construire au niveau du sol',flatText:'Posez les blocs musicaux et le circuit au sol, puis creusez d’un bloc uniquement aux endroits où placer les blocs qui déterminent le son. Cette méthode est rapide.',raised:'Construire un bloc plus haut',raisedText:'Posez une couche de blocs de support, puis construisez les blocs musicaux et le circuit dessus. Les blocs qui déterminent le son restent visibles et faciles à vérifier.',
    pitch:'Régler la hauteur du son',pitchText:'La hauteur d’un bloc musical dépend du nombre de clics droits. Le nombre sur le plan indique les clics nécessaires. Ce nombre n’étant pas visible sur le bloc, cassez-le et reposez-le si vous perdez le compte.',pitchCaption:'Chaque clic droit monte d’un demi-ton, soit d’une touche dans l’éditeur.',
    repeater:'Sens et délai du répéteur',repeaterText:'Tous les répéteurs des photos sont orientés vers la droite. Le pentagone rouge avec un nombre blanc indique le délai. Le mode clics utilise un fond blanc, un contour noir et un nombre rouge.',delay:'Délai',clicks:'Clics',repeaterOperation:'Un répéteur posé a un délai de 1. Faites un clic droit pour le délai 2, deux clics pour le délai 3 et trois clics pour le délai 4. Le plan peut afficher le délai ou le nombre de clics : choisissez ce qui vous convient.',
    start:'Créer le départ',startText:'Nous recommandons un bouton en pierre ou en bois au départ. Appuyez dessus pour envoyer le signal et lancer la musique.',layers:'Couches du circuit compact',layersText:'Pour empiler les couches, laissez au moins un bloc d’air au-dessus des blocs musicaux inférieurs avant de poser le support suivant. Gardez au moins deux blocs entre les supports. Construisez un escalier et reliez la fin d’une couche au début de la suivante avec de la poudre de redstone.',layerConnect:'Construisez un escalier et reliez la fin d’une couche au début de la suivante avec de la poudre de redstone.'
  },
  de:{
    back:'Zurück zum Bauplan',backShort:'Bauplan',home:'Zur Startseite',title:'Blöcke richtig platzieren',lead:'Diese Anleitung zeigt, wie du eine OTO-BLOGIC-Vorlage in Minecraft als Notenblock-Schaltung baust.',
    basic:'Grundaufbau',basicText:'Notenblöcke, Repeater und Redstone-Staub liegen grundsätzlich auf derselben Höhe. Der Block direkt unter einem Notenblock bestimmt seine Klangart.',flat:'Direkt am Boden bauen',flatText:'Setze Notenblöcke und Schaltung auf den Boden. Grabe nur für die Blöcke, die die Klangart bestimmen, ein Feld tief. So lässt sich die Schaltung schnell bauen.',raised:'Einen Block erhöht bauen',raisedText:'Lege zuerst eine Schicht Stützblöcke und baue Notenblöcke und Schaltung darauf. Die Blöcke für die Klangart bleiben sichtbar und lassen sich leicht prüfen.',
    pitch:'Tonhöhe des Notenblocks',pitchText:'Die Tonhöhe hängt davon ab, wie oft du den Notenblock rechtsklickst. Die Zahl im Bauplan zeigt die nötigen Klicks. Der Block selbst zeigt die Anzahl nicht an. Wenn du dich verzählst, baue ihn ab und setze ihn neu.',pitchCaption:'Jeder Rechtsklick erhöht den Ton um einen Halbton – im Editor um eine Taste nach oben.',
    repeater:'Richtung und Verzögerung',repeaterText:'Alle Repeater auf den Bildern zeigen nach rechts. Ein rotes Fünfeck mit weißer Zahl zeigt die Verzögerung. Im Klickmodus ist das Fünfeck weiß, schwarz umrandet und die Zahl rot.',delay:'Verzögerung',clicks:'Klicks',repeaterOperation:'Ein neu gesetzter Repeater hat Verzögerung 1. Ein Rechtsklick ergibt 2, zwei Klicks 3 und drei Klicks 4. Im Bauplan kannst du Verzögerung oder Klickanzahl anzeigen lassen.',
    start:'Den Start bauen',startText:'Am Start eignet sich ein Stein- oder Holzknopf. Beim Drücken gelangt ein Signal in die Schaltung und die Musik beginnt.',layers:'Ebenen der Kompakt-Schaltung',layersText:'Lass beim Stapeln über den unteren Notenblöcken mindestens einen Block Luft, bevor du die nächste Stützebene setzt. Zwischen Stützebenen müssen mindestens zwei Blöcke liegen. Verbinde das Ende einer Ebene über eine Blocktreppe und Redstone-Staub mit dem Anfang der nächsten.',layerConnect:'Verbinde das Ende einer Ebene über eine Blocktreppe und Redstone-Staub mit dem Anfang der nächsten.'
  },
  zh:{
    back:'返回蓝图',backShort:'蓝图',home:'返回首页',title:'方块放置方法',lead:'本指南介绍如何按照 OTO BLOGIC 蓝图，在 Minecraft 中搭建音符盒电路。',
    basic:'基本摆法',basicText:'音符盒、红石中继器和红石粉通常放在同一高度。音符盒正下方的方块决定声音种类。',flat:'直接在地面搭建',flatText:'把音符盒和电路直接放在地面上，只在需要放置声音种类方块的位置向下挖一格。适合快速搭建。',raised:'整体抬高一格',raisedText:'先铺一层支撑方块，再在上面摆放音符盒和电路。决定声音种类的方块保持可见，方便边看边确认。',
    pitch:'调整音符盒音高',pitchText:'音符盒的音高由右键点击次数决定。蓝图上的数字就是需要点击的次数。方块外观不会显示点击次数，如果记不清，建议拆掉后重新放置。',pitchCaption:'每右键点击一次，音高升高半音，也就是编辑器里向上一格琴键。',
    repeater:'中继器方向和延迟',repeaterText:'照片中的中继器全部朝右。红色五边形中的白色数字表示延迟；点击次数模式使用白底、黑边和红色数字。',delay:'延迟',clicks:'点击次数',repeaterOperation:'中继器刚放下时是1延迟。右键1次为2延迟，2次为3延迟，3次为4延迟。蓝图可以选择显示延迟数或点击次数，请使用你更容易理解的方式。',
    start:'制作起点',startText:'起点推荐使用石按钮或木按钮。按下按钮后，信号会进入电路并开始演奏。',layers:'紧凑电路的层级',layersText:'叠加层级时，先在下方音符盒上方至少留一格空气，再放置下一层支撑方块。两层支撑方块之间至少相隔两格。用方块搭成台阶，并用红石粉从上一层的终点连接到下一层的起点。',layerConnect:'用方块搭成台阶，并用红石粉从上一层的终点连接到下一层的起点。'
  },
  'zh-tw':{
    back:'返回藍圖',backShort:'藍圖',home:'返回首頁',title:'方塊放置方法',lead:'本指南介紹如何按照 OTO BLOGIC 藍圖，在 Minecraft 中搭建音階盒電路。',
    basic:'基本擺法',basicText:'音階盒、紅石中繼器和紅石粉通常放在同一高度。音階盒正下方的方塊決定聲音種類。',flat:'直接在地面搭建',flatText:'把音階盒和電路直接放在地面上，只在需要放置聲音種類方塊的位置向下挖一格。適合快速搭建。',raised:'整體墊高一格',raisedText:'先鋪一層支撐方塊，再在上面擺放音階盒和電路。決定聲音種類的方塊保持可見，方便一邊搭建一邊確認。',
    pitch:'調整音階盒音高',pitchText:'音階盒的音高由右鍵點擊次數決定。藍圖上的數字就是需要點擊的次數。方塊外觀不會顯示點擊次數，如果記不清，建議拆掉後重新放置。',pitchCaption:'每按一次右鍵，音高會升高半音，也就是編輯器裡往上一格琴鍵。',
    repeater:'中繼器方向與延遲',repeaterText:'照片中的中繼器全部朝右。紅色五邊形中的白色數字表示延遲；點擊次數模式使用白底、黑框和紅色數字。',delay:'延遲',clicks:'點擊次數',repeaterOperation:'中繼器剛放下時是1延遲。按右鍵1次為2延遲，2次為3延遲，3次為4延遲。藍圖可選擇顯示延遲數或點擊次數，請使用較容易理解的方式。',
    start:'製作起點',startText:'起點建議使用石製按鈕或木製按鈕。按下按鈕後，訊號會進入電路並開始演奏。',layers:'緊湊電路的分層',layersText:'堆疊分層時，先在下方音階盒上方至少留一格空氣，再放置下一層支撐方塊。兩層支撐方塊之間至少相隔兩格。用方塊搭成階梯，並用紅石粉從前一層的終點連到下一層的起點。',layerConnect:'用方塊搭成階梯，並用紅石粉從前一層的終點連到下一層的起點。'
  },
  ko:{
    back:'설계도로 돌아가기',backShort:'설계도',home:'홈으로 이동',title:'블록 설치 방법',lead:'OTO BLOGIC 설계도를 보면서 Minecraft 안에 소리 블록 회로를 만드는 방법을 정리했습니다.',
    basic:'기본 배치',basicText:'소리 블록, 중계기, 레드스톤 가루는 기본적으로 같은 높이에 놓습니다. 소리 블록 바로 아래의 블록이 소리 종류를 결정합니다.',flat:'바닥에 바로 만들기',flatText:'소리 블록과 회로를 바닥에 놓고, 소리 종류를 정하는 블록 자리만 한 칸 파서 넣는 방법입니다. 빠르게 만들 때 편리합니다.',raised:'한 칸 높여 만들기',raisedText:'받침 블록을 한 층 놓고 그 위에 소리 블록과 회로를 만듭니다. 소리 종류를 정하는 블록이 보여서 확인하기 쉽습니다.',
    pitch:'소리 블록 음높이 맞추기',pitchText:'소리 블록은 마우스 오른쪽 버튼을 누른 횟수에 따라 음높이가 바뀝니다. 설계도 숫자는 필요한 클릭 횟수입니다. 겉모습으로는 횟수를 알 수 없으므로 헷갈리면 부수고 다시 놓는 것이 좋습니다.',pitchCaption:'오른쪽 클릭을 할 때마다 반음, 즉 편집기에서 건반 한 칸만큼 음이 올라갑니다.',
    repeater:'중계기 방향과 지연',repeaterText:'사진의 중계기는 모두 오른쪽을 향합니다. 빨간 오각형의 흰 숫자는 지연 수입니다. 클릭 수 표시는 흰 바탕, 검은 테두리, 빨간 숫자를 사용합니다.',delay:'지연',clicks:'클릭 수',repeaterOperation:'중계기를 처음 놓으면 1지연입니다. 오른쪽 클릭 1번은 2지연, 2번은 3지연, 3번은 4지연입니다. 설계도에서는 지연 수와 클릭 수 중 편한 표시를 선택할 수 있습니다.',
    start:'시작 지점 만들기',startText:'시작 지점에는 돌 버튼이나 나무 버튼을 추천합니다. 버튼을 누르면 회로에 신호가 들어가 연주가 시작됩니다.',layers:'압축 회로 레이어',layersText:'레이어를 쌓을 때는 아래 소리 블록 위로 한 칸 이상 비운 뒤 다음 받침을 놓습니다. 받침과 받침 사이는 두 칸 이상 띄우세요. 블록을 계단처럼 쌓고 이전 레이어 끝에서 다음 레이어 시작까지 레드스톤 가루를 연결합니다.',layerConnect:'블록을 계단처럼 쌓고 이전 레이어 끝에서 다음 레이어 시작까지 레드스톤 가루를 연결합니다.'
  },
  id:{
    back:'Kembali ke cetak biru',backShort:'Cetak biru',home:'Ke halaman utama',title:'Cara menempatkan blok',lead:'Panduan ini menjelaskan cara membangun sirkuit note block di Minecraft dengan mengikuti cetak biru OTO BLOGIC.',
    basic:'Susunan dasar',basicText:'Letakkan note block, repeater, dan redstone dust pada ketinggian yang sama. Blok tepat di bawah note block menentukan jenis suaranya.',flat:'Bangun langsung di tanah',flatText:'Letakkan note block dan sirkuit di tanah, lalu gali satu blok hanya di tempat blok penentu jenis suara. Cara ini cocok untuk membangun dengan cepat.',raised:'Bangun satu blok lebih tinggi',raisedText:'Buat satu lapis blok penyangga, lalu bangun note block dan sirkuit di atasnya. Blok penentu jenis suara tetap terlihat sehingga mudah diperiksa.',
    pitch:'Mengatur tinggi nada',pitchText:'Tinggi nada note block berubah sesuai jumlah klik kanan. Angka pada cetak biru menunjukkan jumlah klik yang diperlukan. Jumlah klik tidak terlihat dari bentuk blok, jadi jika lupa, hancurkan lalu pasang kembali.',pitchCaption:'Setiap klik kanan menaikkan nada satu semitone—satu tuts lebih tinggi di editor.',
    repeater:'Arah dan delay repeater',repeaterText:'Semua repeater pada foto menghadap ke kanan. Segi lima merah dengan angka putih menunjukkan delay. Mode jumlah klik memakai dasar putih, garis hitam, dan angka merah.',delay:'Delay',clicks:'Klik',repeaterOperation:'Repeater yang baru dipasang memiliki delay 1. Klik kanan sekali untuk delay 2, dua kali untuk delay 3, dan tiga kali untuk delay 4. Cetak biru dapat menampilkan nilai delay atau jumlah klik; pilih yang paling mudah.',
    start:'Membuat titik mulai',startText:'Gunakan tombol batu atau kayu di titik mulai. Saat ditekan, sinyal masuk ke sirkuit dan musik mulai dimainkan.',layers:'Layer sirkuit padat',layersText:'Saat menumpuk layer, sisakan setidaknya satu blok udara di atas note block di bawah sebelum membuat penyangga berikutnya. Beri jarak setidaknya dua blok antarpenyangga. Buat tangga blok dan sambungkan redstone dust dari akhir satu layer ke awal layer berikutnya.',layerConnect:'Buat tangga blok dan sambungkan redstone dust dari akhir satu layer ke awal layer berikutnya.'
  }
} as const

const resourcePackCopy:Record<string,{caption:string;button:string;javaOnly:string}>={
  ja:{caption:'OTO BLOGIC VISUALSを使うと、音符ブロックの音程や音の種類をゲーム内で見分けやすくなります。',button:'リソースパックをダウンロード',javaOnly:'Minecraft Java版専用です。統合版（Bedrock版）では使用できません。'},
  en:{caption:'OTO BLOGIC VISUALS makes note-block pitches and sound types easier to identify in the game.',button:'DOWNLOAD THE RESOURCE PACK',javaOnly:'For Minecraft Java Edition only. It does not work in Bedrock Edition.'},
  es:{caption:'OTO BLOGIC VISUALS permite distinguir mejor las notas y los tipos de sonido dentro del juego.',button:'DESCARGAR EL PAQUETE',javaOnly:'Solo para Minecraft Java Edition. No funciona en Bedrock Edition.'},
  fr:{caption:'OTO BLOGIC VISUALS aide à reconnaître les hauteurs et les types de son directement dans le jeu.',button:'TÉLÉCHARGER LE PACK',javaOnly:'Uniquement pour Minecraft Java Edition. Incompatible avec Bedrock Edition.'},
  de:{caption:'OTO BLOGIC VISUALS macht Tonhöhen und Klangarten direkt im Spiel leichter erkennbar.',button:'RESSOURCENPAKET LADEN',javaOnly:'Nur für Minecraft Java Edition. Nicht mit Bedrock Edition kompatibel.'},
  zh:{caption:'使用 OTO BLOGIC VISUALS，可以在游戏中更容易分辨音符盒的音高和声音种类。',button:'下载资源包',javaOnly:'仅适用于 Minecraft Java 版，不支持基岩版。'},
  'zh-tw':{caption:'使用 OTO BLOGIC VISUALS，可以在遊戲中更容易分辨音階盒的音高與聲音種類。',button:'下載資源包',javaOnly:'僅適用於 Minecraft Java 版，不支援基岩版。'},
  ko:{caption:'OTO BLOGIC VISUALS를 사용하면 게임 안에서 소리 블록의 음높이와 소리 종류를 쉽게 구분할 수 있습니다.',button:'리소스 팩 다운로드',javaOnly:'Minecraft Java Edition 전용이며 Bedrock Edition에서는 사용할 수 없습니다.'},
  id:{caption:'OTO BLOGIC VISUALS membantu membedakan nada dan jenis suara note block langsung di dalam game.',button:'UNDUH RESOURCE PACK',javaOnly:'Khusus Minecraft Java Edition. Tidak dapat digunakan di Bedrock Edition.'},
}

const useControlNotes:Record<string,string>={
  ja:'※このページの「右クリック」は、ブロックや道具を使う操作です。スマホでは対象をタップ、Nintendo Switchなどのコントローラーでは左トリガー（Switchの初期設定はZL）に相当します。操作設定を変えている場合は「使う／ブロックを置く」に割り当てたボタンを使ってください。',
  en:'Note: “Right-click” on this page means the Use / Place Block action. On touch devices, tap the target. On a controller, use the left trigger (ZL by default on Nintendo Switch). If you changed the controls, use the button assigned to Use / Place Block.',
  es:'Nota: «Clic derecho» significa la acción Usar / Colocar bloque. En pantalla táctil, toca el objetivo. Con mando, usa el gatillo izquierdo (ZL por defecto en Nintendo Switch).',
  fr:'Remarque : «clic droit» désigne l’action Utiliser / Placer un bloc. Sur écran tactile, touchez la cible. Avec une manette, utilisez la gâchette gauche (ZL par défaut sur Nintendo Switch).',
  de:'Hinweis: „Rechtsklick“ meint die Aktion Benutzen / Block platzieren. Auf Touch-Geräten tippst du das Ziel an. Am Controller nutzt du den linken Trigger (auf Nintendo Switch standardmäßig ZL).',
  zh:'注：本页的“右键”指“使用物品／放置方块”操作。手机上请点按目标；手柄上请按左扳机键（Nintendo Switch 默认为 ZL）。',
  'zh-tw':'※本頁的「右鍵」是指「使用物品／放置方塊」操作。手機上請點選目標；控制器請按左扳機鍵（Nintendo Switch 預設為 ZL）。',
  ko:'※이 페이지의 ‘오른쪽 클릭’은 아이템 사용 / 블록 놓기 조작입니다. 모바일에서는 대상을 누르고, 컨트롤러에서는 왼쪽 트리거(Nintendo Switch 기본 ZL)를 사용하세요.',
  id:'Catatan: “Klik kanan” berarti tindakan Gunakan / Letakkan Blok. Pada layar sentuh, ketuk target. Pada kontroler, gunakan pemicu kiri (ZL secara default di Nintendo Switch).'
}

export default function PlacementGuidePage({language,setLanguage,onBack,onHome,onResourcePack}:Props){
  const t=copy[language as keyof typeof copy]??copy.en
  const resourcePack=resourcePackCopy[language]??resourcePackCopy.en
  const imageAlt={flat:t.flat,raised:t.raised,pitch:t.pitch,start:t.start,layers:t.layers}
  return <main className="placement-page" lang={language}>
    <header className="placement-header">
      <button className="placement-brand" onClick={onHome} aria-label={t.home}><img src="/assets/branding/oto-blogic-icon-04.png" alt=""/><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/></button>
      <div className="placement-header-actions"><button className="placement-back" onClick={onBack}>← <span className="placement-back-long">{t.back}</span><span className="placement-back-short">{t.backShort}</span></button><select className="placement-language" value={language} onChange={event=>setLanguage(event.target.value)} aria-label="Language">{languageOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
    </header>
    <section className="placement-hero"><small>HOW TO BUILD</small><h1>{t.title}</h1><p>{t.lead}</p></section>
    <div className="placement-content">
      <section className="placement-section"><h2>{t.basic}</h2><p>{t.basicText}</p><div className="placement-image-grid"><figure><img src="/assets/placement/flat-placement.png" alt={imageAlt.flat}/><figcaption><b>{t.flat}</b><span>{t.flatText}</span></figcaption></figure><figure><img src="/assets/placement/raised-placement.png" alt={imageAlt.raised}/><figcaption><b>{t.raised}</b><span>{t.raisedText}</span></figcaption></figure></div></section>
      <section className="placement-section"><h2>{t.pitch}</h2><p>{t.pitchText}</p><p className="placement-control-note">{useControlNotes[language]??useControlNotes.en}</p><figure className="wide-image"><img src="/assets/placement/note-block-clicks.png" alt={imageAlt.pitch}/><figcaption>{t.pitchCaption}</figcaption></figure><aside className="placement-resource-pack"><figure><img src="/assets/resource-pack/visuals-in-game.jpg" alt="OTO BLOGIC VISUALS"/><figcaption>{resourcePack.caption}</figcaption></figure><div><strong>OTO BLOGIC VISUALS</strong><p>{resourcePack.javaOnly}</p><button onClick={onResourcePack}>{resourcePack.button} →</button></div></aside></section>
      <section className="placement-section"><h2>{t.repeater}</h2><p>{t.repeaterText}</p><div className="repeater-examples">{[1,2,3,4].map(n=><figure key={n}><img src={`/assets/placement/repeater-delay-${n}.png`} alt={`${t.repeater} ${n}`}/><figcaption><span className="repeater-label"><i className="placement-repeater delay-mark right"><b>{n}</b></i><strong>{t.delay} {n}</strong></span><span className="repeater-label"><i className="placement-repeater click-mark right"><b>{n-1}</b></i><strong>{t.clicks} {n-1}</strong></span></figcaption></figure>)}</div><p className="repeater-operation">{t.repeaterOperation}</p></section>
      <section className="placement-section"><h2>{t.start}</h2><p>{t.startText}</p><figure className="wide-image"><img src="/assets/placement/start-button.png" alt={imageAlt.start}/><figcaption>{t.startText}</figcaption></figure></section>
      <section className="placement-section"><h2>{t.layers}</h2><p>{t.layersText}</p><div className="placement-image-grid"><figure><img src="/assets/placement/compact-layer-stack.png" alt={imageAlt.layers}/><figcaption>{t.layersText}</figcaption></figure><figure><img src="/assets/placement/compact-layer-connect.png" alt={t.layerConnect}/><figcaption>{t.layerConnect}</figcaption></figure></div></section>
    </div>
    <footer className="placement-footer"><button onClick={onBack}>{t.back} →</button><span>© 2026 OTO BLOGIC · Powered by SOTA56</span></footer>
  </main>
}
