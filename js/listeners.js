/**
 * listeners.js - Event Listeners & Initialization
 * 事件监听器与初始化函数
 */

function setupEventListeners() {
    try {
        initCoreListeners();
        initModalListeners();
        initChatActionListeners();
        initHeaderAndSettingsListeners();
        initDataManagementListeners();
        initNewFeatureListeners();
        //setupTutorialListeners();
        initMoodListeners();
        initDecisionModule(); 
        initAnniversaryModule(); 
        initThemeEditor(); 
        initThemeSchemes();
        initPeriodListeners(); 
       // initComboMenu(); 
        initCalendar(); 
        initHomeShortcuts();
    } catch (e) {
        console.error("事件绑定过程中发生错误:", e);
    }
}

function initChatActionListeners() {
    DOMElements.chatContainer.addEventListener('click', (e) => {

        if (isBatchFavoriteMode) {
            const wrapper = e.target.closest('.message-wrapper');
            if (wrapper && !e.target.closest('.message-meta-actions')) {
                const messageId = Number(wrapper.dataset.id);
                const index = selectedMessages.indexOf(messageId);

                if (index > -1) {
                    selectedMessages.splice(index, 1);
                    wrapper.classList.remove('selected');
                } else {
                    selectedMessages.push(messageId);
                    wrapper.classList.add('selected');
                }

                const confirmBtn = document.getElementById('confirm-batch-favorite');
                if (confirmBtn) {
                    confirmBtn.textContent = `确认收藏 (${selectedMessages.length})`;
                }
                return;
            }
        }

        const favoriteBtn = e.target.closest('.favorite-action-btn'); 
        if (favoriteBtn) {
            const wrapper = e.target.closest('.message-wrapper');
            const messageId = Number(wrapper.dataset.id);
            const message = messages.find(m => m.id === messageId);
            
            if (message) {
                message.favorited = !message.favorited;
                
                showNotification(message.favorited ? '已收藏': '已取消收藏', 'success', 1500);
                playSound('favorite');
                
                throttledSaveData();
                
                renderMessages(true);
            }
            return;
        }

        const target = e.target.closest('.meta-action-btn');
        if (!target) return;
        
        const wrapper = e.target.closest('.message-wrapper');
        if (!wrapper) return; 
        
        const messageId = Number(wrapper.dataset.id);
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        if (target.classList.contains('delete-btn')) {
            if (confirm('确定要删除这条消息吗？')) {
                const index = messages.findIndex(m => m.id === messageId);
                if (index > -1) {
                    const savedScrollTop = DOMElements.chatContainer.scrollTop;
                    messages.splice(index, 1); 
                    throttledSaveData(); 
                    renderMessages(true);
                    requestAnimationFrame(() => {
                        DOMElements.chatContainer.scrollTop = savedScrollTop;
                    });
                    showNotification('消息已删除', 'success');
                }
            }
            return;
        }
      // 🌟 新增：复制消息逻辑
      if (target.classList.contains('copy-btn')) {
        const textToCopy = message.text;
        if (!textToCopy) return;
        
        // 优先使用现代剪贴板 API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            showNotification('已复制到剪贴板', 'success', 1000);
          }).catch(() => {
            _fallbackCopy(textToCopy);
          });
        } else {
          _fallbackCopy(textToCopy);
        }
        return;
      }

        // 新增：编辑消息逻辑        
        if (target.classList.contains('edit-btn')) {
            const wrapper = e.target.closest('.message-wrapper');
            const messageId = Number(wrapper.dataset.id);
            const message = messages.find(m => m.id === messageId);
            
            if (!message) return;

            // 修正：使用 DOMElements.editModal
            if (DOMElements.editModal && DOMElements.editModal.modal) {
                showModal(DOMElements.editModal.modal, DOMElements.editModal.input);
                DOMElements.editModal.title.textContent = '编辑消息内容';
                DOMElements.editModal.input.value = message.text || ''; 
                DOMElements.editModal.save.disabled = false; 

                // 重新绑定保存按钮的事件
                DOMElements.editModal.save.onclick = () => {
                    const newText = DOMElements.editModal.input.value.trim();
                    
                    if (!newText && !message.image) {
                        showNotification('消息内容不能为空', 'error');
                        return;
                    }
                    
                    message.text = newText; // 更新内存中的消息
                    throttledSaveData();     // 保存数据
                    renderMessages(true);    // 刷新界面
                    hideModal(DOMElements.editModal.modal); // 关闭弹窗
                    showNotification('消息已修改', 'success');
                };
            }
            return;
        }

        
        if (target.classList.contains('reply-btn')) {
            currentReplyTo = {
                id: message.id,
                sender: message.sender,
                text: message.text
            };
            updateReplyPreview();
            DOMElements.messageInput.focus();
            const targetMessageElement = DOMElements.chatContainer.querySelector(`[data-id="${message.id}"]`);
            if (targetMessageElement) targetMessageElement.scrollIntoView({
                behavior: 'smooth', block: 'center'
            });
            return;
        } 
        throttledSaveData();
    });
      // 🛡️ 终极防线：使用 mousedown 抢跑！
    DOMElements.sendBtn.addEventListener('mousedown', (e) => {
        const text = DOMElements.messageInput.value.trim();
        const imageFile = DOMElements.imageInput.files[0];
        if (text || imageFile) {
            // 1. 瞬间打上保活标记（此时焦点还在输入框，稳如泰山！）
            DOMElements.messageInput.dataset.keepFocus = window._keepKeyboardAlive ? '1' : '0';
            // 2. 发送消息
            sendMessage();
        }
        // 3. 杀死浏览器的默认行为，绝不允许它再触发后续的焦点夺夺和 click 事件！
        e.preventDefault(); 
        e.stopPropagation(); 
        return false;
    });

