import { Analytics } from '@vercel/analytics/next'; 
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics /> {/* Автоматически отправляет стандартные метрики */}
      </body>
    </html>
  );
}
