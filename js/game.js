import { $, $$, formatNumber, playSound } from './utils.js';
import { GameState } from './state.js';

const state = new GameState();

// --- DOM Elements ---
const ui = {
    count: $('#count'),
    money: $('#money'),
    pickles: $('#pickles'),
    cucumber: $('#cucumber'),
    cucumberHolder: $('#cucumber-holder'),
    knife: $('#knife'),
    // Workstation elements
    board: $('#board'),
    workstation: $('#workstation'),
    picklingZone: $('#pickling-zone'),
    modals: {
        market: $('#market'),
        factories: $('#factories'),
        aunts: $('#aunts'),
        pickle: $('#pickle'),
        bazaar: $('#bazaar'),
        apk: $('#apkModal')
    },
    lists: {
        factory: $('#factoryList'),
        aunt: $('#auntList'),
        pickle: $('#pickleList')
    },
    notifications: $('#notifications')
};

// --- Notifications ---
function notify(text) {
    if (!ui.notifications) return;
    const n = document.createElement('div');
    n.className = 'notif';
    n.innerHTML = `⚠️ <span>${text}</span>`;
    ui.notifications.appendChild(n);
    playSound('clickSound', 0.5); // Warning tone
    setTimeout(() => n.remove(), 3500);
}

// --- Game Loop (Logic) ---
// Runs every 1 second to match original game balance
setInterval(() => {
    const d = state.data;

    // Factories Logic
    d.factories.forEach(f => {
        if (f.on && f.hp > 0) {
            d.cucumbers += f.lvl;
            f.hp--;
            if (f.hp <= 0) notify("Bir fabrika durdu! (Canı bitti)");
        }
    });

    // Aunts Logic
    d.aunts.forEach(a => {
        if ((a.on !== false) && a.hp > 0) {
            a.hp -= 0.5;
            a.timer++;
            if (a.timer >= 5) {
                if (d.cucumbers >= 10) {
                    d.cucumbers -= 10;
                    // Create new pickle
                    const now = Date.now();
                    d.pickles.push({
                        id: 'p_' + Math.random().toString(36).substr(2, 9),
                        created: now,
                        expires: now + (Math.random() * 5 + 1) * 86400000,
                        spoiled: false
                    });
                }
                a.timer = 0;
            }
            if (a.hp <= 0) notify("Bir teyze yoruldu! (Canı bitti)");
        }
    });

    // Pickle Queue Logic
    d.pickleQueue.forEach((p, i) => {
        p.t--;
        if (p.t <= 0) {
            const now = Date.now();
            d.pickles.push({
                created: now,
                expires: now + (Math.random() * 5 + 1) * 86400000,
                spoiled: false
            });
            d.pickleQueue.splice(i, 1);
        }
    });

    // Spoilage Logic
    const now = Date.now();
    d.pickles.forEach(p => {
        if (!p.spoiled && now > p.expires) {
            p.spoiled = true;
        }
    });

    state.save();
    updateUI();
}, 1000);

// --- UI Update ---

function updateUI() {
    // Top Bar
    if (ui.count) ui.count.textContent = Math.floor(state.data.cucumbers);
    if (ui.money) ui.money.textContent = Math.floor(state.data.money);
    if (ui.pickles) ui.pickles.textContent = state.data.pickles.filter(p => !p.spoiled).length;

    // Lists and Zone
    if (!ui.modals.factories.classList.contains('hidden')) renderFactories();
    if (!ui.modals.aunts.classList.contains('hidden')) renderAunts();
    if (!ui.modals.pickle.classList.contains('hidden')) renderPickles();
    renderPicklingQueue();
}

function renderPicklingQueue() {
    if (!ui.picklingZone) return;

    const queue = state.data.pickleQueue;
    const currentJars = ui.picklingZone.querySelectorAll('.pickling-jar');

    // Remove finished or non-existent
    currentJars.forEach(jar => {
        const id = jar.dataset.id;
        if (!queue.find(p => p.id === id)) {
            if (!jar.classList.contains('completing')) {
                completePickleVisual(jar);
            }
        }
    });

    // Add new ones
    queue.forEach(p => {
        // We need a unique ID to track jars
        if (!p.id) p.id = 'p_' + Math.random().toString(36).substr(2, 9);

        let jar = ui.picklingZone.querySelector(`[data-id="${p.id}"]`);
        if (!jar) {
            jar = document.createElement('div');
            jar.className = 'pickling-jar';
            jar.dataset.id = p.id;
            jar.innerHTML = `
                <div class="pickle-content"></div>
                <div class="bubble" style="left:20%; width:4px; height:4px; animation-delay:0s"></div>
                <div class="bubble" style="left:50%; width: 6px; height:6px; animation-delay:0.3s"></div>
                <div class="bubble" style="left:80%; width:3px; height:3px; animation-delay:0.6s"></div>
            `;
            ui.picklingZone.appendChild(jar);
        }

        const content = jar.querySelector('.pickle-content');
        const progress = ((5 - p.t) / 5) * 100;
        content.style.height = progress + '%';
    });
}

