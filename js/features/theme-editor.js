/**
 * features/theme-editor.js - 主题编辑器 Theme Editor
 * 主题方案管理与头像形状设置
 */
// 把任意 CSS 颜色转成 "r, g, b" 字符串
function colorToRgbString(cssColor) {
  if (!cssColor) return null;
  const temp = document.createElement('div');
  temp.style.color = cssColor;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);
  const match = computed.match(/\d+/g);
  if (match && match.length >= 3) {
    return `${match[0]}, ${match[1]}, ${match[2]}`;
  }
  return null;
}

function applyCustomGlobalCss(cssString) {
    if (!cssString || !cssString.trim()) return;
    
    // 如果页面上已经有这个标签，就先移除，防止重复叠加
    let existingStyle = document.getElementById('user-custom-global-css');
    if (existingStyle) existingStyle.remove();
    
    // 创建 style 标签，把用户写的 CSS 塞进去
    const styleTag = document.createElement('style');
    styleTag.id = 'user-custom-global-css';
    styleTag.textContent = cssString;
    
    // 挂载到 head 里，这样全局生效了！
    document.head.appendChild(styleTag);
}


function applyAvatarShapeToDOM(type, shape) {
            const SHAPES = ['circle','square'];
            const avatarContainer = type === 'my' ? DOMElements.me.avatarContainer : DOMElements.partner.avatarContainer;
            if (!avatarContainer) return;
            SHAPES.forEach(s => avatarContainer.classList.remove('avatar-shape-' + s));
            if (shape && shape !== 'none') avatarContainer.classList.add('avatar-shape-' + shape);
            
            document.querySelectorAll('.message-wrapper').forEach(wrapper => {
                const isUser = wrapper.classList.contains('sent');
                if ((type === 'my' && isUser) || (type === 'partner' && !isUser)) {
                    const avatarDiv = wrapper.querySelector('.message-avatar');
                    if (avatarDiv) {
                        SHAPES.forEach(s => avatarDiv.classList.remove('shape-' + s));
                        if (shape && shape !== 'none') avatarDiv.classList.add('shape-' + shape);
                    }
                }
            });
        }
        function setupAppearancePanelFrameSettings() {
            const setupFor = (type) => {
                const suffix = '-2';
                const preview = document.getElementById(`${type}-frame-preview${suffix}`);
                const uploadBtn = document.getElementById(`${type}-frame-upload-btn${suffix}`);
                const removeBtn = document.getElementById(`${type}-frame-remove-btn${suffix}`);
                const fileInput = document.getElementById(`${type}-frame-file-input${suffix}`);
                const sizeSlider = document.getElementById(`${type}-frame-size${suffix}`);
                const sizeValue = document.getElementById(`${type}-frame-size-value${suffix}`);
                const xSlider = document.getElementById(`${type}-frame-offset-x${suffix}`);
                const xValue = document.getElementById(`${type}-frame-offset-x-value${suffix}`);
                const ySlider = document.getElementById(`${type}-frame-offset-y${suffix}`);
                const yValue = document.getElementById(`${type}-frame-offset-y-value${suffix}`);
                if (!preview || !uploadBtn) return;

                const settingsKey = type === 'my' ? 'myAvatarFrame' : 'partnerAvatarFrame';
                const avatarContainer = type === 'my' ? DOMElements.me.avatarContainer : DOMElements.partner.avatarContainer;
                const avatarElement = type === 'my' ? DOMElements.me.avatar : DOMElements.partner.avatar;

                const updatePreview2 = () => {
                    let avatarContent = avatarElement.innerHTML;
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = avatarContent;
                    const img = tempDiv.querySelector('img');
                    if (img) avatarContent = `<img src="${img.src}" alt="preview">`;
                    const frameSettings = settings[settingsKey];
                    let frameHtml = '';
                    if (frameSettings && frameSettings.src) {
                        const size = frameSettings.size || 100;
                        const ox = frameSettings.offsetX || 0;
                        const oy = frameSettings.offsetY || 0;
                        frameHtml = `<img src="${frameSettings.src}" class="preview-frame" style="width:${size}%;height:${size}%;transform:translate(calc(-50% + ${ox}px),calc(-50% + ${oy}px));">`;
                    }
                    preview.innerHTML = `<div class="preview-bg-layer">${avatarContent}</div>${frameHtml}`;
                };

                const updateControls2 = () => {
                    const frame = settings[settingsKey];
                    if (sizeSlider) { sizeSlider.value = frame?.size || 100; sizeValue.textContent = `${sizeSlider.value}%`; }
                    if (xSlider) { xSlider.value = frame?.offsetX || 0; xValue.textContent = `${xSlider.value}px`; }
                    if (ySlider) { ySlider.value = frame?.offsetY || 0; yValue.textContent = `${ySlider.value}px`; }
                    updatePreview2();
                };

                uploadBtn.addEventListener('click', () => fileInput && fileInput.click());
                if (fileInput) fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0]; if (!file) return;
                    if (file.size > 1024 * 1024) { showNotification('图片大小不能超过1MB', 'error'); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if (!settings[settingsKey]) settings[settingsKey] = { size: 100, offsetX: 0, offsetY: 0 };
                        settings[settingsKey].src = ev.target.result;
                        applyAvatarFrame(avatarContainer, settings[settingsKey]);
                        updateControls2(); throttledSaveData();
                    };
                    reader.readAsDataURL(file);
                });
                if (removeBtn) removeBtn.addEventListener('click', () => {
                    settings[settingsKey] = null;
                    applyAvatarFrame(avatarContainer, null);
                    updateControls2(); throttledSaveData();
                });
                [sizeSlider, xSlider, ySlider].forEach(s => {
                    if (!s) return;
                    s.addEventListener('input', () => {
                        if (!settings[settingsKey]) return;
                        settings[settingsKey].size = parseInt(sizeSlider.value);
                        settings[settingsKey].offsetX = parseInt(xSlider.value);
                        settings[settingsKey].offsetY = parseInt(ySlider.value);
                        applyAvatarFrame(avatarContainer, settings[settingsKey]);
                        updateControls2(); renderMessages(true);
                    });
                    s.addEventListener('change', throttledSaveData);
                });
                updateControls2();
            };
            setupFor('my');
            setupFor('partner');
        }
        const themeColorMappings = {
            '--primary-bg': '主背景色',
            '--secondary-bg': '卡片 / 弹窗背景',
            '--header-bg': '顶栏背景',
            '--input-area-bg': '输入区背景',
            '--text-primary': '主要文字',
            '--text-secondary': '次要文字 / 占位符',
            '--border-color': '边框 / 分割线',
            '--accent-color': '主强调色（按钮 / 图标）',
            '--accent-color-dark': '强调色深色变体',
            '--message-sent-bg': '我方气泡背景',
            '--message-sent-text': '我方气泡文字',
            '--message-received-bg': '对方气泡背景',
            '--message-received-text': '对方气泡文字',
            '--favorite-color': '收藏星标颜色',
        };

        const themeExtraMappings = {
            '--radius': { label: '圆角半径', type: 'range', min: 0, max: 32, unit: 'px', default: '16px' },
            '--message-font-weight': { label: '消息粗细', type: 'select', options: ['300','400','500','600','700'], default: '400' },
            '--message-line-height': { label: '消息行高', type: 'range', min: 1.0, max: 2.5, step: 0.05, unit: '', default: '1.5' },
        };


