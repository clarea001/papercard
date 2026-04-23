/** * board-v2.js - 双向线程留言板 (绝对隔离引擎版) */
(function() {
'use strict';

const STORAGE_KEY = 'boardDataV2';
let currentView = 'me';
let currentThreadId = null;
let currentComposeMode = null;
let currentComposeType = null;
let selectedImage = null;
let isMultiSelectMode = false;
let selectedThreadIds = new Set();


// --- 完全隔离的底层数据与配置 ---
let boardData = {
  myThreads: [], partnerThreads: [], boardReplyPool: [],unreadPartnerCount: 0, // <--- 加上这句
  settings: {
    autoPostEnabled: false, nextAutoPostTime: 0
  }
};

// --- 工具函数 ---
function genId() { return 'v2_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); }
function formatTime(ts) { return new Date(ts).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function getUniqueShuffled(arr, count) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  const unique = [], seen = new Set();
  for(const s of shuffled) { if(!seen.has(s)) { unique.push(s); seen.add(s); } if(unique.length >= count) break; }
  return unique;
}

// 强制把最新的主回复库同步给留言板，解决删除不同步的问题
function syncReplyPool() {
  if (typeof customReplies !== 'undefined') {
    boardData.boardReplyPool = [...customReplies];
    saveData(); // 存进本地，防止刷新页面后又变回老数据
  }
}


async function loadData() {
    try {
        const saved = await localforage.getItem(STORAGE_KEY);
        if (saved) boardData = { ...boardData, ...saved };
        
        // === 核心修复：精准吞噬老版 board.js 的 outbox/inbox 数据 ===
        if (boardData.myThreads.length === 0 && boardData.partnerThreads.length === 0) {
            const count = await migrateOldBoardData();
            if (count > 0 && typeof showNotification === 'function') {
                showNotification(`已完美恢复 ${count} 条老留言记录`, 'success', 4000);
            }
        }

        if (boardData.boardReplyPool.length === 0 && typeof customReplies !== 'undefined' && customReplies.length > 0) {
            boardData.boardReplyPool = JSON.parse(JSON.stringify(customReplies));
            await saveData();
        }
        window.boardDataV2 = boardData;
    } catch(e) {
        console.warn('BoardV2 load error', e);
    }
}

// === 专门针对老版 board.js 的无损迁移函数 ===
async function migrateOldBoardData() {
    try {
        // 1. 在 localforage 里捞出带有 envelopeData 的老键
        const keys = await localforage.keys();
        const oldKey = keys.find(k => k.includes('envelopeData'));
        if (!oldKey) return 0;

        const oldData = await localforage.getItem(oldKey);
        if (!oldData) return 0;

        const outbox = (oldData.outbox || []).filter(l => l.content); // 过滤掉空内容
        const inbox = oldData.inbox || [];
        if (outbox.length === 0) return 0;

        console.log(`[BoardV2] 扫描到老版留言：${outbox.length} 条发件，${inbox.length} 条回复，开始拼接...`);

        // 2. 把老版的信件，1对1 拼成新版的“对话线程”
        outbox.forEach(letter => {
            const newThread = {
                id: letter.id || genId(),
                starter: 'me',
                createdAt: letter.sentTime || Date.now(),
                replies: [{
                    id: 'old_m_' + (letter.id || genId()),
                    sender: 'me',
                    text: letter.content,
                    image: null,
                    sticker: null,
                    timestamp: letter.sentTime || Date.now()
                }]
            };

            // 找到这封信对应的回复 (通过 refId 匹配)
            const matchedReply = inbox.find(r => r.refId === letter.id);
            if (matchedReply) {
                newThread.replies.push({
                    id: 'old_p_' + (matchedReply.id || genId()),
                    sender: 'partner',
                    text: matchedReply.content,
                    image: null,
                    sticker: null,
                    timestamp: matchedReply.receivedTime || Date.now()
                });
                // 如果老版标记了 isNew，新版也加上未读星星
                if (matchedReply.isNew) {
                    newThread.unread = true;
                }
            } else if (letter.status === 'pending' && letter.replyTime) {
                // 如果老版还在等回复，把老版的倒计时直接接过来
                newThread.expectedReplyTime = letter.replyTime;
            }

            boardData.myThreads.push(newThread);
        });

        // 3. 存入新版数据库
        await saveData();
        return outbox.length;
    } catch (e) {
        console.error('[BoardV2] 老版数据迁移出错:', e);
        return 0;
    }
}

async function saveData() { try { await localforage.setItem(STORAGE_KEY, boardData);window.boardDataV2 = boardData; } catch(e) { console.warn('BoardV2 save error', e); } }

// --- 核心：绝对时间锚点引擎 ---
function checkStatus() {
  const now = Date.now();
  syncReplyPool();
  //let needRefreshList = false;
  const processReplies = (threads) => {
    threads.forEach(thread => {
      if (!thread.expectedReplyTime && thread.replies.length > 0) {
        const last = thread.replies[thread.replies.length - 1];
        if (last.sender === 'me') {
          thread.expectedReplyTime = last.timestamp + ((6 + Math.random() * 6) * 3600 * 1000);
          saveData();
          
        }
      }
      if (thread.expectedReplyTime && now >= thread.expectedReplyTime) {
        const myLastReply = [...thread.replies].reverse().find(r => r.sender === 'me');
        if (myLastReply && !myLastReply.liked && Math.random() < 0.35) {
          myLastReply.liked = true;
        }
        const reply = generatePartnerReply();
        if (reply) {
          thread.replies.push(...reply); delete thread.expectedReplyTime; thread.unread = true; // 标记这条留言有未读回复
          saveData();
          if (currentThreadId === thread.id) setTimeout(() => openDetail(thread.id, currentView), 1000);
          //else needRefreshList = true;
        }
      }
    });
  };
    processReplies(boardData.myThreads);
    processReplies(boardData.partnerThreads);
  //if (needRefreshList && document.getElementById('envelope-board-modal')?.style.display === 'flex') switchTab(currentView);
      if (boardData.settings.autoPostEnabled && (typeof settings === 'undefined' || settings.boardPartnerWriteEnabled)) {
        if (!boardData.settings.nextAutoPostTime || now >= boardData.settings.nextAutoPostTime) {
          boardData.settings.nextAutoPostTime = now + (4 * 3600 * 1000);
          saveData();
          
          console.log("[主动留言] 骰子掷出..."); // 加这句
          if (Math.random() < 0.2) {
            const reply = generatePartnerReply();
            console.log("[主动留言] 生成结果:", reply ? "成功" : "被拦截(null)"); // 加这句
            if (reply) {
              //boardData.partnerThreads.push({ id: genId(), starter: 'partner', createdAt: now, replies: reply });
              boardData.partnerThreads.push({ id: genId(), starter: 'partner', createdAt: now, replies: reply, unread: true });
              // --- 新增：提示逻辑 ---
              // 2. 页面内轻提示（你正看网页时能看到的）
              if (typeof showNotification === 'function') {
                const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
                showNotification(partnerName + '在留言板写了新内容', 'info', 2000);
              }
              // 3. 切到后台时的系统通知
              if (typeof window._sendPartnerNotification === 'function') {
                const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
                window._sendPartnerNotification('留言板新动态', partnerName + '给你留了言');
              }
              // --- 提示逻辑结束 ---

              saveData();
              if (currentView === 'partner') switchTab('partner');
            }
          }
        }
      }

}


function generatePartnerReply() {
    const pool = boardData.boardReplyPool;

    const stickers = (typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) ? [...stickerLibrary] : [];
    const emojis = (typeof customEmojis !== 'undefined' && customEmojis.length > 0) ? [...customEmojis] : [];
    if (pool.length === 0 && stickers.length === 0) return null;

    // 1. 拆分出句子（按标点符号断句，保留标点）
    const count = 8 + Math.floor(Math.random() * 5);
    const uniquePool = getUniqueShuffled(pool, count);
    const punctuations = ['。', '！', '…', '～', '，', '、'];
    const rawSentences = uniquePool.map(s => s + punctuations[Math.floor(Math.random() * punctuations.length)]);

    // 2. 先决定这一条留言带不带表情包（必须放在前面，因为后面算 Emoji 配额要用到）
    let pickedStickers = [];
    if (stickers.length > 0 && Math.random() < 0.35) {
        const stickerCount = Math.random() < 0.5 ? 1 : 2;
        pickedStickers = getUniqueShuffled(stickers, stickerCount);
    }

    // 3. 留言板专属 Emoji 策略（模拟活人打字节奏）
    let finalText = '';
    const hasStickers = pickedStickers.length > 0;
    // 决定这一整段留言里，最多能加几个 Emoji（有表情包就最多1个，没有就最多4个）
    const maxEmoji = hasStickers ? 1 : 3; 
    let usedEmoji = 0;

    // 70% 概率开启“加表情模式”
    if (emojis.length > 0 && Math.random() < 0.7) {
        // 遍历所有句子，随机决定哪一句加表情
        rawSentences.forEach((sentence) => {
            finalText += sentence;
            
            // 如果还没用完配额，这一句有 35% 的机会获得 Emoji
            if (usedEmoji < maxEmoji && Math.random() < 0.35) {
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                finalText += emoji;
                usedEmoji++;
            }
        });
    } else {
        // 没触发表情模式，纯文字拼接
        finalText = rawSentences.join('');
    }

    // 4. 统一合并成【唯一的】一条回复消息
    const replyObj = { 
        id: genId(), 
        sender: 'partner', 
        text: finalText, 
        image: null, 
        sticker: null, 
        stickers: pickedStickers, 
        timestamp: Date.now() 
    };
    return [replyObj]; 
}


function initModals() {
  // 全部静态写在 index.html 了，只绑定事件
  bindStaticEvents();
}

function bindStaticEvents() {
  // --- 列表层 ---
  document.getElementById('board-list-close-btn').onclick = () => hideModal(document.getElementById('envelope-board-modal'));
  //document.getElementById('board-export-btn').onclick = () => window._bv2_exportTxt(currentView);
// 把原来的导出按钮事件删掉，换成这个
document.getElementById('board-export-btn').onclick = () => {
    isMultiSelectMode = true;
    selectedThreadIds.clear();
    switchTab(currentView); // 刷新列表，触发多选样式
};

// 绑定多选操作栏的按钮
/*document.getElementById('board-cancel-select-btn').onclick = exitMultiSelectMode;
document.getElementById('board-select-all-btn').onclick = () => {
    const threads = currentView === 'me' ? boardData.myThreads : boardData.partnerThreads;
    threads.forEach(t => selectedThreadIds.add(t.id));
    switchTab(currentView);
};*/
/*document.getElementById('board-confirm-select-btn').onclick = () => {
    if (selectedThreadIds.size === 0) {
        if(typeof showNotification === 'function') showNotification('请至少选择一条留言', 'warning');
        return;
    }
    document.getElementById('board-format-modal').style.display = 'flex';
};*/
/*document.getElementById('board-confirm-select-btn').onclick = () => {
    if (selectedThreadIds.size === 0) {
        if(typeof showNotification === 'function') showNotification('请至少选择一条留言', 'warning');
        return;
    }
    // 不要用 style.display，用系统原生的弹窗函数，防止 DOM 找不到
    if (typeof showModal === 'function') {
        showModal(document.getElementById('board-format-modal'));
    } else {
        document.getElementById('board-format-modal').style.display = 'flex';
    }
};*/
document.getElementById('final-export-cancel').onclick = () => {
    document.getElementById('board-format-modal').style.display = 'none';
};
/*document.getElementById('final-export-txt').onclick = () => {
    document.getElementById('board-format-modal').style.display = 'none';
    window._bv2_exportSelected('txt'); 
};
document.getElementById('final-export-img').onclick = () => {
    document.getElementById('board-format-modal').style.display = 'none';
    window._bv2_exportSelected('img');
};*/

  document.getElementById('board-new-post-btn').onclick = () => window._bv2_openCompose('new', null, 'me');

  // --- 详情层 ---
  document.getElementById('board-detail-back-btn').onclick = () => {
    hideModal(document.getElementById('board-detail-modal'));
    showModal(document.getElementById('envelope-board-modal'));
  };
  document.getElementById('board-global-edit-btn').onclick = () => window._bv2_toggleGlobalEdit();
  document.getElementById('board-delete-thread-btn').onclick = () => {
    if (currentThreadId) window._bv2_deleteThread(currentThreadId, currentView);
  };
  document.getElementById('board-edit-cancel-btn').onclick = () => window._bv2_cancelGlobalEdit();
  document.getElementById('board-edit-save-btn').onclick = () => window._bv2_saveGlobalEdit();

  // --- 撰写层 ---
  /*document.getElementById('board-compose-close-btn').onclick = () => {
    hideModal(document.getElementById('board-compose-modal'));
    showModal(document.getElementById('board-detail-modal'));
  };
  document.getElementById('board-compose-cancel-btn').onclick = () => {
    hideModal(document.getElementById('board-compose-modal'));
    showModal(document.getElementById('board-detail-modal'));
  };*/
  document.getElementById('board-compose-close-btn').onclick = () => {
      hideModal(document.getElementById('board-compose-modal'));
      // 如果不是从详情页进来的（即新建留言），就回列表；否则回详情
      if (!window._bv2_composeFromDetail) {
          showModal(document.getElementById('envelope-board-modal'));
      } else {
          showModal(document.getElementById('board-detail-modal'));
      }
  };
  document.getElementById('board-compose-cancel-btn').onclick = () => {
      hideModal(document.getElementById('board-compose-modal'));
      // 同样的判断逻辑
      if (!window._bv2_composeFromDetail) {
          showModal(document.getElementById('envelope-board-modal'));
      } else {
          showModal(document.getElementById('board-detail-modal'));
      }
  };

  document.getElementById('board-compose-send-btn').onclick = () => window._bv2_submitPost();
  document.getElementById('bv2-compose-img-input').onchange = (e) => window._bv2_handleImgSelect(e);

  // --- 图片操作框事件 ---
  document.getElementById('board-img-action-cancel').onclick = () => hideModal(document.getElementById('board-img-action-modal'));
  document.getElementById('board-img-replace-action').onclick = () => {
    hideModal(document.getElementById('board-img-action-modal'));
    if (window._bv2_pendingImgId) {
      document.getElementById('bv2-detail-img-input').click();
    }
  };
  document.getElementById('board-img-delete-action').onclick = () => {
    hideModal(document.getElementById('board-img-action-modal'));
    if (window._bv2_pendingImgId && confirm('确定要删除这张图片吗？')) {
      if (!window._bv2_imgEdits) window._bv2_imgEdits = {};
      window._bv2_imgEdits[window._bv2_pendingImgId] = { action: 'delete' };
      const imgEl = document.getElementById(`bv2-img-${window._bv2_pendingImgId}`);
      if (imgEl) imgEl.style.display = 'none';
      window._bv2_pendingImgId = null;
    }
  };

  // --- 详情页替换图片用的文件选择器 ---
  document.getElementById('bv2-detail-img-input').onchange = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    let base64 = '';
    if (typeof optimizeImage === 'function') {
      base64 = await optimizeImage(file);
    } else {
      base64 = await new Promise(resolve => {
        const r = new FileReader();
        r.onload = ev => resolve(ev.target.result);
        r.readAsDataURL(file);
      });
    }
    if (window._bv2_pendingImgId) {
      if (!window._bv2_imgEdits) window._bv2_imgEdits = {};
      window._bv2_imgEdits[window._bv2_pendingImgId] = { action: 'replace', data: base64 };
      const imgEl = document.querySelector(`#bv2-img-${window._bv2_pendingImgId} img`);
      if (imgEl) imgEl.src = base64;
      window._bv2_pendingImgId = null;
    }
    e.target.value = '';
  };
}


window.renderEnvelopeBoard = async function() {
    await loadData();
    syncReplyPool();
    initModals();
    // 如果关了主动写留言板，且当前在对方界面，强制切回我的
    if (!(typeof settings !== 'undefined' && settings.boardPartnerWriteEnabled) && currentView === 'partner') {
        currentView = 'me';
    }
    switchTab(currentView);
  // 优雅地打开原系统的弹窗
  const modal = document.getElementById('envelope-board-modal') || document.getElementById('envelope-modal');
  if (modal && typeof showModal === 'function') showModal(modal);
};

function switchTab(type) {
    // 🌟 终极极简版：彻底解绑！按钮永远显示，绝不拦截跳转！
    // canAutoPost 只用来控制后台要不要偷偷生成新留言，跟界面显示一刀两断
    const canAutoPost = typeof settings !== 'undefined' && settings.boardPartnerWriteEnabled;

    currentView = type;
    const isMe = type === 'me';
    const threads = isMe ? boardData.myThreads : boardData.partnerThreads;
    const myName = (typeof settings !== 'undefined' && settings.myName) || '我';
    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';

    // --- 标签区 ---
    const tabArea = document.getElementById('board-tab-area');
    // 永远无条件渲染这两个按钮
    tabArea.innerHTML = `
    <div style="display:flex; gap:8px; align-items:center;">
        <button class="board-tab-btn ${isMe ? 'active' : ''}" data-tab="me" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border-color); background:${isMe ? 'var(--accent-color)' : 'transparent'}; color:${isMe ? '#fff' : 'var(--text-secondary)'}; font-size:12px; font-weight:600; cursor:pointer; position:relative;">
            ${myName}${boardData.myThreads.some(t => t.unread) ? '<span style="position:absolute;top:-6px;right:-6px;font-size:14px;">✨</span>' : ''}
        </button>
        <button class="board-tab-btn ${!isMe ? 'active' : ''}" data-tab="partner" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border-color); background:${!isMe ? 'var(--accent-color)' : 'transparent'}; color:${!isMe ? '#fff' : 'var(--text-secondary)'}; font-size:12px; font-weight:600; cursor:pointer; position:relative;">
            ${partnerName}${boardData.partnerThreads.some(t => t.unread) ? '<span style="position:absolute;top:-6px;right:-6px;font-size:14px;">✨</span>' : ''}
        </button>
    </div>`;
    /*tabArea.querySelectorAll('[data-tab]').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });*/
    tabArea.querySelectorAll('[data-tab]').forEach(btn => {
        btn.onclick = () => {
            if (isMultiSelectMode) exitMultiSelectMode(); // <--- 加上这句
            switchTab(btn.dataset.tab);
        };
    });


  // --- 列表内容 ---
    const listBody = document.getElementById('board-list-body');
    const listFooter = document.getElementById('board-list-footer');
    if (threads.length === 0) {
      listBody.innerHTML = `<div class="board-empty"><i class="fas fa-sticky-note"></i><p>${isMe ? '还没有留言' : 'Ta还没有主动留言'}</p></div>`;
    } else {
      listBody.innerHTML = threads.slice().reverse().map(t => {
        const last = t.replies[t.replies.length - 1];
        let statusText = '等待回复', statusClass = 'pending';
        if (last && ((isMe && last.sender === 'partner') || (!isMe && last.sender === 'me'))) {
          statusText = '已回复'; statusClass = 'replied';
        }
        const preview = t.replies[0] ? (t.replies[0].image ? '🖼 图片留言' : escapeHtml((t.replies[0].text || '').substring(0, 40))) : '';
        const unreadStar = t.unread ? '<span style="position:absolute;top:12px;right:12px;font-size:14px;z-index:2;">✨</span>' : '';
        //return `<div class="board-card" data-thread-id="${t.id}" style="position:relative;cursor:pointer;">${unreadStar}<div class="board-card-top-line"></div><div class="board-card-body"><div class="board-card-preview">${preview}</div><div class="board-card-meta"><span class="board-card-date">${formatTime(t.createdAt)}</span><span class="board-card-status ${statusClass}">${statusText}</span></div></div></div>`;
        return `<div class="board-card" data-thread-id="${t.id}" style="position:relative;cursor:pointer;${isMultiSelectMode && selectedThreadIds.has(t.id) ? 'border:2px solid var(--accent-color);' : ''}">${unreadStar}<div class="board-card-top-line"></div><div class="board-card-body"><div class="board-card-preview">${preview}</div><div class="board-card-meta"><span class="board-card-date">${formatTime(t.createdAt)}</span><span class="board-card-status ${statusClass}">${statusText}</span></div></div></div>`;

      }).join('');
      // 自己绑定点击事件，不再依赖 HTML 的 onclick
      listBody.querySelectorAll('[data-thread-id]').forEach(card => {
          card.onclick = () => {
              const tid = card.dataset.threadId;
              if (isMultiSelectMode) {
                  // --- 核心攻克：确保多选池子被真正激活 ---
                  if (!selectedThreadIds) selectedThreadIds = new Set();
                  if (selectedThreadIds.has(tid)) selectedThreadIds.delete(tid);
                  else selectedThreadIds.add(tid);
                  // --- 攻克结束 ---
                  switchTab(currentView);
              } else {
                  openDetail(tid, currentView);
              }
          };
      });
    }

    // --- 底部按钮 ---
    //listFooter.style.display = isMe ? '' : 'none';
    // 找到原本的 listFooter.style.display = isMe ? '' : 'none';
// 替换成下面这段：
const newPostBtn = document.getElementById('board-new-post-btn');
const multiBar = document.getElementById('board-multi-select-bar');
if (isMultiSelectMode) {
    newPostBtn.style.display = 'none';
    multiBar.style.display = 'flex';
    document.getElementById('board-selected-count').textContent = `已选 ${selectedThreadIds.size} 条`;
} else {
    newPostBtn.style.display = isMe ? 'flex' : 'none';
    multiBar.style.display = 'none';
}

  }

function openDetail(threadId, type) {
    currentThreadId = threadId;
    const threads = type === 'me' ? boardData.myThreads : boardData.partnerThreads;
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    if (thread.unread) {
      thread.unread = false; saveData();
      if (document.getElementById('envelope-board-modal')?.style.display !== 'none') switchTab(currentView);
    }
    const myName = (typeof settings !== 'undefined' && settings.myName) || '我';
    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
    const isMe = type === 'me';
    restoreDetailViewUI();
    let bodyHtml = '';

    thread.replies.forEach((r, idx) => {
      const isSenderMe = r.sender === 'me';
      const isStarter = idx === 0;
      let cHtml = '';
      if (r.text) cHtml += `<div class="${isSenderMe ? 'board-user-text' : 'board-reply-text'}" id="bv2-text-${r.id}">${escapeHtml(r.text)}</div>`;
      if (r.image) cHtml += `<div id="bv2-img-${r.id}" class="${isSenderMe ? 'board-user-text' : 'board-reply-text'}" style="display:inline-block; position:relative; margin-bottom:8px;"><img src="${r.image}" style="max-width:150px;border-radius:8px;display:block;cursor:pointer;" onclick="viewImage('${r.image}')"></div>`;
      if (r.stickers && r.stickers.length > 0) {
          // 先用一个 position:relative 的盒子包住（用来给红线定位）
          cHtml += `<div style="position:relative; display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;margin-bottom:8px; padding-left:40px;">`;

          r.stickers.forEach(st => {
              cHtml += `<img src="${st}" style="max-width:120px; max-height:120px; border-radius:8px; object-fit:contain;">`;
          });
          cHtml += '</div>';
      }



      const sectionClass = isStarter ? 'board-user-section' : 'board-reply-section';
      const labelClass = isStarter ? 'board-user-label' : 'board-reply-label';
      const labelText = isStarter ? ' 的留言' : ' 的回复';
      const senderName = isSenderMe ? myName : partnerName;
      
      // 渲染当前这条消息
      bodyHtml += `<div class="${sectionClass}" id="bv2-section-${r.id}"><div class="${labelClass}">${senderName}${labelText}</div>${cHtml}</div>`;

      // 🌟 终极简化：所有淡字提示统一在这判断
      const isLast = idx === thread.replies.length - 1;
      const nextIsPartner = thread.replies[idx + 1]?.sender === 'partner';

      // 情况1：我看对方的留言板，我点赞了对方最新留言（显示在按钮上方）
      if (!isMe && isLast && r.sender === 'partner' && r.liked) {
        bodyHtml += `<div class="board-system-hint">${myName} 赞了 ${partnerName} 的留言</div>`;
      } 
      // 情况2：历史记录中，我点赞了对方，然后我回复了
      else if (!isMe && !isLast && r.sender === 'partner' && r.liked && thread.replies[idx + 1]?.sender === 'me') {
        bodyHtml += `<div class="board-system-hint">${myName} 赞了 ${partnerName} 的留言</div>`;
      }
      // 情况3：历史记录中，对方偷偷点赞了我，然后对方回复了
      else if (r.sender === 'me' && r.liked && nextIsPartner) {
        bodyHtml += `<div class="board-system-hint">${partnerName} 赞了 ${myName} 的留言</div>`;
      }
    });

    // 🌟 终极简化：底部按钮区
    const last = thread.replies[thread.replies.length - 1];
    let actionHtml = '';
    if (last) {
      if (!isMe && last.sender === 'partner') {
        actionHtml = `
        <div style="display:flex; align-items:center; gap:12px; margin-top:16px;">
          <button class="board-add-btn" id="board-reply-btn"><i class="fas fa-reply"></i> 回复</button>
          <button class="board-like-btn ${last.liked ? 'liked' : ''}" id="board-like-btn">
            <i class="${last.liked ? 'fas' : 'far'} fa-thumbs-up"></i> 
            <!--<span>${last.liked ? '已点赞' : '点赞'}</span>-->
          </button>
        </div>`;
      } else if (isMe && last.sender === 'partner') {
        actionHtml = `<button class="board-add-btn" style="margin-top:16px;" id="board-continue-btn"><i class="fas fa-pen"></i> 继续留言</button>`;
      } else {
        actionHtml = `<div class="board-waiting-reply" style="margin-top:16px;"><i class="fas fa-hourglass-half"></i> 等待回复中...</div>`;
      }
    }

    document.getElementById('board-detail-body').innerHTML = bodyHtml + actionHtml;
    document.getElementById('board-detail-date').textContent = new Date(thread.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    
    const continueBtn = document.getElementById('board-continue-btn');
    const replyBtn = document.getElementById('board-reply-btn');
    if (continueBtn) continueBtn.onclick = () => window._bv2_openCompose('continue', threadId, 'me');
    if (replyBtn) replyBtn.onclick = () => window._bv2_openCompose('reply', threadId, 'partner');

    // 🌟 终极简化：点赞事件只负责改样式和存数据，完全不管界面插字
    const likeBtn = document.getElementById('board-like-btn');
    if (likeBtn) {
      likeBtn.onclick = async () => {
        last.liked = !last.liked;
        // 点赞后直接重新渲染当前详情页，一切交给上面的逻辑去画，绝对不丢
        openDetail(threadId, type);
        if (last.liked && typeof showNotification === 'function') showNotification('已点赞', 'success', 1500);
        if (typeof window.setBoardDataV2 === 'function') window.setBoardDataV2(boardData);
      };
    }

    hideModal(document.getElementById('envelope-board-modal'));
    setTimeout(() => {
      showModal(document.getElementById('board-detail-modal'));
      const p = document.querySelector('.board-paper');
      if (p) p.scrollTop = p.scrollHeight;
    }, 100);
}

function openCompose(mode, threadId, type) {
  currentComposeMode = mode;
  currentThreadId = threadId;
  currentComposeType = type;
  window._bv2_composeFromDetail = (mode !== 'new'); 
  selectedImage = null;
  const titleMap = { new: '写新留言', continue: '继续留言', reply: '回复Ta' };
  document.getElementById('board-compose-title-text').textContent = titleMap[mode] || '写新留言';
  document.getElementById('bv2-compose-text').value = '';
  document.getElementById('bv2-img-hint').style.display = 'none';
  document.getElementById('bv2-compose-img-input').value = '';

  // ✅ 核心修复
  hideModal(document.getElementById('board-detail-modal'));
  setTimeout(() => {
    showModal(document.getElementById('board-compose-modal'));
    document.getElementById('bv2-compose-text')?.focus();
  }, 100);
}


function handleImgSelect(e) {
  const file = e.target.files[0]; if (!file) return;
  if (typeof optimizeImage === 'function') { optimizeImage(file).then(b => { selectedImage = b; document.getElementById('bv2-img-hint').style.display = 'inline'; }); }
  else { const r = new FileReader(); r.onload = ev => { selectedImage = ev.target.result; document.getElementById('bv2-img-hint').style.display = 'inline'; }; r.readAsDataURL(file); }
}

async function submitPost() {
  const text = document.getElementById('bv2-compose-text')?.value.trim() || '';
  if (!text && !selectedImage) {
    if(typeof showNotification === 'function') showNotification('内容不能为空', 'warning');
    return;
  }
  const newReply = { id: genId(), sender: 'me', text, image: selectedImage || null, sticker: null, timestamp: Date.now() };
  if (currentComposeMode === 'new') {
    boardData.myThreads.push({ id: genId(), starter: 'me', createdAt: Date.now(), replies: [newReply] });
  } else {
    const t = (currentComposeType === 'me' ? boardData.myThreads : boardData.partnerThreads).find(t => t.id === currentThreadId);
    if(t) { t.replies.push(newReply); delete t.expectedReplyTime; }
  }
  await saveData();
  checkStatus();
  
  // ✅ 核心修复
  hideModal(document.getElementById('board-compose-modal'));
  if(typeof showNotification === 'function') showNotification('发布成功', 'success');
  
  if (currentComposeMode === 'new') {
    switchTab(currentComposeType);
    showModal(document.getElementById('envelope-board-modal'));
  } else {
    setTimeout(() => openDetail(currentThreadId, currentComposeType), 100);
  }
}

  function findReplyById(id) {
    for (let t of boardData.myThreads) { const r = t.replies.find(x => x.id === id); if(r) return r; }
    for (let t of boardData.partnerThreads) { const r = t.replies.find(x => x.id === id); if(r) return r; }
    return null;
  }

  function editText(replyId) {
    const textEl = document.getElementById(`bv2-text-${replyId}`);
    if (!textEl || textEl.classList.contains('editing')) return;
    const originalText = textEl.textContent;
    textEl.contentEditable = true;
    textEl.classList.add('editing');
    textEl.focus();
    const range = document.createRange();
    range.selectNodeContents(textEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const section = document.getElementById(`bv2-section-${replyId}`);
    if (section && !section.querySelector('.board-edit-actions')) {
      const actions = document.createElement('div');
      actions.className = 'board-edit-actions';
      actions.innerHTML = `<button class="board-edit-btn cancel" onclick="window._bv2_cancelEdit('${replyId}')">取消</button><button class="board-edit-btn save" onclick="window._bv2_saveEdit('${replyId}')">保存</button>`;
      section.appendChild(actions);
    }
    textEl.dataset.originalText = originalText;
  }

  async function saveEdit(replyId) {
    const textEl = document.getElementById(`bv2-text-${replyId}`);
    if (!textEl) return;
    const newText = textEl.textContent.trim();
    if (!newText) { if(typeof showNotification === 'function') showNotification('内容不能为空', 'warning'); return; }
    const reply = findReplyById(replyId);
    if (reply) { reply.text = newText; await saveData(); if(typeof showNotification === 'function') showNotification('已保存', 'success'); }
    exitEditMode(replyId);
  }

  function cancelEdit(replyId) {
    const textEl = document.getElementById(`bv2-text-${replyId}`);
    if (!textEl) return;
    textEl.textContent = textEl.dataset.originalText || '';
    exitEditMode(replyId);
  }

  function exitEditMode(replyId) {
    const textEl = document.getElementById(`bv2-text-${replyId}`);
    if(textEl) { textEl.contentEditable = false; textEl.classList.remove('editing'); delete textEl.dataset.originalText; }
    const section = document.getElementById(`bv2-section-${replyId}`);
    if (section) { const actions = section.querySelector('.board-edit-actions'); if (actions) actions.remove(); }
  }

async function deleteThread(id, type) {
  if (!confirm('确定删除这条留言记录吗？')) return;
  if (type === 'me') boardData.myThreads = boardData.myThreads.filter(t => t.id !== id);
  else boardData.partnerThreads = boardData.partnerThreads.filter(t => t.id !== id);
  await saveData();
  
  // ✅ 核心修复
  hideModal(document.getElementById('board-detail-modal'));
  switchTab(type);
  showModal(document.getElementById('envelope-board-modal'));
  if(typeof showNotification === 'function') showNotification('已删除', 'success');
}

function exitMultiSelectMode() {
    isMultiSelectMode = false;
    selectedThreadIds.clear();
    switchTab(currentView);
}

function getSelectedThreads() {
    const allThreads = currentView === 'me' ? boardData.myThreads : boardData.partnerThreads;
    return allThreads.filter(t => selectedThreadIds.has(t.id));
}

function exportSelected(format) {
  document.getElementById('board-format-modal').style.display = 'none'; // <--- 加上这一句，点完就关掉选择框
    const selectedThreads = getSelectedThreads();
    if (selectedThreads.length === 0) return;
    
    exitMultiSelectMode(); // 导出后退出多选模式

    if (format === 'txt') {
        exportThreadsToTxt(selectedThreads);
    } else {
        exportThreadsToImg(selectedThreads);
    }
}

// 纯净版 TXT 导出（只导出选中的）
function exportThreadsToTxt(threads) {
    const myName = (typeof settings !== 'undefined' && settings.myName) || '我';
    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
    const isMe = currentView === 'me';
    let txt = `========================\n【${isMe ? '我的' : partnerName + '的'}留言板（部分导出）】\n========================\n\n`;
    
    threads.forEach(t => {
        t.replies.forEach((r, idx) => {
            txt += `[${new Date(r.timestamp).toLocaleString('zh-CN')}]\n${r.sender === 'me' ? myName : partnerName}: ${r.image ? '[图片]\n' : ''}${r.text || ''}\n`;
            const isLast = idx === t.replies.length - 1;
            const nextIsPartner = t.replies[idx + 1]?.sender === 'partner';
            if (!isMe && isLast && r.sender === 'partner' && r.liked) txt += `[系统提示] ${myName} 赞了 ${partnerName} 的留言\n`;
            else if (!isMe && !isLast && r.sender === 'partner' && r.liked && t.replies[idx + 1]?.sender === 'me') txt += `[系统提示] ${myName} 赞了 ${partnerName} 的留言\n`;
            else if (r.sender === 'me' && r.liked && nextIsPartner) txt += `[系统提示] ${partnerName} 赞了 ${myName} 的留言\n`;
        });
        txt += '------------------------\n\n';
    });
    
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `留言板记录-${new Date().toLocaleDateString()}.txt`;
    a.click();
    if(typeof showNotification === 'function') showNotification('TXT导出成功', 'success');
}

// 纯净版 图片导出（只导出选中的，保持留言板样式）
async function exportThreadsToImg(threads) {
    if (typeof html2canvas === 'undefined') {
        if(typeof showNotification === 'function') showNotification('缺少截图组件', 'warning');
        return;
    }
    if(typeof showNotification === 'function') showNotification('正在生成图片，请稍候...', 'info', 3000);

    const myName = (typeof settings !== 'undefined' && settings.myName) || '我';
    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
    const isMe = currentView === 'me';

        // 1. 像截图.js一样，提前算出真实颜色和背景
        const cs = getComputedStyle(document.documentElement);
        const realBg = cs.getPropertyValue('--primary-bg').trim() || '#ffffff';
        const realText = cs.getPropertyValue('--text-primary').trim() || '#1a1a1a';
        const realSec = cs.getPropertyValue('--text-secondary').trim() || '#7a7a7a';
        const realBorder = cs.getPropertyValue('--border-color').trim() || '#ebebeb';
        const accentRgb = cs.getPropertyValue('--accent-color-rgb').trim() || '197, 164, 126';
        const realAccent = cs.getPropertyValue('--accent-color').trim() || '#c5a47e';

        // 2. 建容器，只上一个纯色背景，干干净净
        const renderBox = document.createElement('div');
        renderBox.style.cssText = `
            position:fixed; left:-9999px; top:0; width:375px; padding:20px; z-index:-9999;
            background-color: ${realBg};
        `;
        document.body.appendChild(renderBox);
        // 3. 拼 HTML，卡片用 secondary-bg 稍微区分一下层次感
        let html = `<div style="text-align:center; font-size:16px; font-weight:bold; margin-bottom:16px; color:${realText};">${isMe ? '我的' : partnerName + '的'}留言板</div>`;
        
        threads.forEach(t => {
            // 留言卡片：加上 secondary-bg 的底色，看起来像一张张白纸
            html += `<div style="background-color:${cs.getPropertyValue('--secondary-bg').trim() || '#ffffff'}; border-radius:12px; padding:16px; margin-bottom:20px; border:1px solid${realBorder}; position:relative; overflow:hidden;">`;
            
            // 顶部保留那条彩色线，拉满仪式感
            html += `<div style="position:absolute; top:0; left:0; right:0; height:4px; background:${realAccent};"></div>`;
            
            

            t.replies.forEach((r, idx) => {
            const isSenderMe = r.sender === 'me';
            let cHtml = '';
            if (r.text) cHtml += `<div class="${isSenderMe ? 'board-user-text' : 'board-reply-text'}">${escapeHtml(r.text)}</div>`;
            if (r.image) cHtml += `<div id="bv2-img-${r.id}" class="${isSenderMe ? 'board-user-text' : 'board-reply-text'}" style="display:inline-block; position:relative; margin-bottom:8px;"><img src="${r.image}" style="max-width:150px;border-radius:8px;display:block;cursor:pointer;" onclick="viewImage('${r.image}')"></div>`;
            // 大概在 exportThreadsToImg 函数里面，找到这段：
            if (r.stickers && r.stickers.length > 0) {
                
                cHtml += `<div style="position:relative; display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;margin-bottom:8px; padding-left:40px;">`;

                r.stickers.forEach(st => {
                    cHtml += `<img src="${st}" style="max-width:120px; max-height:120px; border-radius:8px; object-fit:contain;">`;
                });
                cHtml += '</div>';
            }
            html += `<div class="${idx === 0 ? 'board-user-section' : 'board-reply-section'}"><div class="${idx === 0 ? 'board-user-label' : 'board-reply-label'}">${isSenderMe ? myName : partnerName}${idx === 0 ? ' 的留言' : ' 的回复'}</div>${cHtml}</div>`;
            
            const isLast = idx === t.replies.length - 1;
            const nextIsPartner = t.replies[idx + 1]?.sender === 'partner';
            if (!isMe && isLast && r.sender === 'partner' && r.liked) html += `<div class="board-system-hint">${myName} 赞了 ${partnerName} 的留言</div>`;
            else if (!isMe && !isLast && r.sender === 'partner' && r.liked && t.replies[idx + 1]?.sender === 'me') html += `<div class="board-system-hint">${myName} 赞了 ${partnerName} 的留言</div>`;
            else if (r.sender === 'me' && r.liked && nextIsPartner) html += `<div class="board-system-hint">${partnerName} 赞了 ${myName} 的留言</div>`;
        });
        html += `</div>`;
        html += `<div style="font-size:12px; color:${realSec}; margin-bottom:12px;text-align: right;">${new Date(t.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>`;
    });
    renderBox.innerHTML = html;

    // 3. 截图下载
    try {
        const canvas = await html2canvas(renderBox, {
            useCORS: true,      // 允许跨域图片（网络表情包）
            allowTaint: true,   // 允许绘制污染的画布（本地上传图）
            backgroundColor: null, 
            scale: 3, 
            logging: false 
        });
        const link = document.createElement('a');
        link.download = `留言板记录-${new Date().toLocaleDateString()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        if(typeof showNotification === 'function') showNotification('图片导出成功', 'success');
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('导出失败，可能存在跨域图片', 'warning');
    } finally {
        document.body.removeChild(renderBox);
    }
}


// 点击铅笔：全页面进入编辑，隐藏干扰按钮
window._bv2_toggleGlobalEdit = function() {
  const threads = currentView === 'me' ? boardData.myThreads : boardData.partnerThreads;
  const thread = threads.find(t => t.id === currentThreadId);
  if (!thread) return;
  const editBar = document.getElementById('board-edit-actions-bar');
  const penBtn = document.getElementById('board-global-edit-btn');
  const deleteBtn = document.getElementById('board-delete-thread-btn');
  if (editBar && editBar.style.display === 'flex') {
    window._bv2_saveGlobalEdit();
    return;
  }
  window._bv2_imgEdits = {};

  // 如果这条留言里有图片，在最上方加一行小字提示
  const hasImg = thread.replies.some(r => r.image);
  if (hasImg) {
    const hint = document.createElement('div');
    hint.id = 'bv2-img-edit-hint';
    hint.style.cssText = 'font-size:12px; color:var(--text-secondary); margin-bottom:12px; text-align:center;';
    hint.textContent = '点击图片可进行替换或删除';
    editBar.parentElement.insertBefore(hint, editBar);
  }

  // 1. 开启文本编辑
  thread.replies.forEach(r => {
    if (r.text) {
      const el = document.getElementById(`bv2-text-${r.id}`);
      if (el) {
        el.dataset.originalText = el.textContent;
        el.contentEditable = true;
        el.classList.add('editing');
      }
    }
  });

  // 2. 给图片绑定点击事件
  thread.replies.forEach(r => {
    if (r.image) {
      const imgWrapper = document.getElementById(`bv2-img-${r.id}`);
      const imgEl = imgWrapper ? imgWrapper.querySelector('img') : null;
      if (imgEl) {
        imgEl.dataset.origOnclick = imgEl.getAttribute('onclick');
        imgEl.removeAttribute('onclick');
        imgEl.style.cursor = 'pointer';
        imgEl.onclick = function(e) {
          e.stopPropagation();
          window._bv2_pendingImgId = r.id;
          //showModal(document.getElementById('board-img-action-modal'));
          document.getElementById('board-img-action-modal').style.display = 'flex';
        };
      }
    }
  });

  if (editBar) editBar.style.display = 'flex';
  if (penBtn) penBtn.style.display = 'none';
  if (deleteBtn) deleteBtn.style.display = 'none';
  const originalActions = document.querySelector('.board-paper-content > .board-add-btn, .board-paper-content > .board-waiting-reply');
  if (originalActions) originalActions.style.display = 'none';
};


window._bv2_saveGlobalEdit = async function() {
  const threads = currentView === 'me' ? boardData.myThreads : boardData.partnerThreads;
  const thread = threads.find(t => t.id === currentThreadId);
  if (!thread) return;
  let needSave = false;

  // 1. 存文本
  thread.replies.forEach(r => {
    if (r.text) {
      const el = document.getElementById(`bv2-text-${r.id}`);
      if (el && el.classList.contains('editing')) {
        const newText = el.textContent.trim();
        if (newText && newText !== r.text) { r.text = newText; needSave = true; }
        el.contentEditable = false;
        el.classList.remove('editing');
        delete el.dataset.originalText;
      }
    }
  });

    // 2. 存图片
  const edits = window._bv2_imgEdits || {};
  const hadImgChange = Object.keys(edits).length > 0; // ✅ 提前在这里判断！
  Object.keys(edits).forEach(replyId => {
    const reply = thread.replies.find(x => x.id === replyId);
    if (!reply) return;
    if (edits[replyId].action === 'delete' && reply.image) {
      reply.image = null;
      needSave = true;
    } else if (edits[replyId].action === 'replace' && edits[replyId].data) {
      reply.image = edits[replyId].data;
      needSave = true;
    }
  });

  window._bv2_imgEdits = {}; // ✅ 判断完之后再清空

  if (needSave) {
    await saveData();
    if(typeof showNotification === 'function') showNotification('修改已保存', 'success');
    // 图片有变动，刷新当前详情页让结构彻底干净
    if (hadImgChange) {
      openDetail(currentThreadId, currentView);
      return;
    }
  }
  restoreDetailViewUI();
};

window._bv2_cancelGlobalEdit = function() {
  const threads = currentView === 'me' ? boardData.myThreads : boardData.partnerThreads;
  const thread = threads.find(t => t.id === currentThreadId);
  if (!thread) return;

  // 1. 还原文本
  thread.replies.forEach(r => {
    if (r.text) {
      const el = document.getElementById(`bv2-text-${r.id}`);
      if (el && el.classList.contains('editing')) {
        el.textContent = el.dataset.originalText || r.text;
        el.contentEditable = false;
        el.classList.remove('editing');
        delete el.dataset.originalText;
      }
    }
  });

  // 2. 还原图片（恢复查看大图功能，重置显示状态）
  thread.replies.forEach(r => {
    if (r.image) {
      const imgWrapper = document.getElementById(`bv2-img-${r.id}`);
      const imgEl = imgWrapper ? imgWrapper.querySelector('img') : null;
      if (imgEl) {
        // 恢复原来的点击事件
        if (imgEl.dataset.origOnclick) {
          imgEl.setAttribute('onclick', imgEl.dataset.origOnclick);
          delete imgEl.dataset.origOnclick;
        }
        imgEl.onclick = null;
        imgEl.style.cursor = 'pointer';
        // 恢复被隐藏的图片
        imgWrapper.style.display = 'inline-block';
      }
    }
  });

  window._bv2_imgEdits = {};
  restoreDetailViewUI();
};

// 重写取消，清除图片编辑状态和蒙层
window._bv2_cancelGlobalEdit = function() {
  const threads = currentView === 'me' ? boardData.myThreads : boardData.partnerThreads;
  const thread = threads.find(t => t.id === currentThreadId);
  if (!thread) return;

  // 1. 还原文本
  thread.replies.forEach(r => {
    if (r.text) {
      const el = document.getElementById(`bv2-text-${r.id}`);
      if (el && el.classList.contains('editing')) {
        el.textContent = el.dataset.originalText || r.text;
        el.contentEditable = false;
        el.classList.remove('editing');
        delete el.dataset.originalText;
      }
    }
  });

  // 2. 移除图片蒙层，恢复透明度
  document.querySelectorAll('.img-edit-overlay').forEach(ov => ov.remove());
  thread.replies.forEach(r => {
    if (r.image) {
      const imgEl = document.getElementById(`bv2-img-${r.id}`);
      if (imgEl) { imgEl.style.opacity = '1'; imgEl.classList.remove('editing'); }
    }
  });

  // 3. 清空状态
  window._bv2_imgEdits = {};
  restoreDetailViewUI();
};

// 内部公用：恢复界面的默认状态
function restoreDetailViewUI() {
  const editBar = document.getElementById('board-edit-actions-bar');
  const penBtn = document.querySelector('.board-detail-actions .board-detail-action-btn:not(.delete)');
  const deleteBtn = document.querySelector('.board-detail-actions .board-detail-action-btn.delete');
  const originalActions = document.querySelector('.board-paper-content > .board-add-btn, .board-paper-content > .board-waiting-reply');
  if (editBar) editBar.style.display = 'none';
  if (penBtn) penBtn.style.display = 'flex';
  if (deleteBtn) deleteBtn.style.display = 'flex';
  if (originalActions) originalActions.style.display = '';
  // 移除图片编辑提示
  const hint = document.getElementById('bv2-img-edit-hint');
  if (hint) hint.remove();
}

// --- 对外只暴露入口和设置，其余全在墙内自己消化 ---
window.loadEnvelopeData = loadData;
window.checkEnvelopeStatus = checkStatus;
window.setBoardDataV2 = function(newData) {
    boardData = { ...boardData, ...newData };
    window.boardDataV2 = boardData;
    saveData();
};
window._bv2_openCompose = openCompose;
window._bv2_submitPost = submitPost;
window._bv2_handleImgSelect = handleImgSelect;
window._bv2_toggleGlobalEdit = function() { /* 保留原本复杂的逻辑在下面 */ };
window._bv2_saveGlobalEdit = function() { /* 保留原本复杂的逻辑在下面 */ };
window._bv2_cancelGlobalEdit = function() { /* 保留原本复杂的逻辑在下面 */ };
window._bv2_deleteThread = deleteThread;
window._bv2_exportSelected = exportSelected;
window._bv2_exitMultiSelectMode = exitMultiSelectMode;
window._bv2_doMultiSelect = function(action) {
    if (action === 'cancel') exitMultiSelectMode();
    else if (action === 'all') {
        const threads = currentView === 'me' ? boardData.myThreads : boardData.partnerThreads;
        threads.forEach(t => selectedThreadIds.add(t.id));
        switchTab(currentView);
    } else if (action === 'confirm') {
        if (selectedThreadIds.size === 0) {
            if(typeof showNotification === 'function') showNotification('请至少选择一条留言', 'warning');
            return;
        }
        document.getElementById('board-format-modal').style.display = 'flex';
    }
};


// --- 启动 ---
loadData().then(() => { setInterval(checkStatus, 60000); checkStatus(); });

})();
