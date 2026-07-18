import './creators.css'
import {traditionalizeRecord} from './localization'
import {BuyMeCoffeeWidget} from './BuyMeCoffee'

type Props={language:string;setLanguage:(language:string)=>void;onBack:()=>void;onStart:()=>void}

function YouTubeIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>}
function XIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.9-6.4L6.5 22H3.3l7.3-8.4L2.9 2h6.4l4.4 5.8L18.9 2Zm-1.1 17.8h1.7L8.4 4H6.6l11.2 15.8Z"/></svg>}

const profiles=[
  {roleJa:'サイト制作',roleEn:'CREATOR',name:'奏多56 / SOTA56',image:'/assets/creators/sota56.png',tone:'blue',bioJa:[
    'JPOPのオケ制作から歌唱までを一人でこなす「ひとりバンド」動画をYouTubeに投稿し、チャンネル登録者1万人を達成。YouTuberの歌ってみた動画のオケ音源制作やレコーディングも担当。',
    '2021年にMinecraftを始めてすぐに音符ブロック演奏にハマる。推しのVTuber兎田ぺこらのマイクラ企画に投稿した音符ブロック作品が視聴者支持率99%超となり盛り上がる。',
    'JAPAN MENSA幽霊会員。'
  ],bioEn:['A one-person band who creates J-pop arrangements, records every instrument, and sings. His YouTube channel has reached more than 10,000 subscribers.','He discovered note-block music soon after starting Minecraft in 2021. A note-block work submitted to VTuber Usada Pekora’s Minecraft project received over 99% viewer support.','An occasionally present member of JAPAN MENSA.'],youtube:'https://youtube.com/@SOTA56',youtubeLabel:'youtube.com/@SOTA56',x:'https://x.com/goro56pika',xLabel:'x.com/goro56pika'},
  {roleJa:'監修',roleEn:'SUPERVISOR',name:'アンズ@DJ Minecraft / Anzu',image:'/assets/creators/anzu.jpg',tone:'yellow',bioJa:[
    'YouTubeに音符ブロック回路の作り方動画を投稿し、チャンネル登録者は20万人超。投稿動画は3000本を超える。特に初心者が音符ブロック演奏で躓きやすいポイントを対策した解説動画には定評がある。',
    '音符ブロック演奏投稿企画を多数開催し、多くのプレイヤーが参加。',
    '晋遊舎「ゲーム完璧バイブル」シリーズにて、制作した音符ブロック回路を6年に渡り掲載。'
  ],bioEn:['A Minecraft educator with over 200,000 YouTube subscribers and more than 3,000 videos. Her practical guides are especially known for helping beginners through common note-block problems.','She has organized numerous community note-block performance projects with many participating players.','Her note-block circuit was featured in Shinyusha’s Game Kanpeki Bible Vol.5.'],youtube:'https://youtube.com/@djminecraft8889',youtubeLabel:'youtube.com/@djminecraft8889',x:'https://x.com/anzu0312',xLabel:'x.com/anzu0312'}
]

