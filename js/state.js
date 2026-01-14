import { Storage } from './utils.js';

const INITIAL_STATE = {
    cucumbers: 0,
    money: 0,
    factories: [],
    aunts: [],
    pickles: [],
    pickleQueue: [],
    knives: ['basic'], // Owned knife IDs
    activeKnife: 'basic',
    customers: [], // {id, type, amount, reward, expires}
    buffs: { tea: 0, coffee: 0 },
    isStallOpen: true
};

export class GameState {
    constructor() {
        this.data = Object.assign({}, INITIAL_STATE, Storage.get('salatalik', {}));

        // Ensure arrays are initialized if loading from old save
        if (!this.data.factories) this.data.factories = [];
        if (!this.data.aunts) this.data.aunts = [];
        if (!this.data.pickles) this.data.pickles = [];
        if (!this.data.pickleQueue) this.data.pickleQueue = [];
        if (!this.data.knives) this.data.knives = ['basic'];
        if (!this.data.activeKnife) this.data.activeKnife = 'basic';
        if (!this.data.customers) this.data.customers = [];
        if (!this.data.buffs) this.data.buffs = { tea: 0, coffee: 0 };
        if (this.data.isStallOpen === undefined) this.data.isStallOpen = true;
    }

    save() {
        Storage.set('salatalik', this.data);
    }

    // --- Actions ---

    clickCucumber() {
        this.data.cucumbers++;
    }

    buyFactory() {
        if (this.data.money >= 100) {
            this.data.money -= 100;
            this.data.factories.push({ lvl: 1, hp: 100, max: 100, on: true });
            return true;
        }
        return false;
    }

    buyAunt() {
        if (this.data.money >= 150) {
            this.data.money -= 150;
            this.data.aunts.push({ lvl: 1, hp: 100, max: 100, timer: 0, on: true });
            return true;
        }
        return false;
    }

    startPickle() {
        if (this.data.cucumbers >= 10) {
            this.data.cucumbers -= 10;
            const id = 'p_' + Math.random().toString(36).substr(2, 9);
            this.data.pickleQueue.push({ id, t: 5 });
            return true;
        }
        return false;
    }

    // --- Factory Management ---

    toggleFactory(index) {
        const i = parseInt(index);
        const f = this.data.factories[i];
        if (f) {
            // Handle undefined as true (working)
            f.on = (f.on === false) ? true : false;
        }
    }

    repairFactory(index) {
        const i = parseInt(index);
        const f = this.data.factories[i];
        if (f && this.data.money >= 20) {
            this.data.money -= 20;
            f.hp = f.max;
            return true;
        }
        return false;
    }

    upgradeFactory(index) {
        const i = parseInt(index);
        const f = this.data.factories[i];
        const cost = f.lvl * 50;
        if (f && this.data.money >= cost) {
            this.data.money -= cost;
            f.lvl++;
            f.max += 20;
            f.hp = f.max;
            return true;
        }
        return false;
    }

    deleteFactory(index) {
        const i = parseInt(index);
        this.data.factories.splice(i, 1);
    }

    // --- Aunt Management ---

    toggleAunt(index) {
        const i = parseInt(index);
        const a = this.data.aunts[i];
        if (a) {
            // Handle undefined as true (working)
            a.on = (a.on === false) ? true : false;
        }
    }

    deleteAunt(index) {
        const i = parseInt(index);
        this.data.aunts.splice(i, 1);
    }

    feedAunt(index) {
        const i = parseInt(index);
        const a = this.data.aunts[i];
        if (a && this.data.money >= 15) {
            this.data.money -= 15;
            a.hp = a.max;
            return true;
        }
        return false;
    }

    upgradeAunt(index) {
        const i = parseInt(index);
        const a = this.data.aunts[i];
        const cost = a.lvl * 40;
        if (a && this.data.money >= cost) {
            this.data.money -= cost;
            a.lvl++;
            a.max += 20;
            a.hp = a.max;
            return true;
        }
        return false;
    }

    // --- Sales ---

    sellCucumbers(amount) {
        if (this.data.cucumbers >= amount) {
            this.data.cucumbers -= amount;
            this.data.money += amount * 0.2;
            return true;
        }
        return false;
    }

