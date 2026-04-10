/**
 * app.js - Application Entry Point
 * 应用初始化与主入口
 */
// app.js 文件顶部或尾部添加（不要放在任何函数内部）

function showSaveStatus(status) {
  let indicator = document.getElementById('save-indicator');
  if (!indicator) {
    const div = document.createElement('div');
    div.id = 'save-indicator';
    div.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            border-radius: 15px;
            font-size: 12px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        `;
    document.body.appendChild(div);
    indicator = div;
  }

  const statusText = {
    saving: '💾 保存中...',
    saved: '✓ 已保存',
    error: '× 保存失败'
  };

  indicator.textContent = statusText[status] || '';
  indicator.style.opacity = status ? '1' : '0';

  if (status === 'saved') {
    setTimeout(() => {
      indicator.style.opacity = '0';
    }, 2000);
  }
}

// 立即保存函数，用于关键操作
function immediateSaveData() {
  // 这里不要声明 saveData，因为它是全局的，由 core.js 提供
  if (typeof saveData === 'function') {
    return saveData().then(() => {
      console.log('[immediateSaveData] 数据已立即保存');
    }).catch(e => {
      console.error('[immediateSaveData] 保存失败:', e);
      showNotification('数据保存失败，请检查存储空间', 'error');
    });
  }
  return Promise.resolve();
}


document.addEventListener('DOMContentLoaded', async () => {
    const loaderBar = document.getElementById('loader-tech-bar');
    const welcomeSubtitle = document.querySelector('.welcome-subtitle-scramble');
    const welcomeScreen = document.getElementById('welcome-animation');
    const disclaimerModal = document.getElementById('disclaimer-modal');
    const acceptDisclaimerBtn = document.getElementById('accept-disclaimer');

    const updateLoader = (text, width) => {
        if (welcomeSubtitle) welcomeSubtitle.textContent = text;
        if (loaderBar) loaderBar.style.width = width;
    };

    const hideWelcomeScreen = () => {
        if (!welcomeScreen) return;
        welcomeScreen.classList.add('hidden');
        setTimeout(() => {
            welcomeScreen.style.display = 'none';
        }, 800);
    };

    const safeAwait = async (promise, fallback = null) => {
        try {
            return await promise;
        } catch (error) {
            console.error('操作失败:', error);
            return fallback;
        }
    };

    try {
      /* safeAwait(Promise.all([
            setupEventListeners?.(),
            initThemeEditor?.(),
            initAnniversaryModule?.(),
            initMoodListeners?.(),
            initDecisionModule?.(),
            initComboMenu?.()
        ]));

        if (typeof localforage === 'undefined') {
            console.warn('LocalForage 未加载，将使用 localStorage 降级方案');
        }

        updateLoader('正在建立安全连接...', '10%');
        await safeAwait(initializeSession());*/
        // ========== 修改后 ==========
        if (typeof localforage === 'undefined') {
        console.warn('LocalForage 未加载，将使用 localStorage 降级方案');
        }
        updateLoader('正在建立安全连接...', '10%');

        // 👇 先初始化 SESSION_ID，再执行其他模块
        await safeAwait(initializeSession());

        safeAwait(Promise.all([
        setupEventListeners?.(),
        initThemeEditor?.(),
        // initAnniversaryModule?.(),  ← 删掉这行，setupEventListeners 里面已经调过了
        initMoodListeners?.(),
        initDecisionModule?.(),
        initComboMenu?.()
        ]));


        updateLoader('正在读取记忆存档...', '40%');
        await safeAwait(loadData());
        // ========== 强制修复：确保新增的设置项能被正确读取和保存 ==========
        if (typeof settings.keepKeyboardAlive === 'undefined') {
            settings.keepKeyboardAlive = false;
        }
        // 无论存没存进去，都强行同步给全局变量
        window._keepKeyboardAlive = !!settings.keepKeyboardAlive;

        // ====== 页面加载时，恢复用户自定义的字体设置 ======
        if (settings.customFontUrl && settings.customFontUrl.trim()) {
        applyCustomFont(settings.customFontUrl.trim()).catch(err => {
            console.warn('初始化加载自定义字体失败，已回退默认字体:', err);
        });
        } else if (settings.messageFontFamily) {
        // 如果之前存过字体栈（比如跟随系统），也直接应用
        document.documentElement.style.setProperty('--font-family', settings.messageFontFamily);
        document.documentElement.style.setProperty('--message-font-family', settings.messageFontFamily);
        }

        updateLoader('正在渲染我们的世界...', '70%');
        
        await Promise.allSettled([
            safeAwait(initializeRandomUI?.()),
           // safeAwait(initMusicPlayer?.())
        ]);

        setInterval(checkStatusChange, 60000);

        if (disclaimerModal) {
            const tourSeen = await safeAwait(localforage?.getItem(APP_PREFIX + 'tour_seen'), false);
            
            if (!tourSeen) {
                showModal(disclaimerModal);
                
                if (acceptDisclaimerBtn) {
                    acceptDisclaimerBtn.addEventListener('click', () => {
                        hideModal(disclaimerModal);
                        if (typeof startTour === 'function') startTour();
                    }, { once: true }); 
                }
            }
        }
        
          // 初始化合并日历
        if (typeof initCombinedCalendar === 'function') {
            initCombinedCalendar();
        }
        
        if (acceptDisclaimerBtn && !acceptDisclaimerBtn._closeFixed) {
            acceptDisclaimerBtn._closeFixed = true;
            acceptDisclaimerBtn.addEventListener('click', () => {
                if (disclaimerModal && disclaimerModal.style.display !== 'none') {
                    hideModal(disclaimerModal);
                }
            });
        }

        updateLoader('连接成功，欢迎回来。', '100%');
        setTimeout(hideWelcomeScreen, 3500);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                clearTimeout(saveTimeout);
                saveData().catch(e => console.error('[visibilitychange] 保存失败:', e));
            }
        });

        window.addEventListener('pagehide', () => {
            _backupCriticalData(); 
        });

        window.addEventListener('beforeunload', () => {
            _backupCriticalData();
        });

        setInterval(() => {
            saveData().catch(e => console.warn('[autoBackup] 定时保存失败:', e));
        }, 30 * 1000);// 每30秒保存一次

        (() => {
            const REMIND_KEY = 'exportReminderLastShown';
            const last = parseInt(localStorage.getItem(REMIND_KEY) || '0', 10);
            const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
            if (daysSince >= 7) {
                setTimeout(() => {
                    showNotification('建议定期导出备份，防止数据意外丢失', 'info', 7000);
                    localStorage.setItem(REMIND_KEY, String(Date.now()));
                }, 8000);
            }
        })();

        setTimeout(async () => {
            if ('Notification' in window && Notification.permission === 'default') {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        showNotification('已开启系统通知，收到消息时会提醒你 ✨', 'success', 3000);
                    }
                } catch(e) {
                    console.warn('通知权限请求失败:', e);
                }
            }
        }, 3000);

    } catch (err) {
        console.error('严重初始化错误:', err);
        updateLoader('加载遇到问题，已强制进入...', '100%');
        setTimeout(hideWelcomeScreen, 3500);
    }

});
const stickerInput = document.getElementById('sticker-file-input');
            if (stickerInput) {
                stickerInput.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    if (!files.length) return;

                    const oversized = files.filter(f => f.size > 2 * 1024 * 1024);
                    if (oversized.length > 0) {
                        showNotification(oversized.length + ' 张图片超过 2MB 限制，已跳过', 'warning');
                    }

                    const validFiles = files.filter(f => f.size <= 2 * 1024 * 1024);
                    if (!validFiles.length) return;

                    showNotification('正在批量处理 ' + validFiles.length + ' 张图片...', 'info');

                    let successCount = 0;
                    let failCount = 0;

                    for (const file of validFiles) {
                        try {
                            const base64 = await optimizeImage(file, 300, 0.8);
                            stickerLibrary.push(base64);
                            successCount++;
                        } catch (err) {
                            console.error(err);
                            failCount++;
                        }
                    }

                    throttledSaveData();
                    renderReplyLibrary();

                    if (failCount > 0) {
                        showNotification('上传完成：' + successCount + ' 张成功，' + failCount + ' 张失败', 'warning');
                    } else {
                        showNotification('上传成功，共 ' + successCount + ' 张', 'success');
                    }

                    e.target.value = '';
                });
            }
const myStickerQuickUpload = document.getElementById('my-sticker-quick-upload');
if (myStickerQuickUpload) {
    myStickerQuickUpload.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const oversized = files.filter(f => f.size > 2 * 1024 * 1024);
        if (oversized.length > 0) showNotification(oversized.length + ' 张图片超过 2MB，已跳过', 'warning');
        const validFiles = files.filter(f => f.size <= 2 * 1024 * 1024);
        if (!validFiles.length) return;
        showNotification('正在处理 ' + validFiles.length + ' 张...', 'info');
        let ok = 0, fail = 0;
        for (const file of validFiles) {
            try {
                const base64 = await optimizeImage(file, 300, 0.8);
                myStickerLibrary.push(base64);
                ok++;
            } catch(err) { fail++; }
        }
        throttledSaveData();
        if (typeof renderComboContent === 'function') renderComboContent('my-sticker');
        showNotification(fail > 0 ? `上传完成：${ok} 成功 ${fail} 失败` : `✓ 已添加 ${ok} 张到我的表情库`, fail > 0 ? 'warning' : 'success');
        e.target.value = '';
    });
}

window.addEventListener('load', function() {
    setTimeout(function() {
        try {
            if (localStorage.getItem('dailyGreetingShown') === new Date().toDateString()) return;
            try { if (typeof checkPartnerDailyMood === 'function') checkPartnerDailyMood(); } catch(e2) { console.warn('checkPartnerDailyMood error:', e2); }
            if (typeof _buildDailyGreeting === 'function') _buildDailyGreeting();
            if (window.localforage && window.APP_PREFIX) {
                localforage.getItem(window.APP_PREFIX + 'tour_seen').then(function(seen) {
                    if (seen) {
                        var modal = document.getElementById('daily-greeting-modal');
                        if (modal) modal.classList.remove('hidden');
                        localStorage.setItem('dailyGreetingShown', new Date().toDateString());
                    }
                }).catch(function() {
                    var modal = document.getElementById('daily-greeting-modal');
                    if (modal) modal.classList.remove('hidden');
                    localStorage.setItem('dailyGreetingShown', new Date().toDateString());
                });
            } else {
                var modal = document.getElementById('daily-greeting-modal');
                if (modal) modal.classList.remove('hidden');
                localStorage.setItem('dailyGreetingShown', new Date().toDateString());
            }
        } catch(e) { console.warn('Daily greeting timing error:', e); }
    }, 4500);
}, { once: true });
