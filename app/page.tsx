'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, X } from 'lucide-react';

export default function Home() {
  const [status, setStatus] = useState('click to talk');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hfSpaceUrl, setHfSpaceUrl] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Загружаем сохраненную ссылку на пространство HF из памяти телефона
  useEffect(() => {
    const savedUrl = localStorage.getItem('hf_space_url') || '';
    setHfSpaceUrl(savedUrl);
    
    // Подключаем красивый рукописный шрифт из Google Fonts
    const link = document.createElement('link');
    link.href = 'https://googleapis.com';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Настраиваем распознавание речи (STT) прямо в браузере
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'ru-RU';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setStatus("i'm listening");
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          await handleVoiceInput(text);
        } else {
          setStatus('click to talk');
        }
      };

      rec.onerror = (e: any) => {
        console.error(e);
        setStatus('click to talk');
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Основная логика: отправка текста в Gemini и получение аудио от TTS
  const handleVoiceInput = async (userText: string) => {
    try {
      setStatus("i'm thinking");

      // 1. Запрос к Gemini
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      const chatData = await chatRes.json();
      
      if (chatData.error) throw new Error(chatData.error);

      // 2. Запрос к Hugging Face TTS для озвучки
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chatData.reply, spaceUrl: hfSpaceUrl }),
      });

      if (!ttsRes.ok) throw new Error('Ошибка генерации голоса');

      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // 3. Воспроизведение звука
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        setStatus("i'm speaking");
        audioRef.current.play();
        audioRef.current.onended = () => {
          setStatus('click to talk');
        };
      }

    } catch (error) {
      console.error(error);
      setStatus('ошибка, попробуй еще раз');
      setTimeout(() => setStatus('click to talk'), 3000);
    }
  };

  const toggleSpeech = () => {
    if (status === "i'm speaking" && audioRef.current) {
      audioRef.current.pause();
      setStatus('click to talk');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        alert('Голосовой ввод не поддерживается вашим браузером. Попробуйте Chrome на Android.');
        return;
      }
      recognitionRef.current.start();
    }
  };

  const saveSettings = (url: string) => {
    localStorage.setItem('hf_space_url', url);
    setHfSpaceUrl(url);
    setIsSettingsOpen(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white text-black p-4 relative overflow-hidden select-none">
      <audio ref={audioRef} className="hidden" />

      {/* Кнопка настроек в углу */}
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-6 right-6 text-neutral-400 hover:text-black transition-colors"
      >
        <Settings size={24} />
      </button>

      {/* Центральный интерактивный элемент (Сфера Pi) */}
      <div className="flex flex-col items-center justify-center gap-12 cursor-pointer" onClick={toggleSpeech}>
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Пульсирующая анимированная тень/аура сферы */}
          <div className={`absolute inset-0 rounded-full bg-neutral-100 blur-xl transition-all duration-1000 ${
            status === "i'm listening" ? 'scale-125 bg-red-50' : 
            status === "i'm thinking" ? 'scale-110 bg-neutral-200' : 
            status === "i'm speaking" ? 'scale-115 bg-neutral-100 animate-pulse' : 'scale-100'
          }`} />
          
          {/* Сама футуристичная сфера */}
          <div className={`w-56 h-56 rounded-full bg-gradient-to-tr from-black via-neutral-800 to-neutral-500 shadow-2xl transition-all duration-500 ${
            status === "i'm listening" ? 'scale-95 border-4 border-neutral-900' : 'scale-100'
          }`} />
        </div>

        {/* Динамический статус-бар красивым рукописным шрифтом */}
        <h1 
          className="text-3xl font-medium tracking-wide text-neutral-600 lowercase transition-all duration-300"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          {status}
        </h1>
      </div>

      {/* Модальное окно настроек */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-neutral-100 shadow-xl relative">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-4 text-neutral-800">Голосовой движок (TTS)</h2>
            <p className="text-xs text-neutral-500 mb-4">
              По умолчанию используется русская модель Bark. Если она отключится, вставьте сюда ссылку на любое другое пространство Hugging Face.
            </p>
            <input 
              type="text" 
              placeholder="Например: suno/bark"
              value={hfSpaceUrl}
              onChange={(e) => setHfSpaceUrl(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black mb-4"
            />
            <button 
              onClick={() => saveSettings(hfSpaceUrl)}
              className="w-full bg-black text-white py-2 rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Сохранить настройки
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

