import { createSignal, onCleanup, type Accessor } from "solid-js";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface UseSpeechRecognitionOptions {
  onTranscript: (transcript: string) => void;
  getCurrentValue: () => string;
}

interface UseSpeechRecognitionReturn {
  isListening: Accessor<boolean>;
  isSupported: Accessor<boolean>;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions,
): UseSpeechRecognitionReturn => {
  let speechRecognition: SpeechRecognition | undefined;

  const [isListening, setIsListening] = createSignal(false);

  const isSupported = () =>
    typeof window !== "undefined" &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

  const start = () => {
    if (!isSupported()) return;

    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) return;

    speechRecognition = new SpeechRecognitionConstructor();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = navigator.language || "en-US";

    let lastInterimText = "";
    let lastValueWeSet = "";

    speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
      const currentValue = options.getCurrentValue();

      let baseValue: string;
      if (lastInterimText && currentValue.endsWith(lastInterimText)) {
        baseValue = currentValue.slice(0, -lastInterimText.length);
      } else if (currentValue === lastValueWeSet && lastInterimText) {
        baseValue = currentValue.slice(0, -lastInterimText.length);
      } else {
        baseValue = currentValue;
      }

      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      lastInterimText = interimText;
      const newValue = baseValue + finalText + interimText;
      lastValueWeSet = newValue;
      options.onTranscript(newValue);
    };

    speechRecognition.onerror = () => {
      setIsListening(false);
    };

    speechRecognition.onend = () => {
      setIsListening(false);
    };

    speechRecognition.start();
    setIsListening(true);
  };

  const stop = () => {
    if (speechRecognition) {
      speechRecognition.stop();
      speechRecognition = undefined;
    }
    setIsListening(false);
  };

  const toggle = () => {
    if (isListening()) {
      stop();
    } else {
      start();
    }
  };

  onCleanup(() => {
    stop();
  });

  return {
    isListening,
    isSupported,
    start,
    stop,
    toggle,
  };
};
