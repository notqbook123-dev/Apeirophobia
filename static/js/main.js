/* ============================================================
   NAVIGATION
   ============================================================ */

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const target = item.dataset.view;

        document.querySelectorAll('.nav-item').forEach(n => {
            n.classList.remove('active');
            document.getElementById('arr-' + n.dataset.view).classList.add('hidden');
        });

        item.classList.add('active');
        document.getElementById('arr-' + target).classList.remove('hidden');

        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active', 'glitch-anim');
        });

        const next = document.getElementById('view-' + target);
        next.classList.add('active');
        void next.offsetWidth;
        next.classList.add('glitch-anim');
        setTimeout(() => next.classList.remove('glitch-anim'), 180);

        fillPwdFields();
    });
});

function switchView(name) {
    document.querySelector(`.nav-item[data-view="${name}"]`).click();
}

/* ============================================================
   PASSWORD HELPERS
   ============================================================ */

function getSavedPwd() {
    return sessionStorage.getItem('fs_pwd') || '';
}

function fillPwdFields() {
    const pwd = getSavedPwd();
    ['files-pwd', 'upload-pwd'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = pwd;
    });
    const g = document.getElementById('global-pwd');
    if (g) g.value = pwd;
}

document.getElementById('btn-save-pwd').addEventListener('click', () => {
    sessionStorage.setItem('fs_pwd', document.getElementById('global-pwd').value);
    setFeedback('pwd-feedback', 'PASSWORD SAVED', 'ok');
    fillPwdFields();
});

document.getElementById('btn-clear-pwd').addEventListener('click', () => {
    sessionStorage.removeItem('fs_pwd');
    document.getElementById('global-pwd').value = '';
    setFeedback('pwd-feedback', 'CLEARED', 'ok');
});

fillPwdFields();

/* ============================================================
   FEEDBACK HELPER
   ============================================================ */

function setFeedback(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent  = msg;
    el.className    = 'feedback ' + type;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
        el.textContent = '';
        el.className   = 'feedback';
    }, 3000);
}

/* ============================================================
   STATUS PING
   ============================================================ */

async function pingStatus() {
    const dot   = document.getElementById('status-dot');
    const label = document.getElementById('status-label');
    try {
        const r = await fetch('/stats', { signal: AbortSignal.timeout(3000) });
        if (r.ok) {
            dot.className = 'status-dot';
            label.textContent = 'ONLINE';
        } else {
            throw new Error();
        }
    } catch {
        dot.className = 'status-dot offline';
        label.textContent = 'NO SIGNAL';
    }
}

pingStatus();
setInterval(pingStatus, 10000);

/* ============================================================
   STATS — автообновление каждые 5 сек -> Плавное обновление
   ============================================================ */

/* текущие значения для анимации */
const current = { cpu: 0, ram: 0, disk: 0 };
const target  = { cpu: 0, ram: 0, disk: 0 };

/* шум ±2% поверх реального значения */
function noise() {
    return (Math.random() - 0.5) * 4;
}

function makeBar(val) {
    const filled = Math.round(val / 5);
    const empty  = 20 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ' ' + val + '%';
}

function animateValue(key, toVal, duration = 800) {
    target[key] = toVal;
    const fromVal = current[key];

    const start = performance.now();

    function tick(now) {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease     = 1 - Math.pow(1 - progress, 3);

        const val         = fromVal + (toVal - fromVal) * ease;
        const displayVal  = Math.min(100, Math.max(0, Math.round(val + (progress === 1 ? noise() : 0))));

        current[key] = val;

        document.getElementById('s-' + key).textContent = displayVal + '%';
        document.getElementById('b-' + key).textContent = makeBar(displayVal);

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            /* после окончания анимации — продолжаем "дышать" */
            setTimeout(() => {
                const breathe = Math.round(target[key] + noise());
                const clamped = Math.min(100, Math.max(0, breathe));
                document.getElementById('s-' + key).textContent = clamped + '%';
                document.getElementById('b-' + key).textContent = makeBar(clamped);
            }, 800 + Math.random() * 600);
        }
    }

    requestAnimationFrame(tick);
}

async function loadStats() {
    try {
        const data = await fetch('/stats').then(r => r.json());

        animateValue('cpu',  data.cpu);
        animateValue('ram',  data.ram);
        animateValue('disk', data.disk);

        document.getElementById('s-proc').textContent = data.proc;
        document.getElementById('s-boot').textContent = data.boot_time;
    } catch { /* offline */ }
}

loadStats();
setInterval(loadStats, 5000);

/* ============================================================
   FILES
   ============================================================ */

document.getElementById('btn-list-files').addEventListener('click', async () => {
    const pwd = document.getElementById('files-pwd').value.trim();
    if (!pwd) {
        setFeedback('files-feedback', 'ENTER PASSWORD', 'err');
        return;
    }

    try {
        const data = await fetch('/files', { headers: { 'x-password': pwd } }).then(r => r.json());

        if (!Array.isArray(data.files)) {
            setFeedback('files-feedback', 'ACCESS DENIED', 'err');
            document.getElementById('files-result').style.display = 'none';
            return;
        }

        setFeedback('files-feedback', 'OK — ' + data.files.length + ' FILE(S)', 'ok');
        renderFiles(data.files, pwd);
        document.getElementById('files-result').style.display = 'block';
    } catch {
        setFeedback('files-feedback', 'REQUEST FAILED', 'err');
    }
});