// ========== 继续回复弹出按钮组逻辑 ==========
    const continueBtn = document.getElementById('continue-btn');
    const continueSubBtns = document.getElementById('continue-sub-btns');
    const continueReplyBtn = document.getElementById('continue-reply-btn');
    const shutUpBtn = document.getElementById('shutUpBtn');

    // 点击大按钮：切换弹出菜单
    if (continueBtn) {
        continueBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = continueSubBtns.classList.contains('active');
            // 先关闭页面上所有其他弹出层（避免叠加）
            document.querySelectorAll('.continue-sub-btns.active').forEach(el => {
                if (el !== continueSubBtns) el.classList.remove('active');
            });
            if (isActive) {
                continueSubBtns.classList.remove('active');
            } else {
                continueSubBtns.classList.add('active');
            }
        });
    }

    // 子按钮：继续回复
    if (continueReplyBtn) {
        continueReplyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            continueSubBtns.classList.remove('active');
            simulateReply();
        });
    }

    // 子按钮：打断对方回复
    if (shutUpBtn) {
        shutUpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            continueSubBtns.classList.remove('active');
            if (typeof window.cancelPartnerReply === 'function') {
                window.cancelPartnerReply();
                showNotification('已打断对方回复', 'success', 1500);
            }
        });
    }

          // 兼容旧浏览器/非HTTPS环境的复制方法
    function _fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          showNotification('已复制到剪贴板', 'success', 1000);
        } catch (e) {
          showNotification('复制失败，请手动复制', 'error');
        }
        document.body.removeChild(ta);
      }

    // 点击页面其他任意位置，自动收起弹出菜单
    document.addEventListener('click', (e) => {
        if (continueSubBtns && !continueSubBtns.contains(e.target)) {
            continueSubBtns.classList.remove('active');
        }
    });
}
function initModalListeners() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const cancelBtns = modal.querySelectorAll('.modal-buttons .modal-btn-secondary');
        cancelBtns.forEach(cancelBtn => {
            if (!cancelBtn.getAttribute('onclick') && !cancelBtn.dataset.noAutoClose) {
                cancelBtn.addEventListener('click', () => hideModal(modal));
            }
        });
    });

    const closeChatBtn = document.getElementById('close-chat');
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            hideModal(DOMElements.chatModal.modal);
        });
    }

    const closeDataBtn = document.getElementById('close-data');
    if (closeDataBtn) {
        closeDataBtn.addEventListener('click', () => {
            hideModal(DOMElements.dataModal.modal);
        });
    }



    const themeModeToggle = document.getElementById('theme-mode-toggle');
        if (themeModeToggle) {
            themeModeToggle.checked = settings.isDarkMode;
            
            themeModeToggle.addEventListener('change', () => {
                settings.isDarkMode = themeModeToggle.checked;
                throttledSaveData();
                updateUI();
                
                showNotification(settings.isDarkMode ? '已切换到夜间模式' : '已切换到日间模式', 'success');
            });
        }


    DOMElements.editModal.input.addEventListener('input', () => {
        DOMElements.editModal.save.disabled = !DOMElements.editModal.input.value.trim();
    });

    


    DOMElements.cancelCoinResult.addEventListener('click', () => {
        DOMElements.coinTossOverlay.classList.remove('visible', 'finished');
        lastCoinResult = null;
    });


    DOMElements.sendCoinResult.addEventListener('click', () => {
        if (lastCoinResult) {
            sendMessage(`🎲 抛硬币结果：${lastCoinResult}`, 'normal');
            DOMElements.coinTossOverlay.classList.remove('visible', 'finished');
            lastCoinResult = null;
        }
    });


    const retryBtn = document.getElementById('retry-coin-toss');

    if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            startCoinFlipAnimation();
        });
    }
}


        function initHeaderAndSettingsListeners() {
            // ========== 本地字体多文件管理 ==========
            async function renderLocalFontList() {
                let container = document.getElementById('local-font-list');
                if (!container) {
                    const btn = document.getElementById('local-font-upload-btn');
                    if (!btn) return;
                    container = document.createElement('div');
                    container.id = 'local-font-list';
                    container.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px;';
                    btn.parentNode.insertBefore(container, btn.nextSibling);
                }

                let fontList = await localforage.getItem(`${APP_PREFIX}local_font_list`) || [];
                
                // 🌟 加上这一段：过滤掉没有 blob 的僵尸记录
                const validList = fontList.filter(f => f && f.buffer && f.buffer.byteLength > 0);
                
                // 🌟 如果过滤后变空了，说明数据全坏了，自动修复状态！
                if (validList.length === 0 && fontList.length > 0) {
                    console.warn('[字体] 检测到僵尸记录，自动清理');
                    await localforage.removeItem(`${APP_PREFIX}local_font_list`);
                    settings.useLocalFont = false;
                    settings.activeLocalFontId = null;
                    throttledSaveData();
                    
                    // 把上传按钮还回去
                    const localFontBtn = document.getElementById('local-font-upload-btn');
                    if (localFontBtn) localFontBtn.style.display = '';
                    const localFontNameEl = document.getElementById('local-font-name');
                    if (localFontNameEl) {
                        localFontNameEl.textContent = '支持 .ttf / .woff / .woff2 / .otf 格式';
                        localFontNameEl.style.cssText = 'padding:10px 14px;';
                    }
                    container.innerHTML = '';
                    return;
                }

                if (validList.length === 0) {
                    container.innerHTML = '';
                    return;
                }
                const activeId = settings.activeLocalFontId;
                container.innerHTML = validList.map(f => {
                    const on = f.id === activeId;
                    return `<div class="lf-item" data-id="${f.id}" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;cursor:pointer;border:1.5px solid ${on ? 'var(--accent-color)' : 'var(--border-color)'};background:${on ? 'rgba(var(--accent-color-rgb),0.06)' : 'var(--primary-bg)'};transition:all 0.15s;">
                        <i class="fas fa-file-alt" style="color:${on ? 'var(--accent-color)' : 'var(--text-secondary)'};font-size:14px;flex-shrink:0;"></i>
                        <span style="flex:1;font-size:12px;color:${on ? 'var(--accent-color)' : 'var(--text-primary)'};font-weight:${on ? '600' : '400'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.name}</span>
                        ${on ? '<span style="font-size:10px;color:var(--accent-color);opacity:.7;">使用中</span>' : ''}
                        <button class="lf-del" data-id="${f.id}" style="width:22px;height:22px;border-radius:6px;border:none;background:transparent;color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;opacity:0;transition:opacity .15s;flex-shrink:0;"><i class="fas fa-times"></i></button>
                    </div>`;
                }).join('');
                container.querySelectorAll('.lf-item').forEach(el => {
                    el.onmouseenter = () => el.querySelector('.lf-del').style.opacity = '1';
                    el.onmouseleave = () => el.querySelector('.lf-del').style.opacity = '0';
                    el.onclick = (e) => { if (!e.target.closest('.lf-del')) switchLocalFont(el.dataset.id); };
                    el.querySelector('.lf-del').onclick = (e) => { e.stopPropagation(); deleteLocalFont(el.dataset.id); };
                });
            }
            // 覆盖全局的 getActiveFontSource，兼容新旧两种存储格式
            window.getActiveFontSource = async function() {
                if (!settings.useLocalFont || !settings.activeLocalFontId) return settings.customFontUrl || '';
                const fontList = await localforage.getItem(`${APP_PREFIX}local_font_list`) || [];
                const target = fontList.find(f => f.id === settings.activeLocalFontId);
                if (!target) return '';
                if (target.buffer && target.buffer.byteLength > 0) {
                    return URL.createObjectURL(new Blob([target.buffer], { type: target.type || 'font/ttf' }));
                }
                return '';
            };

            async function switchLocalFont(fontId) {
                settings.useLocalFont = true;
                settings.activeLocalFontId = fontId;
                settings.customFontUrl = '';
                const src = await getActiveFontSource();
                if (src) await applyCustomFont(src);
                if (fontUrlInput) fontUrlInput.value = '';
                throttledSaveData(); renderLocalFontList(); renderMessages(true);
                showNotification('已切换字体', 'success');
            }
            async function deleteLocalFont(fontId) {
                let list = await localforage.getItem(`${APP_PREFIX}local_font_list`) || [];
                list = list.filter(f => f.id !== fontId);
                await localforage.setItem(`${APP_PREFIX}local_font_list`, list);
                if (settings.activeLocalFontId === fontId) {
                    if (list.length > 0) {
                        settings.activeLocalFontId = list[0].id;
                        const src = await getActiveFontSource();
                        if (src) await applyCustomFont(src);
                    } else {
                        settings.activeLocalFontId = null;
                        settings.useLocalFont = false;
                        await applyCustomFont('');
                    }
                    renderMessages(true);
                }
                throttledSaveData(); renderLocalFontList();
                showNotification('已删除字体', 'success');
            }
            const openNameModal = (isPartner) => {
                const modal = DOMElements.editModal;
                showModal(modal.modal, modal.input);
                modal.title.textContent = `修改${isPartner ? (settings.partnerName || '对方'): '我'}的昵称`;
                modal.input.value = isPartner ? settings.partnerName: settings.myName;
                modal.save.disabled = !modal.input.value.trim();
                modal.save.onclick = () => {
                    const newName = modal.input.value.trim();
                    if (newName) {
                        isPartner ? settings.partnerName = newName: settings.myName = newName;
                        throttledSaveData();
                        updateUI();
                        showNotification('昵称已更新', 'success');
                    }
                    hideModal(modal.modal);
                };
            };

            const openAvatarModal = (isPartner) => {
                const modal = DOMElements.avatarModal;

                modal.modal.querySelector('.modal-content').innerHTML = `
            <div class="modal-title"><i class="fas fa-portrait"></i><span>上传${isPartner ? '对方': '我'}的头像</span></div>
            <div style="margin-bottom: 16px;">
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <button class="modal-btn modal-btn-secondary" id="upload-file-btn" style="flex: 1;">选择文件</button>
            <button class="modal-btn modal-btn-secondary" id="paste-url-btn" style="flex: 1;">粘贴URL</button>
            </div>
            <input type="file" class="modal-input" id="avatar-file-input" accept="image/*" style="display: none;">
            <input type="text" class="modal-input" id="avatar-url-input" placeholder="输入图片URL地址" style="display: none;">
            <div id="avatar-preview" style="text-align: center; margin-top: 10px; display: none;">
            <img id="preview-image" style="max-width: 100px; max-height: 100px; border-radius: 50%; border: 2px solid var(--border-color);">
            </div>
            </div>
            <div class="modal-buttons">
            <button class="modal-btn modal-btn-secondary" id="cancel-avatar">取消</button>
            <button class="modal-btn modal-btn-primary" id="save-avatar" disabled>保存</button>
            </div>
            `;

                showModal(modal.modal);

                const fileInput = document.getElementById('avatar-file-input');
                const urlInput = document.getElementById('avatar-url-input');
                const uploadBtn = document.getElementById('upload-file-btn');
                const pasteUrlBtn = document.getElementById('paste-url-btn');
                const previewDiv = document.getElementById('avatar-preview');
                const previewImg = document.getElementById('preview-image');
                const saveBtn = document.getElementById('save-avatar');
                const cancelBtn = document.getElementById('cancel-avatar');

                let currentAvatarData = null;


                uploadBtn.addEventListener('click', () => {
                    fileInput.click();
                    urlInput.style.display = 'none';
                    uploadBtn.classList.add('active');
                    pasteUrlBtn.classList.remove('active');
                });


                pasteUrlBtn.addEventListener('click', () => {
                    urlInput.style.display = 'block';
                    fileInput.style.display = 'none';
                    pasteUrlBtn.classList.add('active');
                    uploadBtn.classList.remove('active');
                    urlInput.focus();
                });


                fileInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > MAX_AVATAR_SIZE) {
                            showNotification('头像图片不能超过2MB', 'error');
                            return;
                        }

                        showNotification('正在裁剪处理...', 'info', 1000);
                        
                        cropImageToSquare(file, 300).then(base64Data => {
                            currentAvatarData = base64Data;
                            previewImg.src = currentAvatarData;
                            previewDiv.style.display = 'block';
                            saveBtn.disabled = false;
                        }).catch(err => {
                            console.error(err);
                            showNotification('图片处理失败', 'error');
                        });
                    }
                });


                urlInput.addEventListener('input',
                    function() {
                        const url = urlInput.value.trim();
                        if (url) {

                            if (/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))$/i.test(url)) {
                                previewImg.src = url;
                                previewDiv.style.display = 'block';
                                currentAvatarData = url;
                                saveBtn.disabled = false;


                                const img = new Image();
                                img.onload = function() {

                                    previewImg.src = url;
                                };
                                img.onerror = function() {
                                    showNotification('图片URL无效或无法访问', 'error');
                                    saveBtn.disabled = true;
                                };
                                img.src = url;
                            } else {
                                saveBtn.disabled = true;
                            }
                        } else {
                            saveBtn.disabled = true;
                            previewDiv.style.display = 'none';
                        }
                    });


                saveBtn.addEventListener('click',
                    () => {
                        if (currentAvatarData) {
                            updateAvatar(isPartner ? DOMElements.partner.avatar: DOMElements.me.avatar, currentAvatarData);
                            throttledSaveData();
                            showNotification('头像已更新', 'success');
                            hideModal(modal.modal);
                        }
                    });


                cancelBtn.addEventListener('click',
                    () => {
                        hideModal(modal.modal);
                    });
            };

            DOMElements.partner.name.addEventListener('click', () => openNameModal(true));
            DOMElements.me.name.addEventListener('click', () => openNameModal(false));
            DOMElements.partner.avatar.addEventListener('click', () => openAvatarModal(true));
            DOMElements.me.avatar.addEventListener('click', () => openAvatarModal(false));

            DOMElements.me.statusContainer.addEventListener('click', () => {
                const statusTextElement = DOMElements.me.statusText; const statusContainer = DOMElements.me.statusContainer;
                if (statusContainer.querySelector('input')) return;
                const input = document.createElement('input'); input.type = 'text'; input.id = 'my-status-input'; input.value = statusTextElement.textContent;
                const saveStatus = () => {
                    const newStatus = input.value.trim();
                    if (newStatus) {
                        settings.myStatus = newStatus; showNotification('状态已更新', 'success');
                    } else {
                        settings.myStatus = "在线";
                    }
                    statusTextElement.textContent = settings.myStatus;
                    statusContainer.innerHTML = '';
                    statusContainer.appendChild(statusTextElement);
                    throttledSaveData();
                };
                input.addEventListener('blur', saveStatus);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') input.blur();
                });
                statusContainer.innerHTML = ''; statusContainer.appendChild(input); input.focus();
            });

            // 主题切换按钮已移到外观设置中
            const themeToggleBtn = document.getElementById('theme-toggle');
            if (themeToggleBtn) {
                themeToggleBtn.addEventListener('click', () => {
                    settings.isDarkMode = !settings.isDarkMode; 
                    throttledSaveData(); 
                    updateUI(); 
                    showNotification(`已切换到${settings.isDarkMode ? '夜': '昼'}模式`, 'success');
                });
            }

            DOMElements.settingsModal.settingsBtn.addEventListener('click', () => {
                showModal(DOMElements.settingsModal.modal);
            });
            // 日历快捷按钮
            const calendarShortcutBtn = document.getElementById('calendar-shortcut-btn');
            if (calendarShortcutBtn) {
                calendarShortcutBtn.addEventListener('click', () => {
                    renderCalendar(); 
                    showModal(document.getElementById('calendar-modal'));
                });
            }
            // 回复库快捷按钮
            const replyLibraryBtn = document.getElementById('reply-library-btn');
            if (replyLibraryBtn) {
                replyLibraryBtn.addEventListener('click', () => {
                    renderReplyLibrary();
                    showModal(document.getElementById('custom-replies-modal'));
                });
            }
            // 月经快捷按钮
           /* const periodShortcutBtn = document.getElementById('period-shortcut-btn');
            if (periodShortcutBtn) {
                periodShortcutBtn.addEventListener('click', () => {
                    updatePeriodUI(); 
                    showModal(document.getElementById('period-modal'));
                });
            }*/
           // 高级功能快捷按钮 (原月经按钮)
            const advancedShortcutBtn = document.getElementById('advanced-shortcut-btn');
            if (advancedShortcutBtn) {
                advancedShortcutBtn.addEventListener('click', () => {
                    showModal(DOMElements.advancedModal.modal);
                });
            }



