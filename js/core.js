/**
 * core.js - Core Application Logic
 * 核心应用逻辑：数据加载/保存、消息渲染、会话管理等
 */

        function clearAllAppData() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
    overlay.innerHTML = `
        <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,80,80,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <i class="fas fa-trash-alt" style="color:#ff5050;font-size:20px;"></i>
                </div>
                <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">重置数据</div>
                <div style="font-size:12px;color:var(--text-secondary);">请选择要重置的范围</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button id="_reset_current" style="width:100%;padding:12px 16px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.2s;">
                    <i class="fas fa-comment-slash" style="color:var(--accent-color);font-size:15px;width:18px;text-align:center;"></i>
                    <span>仅清除当前会话消息</span>
                </button>
                <button id="_reset_all" style="width:100%;padding:12px 16px;border:1px solid rgba(255,80,80,0.3);border-radius:12px;background:rgba(255,80,80,0.06);color:#ff5050;font-size:13px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.2s;">
                    <i class="fas fa-bomb" style="font-size:15px;width:18px;text-align:center;"></i>
                    <span>重置所有数据（完全清空）</span>
                </button>
                <button id="_reset_cancel" style="width:100%;padding:10px 16px;border:none;border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;transition:all 0.2s;">取消</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    function closeDialog() { overlay.remove(); }
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
    document.getElementById('_reset_cancel').onclick = closeDialog;

    document.getElementById('_reset_current').onclick = () => {
        closeDialog();
        if (confirm('确定要清除当前会话的所有消息吗？此操作无法恢复！')) {
            messages = [];
            throttledSaveData();
            renderMessages();
            showNotification('当前会话消息已清除', 'success');
        }
    };

    document.getElementById('_reset_all').onclick = () => {
        closeDialog();
        if (confirm('【高危操作】确定要重置所有数据吗？此操作将清除所有本地数据且无法恢复！')) {
            window._skipBackup = true;
            messages = [];
            settings = {};
            localforage.clear().then(() => {
                localStorage.clear();
                showNotification('所有数据已重置，页面即将刷新', 'info', 2000);
                setTimeout(() => { window.location.href = window.location.pathname + '?reset=' + Date.now(); }, 2000);
            }).catch(e => {
                window._skipBackup = false;
                showNotification('清除数据时发生错误', 'error');
                console.error("清除 localforage 失败:", e);
            });
        }
    };
}


        function getDefaultSettings() {
            return {
                partnerName: "梦角",
                myName: "我",
                myStatus: "在线",
                partnerStatus: "在线",
                isDarkMode: false,
                colorTheme: "gold",
                soundEnabled: true,
                typingIndicatorEnabled: true,
                readReceiptsEnabled: true,
                replyEnabled: true,
                lastStatusChange: Date.now(),
                nextStatusChange: 1 + Math.random() * 7,
                fontSize: 16,
                bubbleStyle: 'standard',
                messageFontFamily: "'Noto Serif SC', serif",
                messageFontWeight: 400,
                messageLineHeight: 1.5,
                musicPlayerEnabled: false,
                replyDelayMin: 3000,
                replyDelayMax: 7000,
                inChatAvatarEnabled: true,
                inChatAvatarSize: 36,
                inChatAvatarPosition: 'center',
                alwaysShowAvatar: false,
                showPartnerNameInChat: false,
                customFontUrl: "", 
        customBubbleCss: "",
        customGlobalCss: "",
                myAvatarFrame: null, 
                partnerAvatarFrame: null,
                myAvatarShape: 'circle',
                partnerAvatarShape: 'circle',
autoSendEnabled: false,
autoSendInterval: 5,
        allowReadNoReply: false, 
        readNoReplyChance: 0.2,
        timeFormat: 'HH:mm',
        customSoundUrl: '',
        soundVolume: 0.15,
        bottomCollapseMode: false,
        emojiMixEnabled: true,
        enterToSendEnabled: false,
            };
        }


        function renderBackgroundGallery() {
            const list = document.getElementById('background-gallery-list');
            if (!list) return;

            list.innerHTML = '';

            
            const addBtn = document.createElement('div');
            addBtn.className = 'bg-item bg-add-btn';
            
            addBtn.innerHTML = '<i class="fas fa-plus"></i><span></span>';
            addBtn.onclick = () => document.getElementById('bg-gallery-input').click();
            list.appendChild(addBtn);

            const currentBg = safeGetItem(getStorageKey('chatBackground'));

            savedBackgrounds.forEach((bg, index) => {
                const item = document.createElement('div');
                let isActive = false;

                if (currentBg && currentBg === bg.value) isActive = true;

                item.className = `bg-item ${isActive ? 'active': ''}`;

                if (bg.type === 'image') {
                    item.innerHTML = `<img src="${bg.value}" loading="lazy" alt="bg">`;
                } else {
                    item.innerHTML = `<div class="bg-color-block" style="background: ${bg.value}"></div>`;
                }

                item.onclick = (e) => {
                    if (e.target.closest('.bg-delete-btn')) return;
                    applyBackground(bg.value);
                    safeSetItem(getStorageKey('chatBackground'), bg.value);
                    localforage.setItem(getStorageKey('chatBackground'), bg.value);
                    renderBackgroundGallery();
                    showNotification('背景已切换', 'success');
                };

                if (bg.id.startsWith('user-')) {
                    const delBtn = document.createElement('div');
                    delBtn.className = 'bg-delete-btn';
                    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    delBtn.title = "删除此背景";
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm('确定删除这张背景图吗？')) {
                            savedBackgrounds.splice(index, 1);
                            saveBackgroundGallery();

                            if (isActive) {
                                removeBackground(); 
                                renderBackgroundGallery();
                            } else {
                                renderBackgroundGallery();
                            }
                        }
                    };
                    item.appendChild(delBtn);
                }

                list.appendChild(item);
            });
        }



        function saveBackgroundGallery() {
    localforage.setItem(getStorageKey('backgroundGallery'), savedBackgrounds);
}


        const applyBackground = (value) => {
            if (!value || typeof value !== 'string') return;
            try {
                if (value.startsWith('linear-gradient') || value.startsWith('#') || value.startsWith('rgb')) {
                    document.documentElement.style.setProperty('--chat-bg-image', value);
                } else {
                    const cssValue = value.startsWith('url(') ? value : `url(${value})`;
                    document.documentElement.style.setProperty('--chat-bg-image', cssValue);
                }
                document.body.classList.add('with-background');
            } catch (e) {
                if (typeof removeBackground === 'function') removeBackground();
            }
        };


const loadData = async () => {
    try {
        settings = getDefaultSettings();
        
        const results = await Promise.allSettled([
            localforage.getItem(getStorageKey('chatSettings')),
            localforage.getItem(getStorageKey('chatMessages')),
            localforage.getItem(getStorageKey('backgroundGallery')),
            localforage.getItem(getStorageKey('customReplies')),
            localforage.getItem(getStorageKey('customPokes')),
            localforage.getItem(getStorageKey('customStatuses')),
            localforage.getItem(getStorageKey('customMottos')),
            localforage.getItem(getStorageKey('customIntros')),
            localforage.getItem(getStorageKey('anniversaries')),
            localforage.getItem(getStorageKey('stickerLibrary')),
            localforage.getItem(`${APP_PREFIX}customThemes`),
            localforage.getItem(getStorageKey('chatBackground')),
            localforage.getItem(getStorageKey('partnerAvatar')),
            localforage.getItem(getStorageKey('myAvatar')),
            localforage.getItem(getStorageKey('partnerPersonas')), 
            localforage.getItem(getStorageKey('showPartnerNameInChat')),
            localforage.getItem(`${APP_PREFIX}themeSchemes`),
            localforage.getItem(getStorageKey('myStickerLibrary')),
            localforage.getItem(getStorageKey('customReplyGroups')),
            localforage.getItem(getStorageKey('periodCareMessages')),
            localforage.getItem(getStorageKey('calendarEvents')),
            localforage.getItem(getStorageKey('wishingPoolData')),
        ]);
        const getVal = (index) => results[index].status === 'fulfilled' ? results[index].value : null;

        const savedSettings = getVal(0);
        const savedMessages = getVal(1);
        const savedBgGallery = getVal(2);
        const savedCustomReplies = getVal(3);
        const savedPokes = getVal(4);
        const savedStatuses = getVal(5);
        const savedMottos = getVal(6);
        const savedIntros = getVal(7);
        const savedAnniversaries = getVal(8);
        const savedStickers = getVal(9);
        const savedCustomThemes = getVal(10);
        const savedChatBg = getVal(11);
        const partnerAvatarSrc = getVal(12);
        const myAvatarSrc = getVal(13);
        const savedPartnerPersonas = getVal(14);
        const savedShowNameConfig = getVal(15);
        const savedThemeSchemes = getVal(16);
        const savedMyStickers = getVal(17);
        const savedReplyGroups = getVal(18);
        const savedPeriodCare = getVal(19); 
        const savedCalendarEvents = getVal(20);
        const savedWishingPool = getVal(21);


        if (savedWishingPool) wishingPoolData = savedWishingPool;
        if (savedCalendarEvents) calendarEvents = savedCalendarEvents;
        // 处理月经关怀消息
        if (savedPeriodCare) periodCareMessages = savedPeriodCare;
        if (savedPartnerPersonas) partnerPersonas = savedPartnerPersonas; 

        if (savedShowNameConfig !== null) {
            showPartnerNameInChat = savedShowNameConfig;
            document.body.classList.toggle('show-partner-name', showPartnerNameInChat);
        }

        // 检查消息数据完整性
        if (savedMessages && Array.isArray(savedMessages)) {
            // 检查每条消息是否有必要字段
            const validMessages = savedMessages.filter(m => 
                m && m.timestamp && (m.text || m.image)
            );
            
            if (validMessages.length !== savedMessages.length) {
                console.warn(`[loadData] 过滤了 ${savedMessages.length - validMessages.length} 条无效消息`);
            }
            
            messages = validMessages.map(m => ({ 
                ...m, 
                timestamp: new Date(m.timestamp) 
            }));
            
            // 检查是否有重复ID
            const ids = messages.map(m => m.id);
            const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
            if (duplicates.length > 0) {
                console.warn(`[loadData] 发现 ${duplicates.length} 个重复消息ID`);
                // 去重逻辑
                messages = messages.filter((m, index, self) =>
                    index === self.findIndex(t => t.id === m.id)
                );
            }
        }

        if (savedSettings) Object.assign(settings, savedSettings);
        if (settings.showPartnerNameInChat !== undefined) {
            showPartnerNameInChat = settings.showPartnerNameInChat;
            document.body.classList.toggle('show-partner-name', showPartnerNameInChat);
        }
        try {
            if (settings.customFontUrl) applyCustomFont(settings.customFontUrl);
            if (settings.customBubbleCss) applyCustomBubbleCss(settings.customBubbleCss);
            if (settings.customGlobalCss) applyGlobalThemeCss(settings.customGlobalCss);
        } catch(e) { console.warn("样式应用失败", e); }
        
        if (savedPokes) customPokes = savedPokes;
        else customPokes = [...CONSTANTS.POKE_ACTIONS];

        if (savedStatuses) customStatuses = savedStatuses;
        else customStatuses = [...CONSTANTS.PARTNER_STATUSES];

        if (savedMottos) customMottos = savedMottos;
        else customMottos = [...CONSTANTS.HEADER_MOTTOS];
        
        if (savedIntros) customIntros = savedIntros;
        else customIntros = CONSTANTS.WELCOME_ANIMATIONS.map(a => `${a.line1}|${a.line2}`);

        if (savedMessages && Array.isArray(savedMessages)) {
            messages = savedMessages.map(m => ({
                ...m, timestamp: new Date(m.timestamp)
            }));
        } else {
            const backup = _tryRecoverFromBackup();
            if (backup && Array.isArray(backup.messages) && backup.messages.length > 0) {
                const timeSince = Math.round((Date.now() - backup.ts) / 60000);
                console.warn(`[loadData] 主存储无消息，正在从备份恢复（备份时间：${timeSince} 分钟前）`);
                messages = backup.messages.map(m => ({
                    ...m, timestamp: new Date(m.timestamp)
                }));
                if (backup.settings) Object.assign(settings, backup.settings);
                if (backup.anniversaries && Array.isArray(backup.anniversaries)) {
                    anniversaries = backup.anniversaries;
                }
                setTimeout(() => saveData(), 1000);
                showNotification(
                    `已从备份恢复 ${messages.length} 条消息${backup._truncated ? '（备份为最近200条）' : ''}`,
                    'warning', 6000
                );
            } else {
                messages = [];
            }
        }

        if (savedBgGallery) {
            savedBackgrounds = savedBgGallery;
        } else {
            savedBackgrounds = [{ id: 'preset-1', type: 'color', value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }];
        }

        if (savedCustomReplies) customReplies = savedCustomReplies;
        if (savedReplyGroups) window.customReplyGroups = savedReplyGroups;
        if (savedAnniversaries) anniversaries = savedAnniversaries;
        if (savedStickers) stickerLibrary = savedStickers;
        if (savedMyStickers) myStickerLibrary = savedMyStickers;
        if (savedCustomThemes) customThemes = savedCustomThemes;
        if (savedThemeSchemes) themeSchemes = savedThemeSchemes;
        try { const ce = await localforage.getItem(getStorageKey('customEmojis')); if (ce && Array.isArray(ce)) customEmojis = ce; } catch(e) {}
        window._customReplies = customReplies;
        window._CONSTANTS = CONSTANTS;

        if (DOMElements && DOMElements.partner && DOMElements.me) {
            updateAvatar(DOMElements.partner.avatar, partnerAvatarSrc);
            updateAvatar(DOMElements.me.avatar, myAvatarSrc);
        }

        if (savedChatBg) {
            applyBackground(savedChatBg);
        } else {
            const lsBg = safeGetItem(getStorageKey('chatBackground'));
            if (lsBg) {
                applyBackground(lsBg);
                localforage.setItem(getStorageKey('chatBackground'), lsBg);
            }
        }

        try { await initMoodData(); } catch(e) { console.warn("心情数据加载失败", e); }
        try { await loadEnvelopeData(); } catch(e) { console.warn("留言板数据加载失败", e); }
        // 在 loadData() 函数中添加
        try { await initPeriodData(); } catch(e) { console.warn("月经数据加载失败", e); }


        displayedMessageCount = HISTORY_BATCH_SIZE;
        
        setTimeout(() => {
            applyAllAvatarFrames();
            manageAutoSendTimer(); 
            checkEnvelopeStatus(); 
            updateUI();
        }, 100);

    } catch (e) {
        console.error("LoadData 内部致命错误:", e);
        settings = getDefaultSettings();
        messages = [];
        updateUI();
    }
};

const LIBRARY_CONFIG = {
    reply: {
        title: "回复库管理",
        tabs: [
            { id: 'custom', name: '主字卡', mode: 'list' },
            { id: 'emojis', name: 'Emoji', mode: 'grid' },
            { id: 'stickers', name: '表情库', mode: 'grid' },
            { id: 'period', name: '月经关怀', mode: 'list' } 
        ]
    },
    atmosphere: {
        title: "氛围感配置",
        tabs: [
            { id: 'pokes', name: '拍一拍', mode: 'list' },
            { id: 'statuses', name: '对方状态', mode: 'list' },
            { id: 'mottos', name: '顶部格言', mode: 'list' },
            { id: 'intros', name: '开场动画', mode: 'list' }
        ]
    }
};
let currentAnnType = 'anniversary'; 

window.openMyStickerSettings = function() {
    const picker = document.getElementById('user-sticker-picker');
    if (picker) picker.classList.remove('active');
    if (typeof currentMajorTab !== 'undefined') {
        currentMajorTab = 'reply';
        currentSubTab = 'stickers';
    }
    var sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.major === 'reply'); });
    if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
    var modal = document.getElementById('custom-replies-modal');
    if (modal && typeof showModal === 'function') showModal(modal);
};

window.switchAnnType = function(type) {
    currentAnnType = type;
    currentAnniversaryType = type; 
    document.querySelectorAll('.ann-type-btn').forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const desc = document.getElementById('ann-type-desc');
    if(desc) {
        desc.textContent = type === 'anniversary' 
            ? '计算从过去某一天到现在已经过了多少天 (例如: 相识、恋爱)' 
            : '计算从现在到未来某一天还剩下多少天 (例如: 生日、跨年)';
    }
};

window.deleteAnniversaryItem = function(id) {
    if(confirm("确定要删除这条记录吗？")) {
        anniversaries = anniversaries.filter(a => a.id !== id);
        throttledSaveData(); 
        renderAnniversariesList();
        showNotification('已删除', 'success');
    }
};

const _BACKUP_PREFIX = 'BACKUP_V1_';
// 在 core.js 中修改 _backupCriticalData 函数
function _backupCriticalData() {
    if (window._skipBackup) return;
    
    // 确保备份的数据是完整的
    if (!messages || messages.length === 0) {
        console.warn('[backup] 消息为空，跳过备份');
        return;
    }
    
    try {
        const backupPayload = {
            ts: Date.now(),
            messages: messages.slice(-200), // 只备份最近200条，避免过大
            settings: settings,
            sessionId: SESSION_ID,
            anniversaries: anniversaries,
            version: '3.1'
        };
        
        const json = JSON.stringify(backupPayload);
        localStorage.setItem(_BACKUP_PREFIX + 'critical', json);
        localStorage.setItem(_BACKUP_PREFIX + 'timestamp', String(Date.now()));
        
        console.log(`[backup] 已备份 ${backupPayload.messages.length} 条消息`);
    } catch (e) {
        console.warn('[backup] 备份失败:', e);
        // 如果存储空间不足，尝试清理旧备份
        try {
            localStorage.removeItem(_BACKUP_PREFIX + 'critical');
            localStorage.removeItem(_BACKUP_PREFIX + 'timestamp');
        } catch (e2) {
            console.error('清理备份失败:', e2);
        }
    }
}


function _tryRecoverFromBackup() {
    try {
        const raw = localStorage.getItem(_BACKUP_PREFIX + 'critical');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

// core.js 中修改原来的 saveData 函数

const saveData = async () => {
  if (!SESSION_ID) {
    console.warn('[saveData] SESSION_ID 尚未初始化，跳过保存');
    return;
  }


  const promises = [
    { key: 'chatSettings', val: () => localforage.setItem(getStorageKey('chatSettings'), settings) },
    { key: 'customReplies', val: () => localforage.setItem(getStorageKey('customReplies'), customReplies) },
    { key: 'customReplyGroups', val: () => localforage.setItem(getStorageKey('customReplyGroups'), window.customReplyGroups || []) },
    { key: 'customEmojis', val: () => localforage.setItem(getStorageKey('customEmojis'), customEmojis) },
    { key: 'anniversaries', val: () => localforage.setItem(getStorageKey('anniversaries'), anniversaries) },
    { key: 'customPokes', val: () => localforage.setItem(getStorageKey('customPokes'), customPokes) },
    { key: 'customStatuses', val: () => localforage.setItem(getStorageKey('customStatuses'), customStatuses) },
    { key: 'customMottos', val: () => localforage.setItem(getStorageKey('customMottos'), customMottos) },
    { key: 'customIntros', val: () => localforage.setItem(getStorageKey('customIntros'), customIntros) },
    { key: 'stickerLibrary', val: () => localforage.setItem(getStorageKey('stickerLibrary'), stickerLibrary) },
    { key: 'myStickerLibrary', val: () => localforage.setItem(getStorageKey('myStickerLibrary'), myStickerLibrary) },
    { key: 'customThemes', val: () => localforage.setItem(`${APP_PREFIX}customThemes`, customThemes) },
    { key: 'themeSchemes', val: () => localforage.setItem(`${APP_PREFIX}themeSchemes`, themeSchemes) },
    { key: 'chatMessages', val: () => localforage.setItem(getStorageKey('chatMessages'), messages) },
    { key: 'periodCareMessages', val: () => localforage.setItem(getStorageKey('periodCareMessages'), periodCareMessages) },
    { key: 'calendarEvents', val: () => localforage.setItem(getStorageKey('calendarEvents'), calendarEvents) },
    { key: 'moodData', val: () => localforage.setItem(getStorageKey('moodData'), window.moodData) },
    { key: 'wishingPoolData', val: () => localforage.setItem(getStorageKey('wishingPoolData'), wishingPoolData) },
  ];

  const partnerAvatarSrc = (() => {
    try {
      const img = DOMElements.partner.avatar.querySelector('img');
      return img ? img.src : null;
    } catch (e) { return null; }
  })();
  const myAvatarSrc = (() => {
    try {
      const img = DOMElements.me.avatar.querySelector('img');
      return img ? img.src : null;
    } catch (e) { return null; }
  })();

  if (partnerAvatarSrc) {
    promises.push({ key: 'partnerAvatar', val: () => localforage.setItem(getStorageKey('partnerAvatar'), partnerAvatarSrc) });
  } else {
    promises.push({ key: 'partnerAvatar', val: () => localforage.removeItem(getStorageKey('partnerAvatar')) });
  }
  if (myAvatarSrc) {
    promises.push({ key: 'myAvatar', val: () => localforage.setItem(getStorageKey('myAvatar'), myAvatarSrc) });
  } else {
    promises.push({ key: 'myAvatar', val: () => localforage.removeItem(getStorageKey('myAvatar')) });
  }

  const results = await Promise.allSettled(promises.map(p => {
    try { return p.val(); }
    catch (e) { return Promise.reject(e); }
  }));

  const failed = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      failed.push(promises[i].key);
      console.error(`[saveData] 保存失败: ${promises[i].key}`, r.reason);
    }
  });

    if (failed.length > 0) {
        showNotification('部分数据保存失败，请检查存储空间', 'error');
        // 如果你保留了 showSaveStatus 函数，可以在这里保留错误提示
        if (typeof showSaveStatus === 'function') showSaveStatus('error');
    }
    
  _backupCriticalData();
};

        function initializeRandomUI() {
            const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];


            document.querySelector('.header-motto').textContent = getRandomItem(CONSTANTS.HEADER_MOTTOS);
if (customMottos && customMottos.length > 0) {
    document.querySelector('.header-motto').textContent = getRandomItem(customMottos);
} else {
    document.querySelector('.header-motto').textContent = '';
}
            const placeholder = "";
            DOMElements.messageInput.placeholder = placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder;


            const starsContainer = document.getElementById('stars-container');
            starsContainer.innerHTML = '';
            const starCount = 80;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                const size = Math.random() * 2.5 + 0.5;
                const duration = Math.random() * 4 + 2;
                const delay = Math.random() * 6;
                star.style.left = `${x}%`;
                star.style.top = `${y}%`;
                star.style.width = `${size}px`;
                star.style.height = `${size}px`;
                star.style.setProperty('--duration', `${duration}s`);
                star.style.animationDelay = `${delay}s`;
                starsContainer.appendChild(star);
            }
            const particlesContainer = document.getElementById('welcome-particles');
            if (particlesContainer) {
                particlesContainer.innerHTML = '';
                const types = ['petal', 'petal', 'petal', 'sparkle', 'sparkle'];
                for (let i = 0; i < 22; i++) {
                    const p = document.createElement('div');
                    const type = types[i % types.length];
                    p.className = `wp ${type}`;
                    const sz = type === 'petal' ? (Math.random() * 6 + 5) : (Math.random() * 4 + 2);
                    p.style.setProperty('--pSz', sz + 'px');
                    p.style.left = (Math.random() * 100) + '%';
                    p.style.setProperty('--pDur', (Math.random() * 10 + 9) + 's');
                    p.style.setProperty('--pDel', (Math.random() * 8) + 's');
                    p.style.setProperty('--pX1', (Math.random() * 50 - 25) + 'px');
                    p.style.setProperty('--pX2', (Math.random() * 80 - 40) + 'px');
                    p.style.setProperty('--pX3', (Math.random() * 50 - 25) + 'px');
                    particlesContainer.appendChild(p);
                }
            }

            const meteorsContainer = document.getElementById('welcome-meteors');
            if (meteorsContainer) {
                meteorsContainer.innerHTML = '';
                let meteorCount = 0;
                const MAX_METEORS = 12;
                const createMeteor = () => {
                    if (meteorCount >= MAX_METEORS) return;
                    meteorCount++;
                    const m = document.createElement('div');
                    m.className = 'meteor';
                    m.style.left = (Math.random() * 100) + '%';
                    m.style.top = (Math.random() * 35) + '%';
                    const dur = (Math.random() * 0.8 + 0.7);
                    m.style.setProperty('--mDur', dur + 's');
                    m.style.setProperty('--mDel', '0s');
                    m.style.setProperty('--mRot', (25 + Math.random() * 20) + 'deg');
                    meteorsContainer.appendChild(m);
                    setTimeout(() => { m.remove(); meteorCount = Math.max(0, meteorCount - 1); }, (dur + 0.1) * 1000);
                };
                for (let i = 0; i < 8; i++) setTimeout(createMeteor, i * 350);
                const meteorTimer = setInterval(createMeteor, 600);
                setTimeout(() => clearInterval(meteorTimer), 5000);
            }

            const loaderBarEl = document.getElementById('loader-tech-bar');
            if (loaderBarEl) {
                setTimeout(() => loaderBarEl.classList.add('pulsing'), 300);
            }


            const welcomeIcon = getRandomItem(CONSTANTS.WELCOME_ICONS);
document.querySelector('.logo-icon-main').innerHTML = `<i class="${welcomeIcon}"></i>`;

if (customIntros && customIntros.length > 0) {
    const rawIntro = getRandomItem(customIntros);
    const parts = rawIntro.split('|');
    const line1 = parts[0];
    const line2 = parts[1] || ""; 

    const titleEl = document.getElementById('welcome-title-glitch');
    const subEl = document.getElementById('welcome-subtitle-scramble');

    titleEl.classList.remove('playing');
    titleEl.textContent = line1;
    void titleEl.offsetWidth;
    titleEl.classList.add('playing');

    const scrambleText = (element, finalText, duration = 1500) => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
                const length = finalText.length;
                let start = Date.now();

                const interval = setInterval(() => {
                    const now = Date.now();
                    const progress = (now - start) / duration;

                    if (progress >= 1) {
                        element.textContent = finalText;
                        clearInterval(interval);
                        return;
                    }

                    let result = '';

                    const revealIndex = Math.floor(progress * length);

                    for (let i = 0; i < length; i++) {
                        if (i <= revealIndex) {
                            result += finalText[i];
                        } else {

                            result += chars[Math.floor(Math.random() * chars.length)];
                        }
                    }
                    element.textContent = result;
                },
                    40);
            };


          setTimeout(() => {
        scrambleText(subEl, line2, 2000);
    }, 600);
} else {
    document.getElementById('welcome-title-glitch').textContent = "传讯";
    document.getElementById('welcome-subtitle-scramble').textContent = "请在设置中添加开场动画";
}


            const loaderBar = document.getElementById('loader-tech-bar');
            const statusText = document.getElementById('loader-status-text');
            loaderBar.style.width = '0%';
            const loadingPhases = [
                { width: '15%', text: 'INITIALIZING · 初始化中' },
                { width: '40%', text: 'LOADING MEMORIES · 读取记忆' },
                { width: '70%', text: 'BUILDING WORLD · 构建世界' },
                { width: '90%', text: 'ALMOST THERE · 即将完成' },
                { width: '100%', text: 'CONNECTED · 连接成功' }
            ];
            const delays = [100, 700, 1600, 2400, 2900];
            delays.forEach((delay, i) => {
                setTimeout(() => {
                    loaderBar.style.width = loadingPhases[i].width;
                    if (statusText) statusText.textContent = loadingPhases[i].text;
                }, delay);
            });
        }


function manageAutoSendTimer() {
    if (autoSendTimer) {
        clearInterval(autoSendTimer);
        autoSendTimer = null;
    }
    if (settings.autoSendEnabled) {
        const safeInterval = Number(settings.autoSendInterval);
        
        // 👇 关键：如果用户没填或者填的不是数字，直接弹窗提醒他，并关掉开关
        if (isNaN(safeInterval) || safeInterval <= 0) {
            showNotification('请先在设置里填写正确的主动发送时间（分钟）', 'error');
            settings.autoSendEnabled = false;
            if(typeof updateUI === 'function') updateUI(); // 刷新开关状态
            return; 
        }
        
        console.log(`[主动发送] 已启动，间隔：${safeInterval} 分钟`);
        const intervalMs = safeInterval * 60 * 1000;
        
        autoSendTimer = setInterval(() => {
            if (!document.body.classList.contains('batch-favorite-mode')) {
                console.log('[主动发送] 触发回复');
                simulateReply();
            }
        }, intervalMs);
    } else {
        console.log('[主动发送] 功能已关闭');
    }
}


        const updateUI = () => {
            const isCustomTheme = settings.colorTheme.startsWith('custom-');
            if (isCustomTheme) {
                const themeId = settings.colorTheme;
                const theme = customThemes.find(t => t.id === themeId);
                if (theme) {
                    applyTheme(theme.colors);
                } else {
                    DOMElements.html.setAttribute('data-color-theme', 'gold');
                }
            } else {
                DOMElements.html.setAttribute('data-color-theme', settings.colorTheme);
                applyTheme(null, true);
            }
            
            if (settings.customThemeColors && Object.keys(settings.customThemeColors).length > 0) {
                for (const [variable, value] of Object.entries(settings.customThemeColors)) {
                    document.documentElement.style.setProperty(variable, value);
                }
            }

            DOMElements.html.setAttribute('data-theme', settings.isDarkMode ? 'dark': 'light');
            // 主题切换按钮已移到外观设置中
            const themeToggleBtn = document.getElementById('theme-toggle');
            if (themeToggleBtn) {
                themeToggleBtn.innerHTML = settings.isDarkMode ? '<i class="fas fa-sun"></i>': '<i class="fas fa-moon"></i>';
            }

            DOMElements.partner.name.textContent = settings.partnerName;
            DOMElements.me.name.textContent = settings.myName;
            var displayStatus = settings.partnerStatus;
            if (customStatuses && customStatuses.length > 0 && (displayStatus === '在线' || !displayStatus)) {
                displayStatus = customStatuses[Math.floor(Math.random() * customStatuses.length)];
                settings.partnerStatus = displayStatus;
            }
            DOMElements.partner.status.textContent = displayStatus;
            DOMElements.me.statusText.textContent = settings.myStatus;
            if (typeof window.updateDynamicNames === 'function') window.updateDynamicNames();
            document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
            
            const fontToUse = settings.messageFontFamily || "'Noto Serif SC', serif";
            
            document.documentElement.style.setProperty('--message-font-family', fontToUse);
            document.documentElement.style.setProperty('--font-family', fontToUse);
            document.documentElement.style.setProperty('--message-font-weight', settings.messageFontWeight);
            document.documentElement.style.setProperty('--message-line-height', settings.messageLineHeight);

            document.documentElement.style.setProperty('--in-chat-avatar-size', `${settings.inChatAvatarSize}px`);
            const _alignMap = { 'top': 'flex-start', 'center': 'center', 'bottom': 'flex-end', 'custom': 'flex-start' };
            document.documentElement.style.setProperty('--avatar-align', _alignMap[settings.inChatAvatarPosition || 'center'] || 'center');
            if (settings.inChatAvatarPosition === 'custom' && settings.inChatAvatarCustomOffset !== undefined) {
                document.documentElement.style.setProperty('--avatar-custom-offset', settings.inChatAvatarCustomOffset + 'px');
            }
            document.body.classList.toggle('always-show-avatar', !!settings.alwaysShowAvatar);
            if (typeof _applyCollapseState === 'function') _applyCollapseState(!!settings.bottomCollapseMode);
            document.body.classList.toggle('show-partner-name', !!(settings.showPartnerNameInChat || showPartnerNameInChat));

            document.querySelectorAll('.theme-color-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === settings.colorTheme);
            });


            document.querySelectorAll('[data-bubble-style]').forEach(item => {
                item.classList.toggle('active', item.dataset.bubbleStyle === settings.bubbleStyle);
            });

            // Sync setting pill toggles
            const _pillSyncMap = {
                '#reply-toggle': 'replyEnabled',
                '#sound-toggle': 'soundEnabled',
                '#read-receipts-toggle': 'readReceiptsEnabled',
                '#typing-indicator-toggle': 'typingIndicatorEnabled',
                '#read-no-reply-toggle': 'allowReadNoReply',
                '#emoji-mix-toggle': 'emojiMixEnabled',
                '#enter-send-toggle': 'enterToSendEnabled',
                '#auto-send-toggle': 'autoSendEnabled'
            };
            for (const [sel, prop] of Object.entries(_pillSyncMap)) {
                const el = document.querySelector(sel);
                if (el) {
                    const val = prop === 'emojiMixEnabled' ? (settings[prop] !== false) : !!settings[prop];
                    el.classList.toggle('active', val);
                }
            }
            const _immToggle = document.getElementById('immersive-toggle');
            if (_immToggle) _immToggle.classList.toggle('active', document.body.classList.contains('immersive-mode'));

            renderMessages();
        };

        const updateAvatar = (element, src) => {
            if (src) element.innerHTML = `<img src="${src}" alt="avatar">`; else element.innerHTML = `<i class="fas fa-user"></i>`;
        };

        const removeBackground = () => {
            document.documentElement.style.removeProperty('--chat-bg-image');
            document.body.classList.remove('with-background');
            localforage.removeItem(getStorageKey('chatBackground'));
            safeRemoveItem(getStorageKey('chatBackground'));
            showNotification('背景图片已移除', 'success');
        };

        window.scrollToQuotedMessage = function(el) {
            const id = el.getAttribute('data-reply-id');
            if (!id) return;
            const tryScroll = () => {
                const target = document.querySelector(`[data-msg-id="${id}"]`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('msg-highlight');
                    setTimeout(() => target.classList.remove('msg-highlight'), 1500);
                    return true;
                }
                return false;
            };
            if (!tryScroll()) {
                // Message not rendered yet - check if it exists in messages array
                const msgIndex = messages.findIndex(m => String(m.id) === String(id));
                if (msgIndex === -1) {
                    if (typeof showNotification === 'function') showNotification('消息可能已被删除', 'info');
                    return;
                }
                // Load enough messages to include this one
                const needed = messages.length - msgIndex;
                if (needed > displayedMessageCount) {
                    displayedMessageCount = needed;
                    renderMessages(false);
                    setTimeout(tryScroll, 150);
                } else {
                    if (typeof showNotification === 'function') showNotification('消息可能已被删除', 'info');
                }
            }
        };

        function renderMessages(preserveScroll = false) {
            const container = DOMElements.chatContainer;
            const totalMessages = messages.length;

            const startIndex = Math.max(0, totalMessages - displayedMessageCount);
            const msgsToRender = messages.slice(startIndex);

            DOMElements.emptyState.style.display = totalMessages === 0 ? 'flex': 'none';

            const oldScrollHeight = container.scrollHeight;
            
            const prevRenderedCount = container._lastRenderedCount || 0;
            const newMessageCount = msgsToRender.length - prevRenderedCount;
            
            container.innerHTML = '';
            container._lastRenderedCount = msgsToRender.length;

            const fragment = new DocumentFragment();
            const spacer = document.createElement('div');
            spacer.style.flex = '1';
            fragment.appendChild(spacer);
            let currentDate = '';
            let lastSender = null;

            msgsToRender.forEach((msg, index) => {
                const messageDate = new Date(msg.timestamp).toDateString();
                if (messageDate !== currentDate) {
                    currentDate = messageDate;
                    const dateDivider = document.createElement('div');
                    dateDivider.className = 'date-divider';
                    const today = new Date().toDateString();
                    const yesterday = new Date(Date.now() - 86400000).toDateString();
                    const displayDate = (messageDate === today) ? '今天': (messageDate === yesterday) ? '昨天': new Date(msg.timestamp).toLocaleDateString('zh-CN', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    });
                    dateDivider.innerHTML = `<span>${displayDate}</span>`;
                    fragment.appendChild(dateDivider);
                    lastSender = null; 
                }

                if (msg.type === 'system') {
                    const systemMsgDiv = document.createElement('div');
                    systemMsgDiv.className = 'system-message';
                    systemMsgDiv.innerHTML = msg.text;
                    fragment.appendChild(systemMsgDiv);
                    lastSender = 'system';
                    return;
                }

                let showTimestamp = true;
                if (settings.timeFormat === 'off') {
                    showTimestamp = false;
                } else if (index < msgsToRender.length - 1) {
                    const nextMsg = msgsToRender[index + 1];
                    const currentTs = new Date(msg.timestamp).getTime();
                    const nextTs = new Date(nextMsg.timestamp).getTime();
                    
                    if (nextMsg.sender === msg.sender && 
                        nextMsg.type !== 'system' && 
                        (nextTs - currentTs < 60000)) {
                        showTimestamp = false;
                    }
                }

                let isLastInSenderGroup = true;
                if (index < msgsToRender.length - 1) {
                    const nextMsg = msgsToRender[index + 1];
                    const currentTs = new Date(msg.timestamp).getTime();
                    const nextTs = new Date(nextMsg.timestamp).getTime();
                    if (nextMsg.sender === msg.sender &&
                        nextMsg.type !== 'system' &&
                        (nextTs - currentTs < 60000)) {
                        isLastInSenderGroup = false;
                    }
                }

                const wrapper = document.createElement('div');
                wrapper.className = `message-wrapper ${msg.sender === 'user' ? 'sent': 'received'}`;
                wrapper.dataset.id = msg.id;
                wrapper.dataset.msgId = msg.id;
                if (index < msgsToRender.length - Math.max(newMessageCount, 0)) {
                    wrapper.style.animation = 'none';
                    wrapper.style.opacity = '1';
                }
                
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'message-avatar';
                if (settings.inChatAvatarPosition === 'custom' && settings.inChatAvatarCustomOffset !== undefined) {
                    avatarDiv.style.marginTop = settings.inChatAvatarCustomOffset + 'px';
                }

                const groupMember = (msg.sender !== 'user' && typeof getGroupMemberForMessage === 'function') ? getGroupMemberForMessage(msg.id) : null;

                if (settings.inChatAvatarEnabled) {
                    const isSameSenderGroup = groupMember && lastSender === 'group_' + (groupMember ? groupMember.name : '');
                    const isSameSenderNormal = !groupMember && msg.sender === lastSender;
                    const shouldHide = !settings.alwaysShowAvatar && (isSameSenderGroup || isSameSenderNormal);
                    if (shouldHide) {
                        avatarDiv.classList.add('hidden');
                    } else if (groupMember) {
                        const groupAvatarShape = settings.partnerAvatarShape || 'circle';
                        ['circle','square','pentagon','heart'].forEach(s => avatarDiv.classList.remove('shape-' + s));
                        if (groupAvatarShape !== 'none') avatarDiv.classList.add('shape-' + groupAvatarShape);
                        if (groupMember.avatar) {
                            avatarDiv.innerHTML = `<img src="${groupMember.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
                        } else {
                            const initials = (groupMember.name || '?').charAt(0).toUpperCase();
                            avatarDiv.innerHTML = `<div style="width:100%;height:100%;background:var(--accent-color);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">${initials}</div>`;
                        }
                    } else {
                        const isUser = msg.sender === 'user';
                        const avatarElement = isUser ? DOMElements.me.avatar : DOMElements.partner.avatar;
                        const frameSettings = isUser ? settings.myAvatarFrame : settings.partnerAvatarFrame;
                        const avatarShape = isUser ? (settings.myAvatarShape || 'circle') : (settings.partnerAvatarShape || 'circle');
                        avatarDiv.innerHTML = avatarElement.innerHTML;
                        applyAvatarFrame(avatarDiv, frameSettings);
                        ['circle','square','pentagon','heart'].forEach(s => avatarDiv.classList.remove('shape-' + s));
                        if (avatarShape !== 'none') avatarDiv.classList.add('shape-' + avatarShape);
                    }
                } else {
                    avatarDiv.style.display = 'none';
                }
                wrapper.appendChild(avatarDiv);
                
                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'message-content-wrapper';

                if (groupMember && groupChatSettings.showName) {
                    const nameLabel = document.createElement('div');
                    nameLabel.className = 'group-sender-name';
                    nameLabel.textContent = groupMember.name;
                    const isSameSenderGroupForName = lastSender === 'group_' + groupMember.name;
                    if (!isSameSenderGroupForName) contentWrapper.appendChild(nameLabel);
                } else if (!groupMember && msg.sender !== 'user' && msg.sender !== null &&
                           (settings.showPartnerNameInChat || showPartnerNameInChat)) {
                    // Single mode: show partner name when the option is enabled and sender changes
                    const isSameSenderForName = lastSender === msg.sender;
                    if (!isSameSenderForName) {
                        const nameLabel = document.createElement('div');
                        nameLabel.className = 'group-sender-name';
                        nameLabel.textContent = settings.partnerName || msg.sender || '对方';
                        contentWrapper.appendChild(nameLabel);
                    }
                }
                
                let messageHTML = '';
                if (msg.replyTo) {
                    const repliedText = msg.replyTo.text || (msg.replyTo.image ? '🖼 图片' : '[消息]');
                    const repliedSender = msg.replyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
                    messageHTML += `<div class="reply-indicator" data-reply-id="${msg.replyTo.id || ''}" style="cursor:pointer;" onclick="scrollToQuotedMessage(this)"><span class="reply-indicator-sender">${repliedSender}</span><span class="reply-indicator-text">${repliedText}</span></div>`;
                }

                const isImageOnly = !msg.text && !!msg.image;
                let content = msg.text ? `<div>${msg.text.replace(/\n/g, '<br>')}</div>`: '';
                if (msg.image) content += `<img src="${msg.image}" class="message-image${isImageOnly ? ' message-image-only' : ''}" alt="图片" style="max-width:${isImageOnly ? '100px' : '100px'}; border-radius: 12px;${!isImageOnly ? ' margin-top: 6px;' : ''} cursor: pointer;" onclick="viewImage('${msg.image}')">`;
                messageHTML += content;

                const messageDiv = document.createElement('div');
                if (isImageOnly) {
                    messageDiv.className = `message message-${msg.sender === 'user' ? 'sent': 'received'} message-image-bubble-none`;
                } else {
                    messageDiv.className = `message message-${msg.sender === 'user' ? 'sent': 'received'} ${settings.bubbleStyle}`;
                }
                messageDiv.innerHTML = messageHTML;

                let actionsHTML = '';
                
                if (settings.replyEnabled) actionsHTML += `<button class="meta-action-btn reply-btn" title="回复"><i class="fas fa-reply"></i></button>`;
                
                const starIcon = msg.favorited ? 'fas fa-star' : 'far fa-star'; 
                actionsHTML += `<button class="meta-action-btn favorite-action-btn ${msg.favorited ? 'favorited' : ''}" title="${msg.favorited ? '取消收藏' : '收藏'}"><i class="${starIcon}"></i></button>`;
                if (msg.sender === 'user') {
                    actionsHTML += `<button class="meta-action-btn edit-btn" title="编辑"><i class="fas fa-pencil-alt"></i></button>`;
                }

                actionsHTML += `<button class="meta-action-btn delete-btn" title="删除"><i class="fas fa-trash-alt"></i></button>`;
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'message-meta-actions';
                actionsDiv.innerHTML = actionsHTML;

                let metaHTML = '';
                
                if (showTimestamp) {
                    const ts = new Date(msg.timestamp);
                    let timeStr;
                    const fmt = settings.timeFormat || 'HH:mm';
                    if (fmt === 'HH:mm:ss') {
                        timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                    } else if (fmt === 'h:mm AM/PM') {
                        timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    } else if (fmt === 'h:mm:ss AM/PM') {
                        timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                    } else {
                        timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
                    }
                    metaHTML += `<div class="timestamp">${timeStr}</div>`;
                }

                if (msg.sender === 'user' && settings.readReceiptsEnabled && isLastInSenderGroup) {
                    const rrStyle = settings.readReceiptStyle || 'icon';
                    if (rrStyle === 'text') {
                        if (msg.status === 'read') {
                            metaHTML += `<div class="read-receipt read" style="font-size:9px;letter-spacing:0.3px;font-weight:500;">已读</div>`;
                        } else {
                            metaHTML += `<div class="read-receipt" style="font-size:9px;letter-spacing:0.3px;opacity:0.5;">未读</div>`;
                        }
                    } else {
                        const statusIcon = msg.status === 'read' ? 'fa-check-double': 'fa-check';
                        metaHTML += `<div class="read-receipt ${msg.status === 'read' ? 'read': ''}"><i class="fas ${statusIcon}"></i></div>`;
                    }
                }

                if (metaHTML !== '') {
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'message-meta';
                    if (!showTimestamp && !metaHTML.includes('timestamp')) {
                         metaDiv.style.height = 'auto'; 
                         metaDiv.style.marginTop = '2px';
                         if (settings.inChatAvatarPosition !== 'top') {
                             avatarDiv.style.marginBottom = '18px';
                         }
                    } else {
                         
                         if (settings.inChatAvatarPosition !== 'top') {
                             avatarDiv.style.marginBottom = '26px';
                         }
                    }
                    metaDiv.innerHTML = metaHTML;
                    contentWrapper.append(actionsDiv, messageDiv, metaDiv);
                } else {
                    contentWrapper.append(actionsDiv, messageDiv);
                }
                wrapper.appendChild(contentWrapper);
                fragment.appendChild(wrapper);
                
                lastSender = groupMember ? ('group_' + groupMember.name) : msg.sender;
            });

            container.appendChild(fragment);

            if (preserveScroll) {
                const newScrollHeight = container.scrollHeight;
                const delta = newScrollHeight - oldScrollHeight;
                container.scrollTop = Math.max(0, container.scrollTop + delta);
            } else {
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight;
                });
            }
        }        

        // 在 core.js 中添加
        function immediateSaveData() {
            return saveData().then(() => {
                console.log('[immediateSaveData] 数据已立即保存');
            }).catch(e => {
                console.error('[immediateSaveData] 保存失败:', e);
                showNotification('数据保存失败，请检查存储空间', 'error');
            });
        }

        // 新增：打断对方的回复（停止计时器 + 隐藏正在输入）
        /*window.cancelPartnerReply = function() {
            // 1. 清除后台的回复计时器
            if (window._pendingReplyTimer) {
                clearTimeout(window._pendingReplyTimer);
                window._pendingReplyTimer = null;
            }*/
        // 新增：打断对方的回复（停止计时器 + 隐藏正在输入）
        window.cancelPartnerReply = function() {
            // 1. 设置打断标志
            window._replyAborted = true; 

            // 2. 清除后台的回复计时器
            if (window._pendingReplyTimer) {
                clearTimeout(window._pendingReplyTimer);
                window._pendingReplyTimer = null;
            }
            // 3. 立刻隐藏“正在输入”的动画
            const tiW = document.getElementById('typing-indicator-wrapper');
            if (tiW) {
                const tiInner = tiW.querySelector('.typing-indicator');
                if (tiInner) {
                    tiInner.classList.add('hiding');
                    setTimeout(() => {
                        tiW.style.display = 'none';
                        if (tiInner) tiInner.classList.remove('hiding');
                    }, 240);
                } else {
                    tiW.style.display = 'none';
                }
            }
        };


        const addMessage = (message) => {
            if (!(message.timestamp instanceof Date)) message.timestamp = new Date(message.timestamp);
            messages.push(message);
            displayedMessageCount++;
            const container = DOMElements.chatContainer;
            container.style.opacity = '1';
            renderMessages(false);
            //throttledSaveData();
            immediateSaveData(); 
        };

        function optimizeImage(file, maxWidth = 800, quality = 0.7) {
            return new Promise((resolve, reject) => {
                if (file.size < 300 * 1024) {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    let {
                        width,
                        height
                    } = img;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                    URL.revokeObjectURL(img.src);
                };
                img.onerror = () => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                    URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(file);
            });
        }

        window.updateReplyPreview = function() {
            const container = DOMElements.replyPreviewContainer;
            if (!container) return;
            if (!currentReplyTo) {
                container.innerHTML = '';
                container.style.display = 'none';
                return;
            }
            const senderName = currentReplyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
            const previewText = currentReplyTo.text ? currentReplyTo.text.slice(0, 40) : '🖼 图片';
            container.style.display = 'flex';
            container.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(var(--accent-color-rgb),0.07);border-left:3px solid var(--accent-color);border-radius:0 8px 8px 0;width:100%;">
                    <div style="flex:1;min-width:0;">
                        <span style="font-size:11px;color:var(--accent-color);font-weight:600;">回复 ${senderName}</span>
                        <div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${previewText}</div>
                    </div>
                    <button onclick="currentReplyTo=null;window.updateReplyPreview();" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);padding:2px 4px;font-size:14px;">✕</button>
                </div>`;
        };
        function updateReplyPreview() { window.updateReplyPreview(); }

        function sendMessage(textOverride = null, type = 'normal') {
            const text = textOverride || DOMElements.messageInput.value.trim();
            const imageFile = DOMElements.imageInput.files[0];
            if (!text && !imageFile && type === 'normal') return;

            DOMElements.messageInput.value = '';
            DOMElements.messageInput.style.height = '46px';
            if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
                showNotification('图片大小不能超过5MB', 'error'); DOMElements.imageInput.value = ''; return;
            }

            const createMessage = (imgSrc = null) => {
                const messageData = {
                    id: Date.now(),
                    sender: 'user',
                    text: text || '',
                    timestamp: new Date(),
                    image: imgSrc,
                    status: 'sent',
                    favorited: false,
                    note: null,
                    replyTo: currentReplyTo,
                    type: type
                };

                if (type === 'system') messageData.sender = null;
                addMessage(messageData);
                if (type !== 'system') playSound('send');
                currentReplyTo = null;
                updateReplyPreview();

                if (type === 'normal') {
                    window._replyAborted = false;
                    const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                    const randomDelay = settings.replyDelayMin + Math.random() * delayRange;

                    // Show typing indicator immediately (no delay)
                    if (settings.typingIndicatorEnabled) {
                        const tiWrapper = document.getElementById('typing-indicator-wrapper');
                        const tiLabel = document.getElementById('typing-indicator-label');
                        const tiAvatar = document.getElementById('typing-indicator-avatar');
                        if (tiLabel) tiLabel.textContent = (settings.partnerName || '对方') + ' 正在输入';
                        if (tiWrapper) { positionTypingIndicator(); tiWrapper.style.display = 'block'; }
                        if (tiAvatar) {
                            const partnerImg = DOMElements.partner.avatar.querySelector('img');
                            tiAvatar.innerHTML = partnerImg ? `<img src="${partnerImg.src}">` : '<i class="fas fa-user"></i>';
                        }
                        if (DOMElements.chatContainer) DOMElements.chatContainer.scrollTop = DOMElements.chatContainer.scrollHeight;
                    }

                    // Mark messages as read
                    setTimeout(() => {
                        let changed = false;
                        messages.forEach(msg => {
                            if (msg.sender === 'user' && msg.status !== 'read') {
                                msg.status = 'read';
                                changed = true;
                            }
                        });
                        if (changed) { renderMessages(false); throttledSaveData(); }
                    }, 400);

                    // Cancel any pending reply timer and reset it (so rapid messages don't stack replies)
                    const shouldIgnore = settings.allowReadNoReply && (Math.random() <(settings.readNoReplyChance || 0.2));
                    if (!shouldIgnore) {
                        window._pendingReplyTimer = setTimeout(() => {
                            window._pendingReplyTimer = null;
                            simulateReply();
                        }, randomDelay);
                    } else {
                        window._pendingReplyTimer = setTimeout(() => {
                            window._pendingReplyTimer = null;
                            const _tiW = document.getElementById('typing-indicator-wrapper');
                            if (_tiW) { const _tiInner = _tiW.querySelector('.typing-indicator'); if (_tiInner) { _tiInner.classList.add('hiding'); setTimeout(() => { _tiW.style.display = 'none'; if (_tiInner) _tiInner.classList.remove('hiding'); }, 240); } else { _tiW.style.display = 'none'; } }
                        }, randomDelay * 0.4);
                    }
                }
            };

            if (imageFile) {
                showNotification('正在优化图片...', 'info', 1500);
                optimizeImage(imageFile).then(createMessage).catch(() => showNotification('图片处理失败', 'error'));
            } else {
                createMessage();
            }
            DOMElements.imageInput.value = '';
        }

        function positionTypingIndicator() {
            var tiW = document.getElementById('typing-indicator-wrapper');
            var inputArea = document.querySelector('.input-area-wrapper');
            if (!tiW || !inputArea) return;
            var h = inputArea.offsetHeight;
            tiW.style.bottom = h + 'px';
        }
        (function() {
            var inputArea = document.querySelector('.input-area-wrapper');
            if (!inputArea) return;
            var ro = new ResizeObserver(function() {
                var tiW = document.getElementById('typing-indicator-wrapper');
                if (tiW && tiW.style.display !== 'none') positionTypingIndicator();
            });
            ro.observe(inputArea);
        })();

        function simulateReply() {
            window._replyAborted = false;
            function showTypingIndicator() {
                if (!settings.typingIndicatorEnabled) return;
                const tiWrapper = document.getElementById('typing-indicator-wrapper');
                const tiLabel = document.getElementById('typing-indicator-label');
                const tiAvatar = document.getElementById('typing-indicator-avatar');
                if (tiLabel) tiLabel.textContent = (settings.partnerName || '对方') + ' 正在输入';
                if (tiWrapper) { positionTypingIndicator(); tiWrapper.style.display = 'block'; }
                if (tiAvatar) {
                    const partnerImg = DOMElements.partner.avatar.querySelector('img');
                    tiAvatar.innerHTML = partnerImg ? `<img src="${partnerImg.src}">` : '<i class="fas fa-user"></i>';
                }
                DOMElements.chatContainer.scrollTop = DOMElements.chatContainer.scrollHeight;
            }

            showTypingIndicator();

            let changed = false;
            messages.forEach(msg => {
                if (msg.sender === 'user' && msg.status !== 'read') {
                    msg.status = 'read'; changed = true;
                }
            });
            if (changed) {
                renderMessages(false); throttledSaveData();
            }

            // Don't call showTypingIndicator() a second time — already shown by sendMessage
            if (partnerPersonas && partnerPersonas.length > 0 && Math.random() < 0.3) {
                            const currentPool = [
                                ...partnerPersonas
                            ];
                            if(currentPool.length > 0) {
                                const nextPersona = currentPool[Math.floor(Math.random() * currentPool.length)];
                                
                                settings.partnerName = nextPersona.name;
                                DOMElements.partner.name.textContent = nextPersona.name;
                                
                                if (nextPersona.avatar) {
                                    updateAvatar(DOMElements.partner.avatar, nextPersona.avatar);
                                    localforage.setItem(getStorageKey('partnerAvatar'), nextPersona.avatar);
                                }
                                throttledSaveData();
                            }
                        }
                        if (Math.random() < 0.03) {
                            if (customPokes && customPokes.length > 0) {
                    const randomAction = getRandomItem(customPokes);
                            const pokeTypes = [{
                                prefix: "💫",
                                text: `${settings.partnerName} ${randomAction}`
                            },
                                {
                                    prefix: "✨",
                                    text: `${settings.partnerName} ${randomAction}`
                                },
                                {
                                    prefix: "🌟",
                                    text: `${settings.partnerName} ${randomAction}`
                                },
                                {
                                    prefix: "🥰",
                                    text: `${settings.partnerName} ${randomAction}`
                                },
                                {
                                    prefix: "💖",
                                    text: `${settings.partnerName} ${randomAction}`
                                }];

                        const selectedPoke = getRandomItem(pokeTypes);
                    
                    addMessage({
                        id: Date.now(),
                        text: `${selectedPoke.prefix} ${settings.partnerName} ${randomAction} ${selectedPoke.prefix}`,
                        timestamp: new Date(),
                        type: 'system'
                    });
                    (function(){var _tiW=document.getElementById('typing-indicator-wrapper');if(_tiW){var _tiInner=_tiW.querySelector('.typing-indicator');if(_tiInner){_tiInner.classList.add('hiding');setTimeout(function(){_tiW.style.display='none';if(_tiInner)_tiInner.classList.remove('hiding');},240);}else{_tiW.style.display='none';}}})();
                    return;
                }
            }

            const replyCount = Math.random() < 0.75 ? 1: (Math.random() < 0.95 ? 2: 3);
            if (!customReplies || customReplies.length === 0) {
                (function(){var _tiW=document.getElementById('typing-indicator-wrapper');if(_tiW){var _tiInner=_tiW.querySelector('.typing-indicator');if(_tiInner){_tiInner.classList.add('hiding');setTimeout(function(){_tiW.style.display='none';if(_tiInner)_tiInner.classList.remove('hiding');},240);}else{_tiW.style.display='none';}}})();
                showNotification('还没有添加字卡，请先到"自定义回复"中添加字卡', 'info', 4000);
                return;
            }
            let delay = 0;
            //引用回复
            /* const recentUserMsgs = settings.replyEnabled
                ? messages.filter(m => m.sender === 'user' && m.text).slice(-10)
                : [];*/
            // ===== 引用逻辑优化：时间窗口限制 =====
            const REPLY_TIME_LIMIT = 1 * 60 * 60 * 1000; // 设定时间限制为 1小时 (单位：毫秒)
            const recentUserMsgs = settings.replyEnabled ? messages.filter(m => {
                // 1. 必须是用户发的消息，且必须有文字内容
                if (m.sender !== 'user' || !m.text) return false;
                
                // 2. 计算消息时间差
                const msgTime = new Date(m.timestamp).getTime();
                const isRecent = (Date.now() - msgTime) < REPLY_TIME_LIMIT;
                
                // 3. 只保留1小时以内的消息
                return isRecent;
            }).slice(-7) : []; // 4. 只取最近符合条件的 7 条消息

            for (let i = 0; i < replyCount; i++) {
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                delay += settings.replyDelayMin + Math.random() * delayRange;
                setTimeout(() => {
                    if (window._replyAborted) {
                        console.log('回复已被用户打断');
                        var _tiW = document.getElementById('typing-indicator-wrapper');
                        if (_tiW) _tiW.style.display = 'none';
                        return; 
                    }
                    // Bug fix 1: Filter out disabled individual items AND items from disabled groups
                    let disabledItems = new Set();
                    try {
                        const raw = localStorage.getItem('disabledReplyItems');
                        if (raw) disabledItems = new Set(JSON.parse(raw));
                    } catch(e) {}
                    const disabledGroups = (window.customReplyGroups || [])
                        .filter(g => g.disabled)
                        .map(g => g.id);
                    const disabledGroupItems = new Set();
                    if (disabledGroups.length > 0) {
                        customReplies.forEach((reply) => {
                            const itemGroup = (window.customReplyGroups || []).find(g =>
                                g.items && g.items.includes(reply)
                            );
                            if (itemGroup && disabledGroups.includes(itemGroup.id)) {
                                disabledGroupItems.add(reply);
                            }
                        });
                    }
                    const replyPool = customReplies.filter(r => !disabledItems.has(r) && !disabledGroupItems.has(r));
                    const replyText = replyPool[Math.floor(Math.random() * replyPool.length)];

                    // Bug fix 2: 30% chance partner sends a sticker image instead of (or after) text
                    const shouldSendSticker = stickerLibrary && stickerLibrary.length > 0 && Math.random() < 0.3;

                    let finalText = replyText;
                    let separateEmoji = null;
                    if (!shouldSendSticker && customEmojis && customEmojis.length > 0 && Math.random() < 0.3) {
                        const emoji = customEmojis[Math.floor(Math.random() * customEmojis.length)];
                        if (settings.emojiMixEnabled !== false) {
                            finalText = Math.random() < 0.5
                                ? emoji + ' ' + replyText
                                : replyText + ' ' + emoji;
                        } else {
                            separateEmoji = emoji;
                        }
                    }

                    addMessage({
                        id: Date.now() + i,
                        sender: settings.partnerName || '对方',
                        text: finalText,
                        timestamp: new Date(),
                        status: 'received',
                        favorited: false,
                        note: null,
                        replyTo: (i === 0 && recentUserMsgs.length > 0 && Math.random() < 0.3)
                            ? (function(){ const m = recentUserMsgs[Math.floor(Math.random() * recentUserMsgs.length)]; return { id: m.id, text: m.text, sender: m.sender }; })()
                            : null,
                        type: 'normal'
                    });
                    // Bug fix 4: Send background push notification
                    if (typeof window._sendPartnerNotification === 'function') {
                        window._sendPartnerNotification(settings.partnerName || '对方', finalText);
                    }
                    // Bug fix 5: Play sound for incoming message
                    playSound('message');

                    // Bug fix 2 (continued): send the sticker as a follow-up image message
                    if (shouldSendSticker) {
                        const randomSticker = stickerLibrary[Math.floor(Math.random() * stickerLibrary.length)];
                        setTimeout(() => {
                            addMessage({
                                id: Date.now() + i + 2000,
                                sender: settings.partnerName || '对方',
                                text: '',
                                timestamp: new Date(),
                                image: randomSticker,
                                status: 'received',
                                favorited: false,
                                note: null,
                                type: 'normal'
                            });
                            playSound('message');
                            if (typeof window._sendPartnerNotification === 'function') {
                                window._sendPartnerNotification(settings.partnerName || '对方', '[表情]');
                            }
                        }, 400 + Math.random() * 600);
                    }

                    if (separateEmoji) {
                        setTimeout(() => {
                            addMessage({
                                id: Date.now() + i + 1000,
                                sender: settings.partnerName || '对方',
                                text: separateEmoji,
                                timestamp: new Date(),
                                status: 'received',
                                favorited: false,
                                note: null,
                                type: 'normal'
                            });
                        }, 300 + Math.random() * 400);
                    }

                    if (i === replyCount - 1) {
                        (function() {
                            var _tiW = document.getElementById('typing-indicator-wrapper');
                            if (_tiW) {
                                var _tiInner = _tiW.querySelector('.typing-indicator');
                                if (_tiInner) {
                                    _tiInner.classList.add('hiding');
                                    setTimeout(function() {
                                        _tiW.style.display = 'none';
                                        if (_tiInner) _tiInner.classList.remove('hiding');
                                    }, 240);
                                } else {
                                    _tiW.style.display = 'none';
                                }
                            }
                        })();
                    }
                }, delay);
            }
        }

function showModal(modalElement, focusElement = null) {
            if (modalElement._hideTimeout) {
                clearTimeout(modalElement._hideTimeout);
                modalElement._hideTimeout = null;
            }
            modalElement.style.display = 'flex';
            requestAnimationFrame(() => {
                const content = modalElement.querySelector('.modal-content');
                if (content) {
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0) scale(1)';
                }
                if (focusElement) {
                    setTimeout(() => focusElement.focus(), 100);
                }
            });
        }

        function hideModal(modalElement) {
            const content = modalElement.querySelector('.modal-content');
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'translateY(20px) scale(0.95)';
            }
            if (modalElement._hideTimeout) clearTimeout(modalElement._hideTimeout);
            modalElement._hideTimeout = setTimeout(() => {
                modalElement.style.display = 'none';
            }, 300);
        }

        function viewImage(src) {
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;touch-action:pinch-zoom;';
            modal.innerHTML = `
                <div style="position:relative;max-width:95vw;max-height:92vh;display:flex;align-items:center;justify-content:center;">
                    <img src="${src}" style="max-width:95vw;max-height:88vh;object-fit:contain;display:block;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.6);" draggable="false">
                    <button onclick="this.closest('[style*=fixed]').remove()" style="position:fixed;top:16px;right:16px;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);z-index:10;line-height:1;">×</button>
                    <a href="${src}" download style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 24px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);border-radius:20px;color:#fff;font-size:13px;text-decoration:none;backdrop-filter:blur(8px);display:flex;align-items:center;gap:6px;"><i class="fas fa-download"></i> 保存图片</a>
                </div>`;
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.tagName === 'IMG') modal.remove();
            });
            document.body.appendChild(modal);
        }


function exportChatHistory(isAllMode = false) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';

    // 过滤出需要在界面显示的项目 (排除虚拟组本身，只显示实际数据和虚拟组的合并项)
    // 逻辑：如果是虚拟组，显示虚拟组；如果不是虚拟组且不属于某个虚拟组，显示自己
    const displayItems = [];
    const addedGroups = new Set();
    
    window.APP_DATA_REGISTRY.forEach(item => {
        if (item.isVirtual) {
            displayItems.push(item); // 添加虚拟组 (如"氛围感")
            addedGroups.add(item.id);
        } else if (!item.group) {
            displayItems.push(item); // 添加独立项目
        }
    });

    const makeRow = (item) => {
        // 计算子项数据摘要 (如果是虚拟组)
        let sub = '';
        if (item.isVirtual && item.children) {
            const validChildren = item.children.filter(cid => {
                const val = _getRegVal(cid);
                return val && (Array.isArray(val) ? val.length > 0 : Object.keys(val).length > 0);
            });
            sub = validChildren.length > 0 ? `(包含 ${validChildren.length} 项配置)` : '(空)';
        } else {
            const val = _getRegVal(item.id);
            if (Array.isArray(val)) sub = `(${val.length} 条)`;
            else if (val && typeof val === 'object') sub = '(已配置)';
            else sub = '(空)';
        }

        const checked = (item.core || isAllMode) ? 'checked' : '';
        
        return `
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
            <input type="checkbox" data-export-id="${item.id}" ${checked} style="accent-color:var(--accent-color);width:15px;height:15px;">
            <i class="fas ${item.icon}" style="color:var(--accent-color);width:16px;text-align:center;"></i>
            <span>${item.name} <span style="font-size:11px;color:var(--text-secondary);margin-left:4px;">${sub}</span></span>
        </label>`;
    };

    overlay.innerHTML = `
    <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
        <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:6px;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-file-export" style="color:var(--accent-color);font-size:14px;"></i>选择导出内容
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">${isAllMode ? '全量备份模式 (建议全选)' : '勾选需要备份的数据'}</div>
        <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;max-height:50vh;overflow-y:auto;">
            ${displayItems.map(makeRow).join('')}
        </div>
        <div style="display:flex;gap:10px;">
            <button id="_exp_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>
            <button id="_exp_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);display:flex;align-items:center;justify-content:center;gap:7px;">
                <i class="fas fa-download"></i>确认导出
            </button>
        </div>
    </div>`;
    document.body.appendChild(overlay);

    // 绑定事件
    const closeDialog = () => overlay.remove();
    overlay.onclick = (e) => { if(e.target === overlay) closeDialog(); };
    document.getElementById('_exp_cancel').onclick = closeDialog;

    document.getElementById('_exp_confirm').onclick = function() {
        closeDialog();
        const exportObj = { version: '4.0-auto', appName: 'ChatApp', date: new Date().toISOString() };
        
        // 遍历注册表，检查是否被选中
        window.APP_DATA_REGISTRY.forEach(reg => {
            // 跳过虚拟组定义本身，因为我们会检查它的子项
            if (reg.isVirtual) return;

            // 检查 UI 是否勾选
            // 如果该数据属于某个组，检查组的勾选框；否则检查自己的勾选框
            let isChecked = false;
            if (reg.group) {
                const groupCheckbox = overlay.querySelector(`[data-export-id="${reg.group}"]`);
                if (groupCheckbox) isChecked = groupCheckbox.checked;
            } else {
                const checkbox = overlay.querySelector(`[data-export-id="${reg.id}"]`);
                if (checkbox) isChecked = checkbox.checked;
            }

            if (isChecked) {
                const val = _getRegVal(reg.id);
                if (val !== null && val !== undefined) {
                    exportObj[reg.id] = val;
                }
            }
        });

        if (Object.keys(exportObj).length <= 3) {
            showNotification('请至少选择一项内容', 'error');
            return;
        }

        try {
            const dataStr = JSON.stringify(exportObj, null, 2);
            const fileName = `传讯-备份-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
            fallbackExport(dataStr, fileName); // 使用你的下载函数
        } catch(e) {
            console.error(e);
            showNotification('导出失败，数据可能过大', 'error');
        }
    };
}


