import "./globals.css";

export const metadata = {
  title: "PrintForge — Custom print, made personal",
  description: "A modern web-to-print platform for configured production work.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