function completePickleVisual(jar) {
    jar.classList.add('completing');

    // Fly a pickle to the counter
    const rect = jar.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'pickle-fly-icon';
    fly.textContent = '🥫';
    fly.style.left = rect.left + 'px';
    fly.style.top = rect.top + 'px';

    const target = ui.pickles.getBoundingClientRect();
    const dx = target.left - rect.left;
    const dy = target.top - rect.top;

    fly.style.setProperty('--dx', dx + 'px');
    fly.style.setProperty('--dy', dy + 'px');

    document.body.appendChild(fly);

    setTimeout(() => {
        jar.remove();
        fly.remove();
        playSound('clickSound', 1.5); // Pop sound
    }, 800);
}

// --- Render Functions ---

function renderFactories() {
    if (!ui.lists.factory) return;
    ui.lists.factory.innerHTML = '';
    state.data.factories.forEach((f, i) => {
        const percent = (f.hp / f.max) * 100;
        const color = percent < 30 ? 'var(--danger-color)' : 'var(--accent-color)';

        const div = document.createElement('div');
        div.className = `card ${f.hp <= 0 || f.on === false ? "inactive" : ""}`;
        div.innerHTML = `
            <div class="card-header">
                <span>🏭 Fabrika #${i + 1}</span>
                <span>Lvl ${f.lvl}</span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width:${percent}%; background:${color}"></div>
            </div>
            <div class="card-actions">
                <button class="btn-secondary" data-action="toggleFactory" data-index="${i}">${f.on !== false ? "Durdur" : "Çalıştır"}</button>
                <button class="btn-primary" data-action="repairFactory" data-index="${i}">Tamir Et (20 💰)</button>
                <button class="btn-primary" data-action="upgradeFactory" data-index="${i}">Geliştir (${f.lvl * 50} 💰)</button>
                <button class="btn-danger" data-action="deleteFactory" data-index="${i}">Yık 🗑️</button>
            </div>
        `;
        ui.lists.factory.appendChild(div);
    });
}

function renderAunts() {
    ui.lists.aunt.innerHTML = '';
    state.data.aunts.forEach((a, i) => {
        const percent = (a.hp / a.max) * 100;
        const color = percent < 30 ? 'var(--danger-color)' : 'var(--accent-color)';
        const div = document.createElement('div');
        div.className = `card ${a.hp <= 0 || a.on === false ? "inactive" : ""}`;
        div.innerHTML = `
            <div class="card-header">
                <span>👵 Teyze #${i + 1}</span>
                <span>Lvl ${a.lvl}</span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width:${percent}%; background:${color}"></div>
            </div>
            <div class="card-actions">
                <button class="btn-secondary" data-action="toggleAunt" data-index="${i}">${a.on !== false ? "Paydos Ver" : "Çalıştır"}</button>
                <button class="btn-primary" data-action="feedAunt" data-index="${i}">Yemek Ver (15 💰)</button>
                <button class="btn-primary" data-action="upgradeAunt" data-index="${i}">Maaşa Zam (${a.lvl * 40} 💰)</button>
                <button class="btn-danger" data-action="deleteAunt" data-index="${i}">Kov 🧹</button>
            </div>
        `;
        ui.lists.aunt.appendChild(div);
    });
}

function renderPickles() {
    ui.lists.pickle.innerHTML = '';
    const now = Date.now();
    state.data.pickles.forEach(p => {
        const totalDuration = p.expires - p.created;
        const remaining = Math.max(0, p.expires - now);
        const percent = (remaining / totalDuration) * 100;

        const div = document.createElement('div');
        div.className = `card ${p.spoiled ? "inactive" : ""}`;
        div.innerHTML = `
            <div class="card-header">
                <span>${p.spoiled ? "🤢 Bozulmuş Turşu" : "🥒 Taze Turşu"}</span>
                <span>${new Date(p.expires).toLocaleDateString("tr")}</span>
            </div>
            ${!p.spoiled ? `
            <div class="progress-track">
                <div class="progress-fill" style="width:${percent}%"></div>
            </div>` : ''}
        `;
        ui.lists.pickle.appendChild(div);
    });
}

// --- Interaction ---

