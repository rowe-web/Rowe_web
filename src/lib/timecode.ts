/** Timecode de cine a 25 fps: HH:MM:SS:FF */
export const FPS = 25;

/** Píxeles de scroll por fotograma (diseño: 1 fotograma cada 3 px). */
export const PX_PER_FRAME = 3;

const p2 = (n: number) => String(n).padStart(2, "0");

export function formatTimecode(totalFrames: number): string {
  const f = Math.max(0, Math.floor(totalFrames));
  const frames = f % FPS;
  const seconds = Math.floor(f / FPS) % 60;
  const minutes = Math.floor(f / (FPS * 60)) % 60;
  const hours = Math.floor(f / (FPS * 3600));
  return `${p2(hours)}:${p2(minutes)}:${p2(seconds)}:${p2(frames)}`;
}

export function timecodeFromScroll(scrollY: number): string {
  return formatTimecode(Math.round(scrollY / PX_PER_FRAME));
}
