export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => document.querySelectorAll(selector);

export const formatNumber = (num) => Math.floor(num).toLocaleString('tr-TR');

export const Storage = {
    get(key, defaultValue) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage Read Error', e);
            return defaultValue;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage Write Error', e);
        }
    }
};

export const playSound = (id, volume = 0.5) => {
    const audio = $(`#${id}`);
    if (audio) {
        audio.currentTime = 0;
        audio.volume = volume;
        // Handle promise rejection from rapid clicks
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {});
        }
    }
};
