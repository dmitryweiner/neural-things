// FM Synthesis - Высокие тонкие щелчки
// Для звуков прилипания частиц в DLA-tree

class FMSynthesizer {
    constructor() {
        this.audioContext = null;
    }
    
    // Получить или создать Audio Context
    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }
    
    /**
     * Воспроизвести звук с FM синтезом
     * @param {number} carrierFreq - Основная частота (Гц)
     * @param {number} modRatio - Соотношение модулятора к carrier
     * @param {number} modIndex - Глубина модуляции
     * @param {number} attack - Время атаки (мс)
     * @param {number} decay - Время затухания (мс)
     * @param {number} volume - Громкость (0-1)
     */
    playSound(carrierFreq, modRatio, modIndex, attack, decay, volume = 0.3) {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;
        
        // Создаём осцилляторы
        const modulator = ctx.createOscillator();
        const carrier = ctx.createOscillator();
        
        // Создаём gain ноды
        const modulationGain = ctx.createGain();
        const envelopeGain = ctx.createGain();
        
        // Настройка модулятора
        modulator.frequency.value = carrierFreq * modRatio;
        modulationGain.gain.value = modIndex * carrierFreq;
        
        // Настройка carrier
        carrier.frequency.value = carrierFreq;
        carrier.type = 'sine';
        modulator.type = 'sine';
        
        // Подключаем модуляцию
        modulator.connect(modulationGain);
        modulationGain.connect(carrier.frequency);
        
        // Настройка envelope (огибающей)
        envelopeGain.gain.setValueAtTime(0, now);
        envelopeGain.gain.linearRampToValueAtTime(volume, now + attack / 1000);
        envelopeGain.gain.exponentialRampToValueAtTime(0.001, now + attack / 1000 + decay / 1000);
        
        // Подключаем к выходу
        carrier.connect(envelopeGain);
        envelopeGain.connect(ctx.destination);
        
        // Запускаем и останавливаем
        modulator.start(now);
        carrier.start(now);
        
        const totalDuration = (attack + decay + 100) / 1000;
        modulator.stop(now + totalDuration);
        carrier.stop(now + totalDuration);
    }
    
    /**
     * Воспроизвести звук "высокий тонкий щелчок"
     * Подходит для частиц на периферии дерева
     */
    playHighThinClick() {
        const carrierFreq = 1200 + Math.random() * 600;  // 1200-1800 Hz
        const modRatio = 2 + Math.random();              // 2-3
        const modIndex = 2 + Math.random() * 3;          // 2-5
        const attack = 2;                                // 2 ms
        const decay = 80 + Math.random() * 40;           // 80-120 ms
        
        this.playSound(carrierFreq, modRatio, modIndex, attack, decay);
    }
    
    /**
     * Воспроизвести звук с привязкой к координатам частицы
     * @param {number} x - Координата X (0-1 нормализованная)
     * @param {number} y - Координата Y (0-1 нормализованная)
     * @param {number} distance - Расстояние от центра (0-1 нормализованная)
     */
    playPositionBasedClick(x, y, distance) {
        // Частота зависит от Y координаты
        const carrierFreq = 1200 + y * 600;  // Выше = выше тон
        
        // Соотношение модулятора зависит от X
        const modRatio = 2 + x;  // Слева = 2, справа = 3
        
        // Глубина модуляции зависит от расстояния
        const modIndex = 2 + distance * 3;  // Дальше = богаче тембр
        
        const attack = 2;
        const decay = 80 + distance * 40;  // Дальше = дольше звук
        
        this.playSound(carrierFreq, modRatio, modIndex, attack, decay);
    }
}

// Экспорт для использования в других файлах
// Если используете ES6 модули:
// export default FMSynthesizer;

// Если используете в браузере напрямую, синтезатор доступен глобально
if (typeof window !== 'undefined') {
    window.FMSynthesizer = FMSynthesizer;
}