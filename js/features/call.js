/**
 * call.js v5.0
 * Fix: avatar/pulse offset (explicit px sizes, no clamp %), pill drag
 * Note: data-modal redesign is now in data-modal.js
 */

(function () {
    'use strict';

    const KEY_ENABLED  = 'callFeatureEnabled';
    const KEY_POS      = 'callWindowPos';
    const KEY_SIZE     = 'callWindowSize';
    const KEY_PILL_POS = 'callPillPos';
    //const BG_LF_KEY    = 'callBgImageData';
    const KEY_REJECT_ENABLED = 'callRejectEnabled';


    const S = {
        enabled:         localStorage.getItem(KEY_ENABLED) !== 'false',
        rejectEnabled: localStorage.getItem(KEY_REJECT_ENABLED) !== 'false',
        active:          false,
        startTime:       null,
        elapsed:         0,
        timerRAF:        null,
        minimized:       false,
        immersive:       false,
        //bgImage:         null,
        pos:             JSON.parse(localStorage.getItem(KEY_POS)  || 'null'),
        pillPos:         JSON.parse(localStorage.getItem(KEY_PILL_POS) || 'null'),
        size:            JSON.parse(localStorage.getItem(KEY_SIZE) || '{"w":280,"h":440}'),
        dragOff:         null,
        pillDragOff:     null,
        pillDragged:     false,
        resizeInit:      null,
        incomingTimer:   null,
        connectingTimer: null,
        randomCallTimer: null,
        isPartnerCall:   false,
    };

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));




    /* ── SVG hangup ─────────────────────────────────────────── */
    const SVG_HU = `<svg viewBox="0 0 24 24" fill="none" style="display:block;width:100%;height:100%;">
  <path d="M6.6 10.8c1.4 2.8 3.7 5.1 6.5 6.5l2.2-2.2c.28-.27.68-.36 1.03-.24 1.1.37 2.3.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.56 21 3 13.44 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.28.2 2.5.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z" fill="white"/>
  <line x1="21" y1="3" x2="3" y2="21" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

    /* ── CSS ─────────────────────────────────────────────────── */
    function injectCSS() {
        if (document.getElementById('call-feature-style')) return;
        const el = document.createElement('style');
        el.id = 'call-feature-style';
        el.textContent = `