function initThemeEditor() {

    // ==========================================
    // 1. 打开编辑器按钮（点击时同步一下夜间按钮的状态）
    // ==========================================
    const openEditorBtn = document.getElementById('open-theme-editor');

    if (openEditorBtn) {
        const newBtn = openEditorBtn.cloneNode(true);
        openEditorBtn.parentNode.replaceChild(newBtn, openEditorBtn);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("自定义主题编辑器按钮被点击！");
            
            // 👉 每次点开编辑器，强行同步夜间模式按钮的颜色
            if (modeRow) {
                modeRow.classList.toggle('active', document.documentElement.getAttribute('data-theme') === 'dark');
            }
            
            const appearanceModal = document.getElementById('appearance-modal');
            const editorModal = document.getElementById('theme-editor-modal');

            if (appearanceModal) hideModal(appearanceModal);

            populateThemeEditor();
            populateThemeSelector();

            if (editorModal) showModal(editorModal);
        });
    }

    // ==========================================
    // 1. 夜间模式：直接挂载到 window，让 HTML 的 onclick 直接调用，拒绝任何拦截！
    // ==========================================
    window._forceToggleDark = function() {
        const modeRow = document.getElementById('theme-mode-toggle-row');
        if (!modeRow) return;
        
        // 强行切换
        modeRow.classList.toggle('active');
        const isDark = modeRow.classList.contains('active');
        
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        settings.isDarkMode = isDark;
        if(typeof throttledSaveData === 'function') throttledSaveData();
        if(typeof updateBubblePreview === 'function') updateBubblePreview();
    };

    // ==========================================
    // 3. 编辑器里的其他按钮（关闭、重置、应用等）
    // ==========================================
    const closeBtn = document.getElementById('close-theme-editor');
    if (closeBtn) {
        closeBtn.onclick = () => {
            updateUI();
            hideModal(document.getElementById('theme-editor-modal'));
        };
    }

    const resetThemeBtn = document.getElementById('reset-theme-editor');
    if (resetThemeBtn) {
        resetThemeBtn.onclick = () => {
            if (!confirm('重置将清除当前编辑器中的自定义颜色，恢复当前主题方案的默认色彩。\n\n已保存的自定义主题方案不受影响，确定重置吗？')) return;
            settings.customThemeColors = {};
            const root = document.documentElement;
            const allVars = Object.keys(Object.assign({}, themeColorMappings || {}, themeExtraMappings || {}));
            allVars.forEach(v => root.style.removeProperty(v));
            updateUI();
            populateThemeEditor();
            showNotification('已重置为当前主题默认色彩', 'success');
        };
    }

    const applyCloseBtn = document.getElementById('apply-close-theme-editor');
    if (applyCloseBtn) {
        applyCloseBtn.onclick = () => {
            const root = document.documentElement;
            const customColors = {};
            for (const variable of Object.keys(themeColorMappings)) {
                const val = root.style.getPropertyValue(variable);
                if (val) customColors[variable] = val.trim();
            }
            for (const variable of Object.keys(themeExtraMappings)) {
                const val = root.style.getPropertyValue(variable);
                if (val) customColors[variable] = val.trim();
            }
            settings.customThemeColors = customColors;
            throttledSaveData && throttledSaveData();
            updateUI();
            hideModal(document.getElementById('theme-editor-modal'));
            showNotification('主题已应用', 'success');
        };
    }

    const saveBtn = document.getElementById('save-theme-preset-btn');
    if(saveBtn) saveBtn.onclick = saveCurrentThemeAsPreset;

    const overwriteBtn = document.getElementById('overwrite-theme-preset-btn');
    if(overwriteBtn) overwriteBtn.onclick = function() {
        const selector = document.getElementById('theme-preset-selector');
        const selectedId = selector && selector.value;
        if (!selectedId || !selectedId.startsWith('custom-')) {
            showNotification('请先选择一个自定义方案再覆盖', 'warning');
            return;
        }
        const theme = customThemes.find(t => t.id === selectedId);
        if (!theme) return;
        if (!confirm(`确定要用当前编辑内容覆盖「${theme.name}」吗？`)) return;
        const root = document.documentElement;
        theme.colors = {};
        for (const variable of Object.keys(themeColorMappings)) {
            const val = root.style.getPropertyValue(variable) || getComputedStyle(root).getPropertyValue(variable).trim();
            if (val) theme.colors[variable] = val.trim();
        }
        for (const variable of Object.keys(themeExtraMappings)) {
            const val = root.style.getPropertyValue(variable) || getComputedStyle(root).getPropertyValue(variable).trim();
            if (val) theme.colors[variable] = val.trim();
        }
        saveCustomThemes();
        showNotification(`已覆盖「${theme.name}」`, 'success');
    };

    const renameBtn = document.getElementById('rename-theme-preset-btn');
    if(renameBtn) renameBtn.onclick = () => {
        const selector = document.getElementById('theme-preset-selector');
        const selectedId = selector && selector.value;
        if (!selectedId || !selectedId.startsWith('custom-')) {
            showNotification('请先选择一个自定义方案再重命名', 'warning');
            return;
        }
        const theme = customThemes.find(t => t.id === selectedId);
        if (!theme) return;
        const newName = prompt('输入新名称：', theme.name);
        if (!newName || !newName.trim()) return;
        theme.name = newName.trim();
        saveCustomThemes();
        populateThemeSelector();
        showNotification(`已重命名为「${newName}」`, 'success');
    };

    const delBtn = document.getElementById('delete-theme-preset-btn');
    if(delBtn) delBtn.onclick = deleteCurrentPreset;

    const selector = document.getElementById('theme-preset-selector');
    if(selector) {
        selector.onchange = (e) => {
            const selectedValue = e.target.value;
            const owBtn = document.getElementById('overwrite-theme-preset-btn');
            if (owBtn) owBtn.style.display = selectedValue.startsWith('custom-') ? '' : 'none';
            if (selectedValue === "current-editing") return;
            if (selectedValue.startsWith('custom-')) {
                const theme = customThemes.find(t => t.id === selectedValue);
                if (theme) {
                    settings.colorTheme = theme.id;
                    applyTheme(theme.colors);
                    populateThemeEditor(theme.colors);
                    throttledSaveData();
                }
            }
        };
    }

    const fontApplyBtn = document.getElementById('apply-font-btn');
    const fontUrlInput = document.getElementById('font-url-input');
    if (fontApplyBtn && fontUrlInput) {
        fontApplyBtn.addEventListener('click', () => {
            const url = fontUrlInput.value.trim();
            settings.customFontUrl = url;
            settings.useLocalFont = false;
            localforage.removeItem(`${APP_PREFIX}local_font_base64`).catch(()=>{});
            localforage.removeItem(`${APP_PREFIX}local_font_blob`).catch(()=>{});
            showNotification('正在尝试加载字体...', 'info', 1000);
            applyCustomFont(url).then(() => {
                throttledSaveData();
                if(url) showNotification('字体已应用', 'success');
                else showNotification('已恢复默认字体', 'success');
            }).catch(err => {
                console.error('字体加载失败:', err);
                showNotification('字体加载失败，请检查链接或网络', 'error');
            });
        });
    }
}

        function populateThemeEditor(currentColors = null) {
            const grid = document.getElementById('theme-editor-grid');
            grid.innerHTML = '';
            const rootStyle = getComputedStyle(document.documentElement);

            const colorHeading = document.createElement('div');
            colorHeading.style.cssText = 'grid-column:1/-1;font-size:11px;font-weight:700;color:var(--text-secondary);letter-spacing:2px;text-transform:uppercase;padding:4px 0 2px;border-bottom:1px solid var(--border-color);margin-bottom:4px;';
            colorHeading.textContent = '🎨 颜色';
            grid.appendChild(colorHeading);

            for (const [variable, label] of Object.entries(themeColorMappings)) {
                const rawVal = currentColors ? currentColors[variable] : rootStyle.getPropertyValue(variable).trim();
                let colorValue = rawVal;
                if (!colorValue || colorValue.includes('var(')) {
                    colorValue = '#888888';
                } else if (colorValue.startsWith('rgb')) {
                    try {
                        const m = colorValue.match(/\d+/g);
                        if (m && m.length >= 3) {
                            colorValue = '#' + [m[0],m[1],m[2]].map(n => parseInt(n).toString(16).padStart(2,'0')).join('');
                        }
                    } catch(e) { colorValue = '#888888'; }
                }
                const item = document.createElement('div');
                item.className = 'color-picker-item';
                item.innerHTML = `<label for="color-${variable.replace(/--/g,'')}">${label}</label><input type="color" id="color-${variable.replace(/--/g,'')}" data-variable="${variable}" value="${colorValue}">`;
                grid.appendChild(item);
                /*item.querySelector('input[type="color"]').addEventListener('input', (e) => {
                    document.documentElement.style.setProperty(e.target.dataset.variable, e.target.value);
                });*/
                item.querySelector('input[type="color"]').addEventListener('input', (e) => {
                const varName = e.target.dataset.variable;
                document.documentElement.style.setProperty(varName, e.target.value);
                // 同步 RGB 变量
                if (varName === '--message-received-text' || varName === '--message-sent-text') {
                    const rgb = colorToRgbString(e.target.value);
                    if (rgb) {
                    document.documentElement.style.setProperty(varName + '-rgb', rgb);
                    }
                }
                });

            }

            const extraHeading = document.createElement('div');
            extraHeading.style.cssText = 'grid-column:1/-1;font-size:11px;font-weight:700;color:var(--text-secondary);letter-spacing:2px;text-transform:uppercase;padding:8px 0 2px;border-bottom:1px solid var(--border-color);margin-bottom:4px;margin-top:8px;';
            extraHeading.textContent = '⚙️ 数值 & 字重';
            grid.appendChild(extraHeading);

            for (const [variable, cfg] of Object.entries(themeExtraMappings)) {
                const rawVal = rootStyle.getPropertyValue(variable).trim() || cfg.default;
                const numVal = parseFloat(rawVal);
                const item = document.createElement('div');
                item.style.cssText = 'grid-column:1/-1;display:flex;align-items:center;gap:10px;background:var(--primary-bg);padding:8px;border-radius:8px;';
                if (cfg.type === 'range') {
                    item.innerHTML = `
                        <label style="font-size:13px;flex:1;">${cfg.label}</label>
                        <input type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step||1}" value="${numVal||parseFloat(cfg.default)}"
                            data-variable="${variable}" data-unit="${cfg.unit}"
                            style="flex:2;max-width:140px;accent-color:var(--accent-color);">
                        <span style="width:44px;text-align:right;font-size:12px;color:var(--text-secondary);">${numVal||parseFloat(cfg.default)}${cfg.unit}</span>`;
                    const rangeInput = item.querySelector('input[type="range"]');
                    const valLabel = item.querySelector('span');
                    rangeInput.addEventListener('input', () => {
                        const v = rangeInput.value + cfg.unit;
                        document.documentElement.style.setProperty(variable, v);
                        valLabel.textContent = rangeInput.value + cfg.unit;
                        if (variable === '--radius') { settings.borderRadius = rangeInput.value; throttledSaveData && throttledSaveData(); }
                        if (variable === '--message-line-height') { settings.messageLineHeight = parseFloat(rangeInput.value); throttledSaveData && throttledSaveData(); }
                    });
                } else if (cfg.type === 'select') {
                    const opts = cfg.options.map(o => `<option value="${o}" ${String(numVal||cfg.default)===o?'selected':''}>${o}</option>`).join('');
                    item.innerHTML = `<label style="font-size:13px;flex:1;">${cfg.label}</label><select data-variable="${variable}" style="padding:5px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--secondary-bg);color:var(--text-primary);font-size:13px;cursor:pointer;">${opts}</select>`;
                    item.querySelector('select').addEventListener('change', (e) => {
                        const newVal = e.target.value;
                        document.documentElement.style.setProperty(variable, newVal);
                        if (variable === '--message-font-weight') { settings.messageFontWeight = newVal; throttledSaveData && throttledSaveData(); }
                        if (variable === '--message-line-height') { settings.messageLineHeight = parseFloat(newVal); throttledSaveData && throttledSaveData(); }
                    });
                }
                grid.appendChild(item);
            }

            const previewHeading = document.createElement('div');
            previewHeading.style.cssText = 'grid-column:1/-1;font-size:11px;font-weight:700;color:var(--text-secondary);letter-spacing:2px;text-transform:uppercase;padding:8px 0 2px;border-bottom:1px solid var(--border-color);margin-bottom:4px;margin-top:8px;';
            previewHeading.textContent = '👁 实时预览';
            grid.appendChild(previewHeading);

            const previewBox = document.createElement('div');
            previewBox.style.cssText = 'grid-column:1/-1;background:var(--chat-bg,var(--primary-bg));border-radius:14px;padding:14px 12px;border:1px solid var(--border-color);';
            previewBox.innerHTML = `
                <div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:10px;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-color);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-user" style="font-size:12px;color:#fff;"></i>
                    </div>
                    <div class="message message-received" style="max-width:180px;font-size:var(--font-size);">你是我朝夕相伴触手可及的虚拟</div>
                </div>
                <div style="display:flex;align-items:flex-end;gap:8px;justify-content:flex-end;">
                    <div class="message message-sent" style="max-width:180px;font-size:var(--font-size);">你是我未曾拥有无法捕捉的亲昵</div>
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--border-color);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-user" style="font-size:12px;color:var(--text-secondary);"></i>
                    </div>
                </div>`;
            grid.appendChild(previewBox);
            // 在 populateThemeEditor 函数的最末尾加上这段：
            const cssInput = document.getElementById('custom-global-css-input');
            if (cssInput) {
                cssInput.value = settings.customGlobalCss || '';
            }
        }

        function applyTheme(colors, isReset = false) {
            if (isReset) {
                for (const variable of Object.keys(themeColorMappings)) {
                document.documentElement.style.removeProperty(variable);
                }
                // 重置时也清掉 RGB 变量
                document.documentElement.style.removeProperty('--message-received-text-rgb');
                document.documentElement.style.removeProperty('--message-sent-text-rgb');
                return;
            }
            if (!colors) return;
            for (const [variable, color] of Object.entries(colors)) {
                document.documentElement.style.setProperty(variable, color);
                // 同步 RGB 变量
                if (variable === '--message-received-text' || variable === '--message-sent-text') {
                const rgb = colorToRgbString(color);
                if (rgb) {
                    document.documentElement.style.setProperty(variable + '-rgb', rgb);
                }
                }
            }
        }

        
        function saveCurrentThemeAsPreset() {
            const presetName = prompt("请输入新主题方案的名称：");
            if (!presetName || !presetName.trim()) return;

            const newTheme = {
                id: `custom-${Date.now()}`,
                name: presetName.trim(),
                colors: {}
            };
            const root = document.documentElement;
            for (const variable of Object.keys(themeColorMappings)) {
                const val = root.style.getPropertyValue(variable) || getComputedStyle(root).getPropertyValue(variable).trim();
                if (val) newTheme.colors[variable] = val.trim();
            }
            for (const variable of Object.keys(themeExtraMappings)) {
                const val = root.style.getPropertyValue(variable) || getComputedStyle(root).getPropertyValue(variable).trim();
                if (val) newTheme.colors[variable] = val.trim();
            }
            customThemes.push(newTheme);
            settings.colorTheme = newTheme.id;
            saveCustomThemes();
            populateThemeSelector();
            showNotification(`主题 "${presetName}" 已保存`, "success");
        }

        function deleteCurrentPreset() {
            const selector = document.getElementById('theme-preset-selector');
            const selectedId = selector.value;
            if (!selectedId.startsWith('custom-')) {
                showNotification('无法删除预设主题', 'warning');
                return;
            }
            if (confirm(`确定要删除主题 "${selector.options[selector.selectedIndex].text}" 吗？`)) {
                customThemes = customThemes.filter(t => t.id !== selectedId);
                settings.colorTheme = 'gold'; 
                saveCustomThemes();
                updateUI();
                populateThemeSelector();
                populateThemeEditor(); 
                showNotification('主题已删除', 'success');
            }
        }

