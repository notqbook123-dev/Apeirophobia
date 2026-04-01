/* ============================================================
   BOOT SEQUENCE
   ============================================================ */

const bootLines = [
    { text: 'STORAGE PANEL v0.1',                    delay: 0    },
    { text: '',                                        delay: 150  },
    { text: 'INITIALIZING FILE SYSTEM...',            delay: 250,  ok: true },
    { text: 'MOUNTING /dev/sda1...',                  delay: 400,  ok: true },
    { text: 'LOADING MODULES...',                     delay: 550,  ok: true },
    { text: 'CHECKING STORAGE PATH...',               delay: 700,  ok: true },
    { text: '',                                        delay: 1200, prompt: true },
];

function runBoot() {
    const container   = document.getElementById('boot-text');
    const bootCursor  = document.getElementById('boot-cursor');
    const panel       = document.querySelector('.container');

    panel.style.opacity = '0';

bootLines.forEach(({ text, delay, ok, prompt }) => {
    setTimeout(() => {
        const span = document.createElement('span');
        span.className = 'boot-line';

        if (prompt) {
            span.innerHTML = '> press enter <span style="color:var(--glow); animation:cursor-blink 0.8s step-end infinite">_</span>';
        } else if (ok) {
            const dots  = '.'.repeat(Math.max(0, 35 - text.length));
            span.innerHTML = `${text}<span style="color:var(--text-dim)">${dots}</span> <span style="color:var(--green)">[OK]</span>`;
        } else {
            span.textContent = text;
        }

        container.appendChild(span);
    }, delay);
});

    const totalDelay = 800 + 400;

    setTimeout(() => {
        bootCursor.style.transition = 'opacity 0.3s ease';
        bootCursor.style.opacity    = '0';

        const bootScreen = document.getElementById('boot-screen');
        bootScreen.style.transition = 'opacity 0.8s ease';
        bootScreen.style.opacity    = '0';

        panel.style.transition = 'opacity 1.2s ease';
        panel.style.opacity    = '1';

        setTimeout(() => bootScreen.remove(), 800);
    }, totalDelay);
}

document.addEventListener('DOMContentLoaded', runBoot);