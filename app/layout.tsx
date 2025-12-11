import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Электронный журнал",
  description: "Электронный журнал для студентов и преподавателей",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <div className="flex-1">
          {children}
        </div>
        <footer className="py-4 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <a
              href="https://npm-portfolio-eta.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-semibold bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(to right, #C87070, #EE619A)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              meowhiks
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
