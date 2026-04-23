/**
 * data-modal.js — 数据管理界面 v3
 * 全新设计：移动优先、视觉精美、无溢出
 */
(function () {
    'use strict';

    /* ── CSS ──────────────────────────────────────────────────────── */
    function injectCSS() {
        if (document.getElementById('dm3-style')) return;
        const s = document.createElement('style');
        s.id = 'dm3-style';
        s.textContent = `
/* ============================================================
   DM3 — Data Modal v3  (prefix: dm3-)
   ============================================================ */

/* Modal wrapper: bottom sheet on mobile */
#data-modal {
    align-items: flex-end !important;
    padding: 0 !important;
}
#data-modal .modal-content {
    padding: 0 !important;
    width: 100% !important;
    max-width: 520px !important;
    max-height: 92dvh !important;
    border-radius: 28px 28px 0 0 !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    box-shadow: 0 -8px 40px rgba(0,0,0,.18) !important;
    margin: 0 auto !important;
}
@media (min-width: 600px) {
    #data-modal { align-items: center !important; padding: 20px !important; }
    #data-modal .modal-content {
        border-radius: 24px !important;
        max-height: 88dvh !important;
    }
}

/* ── Drag handle ── 
.dm3-handle {
    width: 40px; height: 4px;
    background: var(--border-color);
    border-radius: 99px;
    margin: 12px auto 0;
    flex-shrink: 0;
    opacity: .5;
}*/

/* ── Header ── */
.dm3-header {
    flex-shrink: 0;
    padding: 16px 20px 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    border-bottom: 1px solid var(--border-color);
}
.dm3-header-icon {
    width: 46px; height: 46px;
    border-radius: 16px;
    background: linear-gradient(145deg,
        rgba(var(--accent-color-rgb,224,105,138),.25),
        rgba(var(--accent-color-rgb,224,105,138),.08));
    display: flex; align-items: center; justify-content: center;
    font-size: 19px;
    color: var(--accent-color);
    flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(var(--accent-color-rgb,224,105,138),.2);
}
.dm3-header-info { flex: 1; min-width: 0; }
.dm3-header-title {
    font-size: 17px; font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -.3px;
    line-height: 1.25;
}
.dm3-header-sub {
    font-size: 11.5px;
    color: var(--text-secondary);
    margin-top: 2px;
    opacity: .7;
}
/*.dm3-close-btn {
    width: 32px; height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--secondary-bg);
    color: var(--text-secondary);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
    cursor: pointer;
    flex-shrink: 0;
    transition: background .18s, color .18s;
}
.dm3-close-btn:hover {
    background: rgba(var(--accent-color-rgb,224,105,138),.1);
    color: var(--accent-color);
}*/

/* ── Scroll body ── */
.dm3-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 12px 14px 6px;
}
.dm3-body::-webkit-scrollbar { width: 0; }

/* ── Storage banner ── */
.dm3-banner {
    border-radius: 20px;
    padding: 16px 18px;
    margin-bottom: 14px;
    background: linear-gradient(135deg,
        rgba(var(--accent-color-rgb,224,105,138),.13) 0%,
        rgba(var(--accent-color-rgb,224,105,138),.04) 100%);
    border: 1.5px solid rgba(var(--accent-color-rgb,224,105,138),.18);
    position: relative;
    overflow: hidden;
}
.dm3-banner::before {
    content: '';
    position: absolute;
    top: -20px; right: -20px;
    width: 100px; height: 100px;
    border-radius: 50%;
    background: radial-gradient(circle,
        rgba(var(--accent-color-rgb,224,105,138),.15) 0%,
        transparent 70%);
    pointer-events: none;
}
.dm3-banner-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
}
.dm3-banner-label {
    font-size: 10.5px; font-weight: 800;
    letter-spacing: 1px; text-transform: uppercase;
    color: var(--accent-color);
    display: flex; align-items: center; gap: 5px;
}
.dm3-banner-size {
    font-size: 12px; font-weight: 700;
    color: var(--text-secondary);
}
.dm3-progress-track {
    height: 5px;
    background: rgba(var(--accent-color-rgb,224,105,138),.15);
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 12px;
}
.dm3-progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg,
        var(--accent-color),
        rgba(var(--accent-color-rgb,224,105,138),.55));
    transition: width .8s cubic-bezier(.4,0,.2,1);
     min-width: 2px; /* 👈 新增这行，确保哪怕只有 0.1% 也能看到一条线 */
}
.dm3-stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}
.dm3-stat-chip {
    background: var(--primary-bg);
    border: 1.5px solid var(--border-color);
    border-radius: 13px;
    padding: 9px 8px 8px;
    text-align: center;
}
.dm3-stat-chip-num {
    font-size: 14px; font-weight: 800;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
}
.dm3-stat-chip-lbl {
    font-size: 10px;
    color: var(--text-secondary);
    margin-top: 2px;
    opacity: .75;
}

/* ── Section heading ── */
.dm3-section {
    display: flex; align-items: center; gap: 6px;
    font-size: 10px; font-weight: 800;
    letter-spacing: 1.1px; text-transform: uppercase;
    color: var(--text-secondary);
    opacity: .5;
    margin: 16px 4px 7px;
}
.dm3-section.danger { color: #FF3B30; opacity: .65; }

/* ── Card group ── */
.dm3-group {
    background: var(--secondary-bg);
    border: 1.5px solid var(--border-color);
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 4px;
}

/* ── Row ── */
.dm3-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 16px;
    border-bottom: 1px solid var(--border-color);
    box-sizing: border-box;
    width: 100%;
    min-height: 64px;
}
.dm3-row:last-child { border-bottom: none; }
.dm3-row.tappable {
    cursor: pointer;
    transition: background .15s;
    -webkit-tap-highlight-color: transparent;
}
.dm3-row.tappable:hover { background: rgba(var(--accent-color-rgb,224,105,138),.04); }
.dm3-row.tappable:active { background: rgba(var(--accent-color-rgb,224,105,138),.09); }

/* ── Icon pill ── */
.dm3-icon {
    width: 38px; height: 38px;
    border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px;
    flex-shrink: 0;
}
.dm3-icon-pink   { background: rgba(var(--accent-color-rgb,224,105,138),.14); color: var(--accent-color); }
.dm3-icon-blue   { background: rgba(74,144,226,.13);  color: #4A90E2; }
.dm3-icon-green  { background: rgba(52,199,89,.13);   color: #34C759; }
.dm3-icon-amber  { background: rgba(255,159,10,.13);  color: #FF9F0A; }
.dm3-icon-purple { background: rgba(175,82,222,.13);  color: #AF52DE; }
.dm3-icon-red    { background: rgba(255,59,48,.10);   color: #FF3B30; }
.dm3-icon-teal   { background: rgba(90,200,250,.13);  color: #5AC8FA; }

/* ── Text block ── */
.dm3-text { flex: 1 1 0%; min-width: 0; }
.dm3-row-title {
    font-size: 14px; font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.3;
}
.dm3-row-desc {
    font-size: 11.5px;
    color: var(--text-secondary);
    margin-top: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.35;
    opacity: .8;
}

/* ── Right side: never overflows, never wraps ── */
.dm3-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    flex-wrap: nowrap;
}

/* ── Buttons ── */
.dm3-btn {
    display: inline-flex; align-items: center; gap: 5px;
    height: 34px;
    padding: 0 13px;
    border-radius: 99px;
    font-size: 12.5px; font-weight: 600;
    border: 1.5px solid var(--border-color);
    background: var(--primary-bg);
    color: var(--text-primary);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all .18s;
    font-family: var(--font-family, inherit);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    box-sizing: border-box;
}
.dm3-btn:hover {
    border-color: var(--accent-color);
    color: var(--accent-color);
    background: rgba(var(--accent-color-rgb,224,105,138),.07);
}
.dm3-btn:active { transform: scale(.94); }

.dm3-btn.solid {
    background: var(--accent-color);
    border-color: transparent;
    color: #fff;
}
.dm3-btn.solid:hover { opacity: .85; border-color: transparent; color: #fff; }

.dm3-btn.ghost-red {
    color: #FF3B30;
    border-color: rgba(255,59,48,.25);
    background: transparent;
}
.dm3-btn.ghost-red:hover { background: rgba(255,59,48,.08); border-color: #FF3B30; }

/* ── Toggle ── */
.dm3-toggle {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 50px; height: 28px;
    flex-shrink: 0;
    cursor: pointer;
}
.dm3-toggle input {
    opacity: 0; width: 0; height: 0; position: absolute;
}
.dm3-toggle-track {
    position: absolute;
    inset: 0;
    background: rgba(120,120,128,.22);
    border-radius: 99px;
    transition: background .28s;
}
.dm3-toggle-track::after {
    content: '';
    position: absolute;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: #fff;
    top: 3px; left: 3px;
    transition: transform .28s cubic-bezier(.34,1.3,.64,1);
    box-shadow: 0 2px 6px rgba(0,0,0,.22);
}
.dm3-toggle input:checked + .dm3-toggle-track { background: var(--accent-color); }
.dm3-toggle input:checked + .dm3-toggle-track::after { transform: translateX(22px); }

/* ── Footer ── */
.dm3-footer {
    flex-shrink: 0;
    display: flex;
    gap: 8px;
    padding: 12px 14px;
    padding-bottom: max(14px, env(safe-area-inset-bottom, 14px));
    border-top: 1px solid var(--border-color);
    background: var(--secondary-bg);
}
.dm3-footer-btn {
    flex: 1;
    height: 46px;
    border-radius: 14px;
    border: 1.5px solid var(--border-color);
    background: var(--primary-bg);
    color: var(--text-primary);
    font-size: 14px; font-weight: 600;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: all .18s;
    font-family: var(--font-family, inherit);
    -webkit-tap-highlight-color: transparent;
}
.dm3-footer-btn:hover {
    background: rgba(var(--accent-color-rgb,224,105,138),.06);
    border-color: rgba(var(--accent-color-rgb,224,105,138),.35);
}
.dm3-footer-btn:active { transform: scale(.97); }

.dm3-spacer { height: 10px; }
        `;
        document.head.appendChild(s);
    }

    /* ── HTML ─────────────────────────────────────────────────────── */
    function buildHTML() {
        return `

<div class="dm3-header">
  <div class="dm3-header-icon"><i class="fas fa-database"></i></div>
  <div class="dm3-header-info">
    <div class="dm3-header-title">数据管理</div>
    <div class="dm3-header-sub">备份 · 恢复 · 通知 · 设置</div>
  </div>
  <!--<button class="dm3-close-btn" id="close-data" aria-label="关闭">
    <i class="fas fa-times"></i>
  </button>-->
</div>

<div class="dm3-body">

  <!-- 存储概览 -->
  <div class="dm3-banner">
    <!--<div class="dm3-banner-top">
      <span class="dm3-banner-label"><i class="fas fa-hdd"></i> 本地存储</span>
      <span class="dm3-banner-size" id="dm3-storage-size">计算中…</span>
    </div>-->

    <div class="dm3-banner-top">
        <span class="dm3-banner-label"><i class="fas fa-hdd"></i> 浏览器存储配额</span>
        <span class="dm3-banner-size" id="dm3-storage-size">计算中…</span>
    </div>

    <div class="dm3-progress-track">
      <div class="dm3-progress-fill" id="dm3-progress-fill" style="width:0%"></div>
    </div>
    <div class="dm3-stats-row">
      <div class="dm3-stat-chip">
        <div class="dm3-stat-chip-num" id="dm3-stat-msgs">—</div>
        <div class="dm3-stat-chip-lbl">文字/设置</div>
      </div>      
      <div class="dm3-stat-chip">
        <div class="dm3-stat-chip-num" id="dm3-stat-media">—</div>
        <div class="dm3-stat-chip-lbl">图片/媒体</div>
      </div>
      <div class="dm3-stat-chip">
        <div class="dm3-stat-chip-num" id="dm3-stat-cfg">—</div>
        <div class="dm3-stat-chip-lbl">系统占用</div>
      </div>

    </div>
  </div>

  <!-- 消息通知 -->
  <div class="dm3-section"><i class="fas fa-bell"></i> 消息通知</div>
  <div class="dm3-group">
    <div class="dm3-row">
      <div class="dm3-icon dm3-icon-amber"><i class="fas fa-bell"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">后台消息推送</div>
        <div class="dm3-row-desc" id="notif-status-text">挂在后台时收到新消息自动弹出提醒</div>
      </div>
      <div class="dm3-right">
        <label class="dm3-toggle">
          <input type="checkbox" id="notif-permission-toggle" onchange="handleNotifToggle(this)">
          <span class="dm3-toggle-track"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- 备份与恢复 -->
  <div class="dm3-section"><i class="fas fa-archive"></i> 备份与恢复</div>
  <div class="dm3-group">
    <div class="dm3-row">
      <div class="dm3-icon dm3-icon-blue"><i class="fas fa-layer-group"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">全量备份</div>
        <div class="dm3-row-desc">备份所有数据</div>
      </div>
      <div class="dm3-right">
        <button class="dm3-btn solid" id="export-all-settings"><i class="fas fa-download"></i> 导出</button>
        <button class="dm3-btn" id="import-all-settings"><i class="fas fa-upload"></i> 导入</button>
      </div>
    </div>
    <div class="dm3-row">
      <div class="dm3-icon dm3-icon-green"><i class="fas fa-comments"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">选择性备份</div>
        <div class="dm3-row-desc">仅备份所选内容</div>
      </div>
      <div class="dm3-right">
        <button class="dm3-btn solid" id="export-chat-btn"><i class="fas fa-download"></i> 导出</button>
        <button class="dm3-btn" id="import-chat-btn"><i class="fas fa-upload"></i> 导入</button>
      </div>
    </div>
  </div>

    <!-- 碎片整理 
    <div class="dm3-section"><i class="fas fa-broom"></i> 维护优化</div>
    <div class="dm3-group">
    <div class="dm3-row">
        <div class="dm3-icon dm3-icon-teal"><i class="fas fa-broom"></i></div>
        <div class="dm3-text">
        <div class="dm3-row-title">深度清理</div>
        <div class="dm3-row-desc">清理不必要的垃圾数据</div>
        </div>
        <div class="dm3-right">
        <button class="dm3-btn solid" id="dm3-compact-btn">
            <i class="fas fa-recycle"></i> 清理
        </button>
        </div>
    </div>
    </div>-->
		<!-- 存储优化与帮助 -->
		<div class="dm3-section" style="margin-bottom:8px;"><i class="fas fa-lightbulb"></i> 存储与优化</div>
		<div class="dm3-group" style="margin-bottom:14px;">
			<div class="dm3-row tappable" id="dm3-open-faq">
				<div class="dm3-icon dm3-icon-amber"><i class="fas fa-question-circle"></i></div>
				<div class="dm3-text">
					<div class="dm3-row-title">浏览器常见问题</div>
				</div>
				<div class="dm3-right">
					<i class="fas fa-chevron-right" style="font-size:12px;color:var(--text-secondary);opacity:.5;"></i>
				</div>
			</div>
		</div>


  <!-- 危险操作 -->
  <div class="dm3-section danger"><i class="fas fa-exclamation-triangle"></i> 危险操作</div>
  <div class="dm3-group">
    <div class="dm3-row">
      <div class="dm3-icon dm3-icon-red"><i class="fas fa-trash-alt"></i></div>
      <div class="dm3-text">
        <div class="dm3-row-title">重置全部数据</div>
        <div class="dm3-row-desc">清空所有本地数据，操作不可撤销</div>
      </div>
      <div class="dm3-right">
        <button class="dm3-btn ghost-red" id="clear-storage">
          <i class="fas fa-sync-alt"></i> 重置
        </button>
      </div>
    </div>
  </div>

  <div class="dm3-spacer"></div>
</div>

<div class="dm3-footer">
  <button class="dm3-footer-btn" id="back-data"
    onclick="(function(){hideModal(document.getElementById('data-modal'));showModal(document.getElementById('settings-modal'))})()">
    <i class="fas fa-arrow-left"></i> 返回设置
  </button>
</div>
        `;
    }


/* ── Storage stats ────────────────────────────────────────────── */
function fmt(b) {
    if (!b || b < 0) return '0 B';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
}

async function updateStats() {
  try {
    const get = id => document.getElementById(id);

    // 1. 获取浏览器存储配额
    let quota = 0, usage = 0;
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      quota = estimate.quota || 0;
      usage = estimate.usage || 0;
    }

    // 2. 遍历并精准分类
    let textMsgSize = 0;
    let mediaMsgSize = 0;
    let settingsSize = 0;
    let pureMediaSize = 0;

    try {
      const keys = await localforage.keys();
      for (const key of keys) {
        try {
          const rawValue = await localforage.getItem(key);
          
          // 处理纯正的 ArrayBuffer
          if (rawValue instanceof ArrayBuffer) {
            pureMediaSize += rawValue.byteLength;
            continue;
          }

          // ✨ 新增：如果是数组，且里面装的是原生 File/Blob（比如通话背景老版本残留）
          if (Array.isArray(rawValue) && rawValue.length > 0 && (rawValue[0].file instanceof File || rawValue[0].file instanceof Blob)) {
            for (const item of rawValue) {
              if (item.file) pureMediaSize += (item.file.size || item.file.byteLength || 0);
            }
            continue;
          }

          // 正常的数据转字符串称重
          const str = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue);
          if (!str) continue;
          const bytes = new Blob([str]).size;

          const keyLower = key.toLowerCase();
          const isMsg = keyLower.includes('messages') || keyLower.includes('msgs');

          if (isMsg && Array.isArray(rawValue)) {
            for (const msg of rawValue) {
              if (!msg) continue;
              const msgStr = JSON.stringify(msg);
              const msgBytes = new Blob([msgStr]).size;
              if (msg.image && msg.image.length > 100) {
                mediaMsgSize += msgBytes;
              } else {
                textMsgSize += msgBytes;
              }
            }
          } else {
            // Base64 或外链图片
            if (typeof str === 'string' && str.length > 500 && /data:(image|video)\//i.test(str)) {
              pureMediaSize += bytes;
            } 
            // 带有 buffer 属性的字体对象
            else if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue) && rawValue.buffer instanceof ArrayBuffer) {
              pureMediaSize += rawValue.buffer.byteLength;
            } 
            // 剩下的纯文本设置
            else {
              settingsSize += bytes;
            }
          }
        } catch (itemErr) {
          console.warn('[dm3] 无法读取 key:', key, itemErr);
        }
      }
    } catch (e) {
      console.warn('[dm3] IndexedDB 遍历失败:', e);
    }

    // ✨ 补充：把单独存放在 IndexedDB 里的通话背景真实文件算进去
    if (window.CallBgDB && CallBgDB.db) {
      try {
        const tx = CallBgDB.db.transaction(CallBgDB.storeName, 'readonly');
        const store = tx.objectStore(CallBgDB.storeName);
        const request = store.openCursor();
        
        await new Promise((resolve) => {
          request.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              const file = cursor.value.file;
              if (file) {
                pureMediaSize += (file.size || file.byteLength || 0);
              }
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => resolve();
        });
      } catch (e) {
        // 如果独立 DB 还没初始化或者出错了，直接忽略，不影响主流程
      }
    }

    // 3. 统计 localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        const v = localStorage.getItem(k) || '';
        settingsSize += (k.length + v.length) * 2;
      }
    } catch (e) {
      console.warn('[dm3] localStorage 统计失败:', e);
    }

    // 4. 汇总计算
    const totalText = textMsgSize + settingsSize;
    const totalMedia = mediaMsgSize + pureMediaSize;
    const totalApp = totalText + totalMedia;

    // 5. 更新顶部的浏览器配额 UI
    const pct = quota > 0 ? Math.min(100, (usage / quota) * 100).toFixed(1) : 0;
    const sz = get('dm3-storage-size');
    if (sz) {
      sz.textContent = quota > 0 ? `${fmt(usage)} / ${fmt(quota)}` : `${fmt(usage)} (无法获取配额)`;
    }
    const bar = get('dm3-progress-fill');
    if (bar) {
      bar.style.width = pct + '%';
      if (pct > 90) {
        bar.style.background = 'linear-gradient(90deg, #FF3B30, #FF6B6B)';
      } else if (pct > 75) {
        bar.style.background = 'linear-gradient(90deg, #FF9500, #FFCC00)';
      }
    }

    // 6. 更新下面三个小框的数字
    const m = get('dm3-stat-msgs');
    if (m) m.textContent = fmt(totalText);
    const med = get('dm3-stat-media');
    if (med) med.textContent = fmt(totalMedia);
    /*const c = get('dm3-stat-cfg');
    const systemOverhead = Math.max(0, usage - totalApp);
    if (c) c.textContent = fmt(systemOverhead);*/
    const c = get('dm3-stat-cfg');
    // 既然图片和文字的统计可能会因为底层锁而不准，
    // 我们就把“算不明的差额”直接标记为底层开销，但不允许出现负数
    const calcAppTotal = totalText + totalMedia;
    const realOverhead = usage > calcAppTotal ? (usage - calcAppTotal) : 0;
    if (c) c.textContent = fmt(realOverhead);

    console.log(`[dm3] 精准统计: 纯文字=${fmt(textMsgSize)}, 文本设置=${fmt(settingsSize)}, 图片媒体=${fmt(totalMedia)}, 实际总占=${fmt(totalApp)} | 浏览器底层占用=${fmt(usage)}`);
  } catch (e) {
    console.error('[dm3] 统计失败:', e);
    const get = id => document.getElementById(id);
    const sz = get('dm3-storage-size');
    if (sz) sz.textContent = '统计失败';
    const bar = get('dm3-progress-fill');
    if (bar) bar.style.width = '0%';
  }
}


    /* ── Sync toggles ─────────────────────────────────────────────── */
    function syncToggles() {
        const n = document.getElementById('notif-permission-toggle');
        if (n) n.checked = localStorage.getItem('notifEnabled') === '1';
        const c = document.getElementById('call-enabled-toggle');
        if (c) c.checked = localStorage.getItem('callFeatureEnabled') !== 'false';
    }

    /* ── Force layout overrides (survive showModal rAF) ──────────── */
    function applyLayout(mc) {
        if (!mc) return;
        mc.style.setProperty('padding', '0', 'important');
        mc.style.setProperty('overflow', 'hidden', 'important');
        mc.style.setProperty('display', 'flex', 'important');
        mc.style.setProperty('flex-direction', 'column', 'important');
    }

    /* ── Rebuild ──────────────────────────────────────────────────── */
    function rebuild() {
        const modal = document.getElementById('data-modal');
        if (!modal) return;
        const mc = modal.querySelector('.modal-content');
        if (!mc || mc.dataset.dm3Built) return;
        mc.dataset.dm3Built = '1';
        mc.innerHTML = buildHTML();
        applyLayout(mc);
        syncToggles();
        updateStats();
        bindExportImportEvents(); 
    }

    /* ── Watch for open ───────────────────────────────────────────── */
    function watch() {
        const modal = document.getElementById('data-modal');
        if (!modal) return;
        new MutationObserver(() => {
            const d = modal.style.display;
            if (d === 'flex' || d === 'block') {
                rebuild();
                syncToggles();
                updateStats();
                setTimeout(() => applyLayout(modal.querySelector('.modal-content')), 40);
            }
        }).observe(modal, { attributes: true, attributeFilter: ['style'] });
    }

    /* ── Init ─────────────────────────────────────────────────────── */
    function init() {
        injectCSS();
        const go = () => { rebuild(); watch(); };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(go, 300));
        } else {
            setTimeout(go, 300);
        }
    }
    