function spawnSlices() {
    for (let i = 0; i < 4; i++) {
        const s = document.createElement("div");
        s.className = "slice";
        // Convert JS random logic to CSS variable logic
        // Original: x: +/-60, y: -60 - rand(60), r: +/-60deg
        const tx = (Math.random() * 120 - 60) + "px";
        const ty = (-Math.random() * 80 - 40) + "px"; // flying up
        const r = (Math.random() * 120 - 60) + "deg";

        s.style.setProperty("--tx", tx);
        s.style.setProperty("--ty", ty);
        s.style.setProperty("--r", r);

        // Start from center
        s.style.left = "50%";
        s.style.bottom = "80px";

        ui.sliceContainer.appendChild(s);
        setTimeout(() => s.remove(), 600);
    }
}

function spawnFloater(text, x, y) {
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

// --- Advanced Interaction ---

let cucumberHealth = 10;
let isSweeping = false;

// 1. Initial Spawn
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(spawnNewCucumber, 500);
});

function spawnNewCucumber() {
    if (!ui.cucumberHolder) return;

    // Reset visual
    ui.cucumberHolder.style.width = '220px';
    ui.cucumberHolder.style.opacity = '1';

    // Trigger animation
    ui.cucumberHolder.classList.remove('spawning-cucumber');
    void ui.cucumberHolder.offsetWidth;
    ui.cucumberHolder.classList.add('spawning-cucumber');

    cucumberHealth = 10;

    // Play thud sound after flight
    setTimeout(() => playSound('clickSound', 0.4), 600);
}

function spawnSliceOnBoard() {
    const s = document.createElement("div");
    s.className = "slice";

    // Randomize on board
    const bx = 40 + Math.random() * 160;
    const by = 80 + Math.random() * 60;
    const r = Math.random() * 360;

    s.style.left = bx + 'px';
    s.style.top = by + 'px';
    s.style.transform = `rotate(${r}deg)`;

    ui.board.appendChild(s);

    // Enhanced Gravity Juice Splashes
    for (let i = 0; i < 8; i++) {
        const j = document.createElement('div');
        j.className = 'juice';
        j.style.left = (bx + 20) + 'px';
        j.style.top = (by + 20) + 'px';

        // Randomize physics
        const vx = (Math.random() * 150 - 75);
        const vy = (Math.random() * -120 - 40);

        j.style.setProperty('--jx', vx + 'px');
        j.style.setProperty('--jy', vy + 'px');

        // Random size and color
        const size = 3 + Math.random() * 5;
        const shade = 100 + Math.random() * 100;
        j.style.width = size + 'px';
        j.style.height = size + 'px';
        j.style.backgroundColor = `rgb(0, ${shade}, 0)`;

        ui.board.appendChild(j);
        setTimeout(() => j.remove(), 400);
    }

    // Impact Flash
    const flash = document.createElement('div');
    flash.className = 'impact-flash';
    flash.style.left = (bx + 20) + 'px';
    flash.style.top = (by + 20) + 'px';
    ui.board.appendChild(flash);
    setTimeout(() => flash.remove(), 200);
}

function sweepSlices() {
    if (isSweeping) return;
    isSweeping = true;

    const knife = ui.knife;
    const slices = ui.board.querySelectorAll('.slice');

    // 1. Knife Visual Sweep
    knife.classList.add('sweeping');

    // 2. Fly Slices Away
    setTimeout(() => {
        slices.forEach(s => {
            s.classList.add('zoop-collect');
            // Remove from DOM after flight
            setTimeout(() => s.remove(), 800);
        });
    }, 400);

    // 3. Cleanup and Spawn New
    setTimeout(() => {
        knife.classList.remove('sweeping');
        isSweeping = false;

        // Hide empty holder
        ui.cucumberHolder.style.opacity = '0';

        // Wait then spawn next
        setTimeout(spawnNewCucumber, 400);
    }, 1200);
}

// Interactive Knife: Follow Mouse or Touch X while hovering workstation
if (ui.workstation) {
    const handleMove = (clientX) => {
        if (isSweeping) return;
        const rect = ui.workstation.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const width = rect.width;

        // Map position to knife left (%)
        const targetLeft = 30 + (mouseX / width) * 40;
        ui.knife.style.left = targetLeft + '%';
    };

    ui.workstation.addEventListener('mousemove', (e) => handleMove(e.clientX));
    ui.workstation.addEventListener('touchmove', (e) => {
        handleMove(e.touches[0].clientX);
        e.preventDefault(); // Prevent scrolling while chopping
    }, { passive: false });
}

