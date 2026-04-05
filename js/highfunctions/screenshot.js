/**
 * screenshot.js - 截图功能完整实现 (最终修复版)
 * 解决问题：按钮点击无反应（事件未绑定）
 */

/**
 * 辅助函数：等待图片加载完成
 */
function waitImgLoad(img) {
    return new Promise(resolve => {
        if (img.complete) resolve();
        img.onload = resolve;
        img.onerror = resolve;
    });
}

/**
 * 辅助函数：动态加载 html2canvas 库
 */
function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
        if (typeof html2canvas !== 'undefined') {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('截图组件加载失败，请检查网络'));
        document.head.appendChild(script);
    });
}

/**
 * 1. 初始化截图按钮 (使用事件委托，解决加载顺序问题)
 */
function initScreenshotFunction() {
    // 【核心修复】使用事件委托，绑定在 document 上
    // 这样无论按钮何时加载出来，都能响应点击
    document.addEventListener('click', function(e) {
        // 检查点击的元素是否是截图按钮，或者包含截图按钮
        const btn = e.target.closest('#screenshot-chat-btn');
        if (btn) {
            // 阻止默认行为，防止其他事件干扰
            e.preventDefault();
            e.stopPropagation();
            openScreenshotModal();
        }
    });
}

function openScreenshotModal() {
    const selectModal = document.getElementById('screenshot-select-modal');
    if (!selectModal) {
        showNotification('截图组件未正确加载', 'error');
        console.error('screenshot-select-modal not found');
        return;
    }
    
    // 添加调试日志
    console.log('Opening screenshot modal...');
    
    // 强制显示模态框，使用 important
    selectModal.style.setProperty('display', 'flex', 'important');
    
    // 确保内容区域可见
    const modalContent = selectModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.setProperty('display', 'flex', 'important');
        modalContent.style.setProperty('background-color', 'var(--secondary-bg)', 'important');
        modalContent.style.setProperty('opacity', '1', 'important');
        modalContent.style.setProperty('transform', 'translateY(0) scale(1)', 'important');
        modalContent.style.setProperty('z-index', '2001', 'important');
        
        // 确保内容容器可见
        const container = modalContent.querySelector('#message-selection-container');
        if (container) {
            container.style.setProperty('display', 'block', 'important');
            container.style.setProperty('visibility', 'visible', 'important');
        }
    }
    
    // 初始化列表
    try {
        initScreenshotSelection();
    } catch (error) {
        console.error('初始化消息选择失败:', error);
        showNotification('初始化失败，请重试', 'error');
        closeScreenshotModal();
    }
}

/**
 * 关闭选择模态框
 */
function closeScreenshotModal() {
    const selectModal = document.getElementById('screenshot-select-modal');
    if (selectModal) {
        selectModal.style.setProperty('display', 'none', 'important');
    }
}

