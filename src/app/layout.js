import "./globals.css";

export const metadata = {
  title: "Production Portal",
  description: "Vendor Management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}