type CreatorLocale={heading:string;roles:string[];bios:string[][];messageTitle:string;message:string[];cta:string;open:string;home:string}
const creatorLocales:Record<string,CreatorLocale>={
  es:{heading:'CREACIÓN / SUPERVISIÓN',roles:['CREACIÓN DEL SITIO','SUPERVISIÓN'],bios:[['Músico de “banda unipersonal” que arregla, interpreta y canta J-pop. Su canal de YouTube supera los 10.000 suscriptores y también produce pistas y grabaciones para otros creadores.','Empezó Minecraft en 2021 y pronto se aficionó a los bloques de notas. Una obra enviada a un proyecto de Usada Pekora obtuvo más del 99 % de apoyo del público.','Miembro ocasional de JAPAN MENSA.'],['Creadora de tutoriales de circuitos de bloques de notas, con más de 200.000 suscriptores y 3.000 vídeos. Sus guías para resolver problemas de principiantes son especialmente valoradas.','Ha organizado numerosos proyectos comunitarios de interpretación con bloques de notas.','Sus circuitos han aparecido en la serie Game Kanpeki Bible de Shinyusha.']],messageTitle:'MENSAJE DEL CREADOR',message:['OTO BLOGIC nació cuando Anzu vio mi anterior herramienta, Onpu Mat Maker, y comentó que le gustaría una versión para Minecraft.','Compartíamos la idea de acercar la música a principiantes, así que le pedí supervisar el proyecto. Sus catorce años con la comunidad aportaron ideas y correcciones decisivas.','Diseñamos OTO BLOGIC para músicos y adultos, pero también para niños y personas sin experiencia musical. Crear una canción, construirla y oírla en Minecraft puede ser el primer pequeño logro que haga divertida la música.','Imagino que dentro de cinco o diez años alguien dirá que empezó a hacer música gracias a este sitio. Si ocurre, nos encantará saberlo.'],cta:'COLOCA TU PRIMERA NOTA.',open:'ABRIR OTO BLOGIC',home:'INICIO'},
  fr:{heading:'CRÉATION / SUPERVISION',roles:['CRÉATION DU SITE','SUPERVISION'],bios:[["Musicien en « groupe solo » qui arrange, joue et chante de la J-pop. Sa chaîne YouTube dépasse 10 000 abonnés; il réalise aussi des instrumentaux et enregistrements pour d’autres créateurs.",'Il découvre Minecraft en 2021 puis les blocs musicaux. Une création envoyée à un projet d’Usada Pekora reçoit plus de 99 % de soutien du public.','Membre occasionnel de JAPAN MENSA.'],['Créatrice de tutoriels de circuits de blocs musicaux, avec plus de 200 000 abonnés et 3 000 vidéos. Ses guides répondent notamment aux difficultés des débutants.','Elle a organisé de nombreux projets communautaires autour des blocs musicaux.','Ses circuits ont été publiés dans la série Game Kanpeki Bible de Shinyusha.']],messageTitle:'MESSAGE DU CRÉATEUR',message:["OTO BLOGIC a commencé lorsqu’Anzu a vu mon ancien outil, Onpu Mat Maker, et a souhaité une version Minecraft.","Nous voulions tous deux rendre la musique plus accessible aux débutants; je lui ai donc confié la supervision. Ses quatorze années auprès de la communauté ont apporté des idées et corrections essentielles.",'OTO BLOGIC vise les musiciens et les adultes, mais aussi les enfants et les personnes sans expérience. Composer, construire puis entendre son morceau dans Minecraft offre une première réussite concrète.','J’imagine qu’un futur musicien nous dira dans cinq ou dix ans avoir commencé grâce à ce site. Si cela arrive, écrivez-nous.'],cta:'PLACEZ VOTRE PREMIÈRE NOTE.',open:'OUVRIR OTO BLOGIC',home:'ACCUEIL'},
  de:{heading:'ERSTELLUNG / AUFSICHT',roles:['WEBSITE-ERSTELLUNG','FACHLICHE AUFSICHT'],bios:[['Ein Ein-Mann-Band-Musiker, der J-Pop arrangiert, einspielt und singt. Sein YouTube-Kanal hat über 10.000 Abonnenten; außerdem produziert er Instrumentals und Aufnahmen für andere Creator.','Seit seinem Minecraft-Start 2021 begeistert er sich für Notenblöcke. Ein Beitrag zu einem Projekt von Usada Pekora erhielt über 99 % Zuschauerzustimmung.','Gelegentlich aktives Mitglied von JAPAN MENSA.'],['Erstellt Notenblock-Tutorials für über 200.000 Abonnenten und hat mehr als 3.000 Videos veröffentlicht. Besonders bekannt sind ihre Hilfen für typische Anfängerprobleme.','Sie organisierte zahlreiche Community-Projekte für Notenblockmusik.','Ihre Schaltungen erschienen in Shinyushas Reihe Game Kanpeki Bible.']],messageTitle:'NACHRICHT DES ERSTELLERS',message:['OTO BLOGIC begann, als Anzu mein früheres Onpu Mat Maker sah und sich eine Minecraft-Version wünschte.','Wir wollten beide Musik für Anfänger zugänglicher machen. Deshalb bat ich sie um fachliche Begleitung. Vierzehn Jahre Community-Erfahrung brachten entscheidende Ideen und Korrekturen.','OTO BLOGIC richtet sich an Musiker und Erwachsene, aber ebenso an Kinder und Menschen ohne Vorkenntnisse. Einen Song zu bauen und in Minecraft zu hören, schafft früh ein greifbares Erfolgserlebnis.','Vielleicht erzählt uns in fünf oder zehn Jahren ein Musiker, hier angefangen zu haben. Dann freuen wir uns über eine Nachricht.'],cta:'SETZE DEINE ERSTE NOTE.',open:'OTO BLOGIC ÖFFNEN',home:'STARTSEITE'},
  zh:{heading:'网站制作／监修',roles:['网站制作','监修'],bios:[['独自完成J-pop编曲、演奏与演唱的“一人乐队”创作者。YouTube订阅超过1万人，也为其他创作者制作伴奏并录音。','2021年开始玩Minecraft后迷上音符盒。投稿到兔田佩克拉企划的作品获得超过99%的观众支持。','JAPAN MENSA幽灵会员。'],['专注音符盒电路教程，YouTube订阅超过20万，视频超过3000部。尤其擅长讲解初学者容易卡住的问题。','曾举办多次音符盒演奏投稿活动，众多玩家参与。','制作的音符盒电路刊登于晋游舍《Game Kanpeki Bible》系列。']],messageTitle:'制作者的话',message:['OTO BLOGIC始于Anzu看到我制作的“音符地垫制作器”后，希望有一个Minecraft版本。','我们都希望让初学者更容易接触音乐，因此邀请她监修。她与音符盒玩家相处十四年的经验，为规格带来了大量重要建议。','OTO BLOGIC既面向音乐人和成人，也面向儿童与没有音乐经验的人。一天内完成歌曲、在Minecraft中搭建并听到成果，足以成为“音乐也许很有趣”的起点。','我想象着五年或十年后，会有人告诉我们“我是从这个网站开始做音乐的”。如果真的发生，请一定告诉我们。'],cta:'放下第一个音符。',open:'打开 OTO BLOGIC',home:'首页'},
  ko:{heading:'사이트 제작 / 감수',roles:['사이트 제작','감수'],bios:[['J-pop 편곡, 연주와 노래를 혼자 완성하는 “1인 밴드” 크리에이터입니다. YouTube 구독자 1만 명을 달성했으며 다른 크리에이터의 반주 제작과 녹음도 담당합니다.','2021년 Minecraft를 시작한 뒤 소리 블록 연주에 빠졌습니다. 우사다 페코라 기획에 낸 작품은 시청자 지지율 99% 이상을 기록했습니다.','JAPAN MENSA 유령 회원입니다.'],['소리 블록 회로 강좌를 제작하며 YouTube 구독자 20만 명, 영상 3천 편 이상을 보유합니다. 초보자가 막히기 쉬운 지점을 해결하는 설명으로 알려져 있습니다.','여러 소리 블록 연주 참여 기획을 열어 많은 플레이어가 참가했습니다.','제작한 회로가 신유샤 Game Kanpeki Bible 시리즈에 실렸습니다.']],messageTitle:'제작자의 말',message:['OTO BLOGIC은 Anzu가 제가 만든 Onpu Mat Maker를 보고 Minecraft 버전도 있으면 좋겠다고 말한 데서 시작했습니다.','초보자가 음악을 더 쉽게 시작할 도구가 필요하다는 생각이 같아 감수를 부탁했습니다. 14년간 커뮤니티와 함께한 경험은 많은 아이디어와 중요한 피드백이 되었습니다.','음악 경험자와 어른뿐 아니라 어린이와 초보자도 즐길 수 있도록 직관적인 조작을 목표로 했습니다. 하루 만에 곡을 만들고 Minecraft에서 회로를 재생하는 경험은 음악의 즐거움을 발견하기에 충분합니다.','5년, 10년 뒤 미래의 음악가가 이 사이트를 계기로 음악을 시작했다고 말해 주는 날을 상상했습니다. 그때는 꼭 알려 주세요.'],cta:'첫 노트를 놓아 보세요.',open:'OTO BLOGIC 열기',home:'홈'}
}
creatorLocales['zh-tw']=traditionalizeRecord(creatorLocales.zh)
creatorLocales.id={heading:'PEMBUATAN / SUPERVISI',roles:['PEMBUAT SITUS','SUPERVISI'],bios:[['Kreator “band satu orang” yang mengaransemen, memainkan, dan menyanyikan J-pop. Kanal YouTube-nya memiliki lebih dari 10.000 pelanggan dan ia juga membuat musik pengiring serta rekaman untuk kreator lain.','Mulai bermain Minecraft pada 2021 dan segera menyukai musik blok not. Karyanya untuk proyek Usada Pekora meraih dukungan penonton lebih dari 99%.','Anggota JAPAN MENSA yang sesekali hadir.'],['Pembuat tutorial rangkaian blok not dengan lebih dari 200.000 pelanggan dan 3.000 video. Panduannya dikenal membantu kesulitan yang sering dialami pemula.','Telah mengadakan banyak proyek pertunjukan blok not yang diikuti komunitas.','Rangkaian buatannya dimuat dalam seri Game Kanpeki Bible dari Shinyusha.']],messageTitle:'PESAN DARI KREATOR',message:['OTO BLOGIC bermula ketika Anzu melihat alat saya sebelumnya, Onpu Mat Maker, lalu berharap ada versi Minecraft.','Kami sama-sama ingin membuat musik lebih mudah didekati pemula. Pengalaman empat belas tahunnya bersama komunitas menghasilkan banyak ide dan koreksi penting.','OTO BLOGIC dibuat untuk musisi dan orang dewasa, sekaligus anak-anak dan mereka yang belum berpengalaman. Membuat lagu, membangun rangkaian, dan mendengarnya di Minecraft dapat menjadi keberhasilan kecil pertama yang menyenangkan.','Saya membayangkan lima atau sepuluh tahun lagi ada musisi yang berkata bahwa situs ini menjadi awal mereka. Jika itu terjadi, beri tahu kami.'],cta:'LETAKKAN NOT PERTAMA.',open:'BUKA OTO BLOGIC',home:'BERANDA'}

