"use client";

/**
 * Sonido ambiente (easter egg de la tecla R).
 * Con un audio subido en el panel (brand.ambient_audio_media_id) se reproduce ese fichero.
 * Sin audio: «placeholder» sintetizado con Web Audio — zumbido de proyector (ruido marrón
 * filtrado) a volumen muy bajo, con fundido de entrada y salida. Sin descargas.
 */
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
let fileAudio: HTMLAudioElement | null = null;
let on = false;

function brownNoise(context: AudioContext, seconds = 4): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  return buffer;
}

export function isAmbientOn() {
  return on;
}

export async function toggleAmbient(fileUrl?: string | null): Promise<boolean> {
  on = !on;
  if (fileUrl) {
    fileAudio ??= Object.assign(new Audio(fileUrl), { loop: true, volume: 0.35 });
    if (on) await fileAudio.play().catch(() => (on = false));
    else fileAudio.pause();
    return on;
  }

  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return (on = false);
  ctx ??= new AC();
  if (ctx.state === "suspended") await ctx.resume();

  if (on) {
    gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    source = ctx.createBufferSource();
    source.buffer = brownNoise(ctx);
    source.loop = true;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 1.2);
  } else if (gain && source) {
    const s = source;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    setTimeout(() => s.stop(), 700);
    source = null;
  }
  return on;
}
