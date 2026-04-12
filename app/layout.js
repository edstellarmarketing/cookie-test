import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TrackingScript from "@/components/TrackingScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Training Courses",
  description: "Explore our professional training courses",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="bg-gray-900 text-white px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold">TrainingHub</a>
            <div className="flex gap-6 text-sm">
              <a href="/" className="hover:text-blue-400">Courses</a>
              <a href="/cart" className="hover:text-blue-400">Cart</a>
              <a href="/admin/login" className="hover:text-blue-400">Admin</a>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <TrackingScript />
      </body>
    </html>
  );
}
