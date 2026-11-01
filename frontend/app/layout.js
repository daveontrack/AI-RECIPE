import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import LogoMark from "@/components/LogoMark";
import { neobrutalism } from "@clerk/themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "davecookai",
  description: "",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: neobrutalism,
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/logo.png" sizes="any" />
        </head>
        <body className={`${inter.className}`}>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Toaster richColors />

          {/* Footer */}
          <footer className="py-8 px-4 border-t">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <LogoMark className="h-7 w-7 text-stone-900" />
                <span className="text-2xl font-bold tracking-tight text-stone-900">
                  davecookai
                </span>
              </div>
              <p className="text-stone-500 text-sm">
                Made with 💗 by dawit beriso
              </p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
