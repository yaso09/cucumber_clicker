import { $, $$, formatNumber, playSound } from './utils.js';
import { GameState, KNIFE_TYPES } from './state.js';

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
        knives: $('#knives'),
        stall: $('#stall'),
        kantin: $('#kantin'),
        apk: $('#apkModal')
    },
    lists: {
        factory: $('#factoryList'),
        aunt: $('#auntList'),
        pickle: $('#pickleList'),
        knife: $('#knifeList'),
        customer: $('#customerList')
    },
    notifications: $('#notifications'),
    buffHUD: $('#buff-hud')
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
    const teaBuff = d.buffs.tea > 0;
    const decayRate = teaBuff ? 0.1 : 0.2; // 50% less decay with tea

    d.factories = d.factories.filter(f => {
        if (f.on && f.hp > 0) {
            d.cucumbers += f.lvl;
            f.hp -= decayRate;
            if (f.hp <= 0) {
                notify("Bir fabrika yıkıldı! (Canı bitti)");
                return false;
            }
        }
        return true;
    });

    // Aunts Logic
    d.aunts = d.aunts.filter(a => {
        if ((a.on !== false) && a.hp > 0) {
            a.hp -= (teaBuff ? 0.05 : 0.1);
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
            if (a.hp <= 0) {
                notify("Bir teyze işi bıraktı! (Canı bitti)");
                return false;
            }
        }
        return true;
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

    // Customer Spawning Logic
    if (Math.random() < 0.05 && d.customers.length < 5 && d.isStallOpen) {
        const type = Math.random() < 0.7 ? 'cucumbers' : 'pickles';
        const amount = type === 'cucumbers' ? Math.floor(Math.random() * 20 + 20) : Math.floor(Math.random() * 5 + 5);
        const baseValue = type === 'cucumbers' ? amount * 0.2 : amount * 3;
        const reward = Math.floor(baseValue * (1.5 + Math.random() * 1.5)); // 1.5x to 3x profit

        state.addCustomer({
            id: 'c_' + Math.random().toString(36).substr(2, 9),
            type,
            amount,
            reward,
            expires: now + 60000 // 1 minute
        });
        notify("Yeni bir müşteri geldi! (Tezgah)");
    }

    // Customer Expiry
    const beforeCount = d.customers.length;
    d.customers = d.customers.filter(c => now < c.expires);
    if (d.customers.length < beforeCount) {
        notify("Bir müşteri beklemekten sıkıldı ve gitti! 🏃‍♂️");
    }

    // Buff Ticking
    state.tickBuffs();

    state.save();
    updateUI();
}, 1000);

// --- UI Update ---

function updateUI() {
    // Top Bar
    if (ui.count) ui.count.textContent = Math.floor(state.data.cucumbers);
    if (ui.money) ui.money.textContent = Math.floor(state.data.money);
    if (ui.pickles) ui.pickles.textContent = state.data.pickles.filter(p => !p.spoiled).length;

    // Visual knife update
    const knifeData = KNIFE_TYPES[state.data.activeKnife];
    if (ui.knife && knifeData) {
        ui.knife.src = knifeData.img;
    }

    // Stall Shutter & Toggle
    const shutter = document.getElementById('stallShutter');
    const toggleBtn = document.getElementById('stallToggleBtn');
    if (shutter) {
        if (state.data.isStallOpen) {
            shutter.classList.remove('closed');
            if (toggleBtn) toggleBtn.innerText = "Dükkanı Kapat";
        } else {
            shutter.classList.add('closed');
            if (toggleBtn) toggleBtn.innerText = "Dükkanı Aç";
        }
    }

    // Lists and Zone
    if (!ui.modals.factories.classList.contains('hidden')) renderFactories();
    if (!ui.modals.aunts.classList.contains('hidden')) renderAunts();
    if (!ui.modals.pickle.classList.contains('hidden')) renderPickles();
    if (!ui.modals.knives.classList.contains('hidden')) renderKnives();
    if (!ui.modals.stall.classList.contains('hidden')) renderCustomers();
    renderBuffs();
    renderPicklingQueue();
}

