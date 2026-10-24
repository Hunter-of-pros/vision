/**
 * Industrial Acoustic Alarm Sound Engine
 * Dual-pipeline architecture:
 * 1. Web Audio API (Multi-harmonic piercing industrial alarm buzzer)
 * 2. HTML5 Audio fallback (Embedded Base64 PCM WAV)
 * Automatically unlocks on first user interaction to bypass browser autoplay policies.
 */

const BEEP_WAV_BASE64 =
  'data:audio/wav;base64,UklGRhQLAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YfAKAACAzPLfnUwVFEmZ3fLPhDcOH2Cx6u27aiUNL3nG8eOkUhgSQpLZ89SLPBAbWarm78FyKg0qcsHv5qpZGxA8i9Tz2ZJCEhhSpOPxxnkvDSVqu+3qsWAfDjeEz/LdmUkUFUyd3/LMgDQOIWO06+y3ZyMOMXzJ8uGgTxYTRZbb89GHOg8dXK7o7r5uJw0sdcTw5adWGhE/jtbz1o4/ERpWp+XwxHUsDSduvu7orlwdDzqH0fPblkUTFk+g4fLJfDEOI2e37Ou0YyEONIDM8t+dTBUUSZnd8s+ENw4fYLHq7btqJQ0vecbx46RSGBJCktnz1Is8EBtZqubvwXIqDSpywe/mqlkbEDyL1PPZkkISGFKk4/HGeS8NJWq77eqxYB8ON4TP8t2ZSRQVTJ3f8syANA4hY7Tr7LdnIw4xfMny4aBPFhNFltvz0Yc6Dx1crujuvm4nDSx1xPDlp1YaET+O1vPWjj8RGlan5fDEdSwNJ26+7uiuXB0POofR89uWRRMWT6Dh8sl8MQ4jZ7fs67RjIQ40gMzy351MFRRJmd3yz4Q3Dh9gsertu2olDS95xvHjpFIYEkKS2fPUizwQG1mq5u/BcioNKnLB7+aqWRsQPIvU89mSQhIYUqTj8cZ5Lw0larvt6rFgHw43hM/y3ZlJFBVMnd/yzIA0DiFjtOvst2cjDjF8yfLhoE8WgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggODqli8PVMDzwFQPL5bq4IAgFmrR8axADUCs8dFqFiCA4OqWLw9UwPPAVA8vlurggCAWatHxrEANQKzx0WoWIIDg6pYvD1TA88BUDy+W6uCAIBZq0fGsQA1ArPHRahYggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

let globalAudioCtx = null;
let isAudioGloballyUnlocked = false;

export function unlockAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioCtx();
    }

    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }

    // Play micro silent buffer to satisfy mobile / desktop autoplay heuristics
    const buffer = globalAudioCtx.createBuffer(1, 1, 22050);
    const source = globalAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(globalAudioCtx.destination);
    source.start(0);

    isAudioGloballyUnlocked = true;
  } catch (err) {
    console.warn('[Vision Sound] Audio unlock warning:', err);
  }
}

// Attach global unlock listeners on first interaction
if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    unlockAudioContext();
  };
  window.addEventListener('pointerdown', handleInteraction, { once: true, passive: true });
  window.addEventListener('click', handleInteraction, { once: true, passive: true });
  window.addEventListener('keydown', handleInteraction, { once: true, passive: true });
}

function playHtmlFallbackSound() {
  try {
    const audio = new Audio(BEEP_WAV_BASE64);
    audio.volume = 0.75;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((e) => console.warn('[Vision Sound] HTML5 Audio fallback failed:', e));
    }
  } catch (err) {
    console.warn('[Vision Sound] HTML5 Audio fallback error:', err);
  }
}

/**
 * Plays a loud, piercing, unmistakable 4-burst industrial alarm tone.
 * High urgency frequencies: 880Hz -> 1180Hz -> 880Hz -> 1180Hz
 */
export function playAnomalyAlarm() {
  try {
    unlockAudioContext();
    const ctx = globalAudioCtx;

    if (!ctx) {
      playHtmlFallbackSound();
      return;
    }

    const runSynthesis = () => {
      // Schedule slightly in future to prevent past-time execution glitch
      const start = ctx.currentTime + 0.04;

      const triggerBurst = (freq, offset, duration, volume = 0.45) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Sawtooth wave filtered provides loud, piercing industrial buzzer tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start + offset);

        // Lowpass filter to smooth harshness into clean industrial horn sound
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2800, start + offset);

        gain.gain.setValueAtTime(0.0001, start + offset);
        gain.gain.linearRampToValueAtTime(volume, start + offset + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start + offset);
        osc.stop(start + offset + duration + 0.01);
      };

      // 4 Rapid Industrial Warning Pulses
      triggerBurst(880, 0.00, 0.11, 0.45);   // Pulse 1
      triggerBurst(1180, 0.14, 0.13, 0.50);  // Pulse 2 (higher urgency)
      triggerBurst(880, 0.30, 0.11, 0.45);   // Pulse 3
      triggerBurst(1180, 0.44, 0.16, 0.50);  // Pulse 4
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => runSynthesis()).catch(() => playHtmlFallbackSound());
    } else {
      runSynthesis();
    }
  } catch (err) {
    console.warn('[Vision Sound] Web Audio synthesis error, falling back:', err);
    playHtmlFallbackSound();
  }
}