// 辅助函数：将简写 ID 映射回全局变量名
window._getKeyFromId = function(id) {
    const map = {
        'msgs': 'messages',
        'settings': 'settings',
        'replies': 'customReplies',
        'emojis': 'customEmojis',
        'stickers': 'stickerLibrary',
        'myStickers': 'myStickerLibrary',
        'ann': 'anniversaries',
        'period': 'periodCareMessages',
        'calendar': 'calendarEvents',
        'backgrounds': 'savedBackgrounds',
        'themes': 'customThemes',
        'schemes': 'themeSchemes'
    };
    return map[id] || id;
}

function fallbackExport(dataStr, fileName) {
    fileName = fileName || `chat-backup-${SESSION_ID}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showNotification('导出成功', 'success');
}

/*async function exportFullBackup() {
    try {
        showNotification('正在准备全量备份...', 'info', 2000);

        // 1. 先强制保存一次内存中的变量到数据库
        await saveData();

        // 2. 获取所有键名
        const allKeys = await localforage.keys();
        const backupData = {};
        let count = 0;

        // 3. 过滤出属于本应用的数据，并全部读取
        for (const key of allKeys) {
            if (key.startsWith(APP_PREFIX)) {
                const value = await localforage.getItem(key);
                if (value !== null && value !== undefined) {
                    backupData[key] = value;
                    count++;
                }
            }
        }

        // 4. 构建导出文件对象
        const exportObj = {
            _meta: {
                type: 'FULL_BACKUP_AUTO', 
                version: '3.0-auto',
                date: new Date().toISOString(),
                appName: 'ChatApp'
            },
            data: backupData
        };

        const dataStr = JSON.stringify(exportObj, null, 2);
        const fileName = `传讯-全量备份-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;

        // ✅ 5. 直接调用浏览器下载，不再尝试系统分享
        fallbackExport(dataStr, fileName);
        
        showNotification(`备份成功！共包含 ${count} 个数据项`, 'success');

    } catch (error) {
        console.error('全量备份失败:', error);
        showNotification('备份失败: ' + error.message, 'error');
    }
}*/
async function exportFullBackup() {
    try {
        // 先把内存中的数据写入 localforage，确保备份是最新的
        await saveData();
        if (typeof ChatBackup === 'undefined') {
            showNotification('备份组件未加载，请刷新页面后重试', 'error');
            return;
        }
        // 调用 backup-engine 导出 ZIP，格式兼容旧站
        await ChatBackup.exportBackupToFile();
    } catch (error) {
        console.error('全量备份失败:', error);
        showNotification('备份失败: ' + error.message, 'error');
    }
}