window.setReadReceiptStyle = function(style) {
    settings.readReceiptStyle = style;
    throttledSaveData();
    const iconBtn = document.getElementById('rr-style-icon');
    const textBtn = document.getElementById('rr-style-text');
    if (iconBtn) { iconBtn.className = style === 'icon' ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary'; iconBtn.style.cssText = 'padding:5px 12px;font-size:12px;'; }
    if (textBtn) { textBtn.className = style === 'text' ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary'; textBtn.style.cssText = 'padding:5px 12px;font-size:12px;'; }
    renderMessages();
    showNotification('已读回执样式已更新', 'success');
};

document.getElementById('chat-settings').addEventListener('click', () => {
    hideModal(DOMElements.settingsModal.modal);
    
    const toggleSyncMap = {
        '#reply-toggle': { prop: 'replyEnabled', name: '引用回复' },
        '#sound-toggle': { prop: 'soundEnabled', name: '音效' },
        '#read-receipts-toggle': { prop: 'readReceiptsEnabled', name: '已读回执' },
        '#typing-indicator-toggle': { prop: 'typingIndicatorEnabled', name: '正在输入' },
        '#read-no-reply-toggle': { prop: 'allowReadNoReply', name: '已读不回' },
        '#emoji-mix-toggle': { prop: 'emojiMixEnabled', name: '表情消息' },
        //'#enter-send-toggle': { prop: 'enterToSendEnabled', name: '回车发送消息' }
    };
    for (const [selector, { prop }] of Object.entries(toggleSyncMap)) {
        const el = document.querySelector(selector);
        const val = prop === 'emojiMixEnabled' ? (settings[prop] !== false) : !!settings[prop];
        if (el) el.classList.toggle('active', val);
    }
    const svSlider = document.getElementById('sound-volume-slider');
    const svVal = document.getElementById('sound-volume-value');
    if (svSlider) { svSlider.value = Math.round((settings.soundVolume || 0.15) * 100); if (svVal) svVal.textContent = svSlider.value + '%'; }
   // const csi = document.getElementById('custom-sound-url-input');
  //  if (csi) csi.value = settings.customSoundUrl || '';
    document.querySelectorAll('.time-fmt-opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.fmt === (settings.timeFormat || 'HH:mm'));
    });
    //const autoToggle = document.getElementById('auto-send-toggle');
    //if (autoToggle) autoToggle.classList.toggle('active', !!settings.autoSendEnabled);
    updateAutoSendUI();
    const boardWriteToggle = document.getElementById('board-partner-write-toggle');
    if (boardWriteToggle) boardWriteToggle.classList.toggle('active', !!settings.boardPartnerWriteEnabled);
    updateDelayUI();
    updateRnrUI(); 
    const immToggle = document.getElementById('immersive-toggle');
    if (immToggle) immToggle.classList.toggle('active', document.body.classList.contains('immersive-mode'));
    const rrStyle = settings.readReceiptStyle || 'icon';
    const rrIconBtn = document.getElementById('rr-style-icon');
    const rrTextBtn = document.getElementById('rr-style-text');
    if (rrIconBtn) { rrIconBtn.className = rrStyle === 'icon' ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary'; rrIconBtn.style.cssText = 'padding:5px 12px;font-size:12px;'; }
    if (rrTextBtn) { rrTextBtn.className = rrStyle === 'text' ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary'; rrTextBtn.style.cssText = 'padding:5px 12px;font-size:12px;'; }
    
    showModal(DOMElements.chatModal.modal);
    setupAvatarFrameSettings();
});
            document.getElementById('advanced-settings').addEventListener('click', () => {
                hideModal(DOMElements.settingsModal.modal);
                showModal(DOMElements.advancedModal.modal);
            });

            document.getElementById('data-settings').addEventListener('click', () => {
                hideModal(DOMElements.settingsModal.modal);
                showModal(DOMElements.dataModal.modal);
                (async function calcDmStorage() {
                    try {
                        let total = 0, msgsSize = 0, settingsSize = 0, mediaSize = 0;
                        const keys = await localforage.keys();
                        for (const k of keys) {
                            const raw = await localforage.getItem(k);
                            const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
                            const bytes = new Blob([str]).size;
                            total += bytes;
                            if (/messages|msgs/i.test(k)) msgsSize += bytes;
                            else if (/avatar|image|photo|bg|background|wallpaper/i.test(k)) mediaSize += bytes;
                            else settingsSize += bytes;
                        }
                        const fmt = b => b > 1048576 ? (b/1048576).toFixed(1)+'MB' : b > 1024 ? (b/1024).toFixed(0)+'KB' : b+'B';
                        const MAX = 5 * 1024 * 1024;
                        const pct = Math.min(100, Math.round(total / MAX * 100));
                        const barEl = document.getElementById('dm-storage-bar');
                        const totalEl = document.getElementById('dm-storage-total');
                        if (barEl) barEl.style.width = pct + '%';
                        if (totalEl) totalEl.textContent = fmt(total);
                        const msgsEl = document.getElementById('dm-stat-msgs');
                        const setEl = document.getElementById('dm-stat-settings');
                        const medEl = document.getElementById('dm-stat-media');
                        if (msgsEl) msgsEl.textContent = fmt(msgsSize);
                        if (setEl) setEl.textContent = fmt(settingsSize);
                        if (medEl) medEl.textContent = fmt(mediaSize);
                    } catch(e) {
                        const totalEl = document.getElementById('dm-storage-total');
                        if (totalEl) totalEl.textContent = '无法读取';
                    }
                })();
            });
            const exportChatBtnDm = document.getElementById('export-chat-btn');
            const importChatBtnDm = document.getElementById('import-chat-btn');
            if (exportChatBtnDm) {
                exportChatBtnDm.addEventListener('click', () => {
                    if (typeof exportChatHistory === 'function') exportChatHistory();
                    else showNotification('功能暂不可用', 'error');
                });
            }
            if (importChatBtnDm) {
                importChatBtnDm.addEventListener('click', () => {
                    const inp = document.createElement('input');
                    inp.type = 'file'; inp.accept = '.json,.zip';
                    inp.onchange = e => { if (e.target.files[0] && typeof importChatHistory === 'function') importChatHistory(e.target.files[0]); };
                    inp.click();
                });
            }
            // 全量备份导出
            const exportAllBtn = document.getElementById('export-all-settings');
            if (exportAllBtn) {
                exportAllBtn.addEventListener('click', () => {
                    if (typeof exportChatHistory === 'function') exportChatHistory();
                    else showNotification('功能暂不可用', 'error');
                });
            }

            // 全量备份导入
            const importAllBtn = document.getElementById('import-all-settings');
            if (importAllBtn) {
                importAllBtn.addEventListener('click', () => {
                    const inp = document.createElement('input');
                    inp.type = 'file'; inp.accept = '.json,.zip';
                    inp.onchange = e => { if (e.target.files[0] && typeof importChatHistory === 'function') importChatHistory(e.target.files[0]); };
                    inp.click();
                });
            }



            document.querySelectorAll('.theme-color-btn').forEach(btn => {
                btn.addEventListener('click',
                    () => {
                        settings.colorTheme = btn.dataset.theme;
                        throttledSaveData();
                        updateUI();
                        showNotification(`主题颜色已切换`, 'success');
                    });
            });


            document.querySelectorAll('[data-bubble-style]').forEach(item => {
                item.addEventListener('click',
                    () => {
                        settings.bubbleStyle = item.dataset.bubbleStyle;
                        throttledSaveData();
                        updateUI();
                        showNotification(`气泡样式已切换为${getBubbleStyleName(settings.bubbleStyle)}`, 'success');
                    });
            });

            
            const fontUrlInput = document.getElementById('custom-font-url');
            const applyFontBtn = document.getElementById('apply-font-btn');
            if (fontUrlInput) fontUrlInput.value = settings.customFontUrl || "";

            // 🌟 新增：本地字体文件上传逻辑
            const localFontInput = document.getElementById('local-font-file-input'); 
            const localFontBtn = document.getElementById('local-font-upload-btn'); 
            
            if (localFontBtn && localFontInput) {
                localFontBtn.addEventListener('click', () => localFontInput.click());
                localFontInput.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    if (!files.length) return;
                    localFontInput.setAttribute('multiple', ''); // 确保支持多选
                    const valid = files.filter(f => f.size <= 20 * 1024 * 1024);
                    if (files.length > valid.length) showNotification(`${files.length - valid.length} 个文件超过 20MB，已跳过`, 'error');
                    if (!valid.length) return;
                    showNotification(`正在读取 ${valid.length} 个字体...`, 'info', 2000);
                    let fontList = await localforage.getItem(`${APP_PREFIX}local_font_list`) || [];
                    // 兼容旧版：把旧的单文件迁移进列表
                    const oldBlob = await localforage.getItem(`${APP_PREFIX}local_font_blob`);
                    if (oldBlob && fontList.length === 0) {
                        fontList.push({ id: 'font_legacy', name: '旧版迁移字体', blob: oldBlob });
                        await localforage.removeItem(`${APP_PREFIX}local_font_blob`);
                    }
                    await localforage.removeItem(`${APP_PREFIX}local_font_base64`).catch(()=>{});
                    let added = 0;
                    for (const file of valid) {
                       // const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'font/ttf' });
                       // fontList.push({ id: 'font_' + Date.now() + '_' + Math.random().toString(36).substr(2,5), name: file.name, blob });
                        const buffer = await file.arrayBuffer();
                        fontList.push({ id: 'font_' + Date.now() + '_' + Math.random().toString(36).substr(2,5), name: file.name, buffer: buffer, type: file.type || 'font/ttf' });
                        added++;
                    }
                    await localforage.setItem(`${APP_PREFIX}local_font_list`, fontList);
                    settings.useLocalFont = true;
                    if (!settings.activeLocalFontId || !fontList.find(f => f.id === settings.activeLocalFontId)) {
                        settings.activeLocalFontId = fontList[fontList.length - added].id;
                    }
                    const src = await getActiveFontSource();
                    if (src) await applyCustomFont(src);
                    if (fontUrlInput) fontUrlInput.value = '';
                    throttledSaveData(); renderLocalFontList(); renderMessages(true);
                    showNotification(`已添加 ${added} 个字体`, 'success');
                    e.target.value = '';
                });
            }

            // 🌟 修改：外部链接应用逻辑
            if (applyFontBtn) {
                applyFontBtn.addEventListener('click', () => {
                    const url = fontUrlInput.value.trim();
                    settings.customFontUrl = url;
                    // 关键：如果用户填了外部链接，要清掉本地字体的标记和文件
                    settings.useLocalFont = false;
                    localforage.removeItem(`${APP_PREFIX}local_font_base64`).catch(()=>{});
                    localforage.removeItem(`${APP_PREFIX}local_font_blob`).catch(()=>{});
                    
                    showNotification('正在尝试加载字体...', 'info', 1000);
                    applyCustomFont(url).then(() => {
                        throttledSaveData();
                        if(url) showNotification('外部字体已应用', 'success');
                        else showNotification('已恢复默认字体', 'success');
                    }).catch(err => {
                        console.error('字体加载失败:', err);
                        showNotification('字体加载失败，请检查链接或网络', 'error');
                    });
                });
            }

            const followSystemBtn = document.getElementById('follow-system-font-btn');
            if (followSystemBtn) {
                followSystemBtn.addEventListener('click', () => {
                const systemFontStack = 'system-ui, -apple-system, sans-serif';
                if (fontUrlInput) fontUrlInput.value = "";
                settings.customFontUrl = "";
                // 🌟 加上这两句清理本地字体
                settings.useLocalFont = false; 
                localforage.removeItem(`${APP_PREFIX}local_font_base64`).catch(()=>{});
                localforage.removeItem(`${APP_PREFIX}local_font_blob`).catch(()=>{}); 
                
                settings.messageFontFamily = systemFontStack;
                document.documentElement.style.setProperty('--font-family', systemFontStack);
                document.documentElement.style.setProperty('--message-font-family', systemFontStack);
                document.body.style.fontFamily = systemFontStack;
                throttledSaveData();
                renderMessages(true);
                showNotification('已应用跟随系统字体', 'success');
                });
            }

            const cssTextarea = document.getElementById('custom-bubble-css');
            const applyCssBtn = document.getElementById('apply-css-btn');
            const resetCssBtn = document.getElementById('reset-css-btn');

            if (cssTextarea) cssTextarea.value = settings.customBubbleCss || "";

            function updateCssLivePreview() {
                const previewStyle = document.getElementById('css-live-preview-style');
                if (!previewStyle) return;
                const raw = (cssTextarea ? cssTextarea.value : '') || '';
                const scoped = raw.replace(/([^{}]+)\{/g, (match, selector) => {
                    const parts = selector.split(',').map(s => `#css-live-preview ${s.trim()}`);
                    return parts.join(', ') + ' {';
                });
                previewStyle.textContent = scoped;
            }

            if (cssTextarea) {
                cssTextarea.addEventListener('input', updateCssLivePreview);
                updateCssLivePreview();
            }

            if (applyCssBtn) {
                applyCssBtn.addEventListener('click', () => {
                    const css = cssTextarea.value;
                    settings.customBubbleCss = css;
                    applyCustomBubbleCss(css);
                    throttledSaveData();
                    showNotification('自定义样式已应用', 'success');
                });
            }

            if (resetCssBtn) {
                resetCssBtn.addEventListener('click', () => {
                    cssTextarea.value = "";
                    settings.customBubbleCss = "";
                    applyCustomBubbleCss("");
                    if (document.getElementById('css-live-preview-style')) document.getElementById('css-live-preview-style').textContent = '';
                    throttledSaveData();
                    showNotification('自定义样式已清除', 'success');
                });
            }

            // 全局主题 CSS
            const globalCssTextarea = document.getElementById('custom-global-css');
            const applyGlobalCssBtn = document.getElementById('apply-global-css-btn');
            const resetGlobalCssBtn = document.getElementById('reset-global-css-btn');
            const globalCssLiveToggle = document.getElementById('global-css-live-toggle');
            const globalCssStatus = document.getElementById('global-css-status');

            if (globalCssTextarea) {
                globalCssTextarea.value = settings.customGlobalCss || '';

                globalCssTextarea.addEventListener('input', () => {
                    if (globalCssLiveToggle && globalCssLiveToggle.checked) {
                        applyGlobalThemeCss(globalCssTextarea.value);
                        if (globalCssStatus) {
                            globalCssStatus.style.display = 'block';
                            globalCssStatus.textContent = '● 实时应用中';
                            globalCssStatus.style.color = 'var(--accent-color)';
                        }
                    }
                });
            }

            if (applyGlobalCssBtn) {
                applyGlobalCssBtn.addEventListener('click', () => {
                    const css = globalCssTextarea ? globalCssTextarea.value : '';
                    settings.customGlobalCss = css;
                    applyGlobalThemeCss(css);
                    throttledSaveData();
                    showNotification('全局主题 CSS 已应用', 'success');
                    if (globalCssStatus) {
                        globalCssStatus.style.display = 'block';
                        globalCssStatus.textContent = '✓ 已应用到全局';
                        globalCssStatus.style.color = '#51cf66';
                        setTimeout(() => { if (globalCssStatus) globalCssStatus.style.display = 'none'; }, 2000);
                    }
                });
            }

            if (resetGlobalCssBtn) {
                resetGlobalCssBtn.addEventListener('click', () => {
                    if (globalCssTextarea) globalCssTextarea.value = '';
                    settings.customGlobalCss = '';
                    applyGlobalThemeCss('');
                    throttledSaveData();
                    showNotification('全局主题 CSS 已清除', 'success');
                    if (globalCssStatus) globalCssStatus.style.display = 'none';
                });
            }

            const fontSizeSlider = document.getElementById('font-size-slider');
            const fontSizeValue = document.getElementById('font-size-value');

            fontSizeSlider.value = settings.fontSize;
            fontSizeValue.textContent = `${settings.fontSize}px`;

            fontSizeSlider.addEventListener('input', (e) => {
                settings.fontSize = parseInt(e.target.value);
                document.documentElement.style.setProperty('--font-size',
                    `${settings.fontSize}px`);
                fontSizeValue.textContent = `${settings.fontSize}px`;
                renderMessages(true);
            });

            fontSizeSlider.addEventListener('change', throttledSaveData);

            const avatarToggle = document.getElementById('in-chat-avatar-toggle-2');
            const avatarSizeControl = document.getElementById('in-chat-avatar-size-control-2');
            const avatarPositionControl = document.getElementById('in-chat-avatar-position-control-2');
            const avatarPreview = document.getElementById('avatar-bubble-preview');
            const avatarSizeSlider = document.getElementById('in-chat-avatar-size-slider-2');
            const avatarSizeValue = document.getElementById('in-chat-avatar-size-value-2');

            if (!settings.inChatAvatarPosition) settings.inChatAvatarPosition = 'center';


            function updateBubblePreview() {
                const receivedBubble = document.getElementById('preview-bubble-received');
                const sentBubble = document.getElementById('preview-bubble-sent');
                if (!receivedBubble || !sentBubble) return;
                const style = settings.bubbleStyle || 'standard';
                const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-color-rgb').trim() || '100,150,255';
                const styleMap = {
                    'standard':      { recv: '16px 16px 16px 4px',  sent: '16px 16px 4px 16px',  recvShadow: '0 2px 10px rgba(0,0,0,0.08)', sentShadow: `0 3px 12px rgba(${accentRgb},0.22)` },
                    'rounded':       { recv: '18px 18px 18px 6px',  sent: '18px 18px 6px 18px',  recvShadow: '0 2px 10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)', sentShadow: `0 3px 12px rgba(${accentRgb},0.25), 0 1px 3px rgba(${accentRgb},0.1)` },
                    'rounded-large': { recv: '24px 24px 24px 4px',  sent: '24px 24px 4px 24px',  recvShadow: '0 4px 16px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)', sentShadow: `0 4px 16px rgba(${accentRgb},0.28), 0 2px 4px rgba(${accentRgb},0.12)` },
                    'square':        { recv: '4px 4px 4px 0',       sent: '4px 4px 0 4px',       recvShadow: '0 3px 10px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)', sentShadow: `0 3px 10px rgba(${accentRgb},0.2), 0 1px 2px rgba(${accentRgb},0.08)` }
                };
                const radii = styleMap[style] || styleMap['standard'];
                receivedBubble.style.borderRadius = radii.recv;
                receivedBubble.style.boxShadow = radii.recvShadow;
                sentBubble.style.borderRadius = radii.sent;
                sentBubble.style.boxShadow = radii.sentShadow;
                const recvBg = getComputedStyle(document.documentElement).getPropertyValue('--message-received-bg').trim();
                const recvText = getComputedStyle(document.documentElement).getPropertyValue('--message-received-text').trim();
                const sentBg = getComputedStyle(document.documentElement).getPropertyValue('--message-sent-bg').trim();
                const sentText = getComputedStyle(document.documentElement).getPropertyValue('--message-sent-text').trim();
                if (recvBg) receivedBubble.style.background = recvBg;
                if (recvText) receivedBubble.style.color = recvText;
                if (sentBg) sentBubble.style.background = sentBg;
                if (sentText) sentBubble.style.color = sentText;
                receivedBubble.style.fontFamily = settings.messageFontFamily || '';
                sentBubble.style.fontFamily = settings.messageFontFamily || '';
                receivedBubble.style.fontSize = (settings.fontSize || 16) + 'px';
                sentBubble.style.fontSize = (settings.fontSize || 16) + 'px';
                const customCss = (document.getElementById('custom-bubble-css') || {}).value || '';
                let previewStyle = document.getElementById('bubble-preview-custom-style');
                if (!previewStyle) {
                    previewStyle = document.createElement('style');
                    previewStyle.id = 'bubble-preview-custom-style';
                    document.head.appendChild(previewStyle);
                }
                previewStyle.textContent = customCss;
            }

            function updateAvatarSettingsUI() {
                const enabled = settings.inChatAvatarEnabled;
                const pill = document.getElementById('avatar-toggle-pill-2');
                const knob = document.getElementById('avatar-toggle-knob-2');
                const statusText = document.getElementById('avatar-toggle-status-2');
                if (pill) pill.style.background = enabled ? 'var(--accent-color)' : 'var(--border-color)';
                if (knob) knob.style.right = enabled ? '3px' : '23px';
                if (statusText) statusText.textContent = enabled ? '已开启 — 消息旁显示头像' : '已关闭';

                if (avatarSizeControl) avatarSizeControl.style.display = enabled ? 'flex' : 'none';
                if (avatarPositionControl) avatarPositionControl.style.display = enabled ? 'block' : 'none';
                if (avatarPreview) avatarPreview.style.display = enabled ? 'block' : 'none';

                if (avatarSizeSlider) avatarSizeSlider.value = settings.inChatAvatarSize;
                if (avatarSizeValue) avatarSizeValue.textContent = `${settings.inChatAvatarSize}px`;
                document.documentElement.style.setProperty('--in-chat-avatar-size', `${settings.inChatAvatarSize}px`);

                const pos = settings.inChatAvatarPosition || 'center';
                const alignMap = { 'top': 'flex-start', 'center': 'center', 'bottom': 'flex-end', 'custom': 'flex-start' };
                document.documentElement.style.setProperty('--avatar-align', alignMap[pos] || 'center');
                document.body.dataset.avatarPos = pos;
                document.querySelectorAll('.preview-msg-row').forEach(row => {
                    row.style.alignItems = alignMap[pos] || 'flex-start';
                });
                const topBtn = document.getElementById('avatar-pos-top-2');
                const centerBtn = document.getElementById('avatar-pos-center-2');
                const bottomBtn = document.getElementById('avatar-pos-bottom-2');
                const customBtn = document.getElementById('avatar-pos-custom-2');
                [topBtn, centerBtn, bottomBtn, customBtn].forEach(btn => {
                    if (!btn) return;
                    btn.className = btn.dataset.pos === pos ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary';
                    btn.style.flex = '1'; btn.style.fontSize = '12px'; btn.style.padding = '7px 0';
                });

                const customOffsetCtrl = document.getElementById('avatar-custom-offset-control');
                if (customOffsetCtrl) customOffsetCtrl.style.display = pos === 'custom' ? 'block' : 'none';
                if (pos === 'custom') {
                    const offset = settings.inChatAvatarCustomOffset || 0;
                    document.documentElement.style.setProperty('--avatar-custom-offset', offset + 'px');
                    const sl = document.getElementById('avatar-custom-offset-slider');
                    const vl = document.getElementById('avatar-custom-offset-value');
                    if (sl) sl.value = offset;
                    if (vl) vl.textContent = offset + 'px';
                    const previewPartner = document.getElementById('preview-partner-avatar');
                    if (previewPartner) previewPartner.style.marginTop = offset + 'px';
                    const previewMy = document.getElementById('preview-my-avatar');
                    if (previewMy) previewMy.style.marginTop = offset + 'px';
                } else {
                    document.documentElement.style.removeProperty('--avatar-custom-offset');
                    const previewPartner = document.getElementById('preview-partner-avatar');
                    if (previewPartner) previewPartner.style.marginTop = '';
                    const previewMy = document.getElementById('preview-my-avatar');
                    if (previewMy) previewMy.style.marginTop = '';
                }

                const alwaysPill = document.getElementById('always-avatar-pill');
                const alwaysKnob = document.getElementById('always-avatar-knob');
                const alwaysStatus = document.getElementById('always-avatar-status');
                const alwaysOn = !!settings.alwaysShowAvatar;
                if (alwaysPill) alwaysPill.style.background = alwaysOn ? 'var(--accent-color)' : 'var(--border-color)';
                if (alwaysKnob) alwaysKnob.style.right = alwaysOn ? '3px' : '23px';
                if (alwaysStatus) alwaysStatus.textContent = alwaysOn ? '已开启 — 每条消息都显示头像' : '已关闭 — 仅首条消息显示';
                document.body.classList.toggle('always-show-avatar', alwaysOn);

                const namePill = document.getElementById('partner-name-chat-pill');
                const nameKnob = document.getElementById('partner-name-chat-knob');
                const nameStatus = document.getElementById('partner-name-chat-status');
                const nameOn = !!settings.showPartnerNameInChat;
                if (namePill) namePill.style.background = nameOn ? 'var(--accent-color)' : 'var(--border-color)';
                if (nameKnob) nameKnob.style.right = nameOn ? '3px' : '23px';
                if (nameStatus) nameStatus.textContent = nameOn ? '已开启 — 消息旁显示对方名字' : '已关闭';
                showPartnerNameInChat = nameOn;
                document.body.classList.toggle('show-partner-name', nameOn);

                updateAvatarPreview();
            }
            updateAvatarSettingsUI();

            if (avatarToggle) {
                avatarToggle.addEventListener('click', () => {
                    settings.inChatAvatarEnabled = !settings.inChatAvatarEnabled;
                    updateAvatarSettingsUI();
                    renderMessages(true);
                    throttledSaveData();
                });
            }

            if (avatarSizeSlider) {
                avatarSizeSlider.addEventListener('input', (e) => {
                    settings.inChatAvatarSize = parseInt(e.target.value, 10);
                    updateAvatarSettingsUI();
                    renderMessages(true); 
                });
                avatarSizeSlider.addEventListener('change', throttledSaveData);
            }

            ['avatar-pos-top-2','avatar-pos-center-2','avatar-pos-bottom-2','avatar-pos-custom-2'].forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.addEventListener('click', () => {
                        settings.inChatAvatarPosition = btn.dataset.pos;
                        updateAvatarSettingsUI();
                        renderMessages(true);
                        throttledSaveData();
                    });
                }
            });

            const customOffsetSlider = document.getElementById('avatar-custom-offset-slider');
            const customOffsetValue = document.getElementById('avatar-custom-offset-value');
            if (customOffsetSlider) {
                customOffsetSlider.value = settings.inChatAvatarCustomOffset || 0;
                if (customOffsetValue) customOffsetValue.textContent = (settings.inChatAvatarCustomOffset || 0) + 'px';
                customOffsetSlider.addEventListener('input', () => {
                    const val = parseInt(customOffsetSlider.value, 10);
                    settings.inChatAvatarCustomOffset = val;
                    if (customOffsetValue) customOffsetValue.textContent = val + 'px';
                    document.documentElement.style.setProperty('--avatar-custom-offset', val + 'px');
                    document.querySelectorAll('.preview-msg-row').forEach(row => {
                        row.style.alignItems = 'flex-start';
                    });
                    const previewPartner = document.getElementById('preview-partner-avatar');
                    if (previewPartner) previewPartner.style.marginTop = val + 'px';
                    const previewMy = document.getElementById('preview-my-avatar');
                    if (previewMy) previewMy.style.marginTop = val + 'px';
                    renderMessages(true);
                });
                customOffsetSlider.addEventListener('change', throttledSaveData);
            }

            const alwaysAvatarToggle = document.getElementById('always-avatar-toggle');
            if (alwaysAvatarToggle) {
                alwaysAvatarToggle.addEventListener('click', () => {
                    settings.alwaysShowAvatar = !settings.alwaysShowAvatar;
                    updateAvatarSettingsUI();
                    renderMessages(true);
                    throttledSaveData();
                });
            }

            const partnerNameChatToggle = document.getElementById('partner-name-chat-toggle');
            if (partnerNameChatToggle) {
                partnerNameChatToggle.addEventListener('click', () => {
                    settings.showPartnerNameInChat = !settings.showPartnerNameInChat;
                    updateAvatarSettingsUI();
                    throttledSaveData();
                });
            }

            function updateAvatarPreview(shape, cornerRadius) {
                const previewPartner = document.getElementById('preview-partner-avatar');
                const previewMy = document.getElementById('preview-my-avatar');
                if (!previewPartner || !previewMy) return;
                const sz = `${settings.inChatAvatarSize || 36}px`;
                previewPartner.style.width = sz;
                previewPartner.style.height = sz;
                previewMy.style.width = sz;
                previewMy.style.height = sz;
                const partnerImg = DOMElements.partner && DOMElements.partner.avatar ? DOMElements.partner.avatar.querySelector('img') : null;
                const myImg = DOMElements.me && DOMElements.me.avatar ? DOMElements.me.avatar.querySelector('img') : null;
                const currentShape = shape || settings.myAvatarShape || 'circle';
                
                function applyToPreviewEl(el, img, shp, cr) {
                    if (img && img.src) {
                        el.innerHTML = `<img src="${img.src}" style="width:100%;height:100%;object-fit:cover;">`;
                    }
                    if (shp === 'circle') {
                        el.style.borderRadius = '50%';
                    } else if (shp === 'square') {
                        el.style.borderRadius = (cr || 8) + 'px';
                    }
                }
                const cr = cornerRadius !== undefined ? cornerRadius : parseInt(getComputedStyle(document.documentElement).getPropertyValue('--avatar-corner-radius') || '8') || 8;
                applyToPreviewEl(previewPartner, partnerImg, currentShape, cr);
                applyToPreviewEl(previewMy, myImg, currentShape, cr);
                if (typeof updateBubblePreview === 'function') updateBubblePreview();
            }

            function updateAvatarShapeBtns() {
                const shape = settings.myAvatarShape || 'circle';
                document.querySelectorAll('.avatar-shape-btn-2').forEach(b => {
                    b.classList.toggle('modal-btn-primary', b.dataset.shape === shape);
                    b.classList.toggle('modal-btn-secondary', b.dataset.shape !== shape);
                });
                const radiusCtrl = document.getElementById('avatar-corner-radius-control-2');
                if (radiusCtrl) radiusCtrl.style.display = shape === 'square' ? '' : 'none';
                updateAvatarPreview(shape);
            }
            document.querySelectorAll('.avatar-shape-btn-2').forEach(btn => {
                btn.addEventListener('click', () => {
                    const shape = btn.dataset.shape;
                    settings.myAvatarShape = shape;
                    settings.partnerAvatarShape = shape;
                    applyAvatarShapeToDOM && applyAvatarShapeToDOM('my', shape);
                    applyAvatarShapeToDOM && applyAvatarShapeToDOM('partner', shape);
                    updateAvatarShapeBtns();
                    updateAvatarPreview(shape);
                    renderMessages(true);
                    throttledSaveData();
                });
            });
            const cornerSlider = document.getElementById('avatar-corner-radius-slider-2');
            const cornerVal = document.getElementById('avatar-corner-radius-value-2');
            if (cornerSlider) {
                cornerSlider.value = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--avatar-corner-radius') || '8') || 8;
                if (cornerVal) cornerVal.textContent = cornerSlider.value + 'px';
                cornerSlider.addEventListener('input', () => {
                    const r = cornerSlider.value;
                    if (cornerVal) cornerVal.textContent = r + 'px';
                    document.documentElement.style.setProperty('--avatar-corner-radius', r + 'px');
                    updateAvatarPreview(settings.myAvatarShape || 'circle', parseInt(r));
                    renderMessages(true);
                });
                cornerSlider.addEventListener('change', () => {
                    settings.avatarCornerRadius = cornerSlider.value;
                    throttledSaveData();
                });
            }
            updateAvatarShapeBtns();

            document.querySelectorAll('[data-bubble-style]').forEach(item => {
                item.addEventListener('click', () => {
                    setTimeout(updateBubblePreview, 100);
                });
            });
            
           // const minDelaySlider = document.getElementById('reply-delay-min-slider');
            //const minDelayValue = document.getElementById('reply-delay-min-value');
           // const maxDelaySlider = document.getElementById('reply-delay-max-slider');
           // const maxDelayValue = document.getElementById('reply-delay-max-value');
           // ✅ 新的输入框获取