function esc(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderFiles(files, pwd) {
    const body = document.getElementById('files-body');

    if (files.length === 0) {
        body.innerHTML = `<div style="
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--text-dim);
            letter-spacing: 0.15em;
            padding: 12px 0;
        ">// STORAGE EMPTY</div>`;
        return;
    }

    body.innerHTML = files.map(name => `
        <div class="file-line" id="file-${btoa(name)}">
            <span class="fname">${esc(name)}</span>
            <div style="display:flex; gap:12px">
                
                <span
                    onclick="downloadFile('${esc(name)}', '${esc(pwd)}')"
                    style="color:var(--glow-dim); letter-spacing:0.1em; font-size:11px; cursor:pointer; transition:color 0.15s"
                    onmouseover="this.style.color='var(--glow)'"
                    onmouseout="this.style.color='var(--glow-dim)'"
                >[ DL ]</span>
                <span
                    onclick="deleteFile('${esc(name)}', '${esc(pwd)}')"
                    style="color:var(--text-dim); letter-spacing:0.1em; font-size:11px; cursor:pointer; transition:color 0.15s"
                    onmouseover="this.style.color='var(--red)'"
                    onmouseout="this.style.color='var(--text-dim)'"
                >[ RM ]</span>
            </div>
        </div>
    `).join('');
}

/* ============================================================
   DELETE FILE
   ============================================================ */

async function deleteFile(filename, pwd) {
    try {
        const data = await fetch(
            '/files/' + encodeURIComponent(filename),
            {
                method: 'DELETE',
                headers: { 'x-password': pwd }
            }
        ).then(r => r.json());

        if (data.status === 'deleted') {
            const row = document.getElementById('file-' + btoa(filename));
            if (row) row.remove();
        } else {
            document.getElementById('files-error').textContent = '// DELETE FAILED';
        }
    } catch {
        document.getElementById('files-error').textContent = '// REQUEST FAILED';
    }
}

/* ============================================================
   DOWNLOAD FILE
   ============================================================ */

async function downloadFile(filename, pwd) {
    const r    = await fetch('/download/' + encodeURIComponent(filename), {
        headers: { 'x-password': pwd }
    });
    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/* ============================================================
   UPLOAD FILE
   ============================================================ */

const fileInput = document.getElementById('file-input');
const dropZone  = document.getElementById('drop-zone');
const dropName  = document.getElementById('drop-name');

fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) dropName.textContent = fileInput.files[0].name;
});

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));

dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag');
    if (e.dataTransfer.files[0]) {
        fileInput.files      = e.dataTransfer.files;
        dropName.textContent = e.dataTransfer.files[0].name;
    }
});

document.getElementById('btn-upload').addEventListener('click', async () => {
    const file = fileInput.files[0];
    const pwd  = document.getElementById('upload-pwd').value.trim();

    if (!file) {
        setFeedback('upload-feedback', 'SELECT A FILE FIRST', 'err');
        return;
    }
    if (!pwd) {
        setFeedback('upload-feedback', 'ENTER PASSWORD', 'err');
        return;
    }

    const btn     = document.getElementById('btn-upload');
    const gotoBtn = document.getElementById('btn-goto-files');

    btn.textContent = 'UPLOADING...';
    btn.disabled    = true;
    gotoBtn.style.display = 'none';

    const form = new FormData();
    form.append('file', file);

    try {
        const data = await fetch('/upload', {
            method: 'POST',
            headers: { 'x-password': pwd },
            body: form
                }).then(r => r.json());

        if (data.status === 'success') {
            setFeedback('upload-feedback', 'UPLOADED: ' + data.filename, 'ok');
            dropName.textContent = '';
            fileInput.value      = '';
            /* показываем кнопку перехода в FILES */
            gotoBtn.style.display = 'inline-block';
        } else {
            setFeedback('upload-feedback', 'ACCESS DENIED', 'err');
        }

        btn.textContent = 'EXECUTE UPLOAD';
        btn.disabled    = false;

    } catch {
        setFeedback('upload-feedback', 'REQUEST FAILED', 'err');
        btn.textContent = 'EXECUTE UPLOAD';
        btn.disabled    = false;
    }
});

/* кнопка "перейти в FILES" после успешного аплоада */
document.getElementById('btn-goto-files').addEventListener('click', () => {
    document.getElementById('files-pwd').value = document.getElementById('upload-pwd').value;
    switchView('files');
    document.getElementById('btn-list-files').click();
});

/* ============================================================
   KEYBOARD NAVIGATION
   ============================================================ */

   function skipBoot() {
    const bootScreen = document.getElementById('boot-screen');
    const panel      = document.querySelector('.container');

    bootScreen.style.transition = 'opacity 0.4s ease';
    bootScreen.style.opacity    = '0';
    panel.style.transition      = 'opacity 0.6s ease';
    panel.style.opacity         = '1';

    setTimeout(() => bootScreen.remove(), 400);
}

document.addEventListener('keydown', e => {
    if (e.key === 'Enter') skipBoot();
});

const navViews = ['stats', 'files', 'upload', 'password'];

document.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

    /* не перехватываем стрелки когда фокус в инпуте */
    if (document.activeElement.tagName === 'INPUT') return;

    e.preventDefault();

    const current = document.querySelector('.nav-item.active').dataset.view;
    const idx     = navViews.indexOf(current);

    let next;
    if (e.key === 'ArrowDown') next = navViews[(idx + 1) % navViews.length];
    if (e.key === 'ArrowUp')   next = navViews[(idx - 1 + navViews.length) % navViews.length];

    switchView(next);
});