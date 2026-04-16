'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ブラウザ型拡張（SpeechRecognition はブラウザ標準型のため any で宣言）
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseVoiceInputOptions {
  /** 認識完了時に呼ばれるコールバック（認識したテキストを渡す） */
  onResult: (text: string) => void;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  toggle: () => void;
  stop: () => void;
}

export function useVoiceInput({ onResult }: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setIsSupported(
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    );
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    if (!isSupported || typeof window === 'undefined') return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false; // 最終結果のみ取得
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      onResult(transcript);
    };

    recognition.onerror = (event: any) => {
      // ユーザーがマイクを拒否した場合など
      if (event.error !== 'aborted') {
        console.warn('SpeechRecognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, onResult]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return { isListening, isSupported, toggle, stop };
}
