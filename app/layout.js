import './globals.css'; // <--- THIS WAS LIKELY MISSING OR BROKEN
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Orca AI | Production',
  description: 'Production Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}