/* ═══ INCOMING ═══════════════════════════════════════════ */
#call-incoming-overlay{
    position:fixed;inset:0;z-index:99990;
    display:none;align-items:center;justify-content:center;
    background:rgba(0,0,0,.62);
    backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
}
#call-incoming-overlay.visible{display:flex;animation:cFi .35s ease;}
.call-inc-card{
    width:272px;
    background:linear-gradient(160deg,rgba(255,255,255,.11),rgba(255,255,255,.04));
    border:1px solid rgba(255,255,255,.18);border-radius:32px;
    padding:44px 28px 36px;
    display:flex;flex-direction:column;align-items:center;gap:8px;color:#fff;
    box-shadow:0 32px 80px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.15);
    animation:cCu .45s cubic-bezier(.22,1,.36,1);
    position:relative;overflow:hidden;
}
.call-inc-card::before{
    content:'';position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(ellipse at 50% 0%,rgba(var(--accent-color-rgb,224,105,138),.28),transparent 65%);
}
/* incoming ring */
.call-inc-ring{position:relative;margin-bottom:8px;width:88px;height:88px;}
.call-inc-ring::before,.call-inc-ring::after{
    content:'';position:absolute;
    top:-12px;left:-12px;right:-12px;bottom:-12px;
    border-radius:50%;border:1.5px solid rgba(255,255,255,.18);
    animation:cRp 2.2s ease-in-out infinite;
}
.call-inc-ring::after{
    top:-22px;left:-22px;right:-22px;bottom:-22px;
    border-color:rgba(255,255,255,.08);animation-delay:.65s;
}
.call-inc-avatar{
    position:absolute;inset:0;
    border-radius:50%;background:var(--accent-color,#e0698a);
    display:flex;align-items:center;justify-content:center;overflow:hidden;
    border:2px solid rgba(255,255,255,.25);box-shadow:0 8px 28px rgba(0,0,0,.36);
}
.call-inc-avatar img{width:100%;height:100%;object-fit:cover;}
.call-inc-avatar i{font-size:34px;color:rgba(255,255,255,.85);}
.call-inc-name{font-size:22px;font-weight:700;margin-top:4px;}
.call-inc-sub{font-size:12.5px;color:rgba(255,255,255,.48);display:flex;align-items:center;gap:6px;}
.call-inc-sub-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.48);animation:cBl 1.1s step-end infinite;}
.call-inc-actions{display:flex;gap:44px;margin-top:26px;}
.call-inc-btn{display:flex;flex-direction:column;align-items:center;gap:7px;background:none;border:none;cursor:pointer;color:#fff;}
.call-inc-circle{
    width:64px;height:64px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    transition:transform .18s;padding:16px;
}
.call-inc-btn:hover .call-inc-circle{transform:scale(1.1);}
.call-inc-btn:active .call-inc-circle{transform:scale(.9);}
.call-inc-reject .call-inc-circle{background:linear-gradient(135deg,#ff5252,#c62828);box-shadow:0 6px 20px rgba(255,82,82,.45);}
.call-inc-accept .call-inc-circle{background:linear-gradient(135deg,#4caf50,#2e7d32);box-shadow:0 6px 20px rgba(76,175,80,.45);padding:18px;}
.call-inc-lbl{font-size:12px;color:rgba(255,255,255,.48);font-weight:500;}

/* ═══ CALL WINDOW ═══════════════════════════════════════ */
#call-window{
    position:fixed;z-index:99900;
    border-radius:22px;overflow:visible;
    display:none;flex-direction:column;
    box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.1);
    user-select:none;touch-action:none;
    min-width:160px;min-height:240px;
    max-width:90vw;max-height:90vh;
}
#call-window.visible{display:flex;animation:cWi .4s cubic-bezier(.22,1,.36,1);}

#call-window-inner{
    border-radius:22px;overflow:hidden;
    flex:1;display:flex;flex-direction:column;position:relative;
}

/* Background */
#call-window-bg{position:absolute;inset:0;z-index:0;}
.call-bg-grad{position:absolute;inset:0;background:linear-gradient(155deg,#0d1b2a 0%,#1b263b 50%,#415a77 100%);}
#call-window-bg img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;}
.call-orb{position:absolute;border-radius:50%;filter:blur(44px);opacity:.28;animation:cOrb linear infinite;pointer-events:none;}
.call-orb-1{width:130px;height:130px;background:var(--accent-color,#e0698a);top:-25px;left:-25px;animation-duration:18s;}
.call-orb-2{width:90px;height:90px;background:#4a90d9;bottom:10px;right:-10px;animation-duration:23s;animation-delay:-9s;}
.call-orb-3{width:70px;height:70px;background:#9b59b6;top:40%;left:45%;animation-duration:28s;animation-delay:-14s;}
.call-overlay{
    position:absolute;inset:0;z-index:1;transition:opacity .4s;
    background:linear-gradient(to bottom,rgba(0,0,0,.5) 0%,rgba(0,0,0,.04) 35%,rgba(0,0,0,.04) 60%,rgba(0,0,0,.65) 100%);
}

/* Header */
#call-window-header{
    position:relative;z-index:10;
    display:flex;align-items:center;justify-content:space-between;
    padding:12px 12px 6px;cursor:grab;transition:opacity .35s;flex-shrink:0;
}
#call-window-header:active{cursor:grabbing;}
.call-badge{
    display:flex;align-items:center;gap:5px;
    background:rgba(0,0,0,.32);backdrop-filter:blur(8px);
    border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:4px 10px;
}
.call-rec-dot{
    width:6px;height:6px;border-radius:50%;
    background:#4caf50;box-shadow:0 0 6px #4caf50;
    animation:cBl 1.8s ease-in-out infinite alternate;flex-shrink:0;
}
.call-timer-txt{
    font-size:11px;font-weight:700;letter-spacing:.08em;
    color:rgba(255,255,255,.92);font-variant-numeric:tabular-nums;
}
.call-top-btns{display:flex;gap:3px;}
.call-top-btn{
    width:26px;height:26px;border-radius:50%;border:none;
    background:rgba(255,255,255,.12);backdrop-filter:blur(6px);
    color:rgba(255,255,255,.75);cursor:pointer;font-size:10px;
    display:flex;align-items:center;justify-content:center;
    transition:background .2s,transform .15s;
}
.call-top-btn:hover{background:rgba(255,255,255,.22);transform:scale(1.08);}

/* Connecting state */
#call-connecting-state{
    position:relative;z-index:10;
    display:none;flex-direction:column;align-items:center;
    justify-content:center;flex:1;gap:10px;padding:16px 12px;
}
#call-connecting-state.visible{display:flex;}
.call-conn-dots{display:flex;gap:6px;margin-top:4px;}
.call-conn-dots span{
    width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.5);
    animation:cCd .9s ease-in-out infinite;
}
.call-conn-dots span:nth-child(2){animation-delay:.15s;}
.call-conn-dots span:nth-child(3){animation-delay:.3s;}

/* ─────────────────────────────────────────────────────────
   AVATAR + PULSE — THE FIX:
   .call-av-wrap has EXPLICIT pixel width/height = avatar size
   Pulse rings use top/left/right/bottom = -Npx (NOT inset shorthand)
   to ensure correct cross-browser behavior.
   Avatar uses fixed px, NOT clamp with % units.
───────────────────────────────────────────────────────── */
#call-window-body{
    position:relative;z-index:10;
    flex:1;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    gap:10px;padding:4px 12px;
}
/* Wrapper must have explicit size = avatar size */
.call-av-wrap{
    position:relative;
    width:68px;height:68px;  /* matches .call-avatar */
    flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
}
/* Pulse ring 1 — 10px bigger on each side */
.call-av-pulse{
    position:absolute;
    top:-10px;left:-10px;right:-10px;bottom:-10px;
    border-radius:50%;
    border:1.5px solid rgba(255,255,255,.22);
    animation:cAp 2.5s ease-in-out infinite;
    pointer-events:none;
}
/* Pulse ring 2 — 18px bigger on each side */
.call-av-pulse2{
    position:absolute;
    top:-18px;left:-18px;right:-18px;bottom:-18px;
    border-radius:50%;
    border:1px solid rgba(255,255,255,.09);
    animation:cAp 2.5s ease-in-out infinite .65s;
    pointer-events:none;
}
/* Avatar — fixed 68px square */
.call-avatar{
    width:68px;height:68px;
    border-radius:50%;
    background:var(--accent-color,#e0698a);
    border:2.5px solid rgba(255,255,255,.28);
    overflow:hidden;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 6px 22px rgba(0,0,0,.4);
    position:relative;z-index:1;  /* above pulse rings */
    flex-shrink:0;
}
.call-avatar img{width:100%;height:100%;object-fit:cover;}
.call-avatar i{font-size:26px;color:rgba(255,255,255,.82);}

.call-name{
    font-size:16px;font-weight:700;color:#fff;
    text-shadow:0 2px 8px rgba(0,0,0,.5);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    max-width:88%;text-align:center;
}
.call-wave{display:flex;align-items:center;gap:3px;height:18px;}
.call-wave span{width:3px;border-radius:3px;background:rgba(255,255,255,.5);animation:cWv .85s ease-in-out infinite;}
.call-wave span:nth-child(1){height:6px;animation-delay:0s;}
.call-wave span:nth-child(2){height:13px;animation-delay:.1s;}
.call-wave span:nth-child(3){height:18px;animation-delay:.2s;}
.call-wave span:nth-child(4){height:13px;animation-delay:.3s;}
.call-wave span:nth-child(5){height:6px;animation-delay:.4s;}

/* Same fix for connecting state avatar */
#call-connecting-state .call-av-wrap{
    width:68px;height:68px;
}
#call-connecting-state .call-avatar{
    width:68px;height:68px;
}

/* Controls */
#call-window-controls{
    position:relative;z-index:10;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    padding:8px 12px 16px;
}
.call-hangup-btn{
    width:56px;height:56px;
    border-radius:50%;border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#ff5252,#c62828);
    box-shadow:0 6px 20px rgba(255,82,82,.5),0 0 0 1px rgba(255,255,255,.1);
    transition:transform .18s,box-shadow .2s;
    padding:14px;
}
.call-hangup-btn:hover{transform:scale(1.1);box-shadow:0 10px 28px rgba(255,82,82,.6);}
.call-hangup-btn:active{transform:scale(.9);}

/* Util buttons */
.call-util-btn{
    position:absolute;z-index:10;
    width:28px;height:28px;border-radius:50%;border:none;
    background:rgba(255,255,255,.13);backdrop-filter:blur(8px);
    color:rgba(255,255,255,.65);cursor:pointer;font-size:10px;
    display:flex;align-items:center;justify-content:center;
    transition:background .2s,color .2s,transform .15s;
}
.call-util-btn:hover{background:rgba(255,255,255,.24);color:#fff;transform:scale(1.1);}
.call-util-btn.active{background:rgba(255,255,255,.28);color:#fff;}
#call-bg-btn{bottom:70px;right:10px;}
#call-immersive-btn{bottom:70px;left:10px;}
#call-bg-file-input{display:none;}

/* IMMERSIVE */
#call-window.immersive #call-window-header,
#call-window.immersive #call-window-body,
#call-window.immersive #call-connecting-state,
#call-window.immersive #call-window-controls,
#call-window.immersive #call-bg-btn,
#call-window.immersive .call-overlay{opacity:0 !important;pointer-events:none !important;}
#call-window.immersive #call-immersive-btn{opacity:.35 !important;pointer-events:all !important;}
#call-window.immersive #call-immersive-btn:hover{opacity:1 !important;}

/* Resize handle */
#call-resize-handle{
    position:absolute;bottom:-2px;right:-2px;z-index:99901;
    width:22px;height:22px;cursor:se-resize;
    display:flex;align-items:flex-end;justify-content:flex-end;
    padding:5px;touch-action:none;
}
#call-resize-handle::after{
    content:'';width:10px;height:10px;
    border-right:2px solid rgba(255,255,255,.35);
    border-bottom:2px solid rgba(255,255,255,.35);
    border-radius:0 0 4px 0;
}

/* Size presets */
#call-size-presets{
    position:fixed;z-index:99960;
    display:none;flex-direction:column;gap:2px;
    background:rgba(12,18,36,.94);backdrop-filter:blur(18px);
    border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:5px;
    box-shadow:0 12px 38px rgba(0,0,0,.55);min-width:140px;
}
#call-size-presets.open{display:flex;animation:cFi .18s ease;}
.call-size-btn{
    padding:7px 11px;font-size:12px;color:rgba(255,255,255,.8);
    background:none;border:none;border-radius:8px;
    cursor:pointer;white-space:nowrap;text-align:left;
    transition:background .15s;display:flex;align-items:center;gap:8px;
}
.call-size-btn:hover{background:rgba(255,255,255,.1);color:#fff;}
.call-size-btn i{color:var(--accent-color,#e0698a);width:12px;}

/* ═══ MINI PILL ══════════════════════════════════════════ */
#call-mini-pill{
    position:fixed;bottom:82px;right:16px;z-index:99901;
    display:none;align-items:center;gap:9px;
    background:rgba(10,18,38,.92);backdrop-filter:blur(20px);
    border:1px solid rgba(255,255,255,.12);
    border-radius:30px;padding:8px 14px 8px 10px;
    box-shadow:0 8px 28px rgba(0,0,0,.4);
    cursor:grab;color:#fff;user-select:none;touch-action:none;
}
#call-mini-pill:active{cursor:grabbing;}
#call-mini-pill.visible{display:flex;animation:cPi .3s cubic-bezier(.22,1,.36,1);}
.call-mini-av{
    width:30px;height:30px;border-radius:50%;
    background:var(--accent-color,#e0698a);overflow:hidden;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.call-mini-av img{width:100%;height:100%;object-fit:cover;}
.call-mini-av i{font-size:12px;color:rgba(255,255,255,.82);}
.call-mini-info{display:flex;flex-direction:column;gap:1px;}
.call-mini-name{font-size:12px;font-weight:600;line-height:1.1;}
.call-mini-time{font-size:11px;color:rgba(255,255,255,.5);font-variant-numeric:tabular-nums;font-weight:500;}
.call-mini-dot{width:6px;height:6px;border-radius:50%;background:#4caf50;box-shadow:0 0 5px #4caf50;animation:cBl 1.6s ease-in-out infinite alternate;flex-shrink:0;}
.call-mini-hangup{
    width:30px;height:30px;border-radius:50%;border:none;
    background:rgba(255,82,82,.75);cursor:pointer;
    display:flex;align-items:center;justify-content:center;padding:8px;
    transition:background .2s,transform .15s;flex-shrink:0;
}
.call-mini-hangup:hover{background:#ff5252;transform:scale(1.12);}

/* ═══ TOOLBAR BUTTON ════════════════════════════════════ */
#call-toolbar-btn{
    background-color:var(--message-received-bg) !important;
    color:var(--text-secondary) !important;
}
#call-toolbar-btn:hover{color:var(--text-primary) !important;}
body.bottom-collapse-mode #call-toolbar-btn{display:none !important;}

/* ═══ BLACK-WHITE DARK THEME FIX ════════════════════════ */
html[data-theme="dark"][data-color-theme="black-white"]{
    --accent-color: #c0c0c0;
    --accent-color-rgb: 192,192,192;
    --accent-color-dark: #e0e0e0;
    --message-sent-bg: #3a3a3a;
    --message-sent-text: #ffffff;
}
html:not([data-theme="dark"])[data-color-theme="black-white"] .message-sent{
    color: #ffffff !important;
}

/* ═══ KEYFRAMES ══════════════════════════════════════════ */
@keyframes cFi{from{opacity:0}to{opacity:1}}
@keyframes cCu{from{opacity:0;transform:translateY(28px) scale(.94)}to{opacity:1;transform:none}}
@keyframes cWi{from{opacity:0;transform:scale(.84) translateY(18px)}to{opacity:1;transform:none}}
@keyframes cPi{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
@keyframes cRp{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.12;transform:scale(1.12)}}
@keyframes cAp{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:.12;transform:scale(1.14)}}
@keyframes cBl{from{opacity:1}to{opacity:.18}}
@keyframes cOrb{0%{transform:translate(0,0) rotate(0)}33%{transform:translate(18px,-14px) rotate(120deg)}66%{transform:translate(-10px,18px) rotate(240deg)}100%{transform:translate(0,0) rotate(360deg)}}
@keyframes cWv{0%,100%{transform:scaleY(1);opacity:.5}50%{transform:scaleY(.32);opacity:.22}}
@keyframes cCd{0%,80%,100%{transform:scale(.72);opacity:.3}40%{transform:scale(1.22);opacity:1}}
        `;
        document.head.appendChild(el);
    }

    /* ── HTML ─────────────────────────────────────────────── */
    function injectHTML() {
        if (document.getElementById('call-feature-root')) return;
        const root = document.createElement('div');
        root.id = 'call-feature-root';
        root.innerHTML = `
<!-- INCOMING -->
<div id="call-incoming-overlay">
  <div class="call-inc-card">
    <div class="call-inc-ring">
      <div class="call-inc-avatar" id="call-inc-avatar"><i class="fas fa-user" id="call-inc-av-icon"></i></div>
    </div>
    <div class="call-inc-name" id="call-inc-name">对方</div>
    <div class="call-inc-sub"><span class="call-inc-sub-dot"></span><span>邀请您进行视频通话</span></div>
    <div class="call-inc-actions">
      <button class="call-inc-btn call-inc-reject" id="call-inc-reject">
        <div class="call-inc-circle">${SVG_HU}</div>
        <span class="call-inc-lbl">拒绝</span>
      </button>
      <button class="call-inc-btn call-inc-accept" id="call-inc-accept">
        <div class="call-inc-circle">
          <svg viewBox="0 0 24 24" fill="none" style="display:block;width:100%;height:100%;">
            <path d="M6.6 10.8c1.4 2.8 3.7 5.1 6.5 6.5l2.2-2.2c.28-.27.68-.36 1.03-.24 1.1.37 2.3.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.56 21 3 13.44 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.28.2 2.5.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z" fill="white"/>
          </svg>
        </div>
        <span class="call-inc-lbl">接听</span>
      </button>
    </div>
  </div>
</div>

<!-- CALL WINDOW -->
<div id="call-window">
  <div id="call-window-inner">
    <div id="call-window-bg">
      <div class="call-bg-grad"></div>
      <div class="call-orb call-orb-1"></div>
      <div class="call-orb call-orb-2"></div>
      <div class="call-orb call-orb-3"></div>
      <img id="call-bg-img" src="" alt="">
      <video id="call-bg-video" autoplay muted loop playsinline></video>
    </div>
    <div class="call-overlay"></div>

    <div id="call-window-header">
      <div class="call-badge">
        <span class="call-rec-dot"></span>
        <span class="call-timer-txt" id="call-timer-display">00:00</span>
      </div>
      <div class="call-top-btns">
        <button class="call-top-btn" id="call-size-preset-toggle" title="调整大小"><i class="fas fa-expand-alt"></i></button>
        <button class="call-top-btn" id="call-minimize-btn" title="最小化"><i class="fas fa-minus"></i></button>
      </div>
    </div>

    <div id="call-connecting-state">
      <div class="call-av-wrap">
        <div class="call-av-pulse"></div>
        <div class="call-av-pulse2"></div>
        <div class="call-avatar" id="call-conn-avatar"><i class="fas fa-user" id="call-conn-av-icon"></i></div>
      </div>
      <div class="call-name" id="call-conn-name">对方</div>
      <div style="font-size:11px;color:rgba(255,255,255,.4);display:flex;align-items:center;gap:5px;">
        <i class="fas fa-video" style="font-size:9px;"></i> 正在连接
      </div>
      <div class="call-conn-dots"><span></span><span></span><span></span></div>
    </div>

    <div id="call-window-body">
      <div class="call-av-wrap">
        <div class="call-av-pulse"></div>
        <div class="call-av-pulse2"></div>
        <div class="call-avatar" id="call-win-avatar"><i class="fas fa-user" id="call-win-av-icon"></i></div>
      </div>
      <div class="call-name" id="call-win-name">通话中</div>
      <div class="call-wave"><span></span><span></span><span></span><span></span><span></span></div>
    </div>

    <button class="call-util-btn" id="call-immersive-btn" title="沉浸模式"><i class="fas fa-eye-slash"></i></button>
    <!--<button class="call-util-btn" id="call-bg-btn" title="更换背景"><i class="fas fa-image"></i></button>
    <input type="file" id="call-bg-file-input" accept="image/*,.gif">-->

    <div id="call-window-controls">
      <button class="call-hangup-btn" id="call-hangup-btn">${SVG_HU}</button>
    </div>
  </div>
  <div id="call-resize-handle"></div>
</div>

<!-- SIZE PRESETS -->
<div id="call-size-presets">
  <button class="call-size-btn" data-w="160" data-h="240"><i class="fas fa-compress-alt"></i>迷你</button>
  <button class="call-size-btn" data-w="220" data-h="350"><i class="fas fa-minus-square"></i>小</button>
  <button class="call-size-btn" data-w="280" data-h="440"><i class="fas fa-square"></i>标准</button>
  <button class="call-size-btn" data-w="360" data-h="560"><i class="fas fa-expand"></i>大</button>
</div>

<!-- MINI PILL -->
<div id="call-mini-pill">
  <div class="call-mini-av" id="call-mini-av"><i class="fas fa-user" id="call-mini-av-icon"></i></div>
  <div class="call-mini-info">
    <div class="call-mini-name" id="call-mini-name">通话中</div>
    <div class="call-mini-time" id="call-mini-timer">00:00</div>
  </div>
  <span class="call-mini-dot"></span>
  <button class="call-mini-hangup" id="call-mini-hangup">${SVG_HU}</button>
</div>
        `;
        document.body.appendChild(root);
    }

    /*function injectToolbarBtn() {
        if (document.getElementById('call-toolbar-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'call-toolbar-btn';
        btn.title = '视频通话';
        btn.className = 'input-btn collapse-hideable';
        btn.style.display = S.enabled ? '' : 'none';
        btn.innerHTML = '<i class="fas fa-video"></i>';
        btn.addEventListener('click', () => {
            if (!S.enabled) return;
            if (S.active) {
                restoreWindow();
                return;
            }
            startCall(false);
        });
    }*/

    /* ── Toolbar button ───────────────────────────────────── */
    function injectToolbarBtn() {
        if (document.getElementById('call-toolbar-btn')) return;
        const btn = document.createElement('button');
        /*const anchor = document.getElementById('attachment-btn');
        let anchor = document.getElementById('attachment-btn');
        if (!anchor) {
            anchor = document.getElementById('send-btn');
        }
        if (!anchor) return;*/

        // --- 新的定位逻辑结束 ---
        
        btn.id = 'call-toolbar-btn';
        btn.title = '视频通话';
        btn.className = 'input-btn collapse-hideable';
        btn.style.display = S.enabled ? '' : 'none';
        btn.innerHTML = '<i class="fas fa-video"></i>';
        btn.addEventListener('click', () => {
            if (!S.enabled) return;
            if (S.active) { restoreWindow(); return; }
            startCall(false);
        });
         
        // --- 新的定位逻辑开始 ---
        
        // 1. 尝试查找左侧按钮容器 (常见的类名是 .input-actions)
        let anchor = document.querySelector('.input-actions');

        if (anchor) {
            // 如果找到了左侧容器，直接追加到容器内部（通常是在左侧显示）
            anchor.appendChild(btn);
        } else {
            // 2. 如果找不到左侧容器，尝试查找消息输入框
            const messageInput = document.getElementById('message-input');
            if (messageInput && messageInput.parentNode) {
                // 将按钮插入到输入框的前面（左侧）
                messageInput.parentNode.insertBefore(btn, messageInput);
            } else {
                // 3. 兜底方案：如果连输入框都没有，才尝试找发送按钮
                const sendBtn = document.getElementById('send-btn');
                if (!sendBtn) return;
                sendBtn.parentNode.insertBefore(btn, sendBtn);
            }
        }
        /*anchor.parentNode.insertBefore(btn, anchor); */
    }

    /* ── Helpers ──────────────────────────────────────────── */
    function fmt(ms) {
        const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
        return h > 0
            ? `${h}:${String(m % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
            : `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    }
    const getAvSrc = () => {
        const img = document.querySelector('#partner-avatar img,[id*="partner-avatar"] img,.partner-avatar img');
        return img ? img.src : null;
    };
    const getName = () => window.settings?.partnerName || document.getElementById('partner-name')?.textContent.trim() || '对方';

    function fillAv(avId) {
        const av = document.getElementById(avId), src = getAvSrc();
        if (av) av.innerHTML = src
            ? `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;">`
            : `<i class="fas fa-user"></i>`;
    }
    function fillNm(id) { const e = document.getElementById(id); if (e) e.textContent = getName(); }

    /* ── Timer ────────────────────────────────────────────── */
    function tick() {
        if (!S.active || !S.startTime) return;
        S.elapsed = Date.now() - S.startTime;
        const t = fmt(S.elapsed);
        const a = document.getElementById('call-timer-display');
        const b = document.getElementById('call-mini-timer');
        if (a) a.textContent = t;
        if (b) b.textContent = t;
        S.timerRAF = requestAnimationFrame(tick);
    }

    function positionWindow() {
        const win = document.getElementById('call-window');
        if (!win) return;
        win.style.width = S.size.w + 'px';
        win.style.height = S.size.h + 'px';
        if (S.pos) {
            win.style.left   = clamp(S.pos.x, 0, window.innerWidth  - S.size.w) + 'px';
            win.style.top    = clamp(S.pos.y, 0, window.innerHeight - S.size.h) + 'px';
            win.style.right  = 'auto'; win.style.bottom = 'auto';
        } else {
            win.style.right  = '20px'; win.style.top = '72px';
            win.style.left   = 'auto'; win.style.bottom = 'auto';
        }
    }
    function positionPill() {
        const pill = document.getElementById('call-mini-pill');
        if (!pill || !S.pillPos) return;
        pill.style.left   = clamp(S.pillPos.x, 0, window.innerWidth  - (pill.offsetWidth  || 180)) + 'px';
        pill.style.top    = clamp(S.pillPos.y, 0, window.innerHeight - (pill.offsetHeight || 50))  + 'px';
        pill.style.right  = 'auto'; pill.style.bottom = 'auto';
    }

    /* ── Send chat message ────────────────────────────────── */
    /*function sendCallMsg(dur) {
        if (dur < 2000) return;
        const input = document.getElementById('message-input');
        const send  = document.getElementById('send-btn');
        if (!input || !send) return;
        const prev = input.value;
        input.value = `📹 视频通话已结束 · ${fmt(dur)}`;
        send.click();
        //setTimeout(() => { if (input.value === input.value) {} }, 80);
        // ✅ 修复：删除或修正这里原本错误的判断
        setTimeout(() => {input.value = prev; input.value = ''; }, 150); // 建议稍微延长到 150ms，确保 mousedown 的异步发送逻辑已经读取到值
    }*/
    function sendCallMsg(dur) {
        if (dur < 100) return;
        
        // ✅ 彻底抛弃 input.value 和 send.click()，直接写库！
        const msgText = `📹 视频通话已结束 · ${fmt(dur)}`;
        
        if (typeof window.addMessage === 'function') {
            window.addMessage({
            id: Date.now() + Math.random(),
            sender: 'user',
            text: msgText,
            timestamp: new Date(),
            type: 'normal'
            });
            
            // 顺手触发一下保存和渲染，确保立刻显示
            if (typeof window.throttledSaveData === 'function') window.throttledSaveData();
            if (typeof window.renderMessages === 'function') window.renderMessages(true);
            if (typeof window.playSound === 'function') window.playSound('message');
            setTimeout(() => {
                if (typeof window.simulateReply === 'function') {
                    window.simulateReply();
                }
            }, 300);
        } else {
            // 极端兜底：如果 addMessage 不存在，再尝试 DOM 模拟
            const input = document.getElementById('message-input');
            const send = document.getElementById('send-btn');
            if (!input || !send) return;
            input.value = msgText;
            // 延迟一点点击，避开 endCall 隐藏 UI 的事件风暴
            setTimeout(() => send.click(), 100);
        }
    }


    function sendCallEvent(icon, label, detail) {
    // 优先调用系统中存在的专用函数（支持图标样式）
        if (typeof window._addCallEvent === 'function') {
            window._addCallEvent(icon, label, detail);
        } else {
            // 兜底方案：如果系统中没有 _addCallEvent，则回退到普通文本发送
            const input = document.getElementById('message-input');
            const sendBtn = document.getElementById('send-btn');
            if (input && sendBtn) {
                let text = label;
                // 简单的图标转 Emoji 映射
                if (icon === 'fa-phone-slash') text = `📵 ${label}`;
                else if (icon === 'fa-video') text = `📹 ${label}`;
                
                input.value = text;
                sendBtn.click();
            }
        }
    }
async function applyBg() {
    // 1. 安全检查数据库是否就绪
    if (!CallBgDB || !CallBgDB.db) return;

    // 2. 清理上一次的背景状态，防止视频和图片打架
    const imgEl = document.getElementById('call-bg-img');
    const vidEl = document.getElementById('call-bg-video');
    if (imgEl) { imgEl.style.display = 'none'; imgEl.removeAttribute('src'); }
    if (vidEl) { vidEl.pause(); vidEl.removeAttribute('src'); vidEl.load(); }

    // 3. 找到当前选中的背景记录
    const item = callBgLibrary.find(i => i.id === activeCallBg);
    if (!item) return; // 没选背景就保持默认纯色

    // 4. 去数据库把真文件拿出来
    try {
        const tx = CallBgDB.db.transaction(CallBgDB.storeName, 'readonly');
        const request = tx.objectStore(CallBgDB.storeName).get(item.id);
        
        request.onsuccess = () => {
            const file = request.result?.file;
            if (!file) return; // 文件丢失就不处理
            
            const url = URL.createObjectURL(file); // 拿到真实的本地链接

            // 5. 精准投喂给真正的 DOM 元素！
            if (item.type === 'video') {
                if (vidEl) {
                    vidEl.src = url;
                    vidEl.play().catch(()=>{});
                }
            } else {
                if (imgEl) {
                    imgEl.src = url;
                    imgEl.style.display = 'block'; // 显现图片
                }
            }
        };
    } catch(e) {
        console.error('[通话背景] 应用失败:', e);
    }
}


    /* ── Start / End ──────────────────────────────────────── */
function startCall(isPartner) {
    if (!S.enabled) return;
    S.active = true;
    S.startTime = null;
    S.elapsed = 0;
    S.minimized = false;
    S.isPartnerCall = !!isPartner;
    S.immersive = false;
    const miniTimer = document.getElementById('call-mini-timer');
    if (miniTimer) miniTimer.textContent = '00:00';
    document.getElementById('call-window')?.classList.remove('immersive');

    ['call-inc-avatar', 'call-conn-avatar', 'call-win-avatar', 'call-mini-av'].forEach(fillAv);
    ['call-conn-name', 'call-win-name', 'call-mini-name'].forEach(fillNm);
    
    applyBg();
    positionWindow();

    const win = document.getElementById('call-window');
    const body = document.getElementById('call-window-body');
    const conn = document.getElementById('call-connecting-state');
    const timerEl = document.getElementById('call-timer-display');

    if (win) win.classList.add('visible');
    if (conn) conn.classList.add('visible');
    if (body) body.style.display = 'none';
    if (timerEl) timerEl.textContent = '连接中';

    clearTimeout(S.connectingTimer);

    // ===== 修改后的逻辑 =====
    // 只有当“拒接开关开启”且“是用户主动拨打”时，才判定是否拒接
    if (!isPartner && S.rejectEnabled && Math.random() < 0.2) {
        const rejectDelay = 4000 + Math.random() * 8000;
        
        S.connectingTimer = setTimeout(() => {
            if (!S.active) return;
            
            S.active = false;
            cancelAnimationFrame(S.timerRAF);
            const winEl = document.getElementById('call-window');
            if (winEl) winEl.classList.remove('visible');
            const connEl = document.getElementById('call-connecting-state');
            if (connEl) connEl.classList.remove('visible');
            const bodyEl = document.getElementById('call-window-body');
            if (bodyEl) bodyEl.style.display = '';
            
            const rejectLabels = [
                getName() + ' 未接听',
                getName() + ' 正在忙，无法接听',
                getName() + ' 拒绝了通话',
                getName() + ' 暂时无法接听',
            ];
            const lbl = rejectLabels[Math.floor(Math.random() * rejectLabels.length)];
            
            sendCallEvent('fa-phone-slash', lbl, null);
            
            if (typeof showNotification === 'function') showNotification(lbl, 'info', 3000);
        }, rejectDelay);
    } else {
        // 如果拒接开关关闭，或者概率判定为接通，则直接进入通话
        S.connectingTimer = setTimeout(() => {
            if (!S.active) return;
            S.startTime = Date.now();
            if (conn) conn.classList.remove('visible');
            if (body) body.style.display = '';
            tick();
            // 💡 新增：存档通话状态，防止刷新丢失
            try {
            localStorage.setItem('callActiveState', JSON.stringify({
                startTime: S.startTime,
                isPartnerCall: S.isPartnerCall,
                minimized: false
            }));
            } catch(e) {}
        }, 1400 + Math.random() * 1400);
    }
}


    function endCall() {
        if (!S.active) return;
        const dur = S.elapsed;
        S.active = false; S.startTime = null;
        cancelAnimationFrame(S.timerRAF);
        clearTimeout(S.connectingTimer); clearTimeout(S.incomingTimer);

        ['call-window','call-mini-pill','call-incoming-overlay'].forEach(id => {
            const e = document.getElementById(id);
            if (e) { e.classList.remove('visible'); if (id === 'call-window') e.classList.remove('immersive'); }
        });
        const body = document.getElementById('call-window-body');
        const conn = document.getElementById('call-connecting-state');
        if (body) body.style.display = '';
        if (conn) conn.classList.remove('visible');
        const vid = document.getElementById('call-bg-video');
        if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); }
        S.immersive = false;
        const iBtn = document.getElementById('call-immersive-btn');
        if (iBtn) { iBtn.classList.remove('active'); iBtn.querySelector('i').className = 'fas fa-eye-slash'; }

        localStorage.setItem(KEY_POS,  JSON.stringify(S.pos));
        localStorage.setItem(KEY_SIZE, JSON.stringify(S.size));
        sendCallMsg(dur);
        if (typeof showNotification === 'function' && dur > 1500)
            showNotification(`通话结束 · ${fmt(dur)}`, 'info', 3000);
        try { localStorage.removeItem('callActiveState'); } catch(e) {}
    }

    /* ── Incoming ─────────────────────────────────────────── */
    function showIncomingCall() {
        if (!S.enabled || S.active) return;
        const ov = document.getElementById('call-incoming-overlay');
        if (!ov) return;
        fillAv('call-inc-avatar'); fillNm('call-inc-name');
        ov.classList.add('visible');
        clearTimeout(S.incomingTimer);
        S.incomingTimer = setTimeout(() => ov.classList.remove('visible'), 22000);
    }

    function scheduleRandomCall() {
        clearTimeout(S.randomCallTimer);
        if (!S.enabled) return;
        const ms = (15 + Math.random() * 45) * 60 * 1000;
        S.randomCallTimer = setTimeout(() => {
            if (S.enabled && !S.active && Math.random() < 0.35) showIncomingCall();
            scheduleRandomCall();
        }, ms);
    }

    /* ── Minimize / Restore ───────────────────────────────── */
    function minimizeWindow() {
        S.minimized = true;
        try {
            const saved = JSON.parse(localStorage.getItem('callActiveState') || '{}');
            saved.minimized = true;
            localStorage.setItem('callActiveState', JSON.stringify(saved));
        } catch(e) {}
        document.getElementById('call-bg-video')?.pause();
        document.getElementById('call-window')?.classList.remove('visible');
        const pill = document.getElementById('call-mini-pill');
        if (pill) { pill.classList.add('visible'); positionPill(); }
    }
    function restoreWindow() {
        S.minimized = false;
        // 💡 新增：更新存档为大窗口状态
        try {
            const saved = JSON.parse(localStorage.getItem('callActiveState') || '{}');
            saved.minimized = false;
            localStorage.setItem('callActiveState', JSON.stringify(saved));
        } catch(e) {}
        const win = document.getElementById('call-window');
        if (win) { positionWindow(); win.classList.add('visible'); }
        const vid = document.getElementById('call-bg-video');
        if (vid && vid.src && !S.immersive) vid.play().catch(()=>{});
        document.getElementById('call-mini-pill')?.classList.remove('visible');
    }

    /* ── Immersive ────────────────────────────────────────── */
    function toggleImmersive() {
        S.immersive = !S.immersive;
        document.getElementById('call-window')?.classList.toggle('immersive', S.immersive);
        const btn = document.getElementById('call-immersive-btn');
        if (btn) {
            btn.classList.toggle('active', S.immersive);
            btn.querySelector('i').className = S.immersive ? 'fas fa-eye' : 'fas fa-eye-slash';
        }
    }

    /* ── Size presets ─────────────────────────────────────── */
    function openSizePresets() {
        const p = document.getElementById('call-size-presets');
        const b = document.getElementById('call-size-preset-toggle');
        if (!p || !b) return;
        const r = b.getBoundingClientRect();
        p.style.top  = (r.bottom + 8) + 'px';
        p.style.left = Math.max(8, r.left - 40) + 'px';
        p.classList.add('open');
    }

    /* ── Drag: window ─────────────────────────────────────── */
    function initDrag() {
        const hdr = document.getElementById('call-window-header');
        const win = document.getElementById('call-window');
        if (!hdr || !win) return;
        let on = false;
        hdr.addEventListener('pointerdown', e => {
            if (e.target.closest('.call-top-btn')) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.preventDefault();
            const r = win.getBoundingClientRect();
            S.dragOff = { x: e.clientX - r.left, y: e.clientY - r.top };
            on = true;
            try { hdr.setPointerCapture(e.pointerId); } catch(_) {}
        });
        hdr.addEventListener('pointermove', e => {
            if (!on || !S.dragOff) return; e.preventDefault();
            win.style.left   = clamp(e.clientX - S.dragOff.x, 0, window.innerWidth  - win.offsetWidth)  + 'px';
            win.style.top    = clamp(e.clientY - S.dragOff.y, 0, window.innerHeight - win.offsetHeight) + 'px';
            win.style.right  = 'auto'; win.style.bottom = 'auto';
        });
        const stop = e => {
            if (!on) return; on = false; S.dragOff = null;
            const r = win.getBoundingClientRect(); S.pos = { x: r.left, y: r.top };
            localStorage.setItem(KEY_POS, JSON.stringify(S.pos));
            try { hdr.releasePointerCapture(e.pointerId); } catch(_) {}
        };
        hdr.addEventListener('pointerup', stop);
        hdr.addEventListener('pointercancel', stop);
    }

    /* ── Drag: mini pill ──────────────────────────────────── */
    function initPillDrag() {
        const pill = document.getElementById('call-mini-pill');
        if (!pill) return;
        let on = false;
        pill.addEventListener('pointerdown', e => {
            if (e.target.closest('.call-mini-hangup')) return;
            e.preventDefault();
            const r = pill.getBoundingClientRect();
            S.pillDragOff = { x: e.clientX - r.left, y: e.clientY - r.top };
            S.pillDragged = false; on = true;
            try { pill.setPointerCapture(e.pointerId); } catch(_) {}
        });
        pill.addEventListener('pointermove', e => {
            if (!on || !S.pillDragOff) return; e.preventDefault();
            S.pillDragged = true;
            pill.style.left   = clamp(e.clientX - S.pillDragOff.x, 0, window.innerWidth  - pill.offsetWidth)  + 'px';
            pill.style.top    = clamp(e.clientY - S.pillDragOff.y, 0, window.innerHeight - pill.offsetHeight) + 'px';
            pill.style.right  = 'auto'; pill.style.bottom = 'auto';
        });
        const stop = e => {
            if (!on) return; on = false;
            if (S.pillDragged) {
                const r = pill.getBoundingClientRect();
                S.pillPos = { x: r.left, y: r.top };
                localStorage.setItem(KEY_PILL_POS, JSON.stringify(S.pillPos));
            }
            S.pillDragOff = null;
            try { pill.releasePointerCapture(e.pointerId); } catch(_) {}
        };
        pill.addEventListener('pointerup', stop);
        pill.addEventListener('pointercancel', stop);
    }

    /* ── Resize ───────────────────────────────────────────── */
    function initResize() {
        const h = document.getElementById('call-resize-handle');
        const win = document.getElementById('call-window');
        if (!h || !win) return;
        let on = false;
        h.addEventListener('pointerdown', e => {
            e.preventDefault(); e.stopPropagation();
            const r = win.getBoundingClientRect();
            S.resizeInit = { ex: e.clientX, ey: e.clientY, w: r.width, h: r.height };
            on = true;
            try { h.setPointerCapture(e.pointerId); } catch(_) {}
        });
        h.addEventListener('pointermove', e => {
            if (!on || !S.resizeInit) return; e.preventDefault();
            S.size.w = clamp(S.resizeInit.w + (e.clientX - S.resizeInit.ex), 160, 600);
            S.size.h = clamp(S.resizeInit.h + (e.clientY - S.resizeInit.ey), 240, 800);
            win.style.width = S.size.w + 'px'; win.style.height = S.size.h + 'px';
        });
        const stop = e => {
            if (!on) return; on = false; S.resizeInit = null;
            localStorage.setItem(KEY_SIZE, JSON.stringify(S.size));
            try { h.releasePointerCapture(e.pointerId); } catch(_) {}
        };
        h.addEventListener('pointerup', stop);
        h.addEventListener('pointercancel', stop);
    }

    /* ── Bind all events ──────────────────────────────────── */
    function bindEvents() {
        document.getElementById('call-inc-reject')?.addEventListener('click', () => {
            // 1. 隐藏来电弹窗 & 清除定时器
            document.getElementById('call-incoming-overlay')?.classList.remove('visible');
            clearTimeout(S.incomingTimer);

            // 2. 直接调用 sendCallEvent，保持和对方拒接你完全一致的样式！
            sendCallEvent('fa-phone-slash', `已拒绝 ${getName()} 的视频通话`, null);
        });


        document.getElementById('call-inc-accept')?.addEventListener('click', () => {
            document.getElementById('call-incoming-overlay')?.classList.remove('visible');
            clearTimeout(S.incomingTimer); startCall(true);
        });

        // Controls
        document.getElementById('call-hangup-btn')?.addEventListener('click', endCall);
        document.getElementById('call-mini-hangup')?.addEventListener('click', e => { e.stopPropagation(); endCall(); });
        document.getElementById('call-minimize-btn')?.addEventListener('click', minimizeWindow);
        document.getElementById('call-mini-pill')?.addEventListener('click', e => {
            if (e.target.closest('.call-mini-hangup')) return;
            if (!S.pillDragged) restoreWindow();
        });
        document.getElementById('call-immersive-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleImmersive(); });
        document.getElementById('call-window')?.addEventListener('click', e => {
            if (S.immersive && !e.target.closest('#call-immersive-btn')) toggleImmersive();
        });

        // Size presets
        document.getElementById('call-size-preset-toggle')?.addEventListener('click', e => {
            e.stopPropagation();
            const p = document.getElementById('call-size-presets');
            if (!p) return;
            p.classList.contains('open') ? p.classList.remove('open') : openSizePresets();
        });
        document.addEventListener('click', e => {
            const btn = e.target.closest('.call-size-btn'); if (!btn) return;
            S.size.w = +btn.dataset.w; S.size.h = +btn.dataset.h;
            const win = document.getElementById('call-window');
            if (win) { win.style.width = S.size.w + 'px'; win.style.height = S.size.h + 'px'; }
            document.getElementById('call-size-presets')?.classList.remove('open');
            localStorage.setItem(KEY_SIZE, JSON.stringify(S.size));
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('#call-size-preset-toggle') && !e.target.closest('#call-size-presets'))
                document.getElementById('call-size-presets')?.classList.remove('open');
        });

          // Call feature toggle (delegated, works for both old dm-card and new dm2-card)
        document.addEventListener('change', e => {
            if (e.target.id === 'call-enabled-toggle') {
                S.enabled = e.target.checked;
                localStorage.setItem(KEY_ENABLED, S.enabled);
                const btn = document.getElementById('call-toolbar-btn');
                if (btn) btn.style.display = S.enabled ? '' : 'none';
                if (!S.enabled && S.active) endCall();
                S.enabled ? scheduleRandomCall() : clearTimeout(S.randomCallTimer);
            }
                // 新增：处理拒接开关
            if (e.target.id === 'call-reject-toggle') {
                S.rejectEnabled = e.target.checked;
                localStorage.setItem(KEY_REJECT_ENABLED, S.rejectEnabled);
            }
    });

        initDrag(); initPillDrag(); initResize();
    }

    /* ── Public ───────────────────────────────────────────── */
    window.callFeature = { startCall, endCall, showIncomingCall, restoreWindow, minimizeWindow,applyBg };

    /* ── Init ─────────────────────────────────────────────── */
    function init() {
        injectCSS();
        injectHTML();
        bindEvents();
        // loadBg();
        const late = () => {
            injectToolbarBtn();
            if (S.enabled) scheduleRandomCall();
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(late, 800));
        else setTimeout(late, 800);
        // 新增：同步拒接开关状态
        const rejectToggle = document.getElementById('call-reject-toggle');
        if (rejectToggle) rejectToggle.checked = S.rejectEnabled;
          // 💡 优化：智能等待页面完全加载后再恢复通话，防止遮挡开场动画
  const waitAndRestore = () => {
    // 必须同时满足：1. 页面有输入框了  2. 页面不再处于刚加载的透明状态
    const inputReady = document.getElementById('message-input');
    const bodyLoaded = getComputedStyle(document.body).opacity >= '0.9';
    if (inputReady && bodyLoaded) {
      doRestoreCall();
    } else {
      setTimeout(waitAndRestore, 400); // 每 0.4 秒检查一次
    }
  };

  const doRestoreCall = () => {
    try {
        const savedCall = localStorage.getItem('callActiveState');
        if (savedCall) {
            const state = JSON.parse(savedCall);
            if (state && state.startTime) {
                // 💡 先检查 DOM 是否就绪，没就绪就等会再试，绝不提前改状态
                const win = document.getElementById('call-window');
                const body = document.getElementById('call-window-body');
                if (!win || !body) {
                    setTimeout(doRestoreCall, 500); // 500ms 后重试
                    return;
                }

                // DOM 确认存在，再修改状态
                S.active = true;
                S.startTime = state.startTime;
                S.isPartnerCall = !!state.isPartnerCall;

                ['call-win-avatar', 'call-mini-av'].forEach(fillAv);
                ['call-win-name', 'call-mini-name'].forEach(fillNm);
                applyBg();

                if (state.minimized) {
                    minimizeWindow();

                } else {
                    positionWindow(); // 直接复用定位函数，确保窗口正确显示
                    const conn = document.getElementById('call-connecting-state');
                    if (conn) conn.classList.remove('visible');
                    body.style.display = '';
                    win.classList.add('visible');
                    const pill = document.getElementById('call-mini-pill');
                    if (pill) pill.classList.remove('visible');
                }

                tick(); // 启动计时器
            } else {
                localStorage.removeItem('callActiveState');
            }
        }
    } catch(e) {
        localStorage.removeItem('callActiveState');
    }
};


  // 延迟 1.5 秒后开始检查（给开场动画留出时间）
  setTimeout(waitAndRestore, 3500);
}

// ── 通话事件桥接（配合 call.js 使用） ──
window._addCallEvent = (icon, label, detail) => {
    window.addMessage({
        id: Date.now() + Math.random(),
        sender: 'system',
        text: label + (detail ? ' · ' + detail : ''),
        timestamp: new Date(),
        status: 'received',
        type: 'call-event',
        callIcon: icon || 'fa-video',
        callDetail: detail || null,
        favorited: false,
        note: null,
    });
};

    init();
})();