function renderBuffs() {
    if (!ui.buffHUD) return;
    ui.buffHUD.innerHTML = '';
    const b = state.data.buffs;
    if (b.tea > 0) {
        const div = document.createElement('div');
        div.className = 'buff-badge tea';
        div.innerHTML = `🍵 ${b.tea}s`;
        ui.buffHUD.appendChild(div);
    }
    if (b.coffee > 0) {
        const div = document.createElement('div');
        div.className = 'buff-badge coffee';
        div.innerHTML = `☕ ${b.coffee}s`;
        ui.buffHUD.appendChild(div);
    }
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
                <span>Doğrama Makinesi #${index + 1}</span>
                <span class="status-badge ${f.active ? 'active' : 'paused'}">
                    ${f.active ? 'Çalışıyor' : 'Durduruldu'}
                </span>
            </div>
            <div class="stats-row">
                <span>Hız: ${f.productionRate}/sn</span>
                <span>Durum: %${Math.floor(f.hp)} HP</span>
            </div>
            <div class="hp-bar"><div style="width: ${f.hp}%"></div></div>
            <div class="card-actions">
                <button class="btn-secondary" data-action="toggleFactory" data-index="${index}">
                    ${f.active ? 'Durdur' : 'Başlat'}
                </button>
                <button class="btn-secondary" data-action="repairFactory" data-index="${index}">Tamir</button>
                <button class="btn-primary" data-action="upgradeFactory" data-index="${index}">Yükselt</button>
                <button class="btn-danger" data-action="deleteFactory" data-index="${index}">Kaldır</button>
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

function renderKnives() {
    if (!ui.lists.knife) return;
    ui.lists.knife.innerHTML = '';

    Object.entries(KNIFE_TYPES).forEach(([id, knife]) => {
        const isOwned = state.data.knives.includes(id);
        const isActive = state.data.activeKnife === id;

        const div = document.createElement('div');
        div.className = `card ${isActive ? 'active-item' : ''}`;
        div.innerHTML = `
            <div class="card-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${knife.img}" style="width:30px; height:30px; object-fit:contain;">
                    <span>${knife.name}</span>
                </div>
                <span>Güç: x${knife.power}</span>
            </div>
            <div class="card-actions">
                ${isOwned ?
                `<button class="btn-secondary" ${isActive ? 'disabled' : `data-action="switchKnife" data-id="${id}"`}>
                        ${isActive ? 'Kuşanıldı' : 'Kuşan'}
                    </button>` :
                `<button class="btn-primary" data-action="buyKnife" data-id="${id}" data-cost="${knife.cost}">
                        Satın Al (${knife.cost} 💰)
                    </button>`
            }
            </div>
        `;
        ui.lists.knife.appendChild(div);
    });
}

function renderCustomers() {
    if (!ui.lists.customer) return;

    const now = Date.now();
    const existingCustomers = ui.lists.customer.querySelectorAll('.visual-customer');
    const currentIds = state.data.customers.map(c => c.id);

    // Remove customers that no longer exist
    existingCustomers.forEach(el => {
        if (!currentIds.includes(el.dataset.id)) {
            el.remove();
        }
    });

    // Show empty message only if no customers exist
    if (state.data.customers.length === 0 && ui.lists.customer.querySelectorAll('.visual-customer').length === 0) {
        ui.lists.customer.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; opacity:0.5; color:white;">Müşteriler bekleniyor...</div>';
    } else {
        ui.lists.customer.innerHTML = '';
    }

    // Add new customers or update existing ones
    state.data.customers.forEach(c => {
        let customerEl = ui.lists.customer.querySelector(`[data-id="${c.id}"]`);

        if (!customerEl) {
            // Create new customer element only if it doesn't exist
            const typeIcon = c.type === 'cucumbers' ? '🥒' : '🥫';
            customerEl = document.createElement('div');
            customerEl.className = 'visual-customer';
            customerEl.setAttribute('data-action', 'fulfillCustomer');
            customerEl.setAttribute('data-id', c.id);

            customerEl.innerHTML = `
                <div class="order-bubble">
                    <div style="font-size:0.8rem; margin-bottom:5px;">${c.amount} adet</div>
                    <div style="font-size:1.5rem;">${typeIcon}</div>
                    <div style="font-size:0.7rem; color:#666; margin-top:5px; font-weight:normal;">+${c.reward}💰 Veriyor</div>
                </div>
                <img src="${c.avatar}" class="customer-avatar" alt="${c.name}">
                <div style="color:white; font-size:0.75rem; margin-top:5px; font-weight:bold; text-shadow: 0 1px 3px black;">${c.name}</div>
                <div class="patience-ring" style="width:50px;">
                    <div class="patience-fill"></div>
                </div>
            `;
            ui.lists.customer.appendChild(customerEl);
        }

        // Always update patience bar
        const remaining = Math.max(0, c.expires - now);
        const percent = (remaining / c.totalWait) * 100;
        const color = percent > 60 ? '#4caf50' : (percent > 30 ? '#ffeb3b' : '#f44336');

        const patienceFill = customerEl.querySelector('.patience-fill');
        if (patienceFill) {
            patienceFill.style.width = `${percent}%`;
            patienceFill.style.background = color;
            patienceFill.style.transition = 'width 1s linear';
        }
    });

    // Show empty message if no customers
    if (state.data.customers.length === 0) {
        ui.lists.customer.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; opacity:0.5; color:white;">Müşteriler bekleniyor...</div>';
    }
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
        const knifePower = KNIFE_TYPES[state.data.activeKnife].power;
        const coffeeMultiplier = state.data.buffs.coffee > 0 ? 2 : 1;
        const totalPower = knifePower * coffeeMultiplier;

        for (let i = 0; i < totalPower; i++) {
            state.clickCucumber();
        }

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

// Global Event Delegation
document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action], button'); // Check for data-action or any button
    if (!el) return;

    // Handle Modal Closers (can be any button with these classes)
    if (el.classList.contains('close') || el.classList.contains('btn-close')) {
        playSound('clickSound');
        $$('.modal-overlay').forEach(m => {
            m.classList.remove('active');
            setTimeout(() => m.classList.add('hidden'), 300);
        });
    }

    // Handle Game Actions
    const action = el.dataset.action;
    const id = el.dataset.id;
    const type = el.dataset.type;
    const index = parseInt(el.dataset.index);

    // Handle Modal Openers
    if (el.dataset.modal) {
        playSound('clickSound');
        const m = ui.modals[el.dataset.modal];
        if (m) {
            m.classList.remove('hidden');
            requestAnimationFrame(() => m.classList.add('active'));
            updateUI();
        }
        return;
    }

    if (action) {
        playSound('clickSound');
        let result = false;

        switch (action) {
            case 'buyFactory':
                const success = state.buyFactory();
                if (success) {
                    notify("Yeni bir doğrama makinesi kuruldu! ⚙️");
                    updateUI();
                } else {
                    notify("Yetersiz bakiye!");
                }
                break;
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

            case 'toggleStall':
                const isOpen = state.toggleStall();
                notify(isOpen ? "Dükkan açıldı! Müşteriler geliyor." : "Dükkan kapandı. Huzur...");
                updateUI();
                break;

            case 'buyDrink':
                if (state.buyDrink(el.dataset.type, parseInt(el.dataset.cost))) {
                    const icon = el.dataset.type === 'tea' ? '🍵' : '☕';
                    notify(`${icon} içildi! Enerji tavan!`);
                    playSound('clickSound', 1.2);
                    updateUI();
                } else {
                    notify("Yetersiz bakiye!");
                }
                break;

            // Knife Shop Actions
            case 'buyKnife':
                const knifeId = el.dataset.id;
                const cost = parseInt(el.dataset.cost);
                if (state.buyKnife(knifeId, cost)) {
                    notify(`${KNIFE_TYPES[knifeId].name} satın alındı!`);
                    updateUI();
                } else {
                    notify("Yetersiz bakiye!");
                }
                break;
            case 'switchKnife':
                state.switchKnife(el.dataset.id);
                updateUI();
                break;

            // Stall Actions
            case 'fulfillCustomer':
                if (state.fulfillCustomer(id)) {
                    playSound('clickSound', 1.5);
                    el.classList.add('served'); // Trigger animation
                    setTimeout(() => {
                        notify("Sipariş teslim edildi! 💰");
                        updateUI();
                    }, 400);
                } else {
                    notify("Yetersiz malzeme!");
                }
                break;
        }

        if (result) updateUI();
    }
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
