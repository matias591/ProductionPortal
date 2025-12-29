import './globals.css';
import { Inter } from 'next/font/google';
import { SidebarProvider } from './context/SidebarContext'; // <--- Import this

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Production Portal',
  description: 'Orca AI Vendor System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        {/* WRAP CHILDREN IN PROVIDER */}
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </body>
    </html>
  );
}