/**
 * 3. 初始化消息选择列表 (支持倒序、日期筛选、主题样式)

function initScreenshotSelection() {
    const container = document.getElementById('message-selection-container');
    const selectedCount = document.getElementById('selected-count');
    const saveBtn = document.getElementById('save-selected-messages');
    
    if (!container) {
        console.error('message-selection-container not found in DOM');
        const modalContent = document.querySelector('#screenshot-select-modal .modal-content');
        if (modalContent) {
            const newContainer = document.createElement('div');
            newContainer.id = 'message-selection-container';
            modalContent.insertBefore(newContainer, modalContent.firstChild);
            container = newContainer;
        } else {
            showNotification('截图模态框结构错误', 'error');
            closeScreenshotModal();
            return;
        }
    }

    // 动态插入日期筛选工具栏
    let filterBar = document.getElementById('screenshot-date-filter-bar');
    if (!filterBar) {
        filterBar = document.createElement('div');
        filterBar.id = 'screenshot-date-filter-bar';
        filterBar.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px; padding: 10px; background: var(--primary-bg); border-radius: 12px; align-items: center; flex-wrap: wrap;';
        filterBar.innerHTML = `
            <input type="date" id="screenshot-filter-date" style="flex:1; padding: 8px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; background: var(--secondary-bg); color: var(--text-primary);">
            <button id="screenshot-filter-btn" class="modal-btn modal-btn-secondary" style="padding: 8px 12px; font-size: 12px;">跳转</button>
            <button id="screenshot-filter-clear-btn" class="modal-btn modal-btn-secondary" style="padding: 8px 12px; font-size: 12px; opacity: 0.7;">显示全部</button>
        `;
        container.parentNode.insertBefore(filterBar, container);
    }

    container.innerHTML = '';
    
    // 从 state.js 的 messages 数组获取消息
    let currentMessages = [];
    if (typeof messages !== 'undefined' && Array.isArray(messages)) {
        currentMessages = [...messages];
    } else if (window.messages && Array.isArray(window.messages)) {
        currentMessages = [...window.messages];
    }

    if (currentMessages.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-secondary);">没有可截图的聊天记录</div>';
        if(saveBtn) saveBtn.disabled = true;
        return;
    }

    // ===== 【修改1】倒序排列：最新消息在最上面 =====
    const allMessagesSorted = [...currentMessages].sort((a, b) => b.timestamp - a.timestamp);

        // 渲染列表
    function renderList(msgs) {
        container.innerHTML = '';
        msgs.forEach((msg) => {
            const isUser = msg.sender === 'user';
            const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            const safeText = (msg.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");

            // 【新增】生成引用预览HTML
            let replyPreviewHTML = '';
            if (msg.replyTo) {
                const replySender = msg.replyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
                let replyText = msg.replyTo.text ? msg.replyTo.text.slice(0, 20) : '[图片]';
                if (msg.replyTo.text && msg.replyTo.text.length > 20) replyText += '...';
                
                // 样式设置为淡灰色，与主消息区分
                replyPreviewHTML = `
                    <div class="reply-indicator-preview" style="
                        font-size: 11px; 
                        color: var(--text-secondary); 
                        opacity: 0.6; 
                        margin-bottom: 4px;
                        padding-left: 8px; 
                        border-left: 2px solid var(--border-color); 
                        line-height: 1.3; 
                        white-space: nowrap; 
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">
                        <span style="color: var(--accent-color); margin-right: 4px; font-weight: 600;">${replySender}</span>
                        <span style="font-style: italic; opacity: 0.8;">${replyText}</span>
                    </div>
                `;
            }

            const item = document.createElement('div');
            item.className = 'message-selection-item';
            item.dataset.id = msg.id;
            item.dataset.timestamp = msg.timestamp;
            item.innerHTML = `
                <input type="checkbox" class="message-checkbox" style="width:18px; height:18px; margin-right:12px; cursor:pointer; flex-shrink:0;">
                <div style="flex:1; min-width:0;">
                    <!-- 这里插入了引用预览 -->
                    ${replyPreviewHTML}
                    <div style="font-size:14px; margin-bottom:2px; word-break:break-all;">${safeText}</div>
                    <div style="font-size:11px; color:var(--text-secondary); display:flex; justify-content:space-between;">
                        <span style="font-weight:500; color:${isUser ? 'var(--accent-color)' : 'var(--text-primary)'};">${isUser ? '我' : '对方'}</span>
                        <span>${time}</span>
                    </div>
                </div>
            `;
            // ... 后面的点击事件绑定保持不变 ...
            const checkbox = item.querySelector('.message-checkbox');
            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
                updateCount();
            });
            container.appendChild(item);
        });
    }
    

    renderList(allMessagesSorted);

    // 更新计数函数
    function updateCount() {
        const count = container.querySelectorAll('.message-checkbox:checked').length;
        if (selectedCount) selectedCount.textContent = count;
        if (saveBtn) saveBtn.disabled = count === 0;
    }
    
    // 绑定控制按钮
    const selectAllBtn = document.getElementById('select-all');
    const selectNoneBtn = document.getElementById('select-none');
    const cancelBtn = document.getElementById('cancel-screenshot-select');
    
    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            //container.querySelectorAll('.message-checkbox:visible').forEach(c => c.checked = true);
            container.querySelectorAll('.message-checkbox').forEach(c => c.checked = true);
            updateCount();
        };
    }
    
    if (selectNoneBtn) {
        selectNoneBtn.onclick = () => {
            container.querySelectorAll('.message-checkbox:checked').forEach(c => c.checked = false);
            updateCount();
        };
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = closeScreenshotModal;
    }
    
    // 头像显示开关
    const avatarToggle = document.getElementById('screenshot-show-avatar');
    if (avatarToggle) {
        const savedPref = localStorage.getItem('screenshot-show-avatar');
        avatarToggle.checked = savedPref === 'true';
        avatarToggle.addEventListener('change', (e) => {
            localStorage.setItem('screenshot-show-avatar', e.target.checked);
        });
    }

    // ===== 【修改2】日期筛选逻辑 =====
    const dateInput = document.getElementById('screenshot-filter-date');
    const filterBtn = document.getElementById('screenshot-filter-btn');
    const clearBtn = document.getElementById('screenshot-filter-clear-btn');

    if (filterBtn && dateInput) {
        filterBtn.onclick = () => {
            const selectedDate = dateInput.value; // YYYY-MM-DD
            if (!selectedDate) {
                renderList(allMessagesSorted);
                return;
            }

            // 筛选当天的消息
            const filtered = allMessagesSorted.filter(msg => {
                const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
                return msgDate === selectedDate;
            });

            renderList(filtered);
            
            // 如果有一条，模拟跳转（这里只是选中第一条）
            if (filtered.length > 0) {
                const firstItem = container.querySelector('.message-selection-item');
                if (firstItem) {
                    firstItem.style.background = 'rgba(var(--accent-color-rgb), 0.1)';
                    setTimeout(() => { firstItem.style.background = ''; }, 2000);
                }
            }
        };
    }

    if (clearBtn) {
        clearBtn.onclick = () => {
            dateInput.value = '';
            renderList(allMessagesSorted);
        };
    }

    // 保存按钮点击事件
    if (saveBtn) {
        saveBtn.onclick = () => {
            const checkedItems = container.querySelectorAll('.message-checkbox:checked');
            const selectedMsgs = [];
            
            checkedItems.forEach(cb => {
                const itemEl = cb.closest('.message-selection-item');
                const msgId = itemEl.dataset.id;
                const foundMsg = currentMessages.find(m => String(m.id) === String(msgId));
                if (foundMsg) selectedMsgs.push(foundMsg);
            });
            
            if (selectedMsgs.length === 0) {
                showNotification('请选择消息', 'warning');
                return;
            }
            
            closeScreenshotModal();
            generateScreenshot(selectedMsgs);
        };
    }
    
    updateCount();
} */

