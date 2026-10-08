import './globals.css';
import { Inter } from 'next/font/google';
import { SidebarProvider } from './context/SidebarContext';
import ToastProvider from './components/ToastProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Production Portal',
  description: 'Orca AI Vendor System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#f5f7fb] text-[#0c1f4b] antialiased`}>
        <SidebarProvider>
          {children}
          <ToastProvider />
        </SidebarProvider>
      </body>
    </html>
  );
}