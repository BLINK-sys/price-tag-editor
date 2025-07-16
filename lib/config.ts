export interface LogoConfig {
  size: number;
  verticalPosition: number;
}

export const defaultLogoConfig: LogoConfig = {
  size: 100,
  verticalPosition: 0,
};

// Функция для загрузки конфигурации из файла
export const loadLogoConfig = async (): Promise<LogoConfig> => {
  try {
    const response = await fetch('/config/logo-settings.json');
    if (response.ok) {
      const config = await response.json();
      return { ...defaultLogoConfig, ...config };
    }
    return defaultLogoConfig;
  } catch (error) {
    console.error('Ошибка загрузки конфигурации логотипа:', error);
    return defaultLogoConfig;
  }
};

// Функция для сохранения конфигурации в файл
export const saveLogoConfig = async (config: LogoConfig): Promise<void> => {
  try {
    // В Next.js для сохранения файлов на сервере нужно использовать API route
    const response = await fetch('/api/save-logo-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error('Ошибка сохранения конфигурации');
    }
  } catch (error) {
    console.error('Ошибка сохранения конфигурации логотипа:', error);
  }
}; 