function populateThemeSelector() {
    const selector = document.getElementById('theme-preset-selector');
    selector.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = "current-editing";
    defaultOption.textContent = "当前编辑中...";
    selector.appendChild(defaultOption);

    if (customThemes.length > 0) {
        const customGroup = document.createElement('optgroup');
        customGroup.label = "我的自定义主题";
        customThemes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.name;
            customGroup.appendChild(option);
        });
        selector.appendChild(customGroup);
    }

    if (settings.colorTheme.startsWith('custom-')) {
        selector.value = settings.colorTheme;
    } else {
        selector.value = "current-editing";
    }
    const overwriteBtn = document.getElementById('overwrite-theme-preset-btn');
    if (overwriteBtn) overwriteBtn.style.display = selector.value.startsWith('custom-') ? '' : 'none';
}
        
        function saveCustomThemes() {
             safeSetItem(`${APP_PREFIX}customThemes`, JSON.stringify(customThemes));
        }

        const THEME_COLOR_NAMES = {
            'gold': '金色', 'blue': '蓝色', 'purple': '紫色', 'green': '绿色',
            'pink': '粉色', 'black-white': '黑白', 'pastel': '柔蓝', 
            'sunset': '夕阳', 'forest': '森林', 'ocean': '深蓝'
        };
        const BUBBLE_STYLE_NAMES_SCM = { standard: '标准', rounded: '圆角', 'rounded-large': '大圆角', square: '方形' };

        async function captureCurrentSchemeAsync() {
            const root = document.documentElement;
            let chatBg = '';
            try {
                chatBg = await localforage.getItem(getStorageKey('chatBackground')) || '';
            } catch(e) {
                chatBg = safeGetItem(getStorageKey('chatBackground')) || '';
            }
            return {
                colorTheme: settings.colorTheme,
                isDarkMode: settings.isDarkMode,
                bubbleStyle: settings.bubbleStyle,
                fontSize: settings.fontSize,
                messageFontFamily: settings.messageFontFamily,
                messageFontWeight: settings.messageFontWeight,
                messageLineHeight: settings.messageLineHeight,
                customFontUrl: settings.customFontUrl || '',
                customGlobalCss: document.getElementById('custom-global-css-input')?.value || '',
                customBubbleCss: settings.customBubbleCss || '',
                inChatAvatarEnabled: settings.inChatAvatarEnabled,
                inChatAvatarSize: settings.inChatAvatarSize,
                chatBackground: chatBg,
                customColors: (() => {
                    const colors = {};
                    const mapped = Object.keys(themeColorMappings || {});
                    mapped.forEach(v => {
                        const val = root.style.getPropertyValue(v);
                        if (val) colors[v] = val.trim();
                    });
                    return colors;
                })()
            };
        }

        function captureCurrentScheme() {
            const root = document.documentElement;
            const chatBg = safeGetItem(getStorageKey('chatBackground')) || '';
            
            return {
                colorTheme: settings.colorTheme,
                isDarkMode: settings.isDarkMode,
                bubbleStyle: settings.bubbleStyle,
                fontSize: settings.fontSize,
                messageFontFamily: settings.messageFontFamily,
                messageFontWeight: settings.messageFontWeight,
                messageLineHeight: settings.messageLineHeight,
                customFontUrl: settings.customFontUrl || '',
                customGlobalCss: document.getElementById('custom-global-css-input')?.value || '',
                customBubbleCss: settings.customBubbleCss || '',
                inChatAvatarEnabled: settings.inChatAvatarEnabled,
                inChatAvatarSize: settings.inChatAvatarSize,
                chatBackground: chatBg,
                customColors: (() => {
                    const colors = {};
                    const mapped = Object.keys(themeColorMappings || {});
                    mapped.forEach(v => {
                        const val = root.style.getPropertyValue(v);
                        if (val) colors[v] = val.trim();
                    });
                    return colors;
                })()
            };
        }

        function applyScheme(scheme) {
            settings.colorTheme = scheme.colorTheme;
            settings.isDarkMode = scheme.isDarkMode;
            settings.bubbleStyle = scheme.bubbleStyle;
            settings.fontSize = scheme.fontSize;
            settings.messageFontFamily = scheme.messageFontFamily;
            settings.messageFontWeight = scheme.messageFontWeight;
            settings.messageLineHeight = scheme.messageLineHeight;
            settings.customFontUrl = scheme.customFontUrl || '';
            settings.customBubbleCss = scheme.customBubbleCss || '';
            settings.inChatAvatarEnabled = scheme.inChatAvatarEnabled;
            settings.inChatAvatarSize = scheme.inChatAvatarSize;
            
            const root = document.documentElement;
           // 先处理字体
            if (scheme.customFontUrl && scheme.customFontUrl.trim()) {
                try { applyCustomFont(scheme.customFontUrl); } catch(e) { console.warn('应用方案字体失败', e); }
            } else if (scheme.messageFontFamily) {
                // 如果没有直链，尝试只应用字体栈（配合上面的坑四修复生效）
                document.documentElement.style.setProperty('--message-font-family', scheme.messageFontFamily);
                document.documentElement.style.setProperty('--font-family', scheme.messageFontFamily);
            }

            // 全局 CSS 独立判断，不要用 else if 挡住字体
            if (scheme.customGlobalCss && scheme.customGlobalCss.trim()) {
                try { applyCustomGlobalCss(scheme.customGlobalCss); } catch(e) {}
            }
            
            if (scheme.customBubbleCss) {
                try { applyCustomBubbleCss(scheme.customBubbleCss); } catch(e) {}
            }
            
            if (scheme.chatBackground) {
                applyBackground(scheme.chatBackground);
                safeSetItem(getStorageKey('chatBackground'), scheme.chatBackground);
                localforage.setItem(getStorageKey('chatBackground'), scheme.chatBackground).catch(err => {
                    console.warn('保存方案背景到主数据库失败:', err);
                });
            } else {
                // 如果方案里没背景，要确保清掉主仓库里的旧背景，防止残留
                localforage.removeItem(getStorageKey('chatBackground')).catch(()=>{});
                safeRemoveItem(getStorageKey('chatBackground')); 
            }

            updateUI();
            throttledSaveData();
            renderThemeSchemesList();
        }

        function getSchemePreviewColors(scheme) {
            const colorMap = {
                gold: ['#c5a47e', '#f5f5f5', '#333333'],
                blue: ['#7FA6CD', '#e8f0f8', '#333333'],
                purple: ['#BB9EC7', '#f3eef7', '#333333'],
                green: ['#7BC8A4', '#edf8f3', '#333333'],
                pink: ['#F4A6B3', '#fef0f3', '#333333'],
                'black-white': ['#333333', '#f9f9f9', '#666666'],
                pastel: ['#A8D8EA', '#edf7fc', '#333333'],
                sunset: ['#FF9A8B', '#fff0ee', '#333333'],
                forest: ['#7BA05B', '#eef5e8', '#333333'],
                ocean: ['#4A90E2', '#e8f1fc', '#333333'],
            };
            const theme = scheme.colorTheme;
            if (theme && theme.startsWith('custom-')) {
                const c = scheme.customColors && scheme.customColors['--accent-color'];
                return [c || '#aaa', scheme.isDarkMode ? '#222' : '#f5f5f5', '#888'];
            }
            return colorMap[theme] || ['#aaa', '#f5f5f5', '#888'];
        }

        function renderThemeSchemesList() {
            const list = document.getElementById('theme-schemes-list');
            const empty = document.getElementById('theme-schemes-empty');
            if (!list) return;
            
            list.querySelectorAll('.theme-scheme-item').forEach(el => el.remove());
            
            if (themeSchemes.length === 0) {
                if (empty) empty.style.display = 'flex';
                return;
            }
            if (empty) empty.style.display = 'none';
            
            themeSchemes.forEach(scheme => {
                const dots = getSchemePreviewColors(scheme);
                const bubbleName = BUBBLE_STYLE_NAMES_SCM[scheme.bubbleStyle] || '标准';
                const darkLabel = scheme.isDarkMode ? '夜' : '昼';
                const themeName = THEME_COLOR_NAMES[scheme.colorTheme] || scheme.colorTheme;
                const meta = `${darkLabel} · ${themeName} · ${bubbleName} · ${scheme.fontSize}px`;
                
                const item = document.createElement('div');
                item.className = 'theme-scheme-item';
                item.dataset.schemeId = scheme.id;
                item.innerHTML = `
                    <div class="scheme-preview-dots">
                        ${dots.map(c => `<div class="scheme-dot" style="background:${c};"></div>`).join('')}
                    </div>
                    <div class="scheme-info">
                        <div class="scheme-name">${scheme.name}</div>
                        <div class="scheme-meta">${meta}</div>
                    </div>
                    <div class="scheme-actions">
                        <button class="scheme-action-btn" title="应用方案" onclick="applyThemeScheme('${scheme.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="scheme-action-btn" title="在编辑器中编辑" onclick="editThemeScheme('${scheme.id}', event)" style="color:var(--accent-color);">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="scheme-action-btn delete" title="删除方案" onclick="deleteThemeScheme('${scheme.id}', event)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                list.appendChild(item);
            });
        }

        window.applyThemeScheme = function(id) {
            const scheme = themeSchemes.find(s => s.id === id);
            if (!scheme) return;
            applyScheme(scheme);
            showNotification(`✨ 已应用方案「${scheme.name}」`, 'success');
        };

        window.deleteThemeScheme = function(id, event) {
            if (event) event.stopPropagation();
            const scheme = themeSchemes.find(s => s.id === id);
            if (!scheme) return;
            if (confirm(`确定要删除方案「${scheme.name}」吗？`)) {
                themeSchemes = themeSchemes.filter(s => s.id !== id);
                localforage.setItem(`${APP_PREFIX}themeSchemes`, themeSchemes);
                renderThemeSchemesList();
                showNotification('方案已删除', 'success');
            }
        };

        window.editThemeScheme = function(id, event) {
            if (event) event.stopPropagation();
            const scheme = themeSchemes.find(s => s.id === id);
            if (!scheme) return;
            applyScheme(scheme);
            const appearanceModal = document.getElementById('appearance-modal');
            const editorModal = document.getElementById('theme-editor-modal');
            if (appearanceModal) hideModal(appearanceModal);
            populateThemeEditor(scheme.customColors && Object.keys(scheme.customColors).length > 0 ? scheme.customColors : null);
            populateThemeSelector();
            if (editorModal) showModal(editorModal);
            const selector = document.getElementById('theme-preset-selector');
            if (selector && scheme.id.startsWith('custom-')) selector.value = scheme.id;
            showNotification(`正在编辑方案「${scheme.name}」，修改后点击💾保存`, 'info');
        };

        function initThemeSchemes() {
            const saveBtn = document.getElementById('save-theme-scheme-btn');
            if (saveBtn) {
                saveBtn.onclick = async () => {
                    const name = prompt('请为当前主题方案命名：', `方案 ${themeSchemes.length + 1}`);
                    if (!name || !name.trim()) return;
                    const scheme = await captureCurrentSchemeAsync();
                    scheme.id = `scheme-${Date.now()}`;
                    scheme.name = name.trim();
                    scheme.savedAt = Date.now();
                    themeSchemes.push(scheme);
                    localforage.setItem(`${APP_PREFIX}themeSchemes`, themeSchemes);
                    renderThemeSchemesList();
                    showNotification(`✨ 方案「${name}」已保存（含背景图）！`, 'success');
                };
            }
            renderThemeSchemesList();
        }