const minDelayInput = document.getElementById('reply-delay-min-input');
const maxDelayInput = document.getElementById('reply-delay-max-input');
const minTextInput = document.getElementById('reply-text-min-input');
const maxTextInput = document.getElementById('reply-text-max-input');


            window.switchCsTab = function switchCsTab(btn) {
                document.querySelectorAll('.cs-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.cs-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panel = document.getElementById(btn.dataset.panel);
                if (panel) panel.classList.add('active');
            };
           function updateDelayUI() {
                if (minDelayInput) minDelayInput.value = Math.round((settings.replyDelayMin || 3000) / 1000);
                if (maxDelayInput) maxDelayInput.value = Math.round((settings.replyDelayMax || 7000) / 1000);
                if (minTextInput) minTextInput.value = settings.replyTextMin || 1;
                if (maxTextInput) maxTextInput.value = settings.replyTextMax || 10;
            }

            updateDelayUI();

            /*minDelaySlider.addEventListener('input', (e) => {
                settings.replyDelayMin = parseInt(e.target.value, 10);
                if (settings.replyDelayMin > settings.replyDelayMax) {
                    settings.replyDelayMax = settings.replyDelayMin;
                }
                updateDelayUI();
            });
            minDelaySlider.addEventListener('change', throttledSaveData);

            maxDelaySlider.addEventListener('input', (e) => {
                settings.replyDelayMax = parseInt(e.target.value, 10);
                 if (settings.replyDelayMax < settings.replyDelayMin) {
                    settings.replyDelayMin = settings.replyDelayMax;
                }
                updateDelayUI();
            });
            maxDelaySlider.addEventListener('change', throttledSaveData);*/
            // ===== 回复速度输入框 =====
            if (minDelayInput) {
                minDelayInput.addEventListener('input', () => {
                    settings.replyDelayMin = Math.max(1000, parseInt(minDelayInput.value) * 1000 || 3000);
                    if (settings.replyDelayMin > settings.replyDelayMax) {
                        settings.replyDelayMax = settings.replyDelayMin;
                        if (maxDelayInput) maxDelayInput.value = parseInt(minDelayInput.value);
                    }
                });
                minDelayInput.addEventListener('change', throttledSaveData);
            }
            if (maxDelayInput) {
                maxDelayInput.addEventListener('input', () => {
                    settings.replyDelayMax = Math.max(1000, parseInt(maxDelayInput.value) * 1000 || 7000);
                    if (settings.replyDelayMax < settings.replyDelayMin) {
                        settings.replyDelayMin = settings.replyDelayMax;
                        if (minDelayInput) minDelayInput.value = parseInt(maxDelayInput.value);
                    }
                });
                maxDelayInput.addEventListener('change', throttledSaveData);
            }

            // ===== 回复条数输入框 =====
            if (minTextInput) {
                minTextInput.addEventListener('input', () => {
                    settings.replyTextMin = Math.max(1, Math.min(10, parseInt(minTextInput.value) || 1));
                    if (settings.replyTextMin > settings.replyTextMax) {
                        settings.replyTextMax = settings.replyTextMin;
                        if (maxTextInput) maxTextInput.value = minTextInput.value;
                    }
                });
                minTextInput.addEventListener('change', throttledSaveData);
            }
            if (maxTextInput) {
                maxTextInput.addEventListener('input', () => {
                    settings.replyTextMax = Math.max(1, Math.min(10, parseInt(maxTextInput.value) || 10));
                    if (settings.replyTextMax < settings.replyTextMin) {
                        settings.replyTextMin = settings.replyTextMax;
                        if (minTextInput) minTextInput.value = maxTextInput.value;
                    }
                });
                maxTextInput.addEventListener('change', throttledSaveData);
            }



            const settingToggles = {
                '#reply-toggle': {prop: 'replyEnabled', name: '引用回复'},
                '#sound-toggle': {prop: 'soundEnabled', name: '音效'},
                '#read-receipts-toggle': {prop: 'readReceiptsEnabled', name: '已读回执'},
                '#typing-indicator-toggle': {prop: 'typingIndicatorEnabled', name: '正在输入'},
                '#read-no-reply-toggle': { prop: 'allowReadNoReply', name: '已读不回' },
                '#emoji-mix-toggle': { prop: 'emojiMixEnabled', name: '表情混入消息' },
                '#enter-send-toggle': { prop: 'enterToSendEnabled', name: '回车发送消息' },
                '#keep-keyboard-alive-toggle': { prop: 'keepKeyboardAlive', name: '发送后保留键盘' }, // 🌟【新增】
            };

            /*for (const [selector, {prop, name}] of Object.entries(settingToggles)) {
                const element = document.querySelector(selector);
                if (!element) continue;

                const _initVal = prop === 'emojiMixEnabled' ? (settings[prop] !== false) : !!settings[prop];
                element.classList.toggle('active', _initVal);

                element.addEventListener('click', () => {
                    if (prop === 'emojiMixEnabled' && settings[prop] === undefined) settings[prop] = true;
                    settings[prop] = !settings[prop];
                    if (prop === 'keepKeyboardAlive') {
                        window._keepKeyboardAlive = settings[prop];
                    }
                    throttledSaveData();
                    updateUI();
                    element.classList.toggle('active', !!settings[prop]);
                    if (prop !== 'soundEnabled') renderMessages(true);
                    showNotification(`${name}已${settings[prop] ? '开启': '关闭'}`, 'success');
                });
            }*/
            for (const [selector, { prop, name }] of Object.entries(settingToggles)) {
                const element = document.querySelector(selector);
                if (!element) continue;
                if (settings[prop] === undefined) settings[prop] = false;
                const _initVal = prop === 'emojiMixEnabled' ? (settings[prop] !== false) : !!settings[prop];
                element.classList.toggle('active', _initVal);
                
                element.addEventListener('click', () => {
                    if (prop === 'emojiMixEnabled' && settings[prop] === undefined) settings[prop] = true;
                    settings[prop] = !settings[prop];
                    if (prop === 'keepKeyboardAlive') {
                        window._keepKeyboardAlive = settings[prop];
                    }
                    throttledSaveData();
                    
                    // 🌟 容错处理：如果 updateUI 会因为新加的设置报错，就把它包在 try 里，保证 UI 切换正常
                    try {
                        updateUI();
                    } catch(e) {
                        console.warn(`[开关] 执行 updateUI 时遇到非致命错误，已忽略:`, e);
                    }
                    
                    element.classList.toggle('active', !!settings[prop]);
                    if (prop !== 'soundEnabled') renderMessages(true);
                    showNotification(`${name}已${settings[prop] ? '开启': '关闭'}`, 'success');
                });
            }
            // ========== 独立开关：直接读写 localStorage，彻底解决双重数据源冲突 ==========
            function bindLsToggle(selector, storageKey, defaultVal, name, onChange) {
                const el = document.querySelector(selector);
                if (!el) return;
                const stored = localStorage.getItem(storageKey);
                let val = stored === null ? defaultVal : (stored === '1' || stored === 'true');
                el.classList.toggle('active', val);
                el.addEventListener('click', () => {
                    val = !val;
                    localStorage.setItem(storageKey, val ? '1' : '0');
                    el.classList.toggle('active', val);
                    if (typeof onChange === 'function') onChange(val);
                    showNotification(`${name}已${val ? '开启' : '关闭'}`, 'success');
                });
            }

            //bindLsToggle('#notif-toggle-row', 'notifEnabled', false, '后台消息推送');
        // ========== 单独处理“后台消息推送”开关 ==========
            var notifRow = document.querySelector('#notif-toggle-row');
            if (!notifRow) return;

            // 1. 初始化状态
            var val = localStorage.getItem('notifEnabled') === '1';
            notifRow.classList.toggle('active', val);

            // 2. 绑定点击事件
            notifRow.addEventListener('click', function() {
                val = !val;

                // 如果是尝试打开
                if (val) {
                    if (!('Notification' in window)) {
                        val = false;
                        showNotification('您的浏览器不支持通知功能', 'error');
                        notifRow.classList.remove('active');
                        return;
                    }

                    // 去请求系统权限
                    Notification.requestPermission().then(function(perm) {
                        if (perm === 'granted') {
                            // 真正同意了，才保存状态、改UI、弹“已开启”
                            localStorage.setItem('notifEnabled', '1');
                            notifRow.classList.add('active');
                            showNotification('后台消息推送已开启', 'success'); // ★ 统一的弹窗
                            
                            // 如果你有别的文件里的初始化逻辑，可以写在这里
                        } else {
                            // 拒绝了，把状态弹回去，弹“已关闭”
                            val = false;
                            localStorage.setItem('notifEnabled', '0');
                            notifRow.classList.remove('active');
                            showNotification('后台消息推送已关闭', 'info'); // ★ 统一的弹窗
                        }
                    }).catch(function() {
                        val = false;
                        notifRow.classList.remove('active');
                        showNotification('后台消息推送已关闭', 'info');
                    });

                } else {
                    // 如果是关闭，直接保存，弹“已关闭”
                    localStorage.setItem('notifEnabled', '0');
                    notifRow.classList.remove('active');
                    showNotification('后台消息推送已关闭', 'info'); // ★ 统一的弹窗
                }
            });


            bindLsToggle('#call-enabled-toggle', 'callFeatureEnabled', true, '模拟视频通话', function(val) {
                if (window.callFeature) {
                    if (!val && window.callFeature.endCall) window.callFeature.endCall();
                }
                const btn = document.getElementById('call-toolbar-btn');
                if (btn) btn.style.display = val ? '' : 'none';
            });

            bindLsToggle('#call-reject-toggle', 'callRejectEnabled', true, '对方可主动拒接');


            // --- 已读不回概率滑动条逻辑 ---
            const rnrToggle = document.querySelector('#read-no-reply-toggle');
            const rnrControl = document.getElementById('read-no-reply-chance-control');
            const rnrSlider = document.getElementById('read-no-reply-chance-slider');
            const rnrValue = document.getElementById('read-no-reply-chance-value');

            // 【新增】提取一个专门的 UI 同步函数，保证每次打开弹窗都能恢复正确状态
            const updateRnrUI = () => {
                if (rnrToggle) rnrToggle.classList.toggle('active', !!settings.allowReadNoReply);
                if (rnrControl) rnrControl.style.display = settings.allowReadNoReply ? 'block' : 'none';
                if (rnrSlider) {
                    // 如果设置里有值就用设置的，没有或者异常就安全回退到 20%
                    const chance = (settings.readNoReplyChance !== undefined && settings.readNoReplyChance !== null) ? settings.readNoReplyChance : 0.2;
                    rnrSlider.value = Math.round(chance * 100);
                    if (rnrValue) rnrValue.textContent = rnrSlider.value + '%';
                }
            };

            // 页面刚加载时执行一次同步
            updateRnrUI();

            // 页面加载时同步保活开关状态
            const kaRow = document.getElementById('keepalive-audio-toggle');
            if (kaRow) {
                kaRow.classList.toggle('active', !!settings.keepaliveAudioEnabled);
            }

            // 滑动条拖动逻辑
            if (rnrSlider) {
                rnrSlider.addEventListener('input', (e) => {
                    const val = parseInt(e.target.value);
                    settings.readNoReplyChance = val / 100;
                    if (rnrValue) rnrValue.textContent = val + '%';
                });
                rnrSlider.addEventListener('change', throttledSaveData);
            }

            // 点击开关时的逻辑
            if (rnrToggle && rnrControl) {
                rnrToggle.addEventListener('click', () => {
                    // 延迟 20ms 执行，确保拿到最新的布尔值
                    setTimeout(() => {
                        updateRnrUI();
                    }, 20);
                });
            }

            const soundVolSlider = document.getElementById('sound-volume-slider');
            const soundVolVal = document.getElementById('sound-volume-value');
            if (soundVolSlider) {
                soundVolSlider.value = Math.round((settings.soundVolume || 0.15) * 100);
                if (soundVolVal) soundVolVal.textContent = soundVolSlider.value + '%';
                soundVolSlider.addEventListener('input', (e) => {
                    settings.soundVolume = parseInt(e.target.value) / 100;
                    if (soundVolVal) soundVolVal.textContent = e.target.value + '%';
                });
                soundVolSlider.addEventListener('change', throttledSaveData);
            }
            const customSoundInput = document.getElementById('custom-sound-url-input');
            if (customSoundInput) {
                customSoundInput.value = settings.customSoundUrl || '';
                customSoundInput.addEventListener('change', () => {
                    settings.customSoundUrl = customSoundInput.value.trim();
                    throttledSaveData();
                });
            }
            const testSoundBtn = document.getElementById('test-sound-btn');
            if (testSoundBtn) {
                testSoundBtn.addEventListener('click', () => { playSound('message'); });
            }
            document.querySelectorAll('.time-fmt-opt').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.fmt === (settings.timeFormat || 'HH:mm'));
                opt.addEventListener('click', () => {
                    document.querySelectorAll('.time-fmt-opt').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    settings.timeFormat = opt.dataset.fmt;
                    throttledSaveData();
                    renderMessages(true);
                    showNotification('时间格式已更新', 'success');
                });
            });

           const clearLocalFontBtn = document.getElementById('clear-local-font-btn');
            if (clearLocalFontBtn) {
                clearLocalFontBtn.addEventListener('click', () => {
                    if (!confirm('确定清除所有已上传的本地字体？')) return;
                    settings.useLocalFont = false;
                    settings.activeLocalFontId = null;
                    settings.customFontUrl = ''; 
                    localforage.removeItem(`${APP_PREFIX}local_font_list`).catch(()=>{});
                    localforage.removeItem(`${APP_PREFIX}local_font_base64`).catch(()=>{});
                    localforage.removeItem(`${APP_PREFIX}local_font_blob`).catch(()=>{});
                    //const localFontNameEl = document.getElementById('local-font-name');
                    //if (localFontNameEl) { localFontNameEl.textContent = '支持 .ttf / .woff / .woff2 / .otf 格式'; localFontNameEl.style.cssText = 'padding:10px 14px;'; }
                    const localFontBtn = document.getElementById('local-font-upload-btn');
                    if (localFontBtn) localFontBtn.style.display = '';
                    const listEl = document.getElementById('local-font-list');
                    if (listEl) listEl.innerHTML = '';
                    applyCustomFont('').then(() => {
                        document.documentElement.style.setProperty('--font-family', settings.messageFontFamily || "'Noto Serif SC', serif");
                        document.documentElement.style.setProperty('--message-font-family', settings.messageFontFamily || "'Noto Serif SC', serif");
                        document.body.style.fontFamily = "'Noto Serif SC', serif";
                        throttledSaveData(); renderMessages(true);
                        showNotification('已清除所有本地字体', 'success');
                    });
                });
            }


            document.getElementById('appearance-settings').addEventListener('click', () => {
                hideModal(DOMElements.settingsModal.modal);
                
                renderBackgroundGallery();
                renderThemeSchemesList();
                
                const fontSizeSliderEl = document.getElementById('font-size-slider');
                const fontSizeValueEl = document.getElementById('font-size-value');
                if (fontSizeSliderEl) {
                    fontSizeSliderEl.value = settings.fontSize;
                    if (fontSizeValueEl) fontSizeValueEl.textContent = `${settings.fontSize}px`;
                }
                const fontUrlInputEl = document.getElementById('custom-font-url');
                if (fontUrlInputEl) fontUrlInputEl.value = settings.customFontUrl || '';
                const cssTextareaEl = document.getElementById('custom-bubble-css');
                if (cssTextareaEl) cssTextareaEl.value = settings.customBubbleCss || '';
                const globalCssTextareaEl = document.getElementById('custom-global-css');
                if (globalCssTextareaEl) globalCssTextareaEl.value = settings.customGlobalCss || '';
                
                document.querySelectorAll('[data-bubble-style]').forEach(item => {
                    item.classList.toggle('active', item.dataset.bubbleStyle === settings.bubbleStyle);
                });
                
                document.querySelectorAll('.theme-color-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.theme === settings.colorTheme);
                });
                         
              // 同步本地字体状态
                const localFontNameEl = document.getElementById('local-font-name');
                const localFontBtn = document.getElementById('local-font-upload-btn');
                if (localFontNameEl) localFontNameEl.style.display = 'none';
                if (localFontBtn) localFontBtn.style.display = '';
                renderLocalFontList();
                    // 👇 加上这句：每次打开外观弹窗时，强制同步夜间模式按钮的状态
                const modeRow = document.getElementById('theme-mode-toggle-row');
                if (modeRow) {
                    modeRow.classList.toggle('active', document.documentElement.getAttribute('data-theme') === 'dark');
                }

                showModal(document.getElementById('appearance-modal'));
                setTimeout(() => { 
                    updateAvatarSettingsUI && updateAvatarSettingsUI(); 
                    setupAppearancePanelFrameSettings && setupAppearancePanelFrameSettings();
                }, 100);
            });

           // ---------- 替换成这段 ----------
            const bgInput = document.getElementById('bg-gallery-input');
            if (bgInput) {
                bgInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                        showNotification('背景图片不能超过10MB', 'error');
                        return;
                    }
                    showNotification('正在优化图片以适配手机...', 'info', 1500);
                    optimizeImage(file, 1200, 0.8).then(base64 => {
                        savedBackgrounds.push({ id: `user-${Date.now()}`, type: 'image', value: base64 });
                        saveBackgroundGallery();
                        renderBackgroundGallery();
                        applyBackground(base64, settings.bgDisplayMode || 'contain');
                        localforage.setItem(getStorageKey('chatBackground'), base64);
                        showNotification('新背景已添加并应用', 'success');
                    }).catch(err => {
                        console.error('背景图处理失败:', err);
                        showNotification('图片处理失败，请换一张试试', 'error');
                    });
                    e.target.value = '';
                });
            }

            const autoSendToggle = document.getElementById('auto-send-toggle');
            const autoSendControl = document.getElementById('auto-send-control');
            const autoSendSlider = document.getElementById('auto-send-slider');
            const autoSendValue = document.getElementById('auto-send-value');

            const updateAutoSendUI = () => {
                autoSendToggle.classList.toggle('active', !!settings.autoSendEnabled);
                autoSendControl.style.display = settings.autoSendEnabled ? "flex" : "none";
                const currentVal = settings.autoSendInterval || 5;
                autoSendSlider.value = currentVal;
                autoSendValue.textContent = `${currentVal}分钟`;
            };

            updateAutoSendUI();

            autoSendToggle.addEventListener('click', () => {
                settings.autoSendEnabled = !settings.autoSendEnabled;
                updateAutoSendUI();
                manageAutoSendTimer(); 
                throttledSaveData();
                showNotification(`主动发送已${settings.autoSendEnabled ? '开启' : '关闭'}`, 'success');
            });

            autoSendSlider.value = settings.autoSendInterval || 5;
            autoSendValue.textContent = `${settings.autoSendInterval || 5}分钟`;

            autoSendSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                settings.autoSendInterval = val;
                autoSendValue.textContent = `${val}分钟`;
            });

            autoSendSlider.addEventListener('change', () => {
            manageAutoSendTimer(); 
                throttledSaveData();
            });
            const boardWriteToggle = document.getElementById('board-partner-write-toggle');
            if (boardWriteToggle) {
                boardWriteToggle.addEventListener('click', () => {
                    settings.boardPartnerWriteEnabled = !settings.boardPartnerWriteEnabled;
                    boardWriteToggle.classList.toggle('active', settings.boardPartnerWriteEnabled);
                    
                    // 同步开启留言板内部的自动发帖开关
                    if (window.boardDataV2) {
                    window.boardDataV2.settings.autoPostEnabled = settings.boardPartnerWriteEnabled;
                    window.setBoardDataV2(window.boardDataV2);
                    }
                    
                    throttledSaveData();
                    showNotification(`主动写留言板已${settings.boardPartnerWriteEnabled ? '开启' : '关闭'}`, 'success');
                });
            }

            const resetBgBtn = document.getElementById('reset-default-bg');
            if (resetBgBtn) {
                resetBgBtn.addEventListener('click', () => {
                    removeBackground();
                    renderBackgroundGallery();
                    showNotification('已移除背景图', 'success');
                });
            }
        }



        function initNewFeatureListeners() {
            const flEntry = document.getElementById('fortune-lenormand-function');
            if (flEntry) {
                flEntry.addEventListener('click', () => {
                    hideModal(DOMElements.advancedModal.modal);
                    generateFortune();
                    switchFLTab('fortune');
                    showModal(document.getElementById('fortune-lenormand-modal'));
                });
            }

            /*document.getElementById('close-lenormand').addEventListener('click', () => {
                hideModal(document.getElementById('fortune-lenormand-modal'));
            });*/
            const closeLenormand = document.getElementById('close-lenormand');
            if (closeLenormand) {
                closeLenormand.addEventListener('click', () => {
                    hideModal(document.getElementById('fortune-lenormand-modal'));
                });
            }
            const envelopeEntryBtn = document.getElementById('envelope-function');
            if (envelopeEntryBtn) {
                envelopeEntryBtn.addEventListener('click', async () => {
                    hideModal(DOMElements.advancedModal.modal);
                    await loadEnvelopeData();
                    await checkEnvelopeStatus();
                    /*currentEnvTab = 'outbox';
                    document.getElementById('env-tab-outbox').classList.add('active');
                    document.getElementById('env-tab-inbox').classList.remove('active');
                    document.getElementById('env-outbox-section').style.display = 'block';
                    document.getElementById('env-inbox-section').style.display = 'none';
                    document.getElementById('env-compose-form').style.display = 'none';
                    document.getElementById('env-main-close-btn').style.display = 'flex';
                    renderEnvelopeLists();
                    showModal(document.getElementById('envelope-modal'));*/
                    renderEnvelopeBoard();
                    showModal(document.getElementById('envelope-board-modal'));
    
                });
            }
            const galleryBanner = document.getElementById('gallery-banner-entry');
            if (galleryBanner) {
                galleryBanner.addEventListener('click', () => {
                    window.open('https://aielin17.github.io/-/', '_blank');
                });
                galleryBanner.addEventListener('mousedown', () => { galleryBanner.style.transform = 'scale(0.97)'; });
                galleryBanner.addEventListener('mouseup', () => { galleryBanner.style.transform = 'scale(1)'; });
                galleryBanner.addEventListener('mouseleave', () => { galleryBanner.style.transform = 'scale(1)'; });
            }
            //document.getElementById('send-envelope').addEventListener('click', handleSendEnvelope);
            const sendEnvelopeBtn = document.getElementById('send-envelope');
            if (sendEnvelopeBtn) {
                sendEnvelopeBtn.addEventListener('click', handleSendEnvelope);
            }
            /*document.getElementById('cancel-envelope').addEventListener('click', () => {
                hideModal(document.getElementById('envelope-modal'));
            });*/
            const cancelEnvelopeBtn = document.getElementById('cancel-envelope');
            if (cancelEnvelopeBtn) {
                cancelEnvelopeBtn.addEventListener('click', () => {
                    hideModal(document.getElementById('envelope-modal'));
                });
            }
            const closeFortune = document.getElementById('close-fortune');
            if (closeFortune) {
                closeFortune.addEventListener('click', () => {
                    hideModal(document.getElementById('fortune-lenormand-modal'));
                });
            }
            const batchFavoriteBtn = document.getElementById('batch-favorite-function');
            if (batchFavoriteBtn) {
                batchFavoriteBtn.addEventListener('click', () => {
                    hideModal(DOMElements.favoritesModal.modal);
                    toggleBatchFavoriteMode();
                });
            }

            /*document.getElementById('batch-favorite-function').addEventListener('click', () => {
                hideModal(DOMElements.favoritesModal.modal);
                toggleBatchFavoriteMode();
            });*/

            initReplyLibraryListeners();

            DOMElements.anniversaryAnimation.closeBtn.addEventListener('click', () => {
                DOMElements.anniversaryAnimation.modal.classList.remove('active');
            });


            document.getElementById('stats-function').addEventListener('click', () => {
                hideModal(DOMElements.advancedModal.modal);
                renderStatsContent();
                showModal(DOMElements.statsModal.modal);
            });

            const coinFunctionBtn = document.getElementById('coin-function');
            if (coinFunctionBtn) {
                coinFunctionBtn.addEventListener('click', () => {
                    hideModal(DOMElements.advancedModal.modal);
                    handleCoinToss();
                });
            }
            const wishingPoolBtn = document.getElementById('wishing-pool-function');
            if (wishingPoolBtn) {
                wishingPoolBtn.addEventListener('click', () => {
                    hideModal(DOMElements.advancedModal.modal);
                    if (typeof initWishingPool === 'function') initWishingPool();
                    showModal(DOMElements.wishingPoolModal.modal);
                });
            }
        }
        const annToggleBtn = document.getElementById('ann-toggle-btn');
        const annFormWrapper = document.getElementById('ann-form-wrapper');

        if (annToggleBtn && annFormWrapper) {
            annToggleBtn.addEventListener('click', () => {
                const isActive = annFormWrapper.classList.contains('active');
                
                if (isActive) {
                    annFormWrapper.classList.remove('active');
                    annToggleBtn.classList.remove('active');
                } else {
                    annFormWrapper.classList.add('active');
                    annToggleBtn.classList.add('active');
                    
                    setTimeout(() => {
                        annFormWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 300);
                }
            });
        }

        function getBubbleStyleName(style) {
            const names = {
                'standard': '标准',
                'rounded': '圆角',
                'rounded-large': '大圆角',
                'square': '方形'
            };
            return names[style] || '标准';
        }


        function initDataManagementListeners() {

            document.getElementById('clear-storage').addEventListener('click', clearAllAppData);
            initScreenshotFunction();
            const creditsBtn = document.getElementById('open-credits-btn');
            if (creditsBtn) {
                creditsBtn.addEventListener('click', () => {

                    hideModal(DOMElements.dataModal.modal);


                    const disclaimerModal = document.getElementById('disclaimer-modal');


                    if (disclaimerModal) {
                        showModal(disclaimerModal);
                    }
                });
            }

        }

        const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

        /*function initCoreListeners() {
            // 1. 聊天容器滚动监听
            if (DOMElements.chatContainer) {
                DOMElements.chatContainer.addEventListener('scroll', () => {
                    const container = DOMElements.chatContainer;
                    if (container.scrollTop < 50 && !isLoadingHistory && messages.length > displayedMessageCount) {
                        isLoadingHistory = true;
                        const loader = document.getElementById('history-loader');
                        if (loader) loader.classList.add('visible');
                        setTimeout(() => {
                            displayedMessageCount += HISTORY_BATCH_SIZE;
                            renderMessages(true);
                            if (loader) loader.classList.remove('visible');
                            isLoadingHistory = false;
                        }, 600);
                    }
                });
            }
            // 🌟【新增 1】监听设置里开关的变化
            document.addEventListener('settingsChanged', () => {
                window._keepKeyboardAlive = !!settings.keepKeyboardAlive;
            });
            // 页面加载时读取一次默认值
            window._keepKeyboardAlive = !!settings.keepKeyboardAlive;

            DOMElements.messageInput.addEventListener('input', () => {
                DOMElements.messageInput.style.height = 'auto';
                DOMElements.messageInput.style.height = `${Math.min(DOMElements.messageInput.scrollHeight, 120)}px`;
            });
        

            DOMElements.messageInput.addEventListener('input', () => {
                DOMElements.messageInput.style.height = 'auto'; DOMElements.messageInput.style.height = `${Math.min(DOMElements.messageInput.scrollHeight, 120)}px`;
            });
            // 回车发送消息功能（Shift+Enter依然是换行）
            DOMElements.messageInput.addEventListener('keydown', (e) => {
                if (settings.enterToSendEnabled && e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // 阻止默认的换行
                    // 🌟【新增 2】如果开启了保活，发完立刻把焦点抢回来
                    if (window._keepKeyboardAlive) {
                        setTimeout(() => DOMElements.messageInput.focus(), 50);
                    }
                    const text = DOMElements.messageInput.value.trim();
                    const imageFile = DOMElements.imageInput.files[0];
                    if (text || imageFile) {
                        sendMessage();
                    }
                }
            });
        }*/
       function initCoreListeners() {
            // 1. 聊天容器滚动监听
            if (DOMElements.chatContainer) {
                DOMElements.chatContainer.addEventListener('scroll', () => {
                    const container = DOMElements.chatContainer;
                    if (container.scrollTop < 50 && !isLoadingHistory && messages.length > displayedMessageCount) {
                        isLoadingHistory = true;
                        const loader = document.getElementById('history-loader');
                        if (loader) loader.classList.add('visible');
                        setTimeout(() => {
                            displayedMessageCount += HISTORY_BATCH_SIZE;
                            renderMessages(true);
                            if (loader) loader.classList.remove('visible');
                            isLoadingHistory = false;
                        }, 600);
                    }
                });
            }

            // 🌟【新增 1】监听设置里开关的变化
            document.addEventListener('settingsChanged', () => {
                window._keepKeyboardAlive = !!settings.keepKeyboardAlive;
            });
            // 页面加载时读取一次默认值
            window._keepKeyboardAlive = !!settings.keepKeyboardAlive;

            DOMElements.messageInput.addEventListener('input', () => {
                DOMElements.messageInput.style.height = 'auto';
                DOMElements.messageInput.style.height = `${Math.min(DOMElements.messageInput.scrollHeight, 120)}px`;
            });

            // 回车发送消息功能（Shift+Enter依然是换行）
            /*DOMElements.messageInput.addEventListener('keydown', (e) => {
                if (settings.enterToSendEnabled && e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // 阻止默认的换行
                    
                    // 🌟【新增 2】如果开启了保活，发完立刻把焦点抢回来
                    if (window._keepKeyboardAlive) {
                        setTimeout(() => DOMElements.messageInput.focus(), 50);
                    }

                    const text = DOMElements.messageInput.value.trim();
                    const imageFile = DOMElements.imageInput.files[0];
                    if (text || imageFile) {
                        sendMessage();
                    }
                }
            });*/
            // 回车发送消息功能（Shift+Enter依然是换行）
            DOMElements.messageInput.addEventListener('keydown', (e) => {
                if (settings.enterToSendEnabled && e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // 阻止默认的换行
                    DOMElements.messageInput.dataset.keepFocus = window._keepKeyboardAlive ? '1' : '0';
                    const text = DOMElements.messageInput.value.trim();
                    const imageFile = DOMElements.imageInput.files[0];
                    if (text || imageFile) {
                        sendMessage(); // 正常走 sendMessage
                    }
                }
            });

        } // 🌟 这里是函数结尾的大括号，千万别漏了


       // DOMElements.continueBtn.addEventListener('click', simulateReply);

        function _applyCollapseState(on) {
            document.body.classList.toggle('bottom-collapse-mode', on);
            // Sync cs-panel-display toggle pill
            const csToggle = document.getElementById('bottom-collapse-cs-toggle');
            if (csToggle) csToggle.classList.toggle('active', on);
            if (!on) {
                const panel = document.getElementById('collapsed-extras-panel');
                if (panel) panel.style.display = 'none';
                const expandBtn = document.getElementById('collapse-expand-btn');
                if (expandBtn) expandBtn.classList.remove('open');
            }
        }

        window._toggleBottomCollapse = function() {
            const isOn = !document.body.classList.contains('bottom-collapse-mode');
            if (typeof settings !== 'undefined') settings.bottomCollapseMode = isOn;
            _applyCollapseState(isOn);
            if (typeof throttledSaveData === 'function') throttledSaveData();
            if (typeof showNotification === 'function')
                showNotification(isOn ? '底部栏已收纳 — 点击 ⌃ 展开更多' : '已退出收纳模式', 'success', 2000);
        };

        window.toggleCollapsedExtras = function() {
            const panel = document.getElementById('collapsed-extras-panel');
            const btn = document.getElementById('collapse-expand-btn');
            if (!panel) return;
            const willOpen = panel.style.display === 'none' || panel.style.display === '';
            panel.style.display = willOpen ? 'block' : 'none';
            if (btn) btn.classList.toggle('open', willOpen);

            function wireExtra(extraId, primaryId) {
                const extra = document.getElementById(extraId);
                const primary = document.getElementById(primaryId);
                if (extra && primary && !extra._linked) {
                    extra._linked = true;
                    extra.addEventListener('click', (e) => { e.stopPropagation(); primary.click(); });
                }
            }
            wireExtra('combo-btn-extra', 'combo-btn');
            wireExtra('batch-btn-extra', 'batch-btn');
        };

        window.exitCollapseMode = function() {
            if (typeof settings !== 'undefined') settings.bottomCollapseMode = false;
            _applyCollapseState(false);
            if (typeof throttledSaveData === 'function') throttledSaveData();
            if (typeof showNotification === 'function') showNotification('已退出收纳模式', 'success', 2000);
        };

    (function initCollapseMode() {
        function tryApply() {
            if (typeof settings !== 'undefined') {
                if (settings.bottomCollapseMode) _applyCollapseState(true);
            } else {
                setTimeout(tryApply, 300);
            }
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', tryApply);
        } else {
            setTimeout(tryApply, 400);
        }
        window.switchStatsTab = function(tab) {
            var statsPanel = document.getElementById('stats-panel');
            var favoritesPanel = document.getElementById('favorites-panel');
            var searchPanel = document.getElementById('search-panel');
            var allBtns = document.querySelectorAll('.stats-nav-btn');
            allBtns.forEach(function(b) { b.classList.remove('active'); });
            var activeBtn = document.querySelector('.stats-nav-btn[data-tab="' + tab + '"]');
            if (activeBtn) activeBtn.classList.add('active');

            if (statsPanel) statsPanel.style.display = 'none';
            if (favoritesPanel) favoritesPanel.style.display = 'none';
            if (searchPanel) searchPanel.style.display = 'none';

            if (tab === 'stats') {
                if (statsPanel) statsPanel.style.display = 'block';
            } else if (tab === 'search') {
                if (searchPanel) searchPanel.style.display = 'block';
                setTimeout(function() {
                    var inp = document.getElementById('msg-search-input');
                    if (inp) inp.focus();
                }, 100);
            } else {
                if (favoritesPanel) favoritesPanel.style.display = 'block';
                if (typeof renderFavorites === 'function') renderFavorites();
            }
        };
    })();

/* ================================================
   自定义首页快捷键 — 全部逻辑
   ================================================ */
function initHomeShortcuts() {

    // --------------------------------------------------
    // 【映射表】每个快捷键的 id → 名称、图标、点击后干嘛
    // 如果某个按钮点了没反应，说明下面那个 id 和你 HTML 里的对不上
    // 请打开你的 index.html，找到对应按钮的实际 id，替换掉引号里的内容
    // --------------------------------------------------
    var SHORTCUT_MAP = {
        // —— 设置分类（4个）——
        'appearance': {
            name: '外观设置',
            icon: 'fa-palette',
            action: function () { document.getElementById('appearance-settings') && document.getElementById('appearance-settings').click(); }
        },
        'chat': {
            name: '聊天设置',
            icon: 'fa-comment-dots',
            action: function () { document.getElementById('chat-settings') && document.getElementById('chat-settings').click(); }
        },
        'advanced': {
            name: '高级功能',
            icon: 'fa-solid fa-gem',
            action: function () { document.getElementById('advanced-settings') && document.getElementById('advanced-settings').click(); }
        },
        'data': {
            name: '数据管理',
            icon: 'fa-database',
            action: function () { document.getElementById('data-settings') && document.getElementById('data-settings').click(); }
        },
        // —— 高级功能分类（10个）——
        'custom-replies': {
            name: '自定义回复',
            icon: 'fa-solid fa-feather-pointed',
            action: function () {
                // 如果这个 id 点了没反应，换成你 HTML 里的实际 id
                var btn = document.getElementById('custom-replies-function')
                      || document.getElementById('reply-library-function');
                if (btn) btn.click();
            }
        },
        'stats': {
            name: '消息统计',
            icon: 'fa-chart-bar',
            action: function () { document.getElementById('stats-function') && document.getElementById('stats-function').click(); }
        },
        'mood': {
            name: '心情与日程',
            icon: 'fas fa-calendar-alt',
            action: function () { document.getElementById('calendar-function') && document.getElementById('calendar-function').click(); }
        },
        'envelope': {
            name: '留言板',
            icon: 'fa-thumbtack',
            action: function () { document.getElementById('envelope-function') && document.getElementById('envelope-function').click(); }
        },
        'period': {
            name: '月经记录',
            icon: 'fa-solid fa-droplet',
            // 如果点了没反应，换成你 HTML 里的实际 id
            action: function () { document.getElementById('period-function') && document.getElementById('period-function').click(); }
        },
        'wishing-pool': {
            name: '许愿池',
            icon: 'fas fa-star',
            action: function () { document.getElementById('wishing-pool-function') && document.getElementById('wishing-pool-function').click(); }
        },
        'anniversary': {
            name: '重要日',
            icon: 'fas fa-heart',
            // 如果点了没反应，换成你 HTML 里的实际 id
            action: function () { document.getElementById('anniversary-function') && document.getElementById('anniversary-function').click(); }
        },
        'screenshot': {
            name: '截图保存聊天',
            icon: 'fas fa-camera',
            // 如果点了没反应，换成你 HTML 里的实际 id
            action: function () { document.getElementById('screenshot-chat-btn') && document.getElementById('screenshot-chat-btn').click(); }
        },
        'decision': {
            name: '抉择',
            icon: 'fas fa-balance-scale',
            // 如果点了没反应，换成你 HTML 里的实际 id
            action: function () { document.getElementById('decision-function') && document.getElementById('decision-function').click(); }
        },
        'fortune': {
            name: '运势·占卜',
            icon: 'fas fa-star-and-crescent',
            action: function () { document.getElementById('fortune-lenormand-function') && document.getElementById('fortune-lenormand-function').click(); }
        }
    };

    // --------------------------------------------------
    // 【第1步】找到底部栏的"高级功能"按钮
    // 在它后面插入一个空容器（初始隐藏）
    // --------------------------------------------------
    var advancedBtn = document.getElementById('advanced-shortcut-btn');
    if (!advancedBtn) {
        console.warn('[首页快捷键] 找不到 advanced-shortcut-btn，跳过初始化');
        return;
    }

    var dynamicContainer = document.createElement('div');
    dynamicContainer.id = 'home-shortcuts-dynamic';
    dynamicContainer.style.display = 'none';

    // 如果原来的按钮有 collapse-hideable（收纳模式用的），也加上
    if (advancedBtn.classList.contains('collapse-hideable')) {
        dynamicContainer.classList.add('collapse-hideable');
    }

    // 插入到高级功能按钮的后面
    advancedBtn.parentElement.insertBefore(dynamicContainer, advancedBtn.nextSibling);

        // --------------------------------------------------
    // 【第2步】给 HTML 里的入口行绑定点击事件
    // --------------------------------------------------
    var hsEntryRow = document.getElementById('hs-entry-row');
    if (hsEntryRow) {
        hsEntryRow.addEventListener('click', function () {
            openHomeShortcutsModal();
        });
    }

    // --------------------------------------------------
    // 【第3步】往页面里塞一个模态框（无开关版）
    // --------------------------------------------------
    var tempSelected = [];
    var isModalOpen = false;

    var modalHTML = '<div class="modal" id="home-shortcuts-modal">'
        + '<div class="modal-content"><div class="hs-wrapper">'
        + '<div class="hs-gradient-bar"></div>'
        + '<div class="hs-header">'
        + '<div class="hs-header-title"><i class="fas fa-grip"></i><span>自定义首页快捷键</span></div>'
        + '<button id="hs-close-btn" style="background:none;border:none;color:var(--text-secondary);font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;"><i class="fas fa-times"></i></button>'
        + '</div>'
        + '<div class="hs-body" id="hs-body"></div>'
        + '<div class="hs-footer" style="display:flex;align-items:center;justify-content:space-between;">'
        + '<button id="hs-cancel-btn" style="background:none;border:1px solid var(--border-color);color:var(--text-secondary);padding:6px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
        + '<div class="hs-counter" id="hs-counter">已选 <span>0</span>/5</div>'
        + '<button id="hs-save-btn" style="background:var(--accent-color);border:none;color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600;font-family:var(--font-family);">保存</button>'
        + '</div>'
        + '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    var modal = document.getElementById('home-shortcuts-modal');

    // 点击灰色背景关闭（等同于取消）
    modal.addEventListener('click', function (e) {
        if (e.target === modal) cancelModal();
    });

    // 叉叉和取消按钮
    document.getElementById('hs-close-btn').addEventListener('click', cancelModal);
    document.getElementById('hs-cancel-btn').addEventListener('click', cancelModal);

    // 保存按钮
    document.getElementById('hs-save-btn').addEventListener('click', function () {
        settings.homeShortcutsSelected = tempSelected.slice();
        isModalOpen = false;
        throttledSaveData();
        hideModal(modal);
        renderHomeShortcuts();
        showNotification('快捷键设置已保存', 'success', 1500);
    });

    // --------------------------------------------------
    // 【第4步】渲染模态框里的可选项列表
    // --------------------------------------------------
    function renderHsOptions() {
        var body = document.getElementById('hs-body');
        var html = '';

        // 设置分类
        html += '<div class="hs-group-title">── 设置分类 ───</div>';
        var settingsGroup = ['appearance', 'chat', 'advanced', 'data'];
        for (var s = 0; s < settingsGroup.length; s++) {
            var id = settingsGroup[s];
            var item = SHORTCUT_MAP[id];
            if (!item) continue;
            var isChecked = tempSelected.indexOf(id) > -1;
            html += '<div class="hs-item ' + (isChecked ? 'checked' : '') + '" data-id="' + id + '">'
                + '<div class="hs-item-checkbox">' + (isChecked ? '✓' : '') + '</div>'
                + '<div class="hs-item-icon"><i class="fas ' + item.icon + '"></i></div>'
                + '<div class="hs-item-name">' + item.name + '</div>'
                + '</div>';
        }

        // 分割线
        html += '<hr class="hs-divider">';

        // 高级功能分类
        html += '<div class="hs-group-title">── 高级功能分类 ───</div>';
        var advancedGroup = [
            'custom-replies', 'stats', 'mood', 'envelope',
            'period', 'wishing-pool', 'anniversary', 'screenshot',
            'decision', 'fortune'
        ];
        for (var a = 0; a < advancedGroup.length; a++) {
            var aid = advancedGroup[a];
            var aitem = SHORTCUT_MAP[aid];
            if (!aitem) continue;
            var aisChecked = tempSelected.indexOf(aid) > -1;
            html += '<div class="hs-item ' + (aisChecked ? 'checked' : '') + '" data-id="' + aid + '">'
                + '<div class="hs-item-checkbox">' + (aisChecked ? '✓' : '') + '</div>'
                + '<div class="hs-item-icon"><i class="fas ' + aitem.icon + '"></i></div>'
                + '<div class="hs-item-name">' + aitem.name + '</div>'
                + '</div>';
        }

        body.innerHTML = html;

        // 更新底部 "已选 X/5"
        document.getElementById('hs-counter').innerHTML = '已选 <span>' + tempSelected.length + '</span>/5';

        // 给每个选项绑定点击（仅预览）
        var allItems = body.querySelectorAll('.hs-item');
        for (var j = 0; j < allItems.length; j++) {
            (function (el) {
                el.addEventListener('click', function () {
                    var clickId = el.getAttribute('data-id');
                    var idx = tempSelected.indexOf(clickId);
                    if (idx > -1) {
                        tempSelected.splice(idx, 1);
                    } else {
                        if (tempSelected.length >= 5) {
                            showNotification('最多选择 5 个快捷键', 'warning', 1500);
                            return;
                        }
                        tempSelected.push(clickId);
                    }
                    renderHsOptions();
                    renderHomeShortcuts(); // 实时预览
                });
            })(allItems[j]);
        }
    }

    // --------------------------------------------------
    // 【第5步】渲染首页的快捷按钮
    // --------------------------------------------------
    function renderHomeShortcuts() {
        dynamicContainer.innerHTML = '';

        // 如果在弹窗里，用临时数据预览；否则用真实数据
        var currentSelected = isModalOpen ? tempSelected : (settings.homeShortcutsSelected || []);

        // 如果列表是空的，就显示默认的"高级功能"按钮
        if (currentSelected.length === 0) {
            advancedBtn.style.display = '';
            dynamicContainer.style.display = 'none';
            return;
        }

        // 有选中项，隐藏默认按钮，显示自定义按钮
        advancedBtn.style.display = 'none';
        dynamicContainer.style.display = 'flex';

        for (var k = 0; k < currentSelected.length; k++) {
            var sid = currentSelected[k];
            var sitem = SHORTCUT_MAP[sid];
            if (!sitem) continue;

            var btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.innerHTML = '<i class="fas ' + sitem.icon + '"></i>';
            btn.title = sitem.name;

            (function (mapItem) {
                btn.addEventListener('click', function () {
                    if (mapItem.action) mapItem.action();
                });
            })(sitem);

            dynamicContainer.appendChild(btn);
        }
    }

    // --------------------------------------------------
    // 【第6步】打开模态框
    // --------------------------------------------------
    function openHomeShortcutsModal() {
        tempSelected = (settings.homeShortcutsSelected || []).slice();
        isModalOpen = true;
        renderHsOptions();
        renderHomeShortcuts(); // 开启预览
        showModal(modal);
    }

    // 取消操作（恢复原样）
    function cancelModal() {
        isModalOpen = false;
        hideModal(modal);
        renderHomeShortcuts(); // 恢复真实设置
    }

    // --------------------------------------------------
    // 【第7步】页面加载时渲染
    // --------------------------------------------------
    // 确保一开始就有默认值
    if (!settings.homeShortcutsSelected || settings.homeShortcutsSelected.length === 0) {
        settings.homeShortcutsSelected = ['advanced'];
    }
    
    renderHomeShortcuts();
    setTimeout(function () {
        renderHomeShortcuts();
    }, 600);
}
