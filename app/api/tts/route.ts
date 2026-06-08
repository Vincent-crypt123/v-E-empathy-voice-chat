import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, spaceUrl } = await req.json();
    const hfToken = process.env.HF_TOKEN;

    if (!text) {
      return NextResponse.json({ error: 'Нет текста для озвучки' }, { status: 400 });
    }

    // По умолчанию используем качественную и стабильную модель русского языка Bark от Suno
    // Если пользователь передал свою ссылку на пространство HF из настроек — используем её
    const targetModel = spaceUrl && spaceUrl.trim() !== '' 
      ? spaceUrl 
      : 'https://huggingface.co';

    const response = await fetch(targetModel, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        // Для модели Bark передаем пресет чистого русского голоса без акцента
        parameters: { voice_preset: 'v2/ru_speaker_6' } 
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ошибка Hugging Face: ${errText}`);
    }

    // Получаем аудио в виде бинарных данных
    const audioBuffer = await response.arrayBuffer();
    
    // Возвращаем аудио-файл обратно на фронтенд
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error: any) {
    console.error('Ошибка TTS:', error);
    return NextResponse.json({ error: error.message || 'Ошибка генерации голоса' }, { status: 500 });
  }
}