/**
 * 3. 初始化消息选择列表 (优化版：支持批量选取、无提示、全交互)
 */
function initScreenshotSelection() {
    const container = document.getElementById('message-selection-container');
    const selectedCount = document.getElementById('selected-count');
    const saveBtn = document.getElementById('save-selected-messages');

    if (!container) {
        console.error('message-selection-container not found in DOM');
        const modalContent = document.querySelector('#screenshot-select-modal .modal-content');
        if (modalContent) {
            const newContainer = document.createElement('div');
            newContainer.id = 'message-selection-container';
            modalContent.insertBefore(newContainer, modalContent.firstChild);
            container = newContainer;
        } else {
            showNotification('截图模态框结构错误', 'error');
            closeScreenshotModal();
            return;
        }
    }

    // 动态插入日期筛选工具栏
    let filterBar = document.getElementById('screenshot-date-filter-bar');
    if (!filterBar) {
        filterBar = document.createElement('div');
        filterBar.id = 'screenshot-date-filter-bar';
        filterBar.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px; padding: 10px; background: var(--primary-bg); border-radius: 12px; align-items: center; flex-wrap: wrap;';
        filterBar.innerHTML = `
            <input type="date" id="screenshot-filter-date" style="flex:1; padding: 8px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; background: var(--secondary-bg); color: var(--text-primary);">
            <button id="screenshot-filter-btn" class="modal-btn modal-btn-secondary" style="padding: 8px 12px; font-size: 12px;">跳转</button>
            <button id="screenshot-filter-clear-btn" class="modal-btn modal-btn-secondary" style="padding: 8px 12px; font-size: 12px; opacity: 0.7;">显示全部</button>
        `;
        container.parentNode.insertBefore(filterBar, container);
    }

    container.innerHTML = '';

    // 获取消息数据
    let currentMessages = [];
    if (typeof messages !== 'undefined' && Array.isArray(messages)) {
        currentMessages = [...messages];
    } else if (window.messages && Array.isArray(window.messages)) {
        currentMessages = [...window.messages];
    }

    if (currentMessages.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-secondary);">没有可截图的聊天记录</div>';
        if(saveBtn) saveBtn.disabled = true;
        return;
    }

    // 倒序排列
    const allMessagesSorted = [...currentMessages].sort((a, b) => b.timestamp - a.timestamp);

    // ===== 批量选取逻辑 =====
    let batchMode = false;
    let batchStartEl = null;
    // 注意：这里ID改为对应HTML中的 screenshot-batch-btn
    const batchBtn = document.getElementById('screenshot-batch-btn');
    
    if (batchBtn) {
        batchBtn.onclick = () => {
            batchMode = !batchMode;
            batchStartEl = null;
            if (batchMode) {
                batchBtn.style.background = 'var(--accent-color)';
                batchBtn.style.color = '#fff';
                // 按照要求，去掉了提示
            } else {
                batchBtn.style.background = '';
                batchBtn.style.color = '';
            }
        };
    }

    // 渲染列表
    function renderList(msgs) {
        container.innerHTML = '';
        msgs.forEach((msg) => {
            const isUser = msg.sender === 'user';
            const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            const safeText = (msg.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");

            let replyPreviewHTML = '';
            if (msg.replyTo) {
                const replySender = msg.replyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
                let replyText = msg.replyTo.text ? msg.replyTo.text.slice(0, 20) : '[图片]';
                if (msg.replyTo.text && msg.replyTo.text.length > 20) replyText += '...';
                replyPreviewHTML = `
                    <div class="reply-indicator-preview" style="font-size: 11px; color: var(--text-secondary); opacity: 0.6; margin-bottom: 4px; padding-left: 8px; border-left: 2px solid var(--border-color); line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <span style="color: var(--accent-color); margin-right: 4px; font-weight: 600;">${replySender}</span>
                        <span style="font-style: italic; opacity: 0.8;">${replyText}</span>
                    </div>
                `;
            }

            const item = document.createElement('div');
            item.className = 'message-selection-item';
            item.dataset.id = msg.id;
            item.dataset.timestamp = msg.timestamp;
            item.innerHTML = `
                <input type="checkbox" class="message-checkbox" style="width:18px; height:18px; margin-right:12px; cursor:pointer; flex-shrink:0;">
                <div style="flex:1; min-width:0;">
                    ${replyPreviewHTML}
                    <div style="font-size:14px; margin-bottom:2px; word-break:break-all;">${safeText}</div>
                    <div style="font-size:11px; color:var(--text-secondary); display:flex; justify-content:space-between;">
                        <span style="font-weight:500; color:${isUser ? 'var(--accent-color)' : 'var(--text-primary)'};">${isUser ? '我' : '对方'}</span>
                        <span>${time}</span>
                    </div>
                </div>
            `;

            const checkbox = item.querySelector('.message-checkbox');

            // ===== 核心修改：统一点击事件 =====
            item.addEventListener('click', (e) => {
                
                // 1. 如果在批量模式下
                if (batchMode) {
                    // 无论点击哪里（消息或复选框），都执行批量逻辑
                    if (!batchStartEl) {
                        // 第一次点击：设定起点
                        batchStartEl = item;
                        item.style.outline = '2px solid var(--accent-color)';
                        item.style.outlineOffset = '-2px';
                        checkbox.checked = true; // 选中起点
                        updateCount();
                    } else {
                        // 第二次点击：设定终点并批量选中
                        const allItems = Array.from(container.querySelectorAll('.message-selection-item'));
                        const startIdx = allItems.indexOf(batchStartEl);
                        const endIdx = allItems.indexOf(item);
                        
                        const min = Math.min(startIdx, endIdx);
                        const max = Math.max(startIdx, endIdx);

                        for (let i = min; i <= max; i++) {
                            const cb = allItems[i].querySelector('.message-checkbox');
                            if (cb) cb.checked = true;
                        }

                        // 清理状态
                        batchStartEl.style.outline = '';
                        batchStartEl = null;
                        batchMode = false;
                        if (batchBtn) {
                            batchBtn.style.background = '';
                            batchBtn.style.color = '';
                        }
                        updateCount();
                    }
                    // 阻止默认事件，防止复选框状态被二次切换
                    e.preventDefault(); 
                } 
                // 2. 普通模式
                else {
                    // 如果点击的是复选框本身，让它自己切换（不调用preventDefault）
                    if (e.target === checkbox) {
                         // 浏览器默认行为会切换checkbox，这里只需更新计数
                         // 使用setTimeout确保状态更新后再计数
                         setTimeout(updateCount, 0);
                    } else {
                        // 如果点击的是消息行，手动切换复选框
                        checkbox.checked = !checkbox.checked;
                        updateCount();
                    }
                }
            });

            container.appendChild(item);
        });
    }

    renderList(allMessagesSorted);

    // 更新计数函数
    function updateCount() {
        const count = container.querySelectorAll('.message-checkbox:checked').length;
        if (selectedCount) selectedCount.textContent = count;
        if (saveBtn) saveBtn.disabled = count === 0;
        // 【新增】控制 TXT 按钮状态
        const saveTxtBtn = document.getElementById('save-selected-txt');
        if (saveTxtBtn) {
            saveTxtBtn.disabled = count === 0; // 如果数量为0，禁用按钮
        }
    }

    // 绑定控制按钮
    const selectAllBtn = document.getElementById('select-all');
    const selectNoneBtn = document.getElementById('select-none');
    const cancelBtn = document.getElementById('cancel-screenshot-select');

    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            container.querySelectorAll('.message-checkbox').forEach(c => c.checked = true);
            updateCount();
        };
    }
    if (selectNoneBtn) {
        selectNoneBtn.onclick = () => {
            container.querySelectorAll('.message-checkbox:checked').forEach(c => c.checked = false);
            updateCount();
        };
    }
    if (cancelBtn) {
        cancelBtn.onclick = closeScreenshotModal;
    }

    // 头像显示开关
    const avatarToggle = document.getElementById('screenshot-show-avatar');
    if (avatarToggle) {
        const savedPref = localStorage.getItem('screenshot-show-avatar');
        avatarToggle.checked = savedPref === 'true';
        avatarToggle.addEventListener('change', (e) => {
            localStorage.setItem('screenshot-show-avatar', e.target.checked);
        });
    }

    // 日期筛选逻辑
    const dateInput = document.getElementById('screenshot-filter-date');
    const filterBtn = document.getElementById('screenshot-filter-btn');
    const clearBtn = document.getElementById('screenshot-filter-clear-btn');

    if (filterBtn && dateInput) {
        filterBtn.onclick = () => {
            const selectedDate = dateInput.value;
            if (!selectedDate) {
                renderList(allMessagesSorted);
                return;
            }
            const filtered = allMessagesSorted.filter(msg => {
                const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
                return msgDate === selectedDate;
            });
            renderList(filtered);
            if (filtered.length > 0) {
                const firstItem = container.querySelector('.message-selection-item');
                if (firstItem) {
                    firstItem.style.background = 'rgba(var(--accent-color-rgb), 0.1)';
                    setTimeout(() => { firstItem.style.background = ''; }, 2000);
                }
            }
        };
    }
    if (clearBtn) {
        clearBtn.onclick = () => {
            dateInput.value = '';
            renderList(allMessagesSorted);
        };
    }

    // 保存按钮点击事件
    if (saveBtn) {
        saveBtn.onclick = () => {
            const checkedItems = container.querySelectorAll('.message-checkbox:checked');
            const selectedMsgs = [];
            checkedItems.forEach(cb => {
                const itemEl = cb.closest('.message-selection-item');
                const msgId = itemEl.dataset.id;
                const foundMsg = currentMessages.find(m => String(m.id) === String(msgId));
                if (foundMsg) selectedMsgs.push(foundMsg);
            });
            if (selectedMsgs.length === 0) {
                showNotification('请选择消息', 'warning');
                return;
            }
            closeScreenshotModal();
            generateScreenshot(selectedMsgs);
        };
    }

        // 【新增】导出 TXT 按钮事件
    const saveTxtBtn = document.getElementById('save-selected-txt');
    if (saveTxtBtn) {
        saveTxtBtn.onclick = () => {
            const checkedItems = container.querySelectorAll('.message-checkbox:checked');
            const selectedMsgs = [];
            checkedItems.forEach(cb => {
                const itemEl = cb.closest('.message-selection-item');
                const msgId = itemEl.dataset.id;
                const foundMsg = currentMessages.find(m => String(m.id) === String(msgId));
                if (foundMsg) selectedMsgs.push(foundMsg);
            });
            
            if (selectedMsgs.length === 0) {
                showNotification('请选择消息', 'warning');
                return;
            }
            
            // 关闭模态框并导出
            closeScreenshotModal();
            generateTxtFile(selectedMsgs);
        };
    }

    updateCount();
}

