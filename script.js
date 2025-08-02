  (function(){
    const apiUrl = 'https://vkrdownloader.xyz/server/tv.php';
    const themeBtn = document.getElementById('themeToggle');
    const toast = el('toast');
    const video = document.getElementById('videoPlayer');
    const plyrPlayer = new Plyr(video, {
      autoplay: true, muted: true, quality: {default:  autoQuality(), options: []}
    });
    let allChannels = [], isPlayerOpen = false;

    function el(id){return document.getElementById(id);}
    function showToast(msg){ toast.textContent=msg; toast.classList.remove('hidden'); setTimeout(()=>toast.classList.add('hidden'),2500); }

    // Theme persistence
    const saved = localStorage.getItem('theme');
    if(saved){ document.body.setAttribute('data-theme', saved); themeBtn.textContent = saved==='light' ? '☀️' : '🌙'; }
    themeBtn.onclick = ()=>{
      const next = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.body.setAttribute('data-theme', next); themeBtn.textContent = next==='light' ? '☀️' : '🌙';
      localStorage.setItem('theme', next);
    };

    function renderChannels(filter=''){
      const list = el('channel-list');
      list.innerHTML = '';
      const filtered = allChannels.filter(c=>c.name && c.stream_url && c.logo && c.name.toLowerCase().includes(filter.toLowerCase()));
      if(filtered.length===0){
        list.innerHTML = `<div role="status" aria-live="polite" style="color:#ff6f00;margin:20px">No channels match.</div>`;
        return;
      }
      filtered.forEach(ch=>{
        const card = document.createElement('div');
        card.className='channel-card'; card.role='button'; card.tabIndex=0; card.ariaPressed='false';
        card.innerHTML = `<img src="${ch.logo}" alt="${ch.name}" loading="lazy"><span>${ch.name}</span>`;
        card.onclick = ()=>openPlayer(ch, card);
        card.onkeydown = e=>{ if(e.key==='Enter'||e.key===' ') {e.preventDefault(); card.click();}};
        list.appendChild(card);
      });
    }

    function openPlayer(ch, card){
      card.ariaPressed='true';
      el('player-card').classList.remove('hidden');
      el('channel-title').textContent = ch.name;
      el('channel-logo').src = ch.logo;

      if(Hls.isSupported() && ch.stream_url.endsWith('.m3u8')){
        const hls = new Hls();
        hls.loadSource(ch.stream_url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, ()=> {
          const levels = hls.levels.map(l=>l.width+'x'+l.height+' @'+l.bitrate);
          plyrPlayer.options.quality.options = levels;
          plyrPlayer.on('qualitychange', (e)=> hls.currentLevel = levels.indexOf(e.detail.quality));
        });
      } else {
        video.src = ch.stream_url;
      }
      // subtitles: dynamic tracks
      el('subtitle-selector').innerHTML = '';
      setTimeout(()=>{
        buildSubtitleMenu();
        plyrPlayer.play().catch(()=>showToast('🛑 User gesture needed'));
        video.focus();
        isPlayerOpen = true;
      },50);
    }

    function buildSubtitleMenu(){
      const sel = el('subtitle-selector');
      const tracks = video.textTracks;
      if(!tracks) return;
      const ul = document.createElement('ul'); ul.className='subtitle-menu';
      const off = li('Off','off'); ul.appendChild(off);
      for(let i=0;i<tracks.length;i++){
        const t = tracks[i];
        const item = li(t.label || t.language, t.language);
        item.onclick = ()=>selectSubtitle(i);
        ul.appendChild(item);
      }
      sel.appendChild(ul);
    }
    function li(label,lang){ const item=document.createElement('li'); item.textContent=label; item.dataset.lang=lang; return item; }
    function selectSubtitle(idx){
      Array.from(video.textTracks).forEach((t,i)=>t.mode = (i===idx?'showing':'disabled'));
    }

    function closePlayer(){
      el('player-card').classList.add('hidden');
      video.pause(); video.removeAttribute('src'); video.load();
      document.querySelectorAll('.channel-card[aria-pressed="true"]').forEach(c=>c.ariaPressed='false');
      isPlayerOpen=false;
    }

    el('closePlayer').onclick = closePlayer;
    window.addEventListener('keydown', e=>{
      if(isPlayerOpen && (e.key==='Escape'||e.key==='Esc')) closePlayer();
      if(e.key==='/' && document.activeElement !== el('search')){
        e.preventDefault(); el('search').focus();
      }
    });

    el('search').oninput = e=> renderChannels(e.target.value);

    fetch(apiUrl).then(r=>r.json()).then(data=>{
      allChannels = Array.isArray(data)?data.filter(c=>c.name && c.stream_url && c.logo):[];
      el('loading').classList.add('hidden');
      renderChannels();
    }).catch(e=>{
      el('loading').textContent='⚠️ Failed to load channels.';
      showToast('Failed to load channels.');
      console.error(e);
    });

    function autoQuality(){
      return 'Auto';
    }

  })();