/**
 * 【智能导入】自动识别备份类型并恢复
 */
/*async function importAnyBackup(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const rawText = e.target.result;
            const imported = JSON.parse(rawText);

            // --- 情况 A：新格式的全自动全量备份 ---
            if (imported._meta && imported._meta.type === 'FULL_BACKUP_AUTO' && imported.data) {
                const count = Object.keys(imported.data).length;
                
                if (!confirm(`检测到【全量备份文件】，包含 ${count} 个数据项。\n\n⚠️ 警告：这将覆盖当前的所有数据！是否继续？`)) {
                    return;
                }

                showNotification('正在恢复数据...', 'info');
                
                // 1. 清空当前数据库（为了干净恢复）
                await localforage.clear();

                // 2. 写入备份数据
                for (const key in imported.data) {
                    await localforage.setItem(key, imported.data[key]);
                }

                showNotification('恢复成功！页面即将刷新加载新数据', 'success');
                
                // 3. 刷新页面以加载新数据
                setTimeout(() => window.location.reload(), 1500);
            }
            
            // --- 情况 B：旧版本的选择性备份 ---
            else if (imported.version || imported.messages || imported.settings) {
                // 这里直接调用你原来的旧版导入逻辑
                // 如果旧版逻辑叫 importChatHistory，可以直接把 file 传给它
                // 但为了避免递归，我们把原逻辑移到这里（或者取个别名）
                showNotification('检测到旧版备份，正在兼容恢复...', 'info');
                handleLegacyImport(imported); // 调用下面的兼容处理函数
            }
            
            else {
                throw new Error('无法识别的文件格式');
            }

        } catch (error) {
            console.error('导入失败:', error);
            showNotification('文件格式错误或已损坏', 'error');
        }
    };
    reader.readAsText(file);
}*/
async function importAnyBackup(file) {
    try {
        // 只读一次文件，用 ArrayBuffer 统一处理
        const ab = await file.arrayBuffer();

        // ===== 旧站备份检测（ZIP 或 v4 JSON）=====
        if (typeof ChatBackup !== 'undefined') {
            // ZIP 检测：PK 开头
            const u8 = new Uint8Array(ab);
            const isZip = ab.byteLength >= 4
                && u8[0] === 0x50 && u8[1] === 0x4b
                && (u8[2] === 0x03 || u8[2] === 0x05 || u8[2] === 0x07)
                && (u8[3] === 0x04 || u8[3] === 0x06 || u8[3] === 0x08);

            if (isZip) {
                if (!confirm('检测到【旧站全量备份（ZIP）】\n\n这将覆盖当前所有数据，确定继续吗？')) return;
                showNotification('正在恢复数据...', 'info', 3000);
                const data = await ChatBackup.loadBackupFromArrayBuffer(ab);
                if (!ChatBackup.isFullBackupShape(data)) {
                    throw new Error('ZIP 内的备份格式无效');
                }
                await ChatBackup.applyBackupToStorage(data);
                showNotification('恢复成功，页面即将刷新', 'success');
                //setTimeout(() => window.location.reload(), 1500);
                return;
            }

            // 非 ZIP：尝试解析 JSON，检测旧站 v4 格式
            let text = new TextDecoder('utf-8', { fatal: false }).decode(ab);
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
            let parsed;
            try { parsed = JSON.parse(text); } catch (_) { parsed = null; }

            if (parsed && ChatBackup.isFullBackupShape(parsed)) {
                if (!confirm('检测到【旧站全量备份（JSON）】\n\n这将覆盖当前所有数据，确定继续吗？')) return;
                showNotification('正在恢复数据...', 'info', 3000);
                await ChatBackup.applyBackupToStorage(parsed);
                showNotification('恢复成功，页面即将刷新', 'success');
                setTimeout(() => window.location.reload(), 1500);
                return;
            }
        }

        // ===== 新站自己的格式检测 =====
        let text2 = new TextDecoder('utf-8', { fatal: false }).decode(ab);
        if (text2.charCodeAt(0) === 0xFEFF) text2 = text2.slice(1);
        const imported = JSON.parse(text2);

        // 情况 A：新站 FULL_BACKUP_AUTO
        if (imported._meta && imported._meta.type === 'FULL_BACKUP_AUTO' && imported.data) {
            const count = Object.keys(imported.data).length;
            if (!confirm(`检测到【全量备份文件】，包含 ${count} 个数据项。\n\n⚠️ 这将覆盖当前所有数据！是否继续？`)) return;
            showNotification('正在恢复数据...', 'info', 3000);
            await localforage.clear();
            for (const key in imported.data) {
                await localforage.setItem(key, imported.data[key]);
            }
            showNotification('恢复成功，页面即将刷新', 'success');
            setTimeout(() => window.location.reload(), 1500);
            return;
        }

        // 情况 B：选择性备份（新站导出 或 旧站 exportChatHistory 导出）
        if (imported.version || imported.messages || imported.settings) {
            handleLegacyImport(imported);
            return;
        }

        throw new Error('无法识别的文件格式');
    } catch (error) {
        console.error('导入失败:', error);
        showNotification('文件格式错误或已损坏', 'error');
    }
}


