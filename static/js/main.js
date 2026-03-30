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
   STATS — автообновление каждые 5 сек
   ============================================================ */

function makeBar(val) {
    const filled = Math.round(val / 5);
    const empty  = 20 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ' ' + val + '%';
}

async function loadStats() {
    try {
        const data = await fetch('/stats').then(r => r.json());

        document.getElementById('s-cpu').textContent  = data.cpu  + '%';
        document.getElementById('s-ram').textContent  = data.ram  + '%';
        document.getElementById('s-disk').textContent = data.disk + '%';
        document.getElementById('s-proc').textContent = data.proc;
        document.getElementById('s-boot').textContent = data.boot_time;

        document.getElementById('b-cpu').textContent  = makeBar(data.cpu);
        document.getElementById('b-ram').textContent  = makeBar(data.ram);
        document.getElementById('b-disk').textContent = makeBar(data.disk);
    } catch { /* offline — dot покажет */ }
}

document.getElementById('btn-refresh-stats').addEventListener('click', loadStats);

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
        const data = await fetch('/files?password=' + encodeURIComponent(pwd)).then(r => r.json());

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
        <div class="file-line">
            <span class="fname">${esc(name)}</span>
            <a
                href="/download/${encodeURIComponent(name)}?password=${encodeURIComponent(pwd)}"
                download="${esc(name)}"
                style="color:var(--glow-dim); text-decoration:none; letter-spacing:0.1em;
                       font-family:var(--font-mono); font-size:11px; transition:color 0.15s;"
                onmouseover="this.style.color='var(--glow)'"
                onmouseout="this.style.color='var(--glow-dim)'"
            >[ DL ]</a>
        </div>
    `).join('');
}

/* ============================================================
   UPLOAD
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
        const data = await fetch('/upload?password=' + encodeURIComponent(pwd), {
            method: 'POST',
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