// Click Handler
if (ui.workstation) {
    ui.workstation.addEventListener('click', (e) => {
        if (isSweeping || cucumberHealth <= 0) return;

        // 1. Logic
        state.clickCucumber();

        // 1.5 Music (Start if paused)
        const bgm = $('#bgm');
        if (bgm && bgm.paused) {
            bgm.volume = 0.25;
            bgm.play().catch(() => { });
        }

        // 2. Audio
        playSound('clickSound', 0.6 + (Math.random() * 0.2));

        // 3. Knife Chop & Board Shake & Screen Shake
        const knife = ui.knife;
        knife.classList.remove("chop");
        void knife.offsetWidth;
        knife.classList.add("chop");

        ui.board.classList.remove("impact");
        void ui.board.offsetWidth;
        ui.board.classList.add("impact");

        document.body.classList.remove("shake");
        void document.body.offsetWidth;
        document.body.classList.add("shake");

        // 3.1 Cucumber Squish
        ui.cucumber.classList.remove("squish");
        void ui.cucumber.offsetWidth;
        ui.cucumber.classList.add("squish");

        // 4. Cucumber Reduction (Visual only)
        cucumberHealth--;
        const newWidth = (cucumberHealth / 10) * 220;
        if (ui.cucumberHolder) ui.cucumberHolder.style.width = Math.max(0, newWidth) + 'px';

        // 5. Spawn Slice & Splashes
        spawnSliceOnBoard();

        // 6. Floating Text
        spawnFloater("+1", e.clientX, e.clientY);

        // 7. Check Sweep & Slow-Mo Finisher
        if (cucumberHealth <= 0) {
            document.body.classList.add('slow-mo');
            setTimeout(() => {
                document.body.classList.remove('slow-mo');
                sweepSlices();
            }, 600);
        }

        updateUI();
        state.save();
    });
}

// Global Event Delegation for Buttons
document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    // Handle Modal Openers
    if (btn.dataset.modal) {
        playSound('clickSound');
        const m = ui.modals[btn.dataset.modal];
        if (m) {
            m.classList.remove('hidden');
            // Allow a small delay for transition
            requestAnimationFrame(() => m.classList.add('active'));
            updateUI();
        }
    }

    // Handle Modal Closers
    if (btn.classList.contains('close') || btn.classList.contains('btn-close')) {
        playSound('clickSound');
        $$('.modal-overlay').forEach(m => {
            m.classList.remove('active');
            setTimeout(() => m.classList.add('hidden'), 300);
        });
    }

    // Handle Game Actions
    const action = btn.dataset.action;
    const index = btn.dataset.index;

    if (action) {
        playSound('clickSound');
        let result = false;

        switch (action) {
            case 'buyFactory': result = state.buyFactory(); break;
            case 'buyAunt': result = state.buyAunt(); break; // Fix: was buyFactory
            case 'startPickle': result = state.startPickle(); break;
            case 'sellCucumbers': result = state.sellCucumbers(10); break;
            case 'sellAllCucumbers': result = state.sellAllCucumbers(); break;
            case 'sellPickles': result = state.sellPickles(1); break;
            case 'sellAllPickles': result = state.sellAllPickles(); break;

            // Indexed actions
            case 'toggleFactory': state.toggleFactory(index); updateUI(); break;
            case 'repairFactory': state.repairFactory(index); updateUI(); break;
            case 'upgradeFactory': state.upgradeFactory(index); updateUI(); break;
            case 'deleteFactory': if (confirm("Emin misin?")) state.deleteFactory(index); updateUI(); break;

            case 'feedAunt': state.feedAunt(index); updateUI(); break;
            case 'toggleAunt': state.toggleAunt(index); updateUI(); break;
            case 'upgradeAunt': state.upgradeAunt(index); updateUI(); break;
            case 'deleteAunt': if (confirm("Teyzeyi kovmak istediğine emin misin?")) state.deleteAunt(index); updateUI(); break;
        }

        if (result) updateUI();
    }

    // Explicit handlers for Bazaar (since they have params)
    if (btn.id === 'btn-sell-10') { playSound('clickSound'); state.sellCucumbers(10); updateUI(); }
    if (btn.id === 'btn-sell-1pick') { playSound('clickSound'); state.sellPickles(1); updateUI(); }
});

// Modal Overlay Click to Close
$$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    });
});

// Init
updateUI();

// Check Android
const params = new URLSearchParams(window.location.search);
const isAndroid = /Android/i.test(navigator.userAgent);
if (window.location.pathname.includes("game.html")) {
    if (params.get("application") !== "true" && isAndroid) {
        if (ui.modals.apk) {
            ui.modals.apk.classList.remove('hidden');
            setTimeout(() => ui.modals.apk.classList.add('active'), 100);
        }
    }
}
