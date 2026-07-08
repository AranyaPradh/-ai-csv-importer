import "./globals.css";

export const metadata = {
  title: "AI CSV Importer",
  description: "Import messy CSV leads into GrowEasy CRM format",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
