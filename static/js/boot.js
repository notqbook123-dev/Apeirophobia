/* ============================================================
   BOOT SEQUENCE
   ============================================================ */

const bootLines = [
    { text: 'STORAGE PANEL v0.1',                   delay: 0,    status: null      },
    { text: '',                                       delay: 400,  status: null      },
    { text: 'INITIALIZING FILE SYSTEM....',          delay: 600,  status: 'OK'      },
    { text: 'LOADING MODULES...',                    delay: 1000, status: 'OK'      },
    { text: 'CHECKING STORAGE PATH...',              delay: 1400, status: 'OK'      },
    { text: 'ESTABLISHING CONNECTION...',            delay: 1800, status: 'OK'      },
    { text: '',                                       delay: 2200, status: null      },
    { text: 'ACCESS GRANTED',                        delay: 2600, status: null, granted: true },
];

function padLine(text, status) {
    if (!status) return text;
    const dots = '.'.repeat(Math.max(0, 42 - text.length));
    return `${text}${dots} [${status}]`;
}

function runBoot() {
    const container = document.getElementById('boot-text');
    const cursor    = document.getElementById('boot-cursor');
    const panel = document.querySelector('.container');

    /* прячем панель до конца загрузки */
    panel.style.opacity = '0';

    bootLines.forEach(({ text, delay, status, granted }) => {
        setTimeout(() => {
            const span = document.createElement('span');
            span.className = 'boot-line' + (granted ? ' granted' : '') + (status ? ' ok' : '');

            if (granted) {
                span.textContent = text;
            } else {
                span.innerHTML = padLine(text, status)
                    .replace(/\[OK\]/g, '<span class="boot-status">[OK]</span>');
            }

            container.appendChild(span);
        }, delay);
    });

    /* glitch в середине */
    setTimeout(() => {
        const glitch = document.createElement('span');
        glitch.className = 'boot-line';
        glitch.style.color = 'var(--text-dim)';
        glitch.textContent = 'X7#@!..CORRUPTED..##@X....';
        container.appendChild(glitch);

        setTimeout(() => glitch.remove(), 120);
    }, 1600);

    /* конец загрузки — убираем boot screen, показываем панель */
    const totalDelay = 2600 + 800;

    setTimeout(() => {
        cursor.style.display = 'none';

        const bootScreen = document.getElementById('boot-screen');
        bootScreen.style.transition = 'opacity 0.8s ease';
        bootScreen.style.opacity    = '0';

        /* плавное появление панели */
        panel.style.transition = 'opacity 1.2s ease';
        panel.style.opacity    = '1';

        setTimeout(() => bootScreen.remove(), 800);
    }, totalDelay);
}

document.addEventListener('DOMContentLoaded', runBoot);