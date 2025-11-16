export const playCopySound = () => {
  try {
    const audioContext = new (window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- window.webkitAudioContext is not typed
      (window as any).webkitAudioContext)();
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);

    const notes = [
      { freq: 523.25, start: 0, duration: 0.1 },
      { freq: 659.25, start: 0.05, duration: 0.1 },
      { freq: 783.99, start: 0.1, duration: 0.15 },
    ];

    notes.forEach((note) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(masterGain);

      oscillator.frequency.value = note.freq;
      oscillator.type = "triangle";

      const startTime = audioContext.currentTime + note.start;
      const peakTime = startTime + 0.01;
      const endTime = startTime + note.duration;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, peakTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  } catch {}
};
