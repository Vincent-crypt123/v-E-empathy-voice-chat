import { GoogleGenAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    // Получаем ключ из переменных окружения Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Ключ GEMINI_API_KEY не настроен' }, { status: 500 });
    }

    // Инициализируем актуальный SDK, который знает про ключи 'AQ.'
    const ai = new GoogleGenAI({ apiKey });
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Задаем характер эмпатичного Pi AI
    const systemPrompt = `Ты — эмпатичный, невероятно теплый, поддерживающий и мудрый личный ассистент на русском языке, как ИИ Pi. 
    Твоя цель — выслушать пользователя, проявить глубокое понимание его чувств и дать поддерживающий ответ.
    ОТВЕЧАЙ СТРОГО КОРОТКО (1-3 простых предложения). Не используй списки, маркеры и сложные знаки препинания. 
    Твой ответ будет озвучен голосом, поэтому пиши так, чтобы текст звучал максимально естественно при чтении вслух.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 150,
        temperature: 0.7,
      }
    });

    const reply = result.response.text();
    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error('Ошибка Gemini:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера Gemini' }, { status: 500 });
  }
}