async function handleLegacyImport(importedData) {
    try {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';

        // 动态生成导入选项
        const rows = [];
        window.APP_DATA_REGISTRY.forEach(reg => {
            // 虚拟组处理
            if (reg.isVirtual && reg.children) {
                const hasData = reg.children.some(cid => importedData[cid]);
                if (hasData) {
                    rows.push(`
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                        <input type="checkbox" data-imp-id="${reg.id}" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                        <i class="fas ${reg.icon}" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                        <span>${reg.name} (检测到数据)</span>
                    </label>`);
                }
                return;
            }

            // 普通项
            if (importedData[reg.id]) {
                rows.push(`
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                    <input type="checkbox" data-imp-id="${reg.id}" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                    <i class="fas ${reg.icon}" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                    <span>${reg.name}</span>
                </label>`);
            }
        });

        if (rows.length === 0) {
            showNotification('文件中没有识别到有效数据', 'error');
            return;
        }

        /*overlay.innerHTML = `
        <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
            <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:16px;">选择要导入的内容</div>
            <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;max-height:50vh;overflow-y:auto;">
                ${rows.join('')}
            </div>
            <div style="display:flex;gap:10px;">
                <button id="_imp_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>
                <button id="_imp_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">确认导入</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);

        const closeDialog = () => overlay.remove();
        overlay.onclick = (e) => { if(e.target === overlay) closeDialog(); };
        document.getElementById('_imp_cancel').onclick = closeDialog;

        document.getElementById('_imp_confirm').onclick = async function() {
            closeDialog();
            let reloadNeeded = false;

            // 遍历注册表执行导入
            window.APP_DATA_REGISTRY.forEach(reg => {
                if (reg.isVirtual) return; // 虚拟组跳过

                // 判断是否勾选
                let isChecked = false;
                if (reg.group) {
                    // 如果属于组，检查组的勾选状态
                    const groupCb = overlay.querySelector(`[data-imp-id="${reg.group}"]`);
                    if (groupCb) isChecked = groupCb.checked;
                } else {
                    const cb = overlay.querySelector(`[data-imp-id="${reg.id}"]`);
                    if (cb) isChecked = cb.checked;
                }

                if (isChecked && importedData[reg.id] !== undefined) {
                    // 执行赋值或特殊处理
                    if (reg.onImport) {
                        reg.onImport(importedData[reg.id]);
                    } else {
                        _setRegVal(reg.id, importedData[reg.id]);
                    }
                    
                    // 如果是设置或消息，标记可能需要刷新
                    if (reg.id === 'messages' || reg.id === 'settings') reloadNeeded = true;
                }
            });

            await saveData(); // 保存到数据库
            
            // 刷新界面
            if (reloadNeeded) {
                 // 尝试应用设置
                 if (typeof updateUI === 'function') updateUI();
                 if (typeof renderMessages === 'function') renderMessages();
            }
            showNotification('导入成功', 'success');
        };*/
                overlay.innerHTML = `
        <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
            <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:16px;">选择要导入的内容</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">文件中检测到以下数据，选择要导入的模块</div>
            
            <!-- 新增：追加/覆盖 模式选择 -->
            <div style="display:flex;gap:8px;margin-bottom:16px;">
                <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;padding:8px 0;border:1.5px solid var(--accent-color);border-radius:10px;background:rgba(var(--accent-color-rgb,224,105,138),0.1);font-size:12px;color:var(--accent-color);font-weight:600;" id="mode-overwrite-label">
                    <input type="radio" name="import-mode" value="overwrite" checked style="display:none;">
                    覆盖导入
                </label>
                <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;padding:8px 0;border:1.5px solid var(--border-color);border-radius:10px;font-size:12px;color:var(--text-secondary);" id="mode-append-label">
                    <input type="radio" name="import-mode" value="append" style="display:none;">
                    追加导入
                </label>
            </div>

            <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;max-height:40vh;overflow-y:auto;">
                ${rows.join('')}
            </div>
            <div style="display:flex;gap:10px;">
                <button id="_imp_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>
                <button id="_imp_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">确认导入</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        const closeDialog = () => overlay.remove();
        overlay.onclick = (e) => { if(e.target === overlay) closeDialog(); };
        document.getElementById('_imp_cancel').onclick = closeDialog;
        // 给模式按钮绑定切换高亮样式的事件
        const overwriteLabel = document.getElementById('mode-overwrite-label');
        const appendLabel = document.getElementById('mode-append-label');
        if (overwriteLabel && appendLabel) {
            overwriteLabel.addEventListener('click', () => {
                overwriteLabel.style.borderColor = 'var(--accent-color)'; overwriteLabel.style.background = 'rgba(var(--accent-color-rgb,224,105,138),0.1)'; overwriteLabel.style.color = 'var(--accent-color)'; overwriteLabel.style.fontWeight = '600';
                appendLabel.style.borderColor = 'var(--border-color)'; appendLabel.style.background = 'none'; appendLabel.style.color = 'var(--text-secondary)'; appendLabel.style.fontWeight = '400';
            });
            appendLabel.addEventListener('click', () => {
                appendLabel.style.borderColor = 'var(--accent-color)'; appendLabel.style.background = 'rgba(var(--accent-color-rgb,224,105,138),0.1)'; appendLabel.style.color = 'var(--accent-color)'; appendLabel.style.fontWeight = '600';
                overwriteLabel.style.borderColor = 'var(--border-color)'; overwriteLabel.style.background = 'none'; overwriteLabel.style.color = 'var(--text-secondary)'; overwriteLabel.style.fontWeight = '400';
            });
        }

        document.getElementById('_imp_confirm').onclick = async function() {
            closeDialog();
            // 获取用户选择的导入模式
            const modeRadio = overlay.querySelector('input[name="import-mode"]:checked');
            const isAppend = modeRadio && modeRadio.value === 'append';
            
            let reloadNeeded = false;

            // 遍历注册表执行导入
            window.APP_DATA_REGISTRY.forEach(reg => {
                if (reg.isVirtual) return; // 虚拟组跳过

                // 判断是否勾选
                let isChecked = false;
                if (reg.group) {
                    const groupCb = overlay.querySelector(`[data-imp-id="${reg.group}"]`);
                    if (groupCb) isChecked = groupCb.checked;
                } else {
                    const cb = overlay.querySelector(`[data-imp-id="${reg.id}"]`);
                    if (cb) isChecked = cb.checked;
                }

                if (isChecked && importedData[reg.id] !== undefined) {
                    if (isAppend) {
                        // ========= 追加模式逻辑 =========
                        if (reg.id === 'messages') {
                            // 消息追加：获取现有ID集合，过滤掉重复的，然后拼接到末尾
                            const existingIds = new Set(messages.map(m => m.id));
                            const newMsgs = (importedData[reg.id] || []).map(m => ({...m, timestamp: new Date(m.timestamp)}));
                            const uniqueNew = newMsgs.filter(m => !existingIds.has(m.id));
                           // messages = [...messages, ...uniqueNew];
                            messages = [...messages, ...uniqueNew].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // 👈 加上 .sort 按时间排个序
                            reloadNeeded = true;
                        } else if (reg.id === 'settings') {
                            // 设置追加：其实就是合并属性（新属性覆盖旧属性，旧属性保留）
                            Object.assign(settings, importedData[reg.id]);
                            reloadNeeded = true;
                        } else {
                            // 其他数据追加（如字卡、表情、纪念日等数组或对象）
                            const curVal = _getRegVal(reg.id);
                            const incVal = importedData[reg.id];
                            if (Array.isArray(curVal) && Array.isArray(incVal)) {
                                _setRegVal(reg.id, [...curVal, ...incVal]);
                            } else if (typeof curVal === 'object' && curVal !== null && typeof incVal === 'object') {
                                _setRegVal(reg.id, { ...curVal, ...incVal });
                            } else {
                                _setRegVal(reg.id, incVal);
                            }
                        }
                    } else {
                        // ========= 覆盖模式逻辑（保持原样） =========
                        if (reg.onImport) {
                            reg.onImport(importedData[reg.id]);
                        } else {
                            _setRegVal(reg.id, importedData[reg.id]);
                        }
                        if (reg.id === 'messages' || reg.id === 'settings') reloadNeeded = true;
                    }
                }
            });

            await saveData(); // 保存到数据库

            // 刷新界面
            if (reloadNeeded) {
                if (typeof updateUI === 'function') updateUI();
                if (typeof renderMessages === 'function') renderMessages();
            }
            showNotification(isAppend ? '追加导入成功' : '覆盖导入成功', 'success');
        };

    } catch (e) {
        console.error(e);
        showNotification('导入处理出错', 'error');
    }
}


        function fallbackExport(dataStr, fileName) {
            fileName = fileName || `chat-backup-${SESSION_ID}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            showNotification('导出成功', 'success');
        }

        function importChatHistory(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    let rawText = e.target.result;
                    if (rawText.charCodeAt(0) === 0xFEFF) rawText = rawText.slice(1);
                    const importedData = JSON.parse(rawText);

                    const hasMessages  = importedData.messages && Array.isArray(importedData.messages);
                    const hasSettings  = !!importedData.settings;
                    const hasReplies   = importedData.customReplies && Array.isArray(importedData.customReplies);
                    const hasAnn       = importedData.anniversaries && Array.isArray(importedData.anniversaries);
                    const hasThemes    = !!importedData.customThemes || !!importedData.stickerLibrary;

                    if (!hasMessages && !hasSettings && !hasReplies && !hasAnn && !hasThemes) {
                        throw new Error('无效的聊天记录文件（未检测到可识别的数据模块）');
                    }

                    const overlay = document.createElement('div');
                    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';

                    const makeRow = (id, icon, label, sublabel, available, checked) => {
                        if (!available) return '';
                        return `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="${icon}" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>${label}${sublabel ? `<span style="font-size:11px;color:var(--text-secondary);margin-left:4px;">${sublabel}</span>` : ''}</span>
                        </label>`;
                    };

                    overlay.innerHTML = `
                        <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
                            <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                                <i class="fas fa-file-import" style="color:var(--accent-color);font-size:14px;"></i>选择导入内容
                            </div>
                            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">文件中检测到以下数据，选择要导入的模块</div>
                            <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;">
                                ${makeRow('_imp_msgs', 'fas fa-comments', '聊天记录', hasMessages ? `(${importedData.messages.length} 条)` : '', hasMessages, true)}
                                ${makeRow('_imp_settings', 'fas fa-sliders-h', '外观与聊天设置', '', hasSettings, true)}
                                ${makeRow('_imp_replies', 'fa-solid fa-feather-pointed', '字卡回复库', '', hasReplies, false)}
                                ${makeRow('_imp_ann', 'fas fa-calendar-heart', '纪念日 / 倒计时', '', hasAnn, false)}
                                ${makeRow('_imp_themes', 'fas fa-palette', '自定义主题配色', '', hasThemes, false)}
                            </div>
                            <div style="display:flex;gap:10px;">
                                <button id="_imp_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>
                                <button id="_imp_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);display:flex;align-items:center;justify-content:center;gap:7px;">
                                    <i class="fas fa-upload"></i>确认导入
                                </button>
                            </div>
                        </div>`;
                    document.body.appendChild(overlay);

                    function closeDialog() { overlay.remove(); }
                    overlay.addEventListener('click', ev => { if (ev.target === overlay) closeDialog(); });
                    document.getElementById('_imp_cancel').onclick = closeDialog;

                    document.getElementById('_imp_confirm').onclick = function() {
                        const doMsgs     = hasMessages  && document.getElementById('_imp_msgs')?.checked;
                        const doSettings = hasSettings  && document.getElementById('_imp_settings')?.checked;
                        const doReplies  = hasReplies   && document.getElementById('_imp_replies')?.checked;
                        const doAnn      = hasAnn       && document.getElementById('_imp_ann')?.checked;
                        const doThemes   = hasThemes    && document.getElementById('_imp_themes')?.checked;

                        if (!doMsgs && !doSettings && !doReplies && !doAnn && !doThemes) {
                            showNotification('请至少选择一项导入内容', 'error');
                            return;
                        }

                        if (doMsgs && messages.length > 0 && !confirm('导入将覆盖当前会话的聊天记录，确定继续吗？')) return;
                        closeDialog();

                        if (doMsgs) {
                            messages = importedData.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
                        }
                        if (doSettings) {
                            if (importedData.settings) {
                                Object.assign(settings, importedData.settings);
                                try {
                                    if (settings.customFontUrl) applyCustomFont(settings.customFontUrl);
                                    if (settings.customBubbleCss) applyCustomBubbleCss(settings.customBubbleCss);
                                    if (settings.customGlobalCss) applyGlobalThemeCss(settings.customGlobalCss);
                                } catch(e2) { console.warn('导入后样式应用失败', e2); }
                            }
                            if (importedData.dgCustomData) { try { localStorage.setItem('dg_custom_data', JSON.stringify(importedData.dgCustomData)); } catch(e2) {} }
                            if (importedData.dgStatusPool) { try { localStorage.setItem('dg_status_pool', JSON.stringify(importedData.dgStatusPool)); } catch(e2) {} }
                            if (importedData.customWeatherMap) { try { Object.keys(importedData.customWeatherMap).forEach(wk => localStorage.setItem(wk, importedData.customWeatherMap[wk])); } catch(e2) {} }
                        }
                        if (doReplies  && importedData.customReplies)  customReplies  = importedData.customReplies;
                        if (doReplies  && importedData.customEmojis && Array.isArray(importedData.customEmojis)) customEmojis = importedData.customEmojis;
                        if (doAnn      && importedData.anniversaries)   anniversaries  = importedData.anniversaries;
                        if (doThemes   && importedData.customThemes)    customThemes   = importedData.customThemes;
                        if (doThemes   && importedData.stickerLibrary)  stickerLibrary = importedData.stickerLibrary;

                        saveData();
                        if (doMsgs && typeof renderMessages === 'function') renderMessages();
                        if (typeof applySettings === 'function') applySettings();
                        updateUI();
                        const count = doMsgs ? `${messages.length} 条消息` : '所选数据';
                        showNotification(`成功导入${count}`, 'success');
                    };
                } catch (error) {
                    console.error('导入失败:', error);
                    showNotification('文件格式错误或已损坏', 'error');
                }
            };
            reader.onerror = () => showNotification('文件读取失败', 'error');
            reader.readAsText(file);
        }

        const checkStatusChange = () => {
            if ((Date.now() - settings.lastStatusChange) / 36e5 >= settings.nextStatusChange) {
if (customStatuses && customStatuses.length > 0) {
    settings.partnerStatus = getRandomItem(customStatuses);
}
                settings.lastStatusChange = Date.now();
                settings.nextStatusChange = 1 + Math.random() * 7;
                DOMElements.partner.status.textContent = settings.partnerStatus;
                throttledSaveData();
            }
        };



        function getStorageKey(baseKey) {
            if (!SESSION_ID) {
                console.error('[getStorageKey] SESSION_ID 尚未初始化，拒绝生成存储键:', baseKey);
                throw new Error('SESSION_ID 未初始化，存储操作已中止');
            }
            return `${APP_PREFIX}${SESSION_ID}_${baseKey}`;
        }

        async function migrateData() {
            const isMigrated = await localforage.getItem(APP_PREFIX + 'MIGRATION_V2_DONE');
            if (isMigrated) return;

            try {
                const keys = Object.keys(localStorage);
                for (const key of keys) {
                    if (key.startsWith(APP_PREFIX)) {
                        try {
                            const val = localStorage.getItem(key);
                            if (val) {
                                let dataToStore = val;
                                try {
                                    if (val.startsWith('{') || val.startsWith('[')) {
                                        dataToStore = JSON.parse(val);
                                    }
                                } catch (e) {
                                    console.warn(`迁移期间解析数据失败: ${key}，将作为原始字符串存储。`, e);
                                }
                                await localforage.setItem(key, dataToStore);
                            }
                        } catch (e) {
                            console.error(`迁移键值 ${key} 时发生错误，已跳过。`, e);
                        }
                    }
                }
                
                await localforage.setItem(APP_PREFIX + 'MIGRATION_V2_DONE', 'true');
            } catch (e) {
                console.error("数据迁移过程中发生严重错误:", e);
                showNotification('数据迁移失败，部分旧数据可能丢失', 'error');
            }
        }

        async function createNewSession(save = true) {
            const id = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
            const newSession = {
                id: id,
                name: '默认会话',
                createdAt: Date.now()
            };
            sessionList.push(newSession);
            if (save) {
                await localforage.setItem(`${APP_PREFIX}sessionList`, sessionList);
            }
            return id;
        }

        async function initializeSession() {
            
            await migrateData();

            const sessionsData = await localforage.getItem(`${APP_PREFIX}sessionList`);
            sessionList = sessionsData || [];

            const hash = window.location.hash.substring(1);
            if (hash && sessionList.some(s => s.id === hash)) {
                SESSION_ID = hash;
            } else if (sessionList.length > 0) {
                const lastId = await localforage.getItem(`${APP_PREFIX}lastSessionId`);
                SESSION_ID = lastId && sessionList.some(s => s.id === lastId) ? lastId : sessionList[0].id;
            } else {
                SESSION_ID = await createNewSession(false);
            }

            await localforage.setItem(`${APP_PREFIX}lastSessionId`, SESSION_ID);
        }