    sellAllCucumbers() {
        const n = Math.floor(this.data.cucumbers);
        if (n > 0) {
            this.data.money += n * 0.2;
            this.data.cucumbers = 0;
            return true;
        }
        return false;
    }

    sellPickles(amount) {
        const goodPickles = this.data.pickles.filter(p => !p.spoiled);
        if (goodPickles.length >= amount) {
            // Remove 'amount' number of good pickles
            // We need to find their indices in the main array to remove them correctly OR filter and reassign
            // Since we just need to remove N good pickles, let's filter the kept ones.

            // Strategy: Verify we have enough, then re-construct the array
            // Optimization: Since we just want to remove N, let's just find the first N non-spoiled and remove them.
            let removed_count = 0;
            this.data.pickles = this.data.pickles.filter(p => {
                if (removed_count < amount && !p.spoiled) {
                    removed_count++;
                    return false; // remove
                }
                return true; // keep
            });

            this.data.money += amount * 3;
            return true;
        }
        return false;
    }

    sellAllPickles() {
        const goodPickles = this.data.pickles.filter(p => !p.spoiled);
        const count = goodPickles.length;
        if (count > 0) {
            this.data.money += count * 3;
            this.data.pickles = this.data.pickles.filter(p => p.spoiled); // Keep only spoiled
            return true;
        }
        return false;
    }

    // --- Knife Management ---

    toggleStall() {
        this.data.isStallOpen = !this.data.isStallOpen;
        return this.data.isStallOpen;
    }

    buyKnife(id, cost) {
        if (this.data.money >= cost && !this.data.knives.includes(id)) {
            this.data.money -= cost;
            this.data.knives.push(id);
            this.data.activeKnife = id;
            return true;
        }
        return false;
    }

    switchKnife(id) {
        if (this.data.knives.includes(id)) {
            this.data.activeKnife = id;
            return true;
        }
        return false;
    }

    // --- Customer Management ---

    addCustomer(customer) {
        if (this.data.customers.length < 5) {
            const names = ["Gurme Ayşe", "Aç Emre", "Turşu Seven Can", "Müptela Murat", "Seçici Selin", "Obur Osman"];

            customer.name = names[Math.floor(Math.random() * names.length)];
            // Assign a random customer image (1-4)
            const imageNum = Math.floor(Math.random() * 4) + 1;
            customer.avatar = `./assets/images/customer_${imageNum}.png`;
            customer.totalWait = customer.expires - Date.now();

            this.data.customers.push(customer);
            return true;
        }
        return false;
    }

    fulfillCustomer(customerId) {
        const index = this.data.customers.findIndex(c => c.id === customerId);
        if (index === -1) return false;

        const customer = this.data.customers[index];
        let success = false;

        if (customer.type === 'cucumbers') {
            if (this.data.cucumbers >= customer.amount) {
                this.data.cucumbers -= customer.amount;
                success = true;
            }
        } else if (customer.type === 'pickles') {
            const goodPickles = this.data.pickles.filter(p => !p.spoiled);
            if (goodPickles.length >= customer.amount) {
                let removed = 0;
                this.data.pickles = this.data.pickles.filter(p => {
                    if (removed < customer.amount && !p.spoiled) {
                        removed++;
                        return false;
                    }
                    return true;
                });
                success = true;
            }
        }

        if (success) {
            this.data.money += customer.reward;
            this.data.customers.splice(index, 1);
            return true;
        }
        return false;
    }

    // --- Buff Management ---

    buyDrink(type, cost) {
        if (this.data.money >= cost) {
            this.data.money -= cost;
            // Add 2 minutes of buff
            this.data.buffs[type] += 120;
            return true;
        }
        return false;
    }

    tickBuffs() {
        if (this.data.buffs.tea > 0) this.data.buffs.tea--;
        if (this.data.buffs.coffee > 0) this.data.buffs.coffee--;
    }
}

export const KNIFE_TYPES = {
    basic: { name: 'Mutfak Bıçağı', power: 1, cost: 0, img: 'assets/images/knife.svg' },
    chef: { name: 'Şef Bıçağı', power: 3, cost: 500, img: 'assets/images/knife_chef.svg' },
    cleaver: { name: 'Satır', power: 8, cost: 2000, img: 'assets/images/knife_cleaver.svg' },
    gold: { name: 'Altın Bıçak', power: 25, cost: 10000, img: 'assets/images/knife_gold.svg' }
};
