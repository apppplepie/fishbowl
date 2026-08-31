import type { Metadata, Viewport } from "next";
import MessageConfig from "./message-config";
import Providers from "./providers";
import { theme } from "./config/theme";
import "./globals.css";
import { AppThemeProvider } from "./contexts/AppThemeContext";
import { AppThemeBody } from "@/app/components/AppThemeBody";
import GlobalLayout from "./components/GlobalLayout";
import { MessageContainer, ConfirmModalProvider } from "@/app/components/ui";

export const metadata: Metadata = {
  title: "Fishbowl",
  description: "v1.0",
};

// 禁止移动端缩放
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <AppThemeProvider>
        <AppThemeBody>
          <Providers>
            <MessageConfig />
            <ConfirmModalProvider>
              <MessageContainer />
              <GlobalLayout>
                {children}
              </GlobalLayout>
            </ConfirmModalProvider>
          </Providers>
        </AppThemeBody>
      </AppThemeProvider>
    </html>
  );
}