export default function CreatorsPage({language,setLanguage,onBack,onStart}:Props){
  const ja=language==='ja'
  const locale=creatorLocales[language]
  return <main className="creators-page">
    <BuyMeCoffeeWidget/>
    <header className="creators-topbar">
      <button className="creators-brand" onClick={onBack} aria-label={ja?'ホームへ戻る':'Back to home'}><img src="/assets/branding/oto-blogic-icon.svg" alt=""/><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/></button>
      <select value={language} onChange={event=>setLanguage(event.target.value)} aria-label="Language"><option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="zh">简体中文</option><option value="zh-tw">繁體中文</option><option value="ko">한국어</option><option value="id">Bahasa Indonesia</option></select>
    </header>

    <section className="creators-hero"><h1>{ja?'サイト制作 / 監修':locale?.heading??'CREATOR / SUPERVISOR'}</h1></section>

    <section className="creator-profiles">
      {profiles.map((profile,index)=><article className={`creator-card ${profile.tone}`} key={profile.name}>
        <div className="creator-portrait"><img src={profile.image} alt={profile.name}/></div>
        <div className="creator-copy">
          <small>{ja?profile.roleJa:locale?.roles[index]??profile.roleEn}</small><h2>{profile.name}</h2>
          {(ja?profile.bioJa:locale?.bios[index]??profile.bioEn).map(text=><p key={text}>{text}</p>)}
          <nav aria-label={`${profile.name} social links`}><a href={profile.youtube} target="_blank" rel="noreferrer"><YouTubeIcon/><span>{profile.youtubeLabel}</span></a><a href={profile.x} target="_blank" rel="noreferrer"><XIcon/><span>{profile.xLabel}</span></a></nav>
        </div>
      </article>)}
    </section>

    <section className="creator-message">
      <header><small>FROM THE CREATOR</small><h2>{ja?'制作者より':locale?.messageTitle??'A MESSAGE FROM THE CREATOR'}</h2></header>
      <div className="message-copy">
        {ja?<>
          <p>OTO BLOGICの制作は、私が制作した「おんぷマットメーカー」を見たアンズさんが、「マイクラ版もあったらいいな」というレスポンスをくれたことから始まりました。</p>
          <p>「音楽初心者がもっと音楽にとっつきやすいツールがあれば」という思いが一致し、彼女に監修を依頼して本サイトを立ち上げるに至った次第です。彼女が活動14年という長期に渡り音符ブロック演奏ファンと向き合ってきた経験は伊達ではなく、仕様について多くのアイデアやフィードバックをもらったことで、「初心者でも扱いやすい」と自信を持って言えるサイトに仕上がりました。</p>
          <p>OTO BLOGICは、音楽経験者や大人の方はもちろん、音楽経験のない方やお子さんにも楽しんでいただける様、直感的な操作性を心掛けて開発しました。初心者が「1日で曲が作れて、マイクラで回路を組んで再生できた」という体験は、「音楽って楽しいかも」と感じてもらうには十分だと思います。</p>
          <p>何事も、早い段階で小さな成果と達成感を得られることが継続の鍵であると私は考えています。5年後10年後に、未来の音楽家から「このサイトがきっかけで音楽を始めました！」なんて報告をしてもらえるかもと妄想して開発していましたので、是非その折にはご一報いただけると幸いです笑</p>
        </>:locale?<>{locale.message.map(text=><p key={text}>{text}</p>)}</>:<>
          <p>OTO BLOGIC began when Anzu saw my previous tool, Onpu Mat Maker, and replied that she wished there were a Minecraft version.</p>
          <p>We shared the belief that beginners deserve a friendlier way into music, so I asked her to supervise the project. Her fourteen years of experience with the note-block community brought countless ideas and practical corrections that made this a tool we can confidently call beginner-friendly.</p>
          <p>We designed OTO BLOGIC for experienced musicians and adults, but equally for children and people with no musical background. Making a song in one day, building the circuit in Minecraft, and hearing it play can be enough to discover that music might be fun.</p>
          <p>I believe an early, achievable success is what keeps people learning. I built this site imagining that, five or ten years from now, a future musician might tell us: “OTO BLOGIC is where I started.” If that happens, please let us know.</p>
        </>}
        <strong>SOTA56</strong>
      </div>
    </section>

    <section className="creators-cta"><small>READY TO BUILD?</small><h2>{ja?'最初の音を置いてみよう。':locale?.cta??'PLACE YOUR FIRST NOTE.'}</h2><button onClick={onStart}>{ja?'OTO BLOGICを開く':locale?.open??'OPEN OTO BLOGIC'}<b>→</b></button></section>
    <footer className="creators-footer"><button onClick={onBack}>← {ja?'ホームへ':locale?.home??'HOME'}</button><span>© 2026 OTO BLOGIC · POWERED BY SOTA56</span></footer>
  </main>
}
