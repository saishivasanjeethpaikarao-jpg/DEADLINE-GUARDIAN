/**
 * Browser-based synthesizer sound effects for Deadline Guardian
 */

// Simple upbeat double chime: C5 (523.25 Hz) then G5 (783.99 Hz) for completion/success
export const playSuccessChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const now = ctx.currentTime;
    
    // First note (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);
    
    // Second note (G5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0.0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (error) {
    console.warn("Audio success feedback failed:", error);
  }
};

// Gentle retro pulse tone for alarm ring/approaching deadline alert
export const playAlarmTriggerChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const now = ctx.currentTime;
    
    // Dual pulse alarm chime (A4 - 440Hz, then C#5 - 554.37Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(440, now);
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.linearRampToValueAtTime(0.001, now + 0.15);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);
    
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(554.37, now + 0.2);
    gain2.gain.setValueAtTime(0.1, now + 0.2);
    gain2.gain.linearRampToValueAtTime(0.001, now + 0.35);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.4);
  } catch (error) {
    console.warn("Alarm trigger chime failed:", error);
  }
};

// ==================== AMBIENT AUDIO FOCUS HUM ====================
let ambientFocusOscillator: any = null;
let ambientFocusGain: any = null;
let ambientAudioCtx: any = null;

export const playAmbientFocusHum = () => {
  try {
    if (ambientFocusOscillator) return; // already playing

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    ambientAudioCtx = new AudioContextClass();
    const now = ambientAudioCtx.currentTime;

    ambientFocusOscillator = ambientAudioCtx.createOscillator();
    ambientFocusGain = ambientAudioCtx.createGain();
    
    ambientFocusOscillator.type = 'sine';
    ambientFocusOscillator.frequency.setValueAtTime(110.00, now); // A2 deep warm focus note
    
    const filter = ambientAudioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);

    ambientFocusGain.gain.setValueAtTime(0.0, now);
    ambientFocusGain.gain.linearRampToValueAtTime(0.35, now + 1.0); // smooth 1-second fade-in

    ambientFocusOscillator.connect(filter);
    filter.connect(ambientFocusGain);
    ambientFocusGain.connect(ambientAudioCtx.destination);
    
    ambientFocusOscillator.start(now);
  } catch (error) {
    console.warn("Ambient focus hum failed to initiate:", error);
  }
};

export const stopAmbientFocusHum = () => {
  try {
    if (ambientFocusOscillator && ambientFocusGain && ambientAudioCtx) {
      const now = ambientAudioCtx.currentTime;
      ambientFocusGain.gain.cancelScheduledValues(now);
      ambientFocusGain.gain.setValueAtTime(ambientFocusGain.gain.value, now);
      ambientFocusGain.gain.linearRampToValueAtTime(0.0, now + 0.5); // smooth fade-out
      
      const osc = ambientFocusOscillator;
      const ctx = ambientAudioCtx;
      setTimeout(() => {
        try {
          osc.stop();
          ctx.close();
        } catch (e) {}
      }, 600);

      ambientFocusOscillator = null;
      ambientFocusGain = null;
      ambientAudioCtx = null;
    }
  } catch (e) {
    console.warn("Stop ambient focus failed:", e);
  }
};

