import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();
    
    // Путь к файлу конфигурации
    const configPath = join(process.cwd(), 'public', 'config', 'logo-settings.json');
    
    // Сохраняем конфигурацию в файл
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка сохранения конфигурации:', error);
    return NextResponse.json(
      { error: 'Ошибка сохранения конфигурации' },
      { status: 500 }
    );
  }
} 