/**
 * 导出聊天记录为 TXT 文件 (极简分析版 + 头部统计)
 */
function generateTxtFile(msgs) {
    if (!msgs || msgs.length === 0) return;

    // 按时间正序排列
    const sortedMsgs = [...msgs].sort((a, b) => a.timestamp - b.timestamp);

    // ===== 1. 添加头部信息 =====
    const exportTime = new Date().toLocaleString('zh-CN'); // 例如：2023/10/27 16:30:00
    const count = sortedMsgs.length;
    
    // 拼接头部字符串
    let textContent = `导出时间：${exportTime}\n导出条数：${count} 条\n----------------------------------------\n`;

    // ===== 2. 循环生成消息内容 =====
    sortedMsgs.forEach(msg => {
        // 确定发送者昵称
        const sender = msg.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
        
        // 获取消息内容
        const content = msg.text || '[图片/文件]';

        // 处理引用内容 (全文)
        let replyStr = "";
        if (msg.replyTo) {
            const replySender = msg.replyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
            const replyText = msg.replyTo.text || '[图片/文件]';
            replyStr = `【回复 ${replySender}: ${replyText}】`;
        }

        // 拼接最终行
        textContent += `${sender}: ${replyStr}${content}\n`;
    });

    // ===== 3. 下载文件 =====
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `聊天记录_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('TXT 文档已导出', 'success');
}

 
async function generateScreenshot(msgs) {
    showNotification('正在生成截图...', 'info');

    // 1. 强制等待字体加载完成
    if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
    }
    await new Promise(resolve => setTimeout(resolve, 100));

    let tempContainer = null;
    try {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);

        // 获取样式变量
        const fontFamily = computedStyle.getPropertyValue('--message-font-family').trim() || "'Noto Serif SC', serif";
        const accentColor = computedStyle.getPropertyValue('--accent-color').trim() || '#c5a47e';
        const secondaryBg = computedStyle.getPropertyValue('--secondary-bg').trim() || '#f0f0f0';
        const primaryBg = computedStyle.getPropertyValue('--primary-bg').trim() || '#ffffff';
        const textPrimary = computedStyle.getPropertyValue('--text-primary').trim() || '#1a1a1a';
        const textSecondary = computedStyle.getPropertyValue('--text-secondary').trim() || '#7a7a7a';
        const messageFontWeight = computedStyle.getPropertyValue('--message-font-weight').trim() || '400';
        const messageLineHeight = computedStyle.getPropertyValue('--message-line-height').trim() || '1.5';
        const bubbleStyle = settings.bubbleStyle || 'standard';
        const showAvatar = localStorage.getItem('screenshot-show-avatar') === 'true';

        // 【修复位置】定义头像圆角
        let avatarRadius = '20%'; 
        try {
            const radiusVar = computedStyle.getPropertyValue('--avatar-corner-radius').trim();
            if (radiusVar && radiusVar !== '0px' && radiusVar !== '50%') {
                avatarRadius = radiusVar;
            } else if (radiusVar === '0px') {
                avatarRadius = '4px';
            }
        } catch (e) {}

        // 背景设置
        let bgStyle = `background-color: ${primaryBg};`;
        const bgImageVar = computedStyle.getPropertyValue('--chat-bg-image').trim();
        if (bgImageVar && bgImageVar !== 'none') {
            bgStyle = `background-image: ${bgImageVar}; background-size: 100% auto; background-position: top center; background-repeat: repeat-y;`;
        } else if (settings.backgroundUrl) {
            bgStyle = `background-image: url('${settings.backgroundUrl}'); background-size: 100% auto; background-position: top center; background-repeat: repeat-y;`;
        }

        // 头像URL获取
        let myAvatarUrl = '';
        let partnerAvatarUrl = '';
        if (showAvatar) {
            // 修正：右侧是用户，左侧是系统
            const myAvatarImg = document.querySelector('.user-info:last-child .avatar img');
            const partnerAvatarImg = document.querySelector('.user-info:first-child .avatar img');
            if (myAvatarImg) myAvatarUrl = myAvatarImg.src;
            if (partnerAvatarImg) partnerAvatarUrl = partnerAvatarImg.src;
        }

        // 消息排序
        const sortedMsgs = [...msgs].sort((a, b) => a.timestamp - b.timestamp);
        const firstDate = new Date(sortedMsgs[0].timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', year: 'numeric' });
        const lastDate = new Date(sortedMsgs[sortedMsgs.length - 1].timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', year: 'numeric' });
        let dateTitle = firstDate;
        if (firstDate !== lastDate) dateTitle = `${firstDate} - ${lastDate}`;

        // 生成 HTML
        const chatParts = [];
        
        // 头部
        chatParts.push(`
            <div style="font-family:sans-serif; max-width: 100%; margin: auto; position: relative; z-index: 1; background: transparent;">
                <div style="text-align:center; margin-bottom:20px; padding:10px 0; font-size:18px; font-weight:600; color: #333; border-bottom: 1px solid #ddd; letter-spacing: 1px;">
                    聊天记录 · 共 ${sortedMsgs.length} 条消息
                </div>
                <div style="background: transparent; padding: 0;">
        `);

        // 循环消息
        sortedMsgs.forEach((msg, index) => {
            const isUser = msg.sender === 'user';
            const safeText = (msg.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
            // 生成时间戳（根据设置中的格式）
           // 生成时间戳（连续同发送者只在最后一条显示）
            const fmt = settings.timeFormat || 'HH:mm';
            let timeStrHTML = '';
            if (fmt !== 'off') {
                const nextMsg = sortedMsgs[index + 1];
                const isLastInGroup = !nextMsg || nextMsg.sender !== msg.sender;
                if (isLastInGroup) {
                    const ts = new Date(msg.timestamp);
                    let timeStr;
                    if (fmt === 'HH:mm:ss') {
                        timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                    } else if (fmt === 'h:mm AM/PM') {
                        timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    } else if (fmt === 'h:mm:ss AM/PM') {
                        timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                    } else {
                        timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
                    }
                    const tsColor = isUser ? 'rgba(255,255,255,0.7)' : textSecondary;
                    const tsAlign = isUser ? 'right' : 'left';
                    timeStrHTML = `<div style="font-size:11px;color:${tsColor};margin-top:5px;text-align:${tsAlign};font-weight:500;opacity:0.7;">${timeStr}</div>`;
                }
            }

            // 引用内容
            let replyContent = '';
            if (msg.replyTo) {
                const replySender = msg.replyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
                let replyText = msg.replyTo.text ? msg.replyTo.text.slice(0, 40) : '[图片]';
                if (msg.replyTo.text && msg.replyTo.text.length > 40) replyText += '...';
                
                if (isUser) {
                    replyContent = `<div style="display:flex;flex-direction:column;border-left:3px solid rgba(255,255,255,0.7);padding:5px 10px 5px 9px;margin-bottom:7px;background-color:rgba(255,255,255,0.18);border-radius:0 8px 8px 0;overflow:hidden;"><div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.9);margin-bottom:2px;">${replySender}</div><div style="font-size:12px;color:rgba(255,255,255,0.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-style:italic;max-width:200px;">${replyText}</div></div>`;
                } else {
                    replyContent = `<div style="display:flex;flex-direction:column;border-left:3px solid ${accentColor};padding:5px 10px 5px 9px;margin-bottom:7px;background-color:rgba(var(--primary-bg-rgb),0.55);border-radius:0 8px 8px 0;overflow:hidden;"><div style="font-size:11px;font-weight:600;color:${accentColor};margin-bottom:2px;">${replySender}</div><div style="font-size:12px;color:${textSecondary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-style:italic;max-width:200px;">${replyText}</div></div>`;
                }
            }

        // 气泡样式
            let bubbleStyleCSS = '';
            if (bubbleStyle === 'rounded') bubbleStyleCSS = 'border-radius: 20px;';
            else if (bubbleStyle === 'rounded-large') bubbleStyleCSS = 'border-radius: 24px;';
            else if (bubbleStyle === 'square') bubbleStyleCSS = 'border-radius: 8px;';
            // 头像 HTML
            // 头像 HTML（✨ 修复跨域卡死：过滤外部图床链接）
            const avatarSize = 35;
            const avatarUrl = isUser ? myAvatarUrl : partnerAvatarUrl;
            // 判断是不是安全的本地数据（base64）或者同源链接
            const isSafeImg = avatarUrl && (avatarUrl.startsWith('data:') || avatarUrl.startsWith(window.location.origin));

            let avatarHTML = '';
            if (showAvatar) {
                if (isSafeImg) {
                    // 安全图片：正常渲染 <img>
                    avatarHTML = `<img src="${avatarUrl}" style="width:${avatarSize}px; height:${avatarSize}px; border-radius:${avatarRadius}; object-fit:cover; flex-shrink:0; border: 2px solid rgba(255,255,255,0.3);">`;
                } else {
                    // 外部跨域图片（如图床）：用纯色文字代替，彻底避免 html2canvas 卡死
                    avatarHTML = `<div style="width:${avatarSize}px; height:${avatarSize}px; border-radius:${avatarRadius}; background:${isUser ? accentColor : '#e0e0e0'}; display:flex; align-items:center; justify-content:center; color:${isUser ? '#fff' : '#999'}; font-size:14px; flex-shrink:0; border: 2px solid rgba(255,255,255,0.3);">${isUser ? '我' : 'T'}</div>`;
                }
            }

             // 拼接消息块
            if (showAvatar) {
                chatParts.push(`
                <div style="margin:16px 0; display:flex; align-items:flex-start; gap:12px; flex-direction:${isUser ? 'row-reverse' : 'row'};">
                    ${avatarHTML}
                    <div style="display:flex; flex-direction:column; max-width:calc(80% - ${avatarSize + 12}px); align-items:${isUser ? 'flex-end' : 'flex-start'};">
                    <div style="display:inline-block; padding:10px 15px; border-radius:18px; background:${isUser ? accentColor : secondaryBg}; max-width:calc(80% -${avatarSize + 12}px); color:${isUser ? '#fff' : textPrimary}; text-align:left; font-size:15px; word-break:break-word;${bubbleStyleCSS} box-shadow: 0 3px 6px rgba(0,0,0,0.1);">
                        ${replyContent}
                        ${safeText}
                    </div>
                    ${timeStrHTML}
                    </div>
                </div>
            `);

            } else {
                chatParts.push(`
                    <div style="margin:16px 0; display:flex; flex-direction:column; align-items:${isUser ? 'flex-end' : 'flex-start'};">
                       <div style="display:inline-block; padding:10px 15px; border-radius:18px; background:${isUser ? accentColor : secondaryBg}; max-width:80%; color:${isUser ? '#fff' : textPrimary}; text-align:left; font-size:15px; word-break:break-word; ${bubbleStyleCSS} box-shadow: 0 3px 6px rgba(0,0,0,0.1);">
                            ${replyContent}
                            ${safeText}
                        </div>
                        ${timeStrHTML}
                    </div>
                `);
            }
        });

        // 尾部
        chatParts.push(`
                </div>
                <div style="text-align:center; margin-top:20px; padding:10px; font-size:12px; color: #888; border-top: 1px solid #eee; border-radius: 0 0 12px 12px;">
                    ${dateTitle}
                </div>
            </div>
        `);

        // 创建临时容器
        tempContainer = document.createElement('div');
        const phoneWidth = 375;
        tempContainer.style.cssText = `
            position:fixed; left:-9999px; top:0;
            width:${phoneWidth}px;
            ${bgStyle}
            color:${textPrimary};
            font-family: ${fontFamily};
            font-weight: ${messageFontWeight};
            line-height: ${messageLineHeight};
            padding: 30px 20px;
            border-radius: 10px;
            overflow: hidden;
        `;
        tempContainer.innerHTML = chatParts.join('');
        // ✨ 注入用户的自定义气泡 CSS（让高级自定义代码也能在截图里生效）
        document.body.appendChild(tempContainer);

        // 生成截图
        const canvas = await html2canvas(tempContainer, {
            backgroundColor: null,
            scale: 5,
            useCORS: false,
            logging: false,
            windowWidth: phoneWidth,
            allowTaint: true,
            ignoreElements: (element) => {
            // ✨ 如果漏网了外部图片标签，直接让 html2canvas 无视它
                if (element.tagName === 'IMG' && element.src && !element.src.startsWith('data:') && !element.src.startsWith(window.location.origin)) {
                    return true;
                }
                return false;
            },
            onclone: (clonedDoc) => {
                const clonedContainer = clonedDoc.body.querySelector('div[style*="width: 375px"]');
                
                // 1. 注入基础字体
                const fontStyle = clonedDoc.createElement('style');
                fontStyle.textContent = ` * { font-family: ${fontFamily} !important; } `;
                if (clonedContainer) clonedContainer.insertBefore(fontStyle, clonedContainer.firstChild);

                // 2. ✨ 核心修复：把用户的自定义气泡 CSS 注入到克隆文档中！
                const userBubbleCSS = document.getElementById('user-custom-bubble-style');
                if (userBubbleCSS && userBubbleCSS.textContent) {
                    const bubbleStyle = clonedDoc.createElement('style');
                    bubbleStyle.textContent = userBubbleCSS.textContent;
                    if (clonedContainer) {
                        clonedContainer.insertBefore(bubbleStyle, clonedContainer.firstChild);
                    } else {
                        clonedDoc.head.appendChild(bubbleStyle);
                    }
                }

                // 3. 复制主文档的外部样式表
                document.head.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                    const newLink = clonedDoc.createElement('link');
                    newLink.rel = 'stylesheet';
                    newLink.href = link.href;
                    clonedDoc.head.appendChild(newLink);
                });
            }

        });

        const url = canvas.toDataURL('image/png');
        if (tempContainer && tempContainer.parentNode) {
            document.body.removeChild(tempContainer);
        }
        showScreenshotPreview(url, sortedMsgs.length, canvas.width, canvas.height);

    } catch (error) {
        console.error('截图生成失败:', error);
        showNotification('截图失败: ' + error.message, 'error');
        if (tempContainer && tempContainer.parentNode) {
            document.body.removeChild(tempContainer);
        }
    }
}



