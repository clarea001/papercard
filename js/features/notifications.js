/**
 * features/notifications.js - 通知 Notifications & Storage
 * 推送通知与存储使用量
 */

function updateStorageUsageBar() {
    var fill = document.getElementById('storage-usage-fill');
    var text = document.getElementById('storage-usage-text');
    if (!fill || !text) return;

    try {
        var total = 0;
        if (window.localforage && window.APP_PREFIX) {
            localforage.keys().then(function(keys) {
                var promises = keys.map(function(k) {
                    return localforage.getItem(k).then(function(v) {
                        if (v === null || v === undefined) return 0;
                        var str = typeof v === 'string' ? v : JSON.stringify(v);
                        return k.length + str.length;
                    });
                });
                Promise.all(promises).then(function(sizes) {
                    var total = sizes.reduce(function(a,b){return a+b;}, 0);
                    var usedKB = (total * 2 / 1024).toFixed(1);
                    var maxKB = 10240;
                    var pct = Math.min(total * 2 / 1024 / maxKB * 100, 100).toFixed(1);
                    fill.style.width = pct + '%';
                    if (parseFloat(pct) > 80) fill.style.background = 'linear-gradient(90deg,#ff4757,#ff6b8a)';
                    else if (parseFloat(pct) > 50) fill.style.background = 'linear-gradient(90deg,#ffa502,rgba(255,165,2,0.6))';
                    else fill.style.background = 'linear-gradient(90deg,var(--accent-color),rgba(var(--accent-color-rgb),0.6))';
                    text.textContent = usedKB + ' KB / ~10 MB (' + pct + '%)';
                });
            }).catch(function() {
                var ls = 0;
                for (var i = 0; i < localStorage.length; i++) {
                    var k = localStorage.key(i) || '';
                    var v = localStorage.getItem(k) || '';
                    ls += k.length + v.length;
                }
                var kb = (ls * 2 / 1024).toFixed(1);
                fill.style.width = Math.min(ls * 2 / 1024 / 5120 * 100, 100).toFixed(1) + '%';
                text.textContent = kb + ' KB (localStorage)';
            });
        } else {
            text.textContent = '暂无数据';
            fill.style.width = '0%';
        }
    } catch(e) {
        if (text) text.textContent = '无法读取';
    }
}

(function() {
    var orig = window.showModal;
    if (typeof orig === 'function') {
        window.showModal = function(el) {
            orig.apply(this, arguments);
            if (el && el.id === 'data-modal') {
                setTimeout(updateStorageUsageBar, 200);
            }
        };
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('data-settings');
    if (btn) {
        btn.addEventListener('click', function() { setTimeout(updateStorageUsageBar, 300); });
    }
});

window._sendPartnerNotification = function(title, body) {
    try {
        var enabled = localStorage.getItem('notifEnabled') === '1';
        if (!enabled) return;
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        if (!document.hidden) return; 
        new Notification(title || '传讯', {
            body: body || '对方发来了消息',
            icon: document.querySelector('#partner-avatar img') ? document.querySelector('#partner-avatar img').src : undefined,
            tag: 'partner-msg',
            renotify: true
        });
    } catch(e) {}
};

window.handleNotifToggle = function(checkbox) {
    if (checkbox.checked && !settings.autoSendEnabled) {
        checkbox.checked = false;
        showNotification('请先在聊天设置中开启「主动发送」功能', 'warning', 3000);
        return;
    }
    var statusEl = document.getElementById('notif-status-text');
    if (!('Notification' in window)) {
        checkbox.checked = false;
        if (statusEl) statusEl.textContent = '⚠️ 您的浏览器不支持通知功能，请更换浏览器';
        return;
    }
    if (checkbox.checked) {
        Notification.requestPermission().then(function(perm) {
            if (perm === 'granted') {
                if (statusEl) statusEl.textContent = '✅ 已开启 — 当页面在后台时，收到消息会弹出系统通知';
                localStorage.setItem('notifEnabled', '1');
                try {
                    new Notification('传讯通知已开启 ✨', {
                        body: '你现在可以在后台收到消息提醒了',
                        tag: 'notif-test'
                    });
                } catch(e) {}
            } else if (perm === 'denied') {
                checkbox.checked = false;
                if (statusEl) statusEl.textContent = '❌ 权限被拒绝，请自行搜索如何开启';
                localStorage.setItem('notifEnabled', '0');
            } else {
                checkbox.checked = false;
                if (statusEl) statusEl.textContent = '⚠️ 未做出选择，请重试';
                localStorage.setItem('notifEnabled', '0');
            }
        }).catch(function() {
            checkbox.checked = false;
            if (statusEl) statusEl.textContent = '❌ 请求权限失败，请自行搜索如何打开';
            localStorage.setItem('notifEnabled', '0');
        });
    } else {
        if (statusEl) statusEl.textContent = '已关闭 — 后台将不再弹出消息提醒';
        localStorage.setItem('notifEnabled', '0');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    var toggle = document.getElementById('notif-permission-toggle');
    var statusEl = document.getElementById('notif-status-text');
    if (!toggle) return;
    var enabled = localStorage.getItem('notifEnabled') === '1';
    var granted = ('Notification' in window) && Notification.permission === 'granted';
    toggle.checked = enabled && granted;
    if (toggle.checked && statusEl) {
        statusEl.textContent = '✅ 已开启 — 当页面在后台时，收到消息会弹出系统通知';
    } else if (statusEl) {
        if ('Notification' in window && Notification.permission === 'denied') {
            statusEl.textContent = '❌ 通知权限已被浏览器屏蔽，请自行搜索如何开启';
        } else {
            statusEl.textContent = '关闭状态 — 开启后可在后台接收消息提醒';
        }
    }
});