function bindExportImportEvents() {
    // 聊天记录导出 (仅消息)
    const exportChatBtn = document.getElementById('export-chat-btn');
    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', () => {
            //if (typeof exportChatHistory === 'function') exportChatHistory(false); // 传入 false 表示仅聊天
            // else showNotification('功能暂不可用', 'error');
            if (typeof exportChatHistory === 'function') exportChatHistory(false); 
        });
    }

    // 全量备份导出 (所有数据，默认全选)
    const exportAllBtn = document.getElementById('export-all-settings');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', () => {
            //if (typeof exportChatHistory === 'function') exportChatHistory(true); // 传入 true 表示全量备份
            if (typeof exportFullBackup === 'function') exportFullBackup();
            else showNotification('功能暂不可用', 'error');
        });
    }
// --- 3. 导入 (智能识别) ---
    // 只需要一个导入按钮，函数会自动判断是新格式还是旧格式
    const importChatBtn = document.getElementById('import-chat-btn');
    const importAllBtn = document.getElementById('import-all-settings');

    const handleImportClick = () => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json,.zip';
        inp.onchange = e => {
            if (e.target.files[0]) {
                // 调用新的智能导入函数
                if (typeof importAnyBackup === 'function') importAnyBackup(e.target.files[0]);
            }
        };
        inp.click();
    };

    if (importChatBtn) importChatBtn.addEventListener('click', handleImportClick);
    if (importAllBtn) importAllBtn.addEventListener('click', handleImportClick);
     // ✅ 加上这一段
    const clearBtn = document.getElementById('clear-storage');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof clearAllAppData === 'function') clearAllAppData();
        });
    }

	// ================= 浏览器存储 FAQ 弹窗 =================
	const faqTrigger = document.getElementById('dm3-open-faq');
	if (faqTrigger) {
		faqTrigger.addEventListener('click', () => {
			// 如果已经打开了就忽略
			if (document.getElementById('dm3-faq-modal')) return;

			const overlay = document.createElement('div');
			overlay.id = 'dm3-faq-modal';
			overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:dm3FadeIn .2s ease;';
			
			// 定义 FAQ 列表（后续要加新问题，直接在这个数组里加对象就行）
			const faqList = [
        {
					q: '以下内容仅供参考，遇到站内问题还是建议及时反馈！',
					a: '本网站基于milk老师字卡网站二创，AI辅助撰写代码。<b>本网站内不含AI纯概率学</b>。修代码过程中难免出现bug，遇到问题欢迎在<b>小红书内 @苏铂潼 </b>进行反馈。'
				},
				{
					q: '关于“系统占用”',
					a: '删除图片或视频后，浏览器底层会保留“碎片文件”导致空间无法立刻释放。若“系统占用”数据持续过高，建议通过：<b>清除浏览器缓存</b>，或<b>全量备份导出 → 清除浏览器本站数据 → 重新导入</b>，即可腾出可用空间。'
				},
				{
					q: '关于“数据突然没了或网页自动刷新或闪退，或网页卡顿”',
					a: '通常是因为浏览器或手机的内存不足，无法同时处理大量数据（如加载页面、图片、聊天记录）导致的。手机或电脑的运行内存（RAM）被占满后，系统会自动关闭占用资源最高的应用，导致页面刷新或退出。这是浏览器的自我保护机制。建议<b>使用正常模式浏览或更换浏览器，并避免同时开太多标签页。</b>'
				},
				{
					q: '关于“milk网站导出数据的不兼容性或数据膨胀”',
					a: '因为导出的文件中可能包含了大量冗余数据（例如将所有图片直接编码为冗长的文本）。这会导致一个原本只有 20MB 的数据膨胀到 200MB。尝试导入这种臃肿文件时，浏览器内存极易被撑爆，从而导致页面卡顿或崩溃。建议<b>只导入由本站导出的备份文件。</b>'
				},
        {
					q: '关于“后台消息推送”',
					a: '即使你开启了浏览器通知权限，网页要在后台发通知，必须依赖一项叫 Service Worker（后台服务）的技术。但目前的安卓系统和手机厂商（如华为、小米、OPPO等）为了防止流氓软件，不仅会杀后台，还会在系统底层直接拦截浏览器的这种后台唤醒行为。这就导致即使权限全开，系统也会把网页发通知的动作“静默拦截”掉。如果你想收到通知，建议<b>使用电脑浏览器访问，或更换为对后台支持更友好的手机浏览器</b>。'
				},
        {
					q: '关于“进不去本网站”',
					a: '这是因为网站托管在GitHub Pages上，该平台在全球的访问稳定性会受地区网络环境影响。部分网络环境下，可能会遇到页面加载失败等问题。如果无法打开本网站，建议<b>尝试切换网络（如使用移动数据）、更换浏览器</b>，或稍后再试。'
				},
			];

		// 拼装 HTML 内容
			let faqHtml = '';
			faqList.forEach(item => {
				faqHtml += `
					<div style="margin-bottom:16px;">
						<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
							<i class="fas fa-lightbulb" style="color:var(--accent-color);margin-top:3px;font-size:12px;flex-shrink:0;"></i>
							<div style="font-size:13.5px;font-weight:700;color:var(--text-primary);line-height:1.4;">${item.q}</div>
						</div>
						<div style="font-size:12.5px;color:var(--text-secondary);line-height:1.65;padding-left:20px;opacity:.85;">${item.a}</div>
					</div>
				`;
			});

			overlay.innerHTML = `
				<div style="background:var(--primary-bg);border-radius:20px;width:100%;max-width:420px;max-height:75dvh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden;">
					<div style="padding:18px 20px 14px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:12px;flex-shrink:0;">
						<div style="width:36px;height:36px;border-radius:12px;background:rgba(255,159,10,.12);display:flex;align-items:center;justify-content:center;color:#FF9F0A;font-size:15px;flex-shrink:0;">
							<i class="fas fa-book-open"></i>
						</div>
						<div style="flex:1;font-size:16px;font-weight:800;color:var(--text-primary);">浏览器常见问题</div>
						<button id="dm3-faq-close" style="width:30px;height:30px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">
							<i class="fas fa-times"></i>
						</button>
					</div>
					<div style="flex:1;overflow-y:auto;padding:18px 20px 20px;-webkit-overflow-scrolling:touch;">
						${faqHtml}
					</div>
				</div>
			`;

			document.body.appendChild(overlay);

			// 绑定关闭事件
			const closeBtn = document.getElementById('dm3-faq-close');
			const closeModal = () => {
				overlay.style.opacity = '0';
				overlay.style.transition = 'opacity .15s';
				setTimeout(() => overlay.remove(), 150);
			};
			closeBtn.addEventListener('click', closeModal);
			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) closeModal();
			});
		});
	}

}

    init();
})();
