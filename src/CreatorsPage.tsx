import './creators.css'

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
    '晋遊舎「ゲーム完璧バイブル」シリーズにて、制作した音符ブロック回路を掲載。'
  ],bioEn:['A Minecraft educator with over 200,000 YouTube subscribers and more than 3,000 videos. Her practical guides are especially known for helping beginners through common note-block problems.','She has organized numerous community note-block performance projects with many participating players.','Her note-block circuit was featured in Shinyusha’s Game Kanpeki Bible Vol.5.'],youtube:'https://youtube.com/@djminecraft8889',youtubeLabel:'youtube.com/@djminecraft8889',x:'https://x.com/anzu0312',xLabel:'x.com/anzu0312'}
]

export default function CreatorsPage({language,setLanguage,onBack,onStart}:Props){
  const ja=language==='ja'
  return <main className="creators-page">
    <header className="creators-topbar">
      <button className="creators-brand" onClick={onBack} aria-label={ja?'ホームへ戻る':'Back to home'}><img src="/assets/branding/oto-blogic-icon.svg" alt=""/><img src="/assets/branding/oto-blogic-logo.png" alt="OTO BLOGIC"/></button>
      <select value={language} onChange={event=>setLanguage(event.target.value)} aria-label="Language"><option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="zh">中文</option><option value="ko">한국어</option></select>
    </header>

    <section className="creators-hero"><h1>{ja?'サイト制作 / 監修':'CREATOR / SUPERVISOR'}</h1></section>

    <section className="creator-profiles">
      {profiles.map(profile=><article className={`creator-card ${profile.tone}`} key={profile.name}>
        <div className="creator-portrait"><img src={profile.image} alt={profile.name}/></div>
        <div className="creator-copy">
          <small>{ja?profile.roleJa:profile.roleEn}</small><h2>{profile.name}</h2>
          {(ja?profile.bioJa:profile.bioEn).map(text=><p key={text}>{text}</p>)}
          <nav aria-label={`${profile.name} social links`}><a href={profile.youtube} target="_blank" rel="noreferrer"><YouTubeIcon/><span>{profile.youtubeLabel}</span></a><a href={profile.x} target="_blank" rel="noreferrer"><XIcon/><span>{profile.xLabel}</span></a></nav>
        </div>
      </article>)}
    </section>

    <section className="creator-message">
      <header><small>FROM THE CREATOR</small><h2>{ja?'制作者より':'A MESSAGE FROM THE CREATOR'}</h2></header>
      <div className="message-copy">
        {ja?<>
          <p>OTO BLOGICの制作は、私が制作した「おんぷマットメーカー」を見たアンズさんが、「マイクラ版もあったらいいな」というレスポンスをくれたことから始まりました。</p>
          <p>「音楽初心者がもっと音楽にとっつきやすいツールがあれば」という思いが一致し、彼女に監修を依頼して本サイトを立ち上げるに至った次第です。彼女が活動14年という長期に渡り音符ブロック演奏ファンと向き合ってきた経験は伊達ではなく、仕様について多くのアイデアやフィードバックをもらったことで、「初心者でも扱いやすい」と自信を持って言えるサイトに仕上がりました。</p>
          <p>OTO BLOGICは、音楽経験者や大人の方はもちろん、音楽経験のない方やお子さんにも楽しんでいただける様、直感的な操作性を心掛けて開発しました。初心者が「1日で曲が作れて、マイクラで回路を組んで再生できた」という体験は、「音楽って楽しいかも」と感じてもらうには十分だと思います。</p>
          <p>何事も、早い段階で小さな成果と達成感を得られることが継続の鍵であると私は考えています。5年後10年後に、未来の音楽家から「このサイトがきっかけで音楽を始めました！」なんて報告をしてもらえるかもと妄想して開発していましたので、是非その折にはご一報いただけると幸いです笑</p>
        </>:<>
          <p>OTO BLOGIC began when Anzu saw my previous tool, Onpu Mat Maker, and replied that she wished there were a Minecraft version.</p>
          <p>We shared the belief that beginners deserve a friendlier way into music, so I asked her to supervise the project. Her fourteen years of experience with the note-block community brought countless ideas and practical corrections that made this a tool we can confidently call beginner-friendly.</p>
          <p>We designed OTO BLOGIC for experienced musicians and adults, but equally for children and people with no musical background. Making a song in one day, building the circuit in Minecraft, and hearing it play can be enough to discover that music might be fun.</p>
          <p>I believe an early, achievable success is what keeps people learning. I built this site imagining that, five or ten years from now, a future musician might tell us: “OTO BLOGIC is where I started.” If that happens, please let us know.</p>
        </>}
        <strong>SOTA56</strong>
      </div>
    </section>

    <section className="creators-cta"><small>READY TO BUILD?</small><h2>{ja?'最初の音を置いてみよう。':'PLACE YOUR FIRST NOTE.'}</h2><button onClick={onStart}>{ja?'OTO BLOGICを開く':'OPEN OTO BLOGIC'}<b>→</b></button></section>
    <footer className="creators-footer"><button onClick={onBack}>← {ja?'ホームへ':'HOME'}</button><span>© 2026 OTO BLOGIC · POWERED BY SOTA56</span></footer>
  </main>
}