/**
 * 5. 显示预览模态框
 */
function showScreenshotPreview(url, count, width, height) {
    const previewModal = document.createElement('div');
    previewModal.className = 'modal';
    previewModal.id = 'screenshot-preview-modal';
    
    previewModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-title">
                <i class="fas fa-image"></i>
                <span>截图预览</span>
            </div>
            <div style="margin-bottom: 16px; text-align: center; max-height: 60vh; overflow-y: auto;">
                <img src="${url}" style="max-width: 100%; border-radius: var(--radius); box-shadow: var(--shadow);" alt="聊天记录截图">
            </div>
            <div style="margin-bottom: 16px; font-size: 14px; color: var(--text-secondary); text-align: center;">
                包含 ${count} 条消息 · 尺寸: ${width} × ${height}
            </div>
            <div class="modal-buttons">
                <button class="modal-btn modal-btn-secondary" id="close-screenshot-preview">
                    <i class="fas fa-times"></i> 关闭
                </button>
                <button class="modal-btn modal-btn-primary" id="download-screenshot">
                    <i class="fas fa-download"></i> 下载图片
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(previewModal);

    if (typeof showModal === 'function') {
        showModal(previewModal);
    } else {
        previewModal.style.display = 'flex';
    }

    const downloadBtn = previewModal.querySelector('#download-screenshot');
    downloadBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        a.download = `聊天记录_${dateStr}_${count}条消息.png`;
        a.click();
        showNotification('截图下载中...', 'success', 2000);
    });

    const closeBtn = previewModal.querySelector('#close-screenshot-preview');
    closeBtn.addEventListener('click', () => {
        if (typeof hideModal === 'function') {
            hideModal(previewModal);
            setTimeout(() => previewModal.remove(), 300);
        } else {
            previewModal.style.display = 'none';
            previewModal.remove();
        }
    });
    
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
             if (typeof hideModal === 'function') {
                hideModal(previewModal);
                setTimeout(() => previewModal.remove(), 300);
            } else {
                previewModal.style.display = 'none';
                previewModal.remove();
            }
        }
    });
}
