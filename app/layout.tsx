import type { Metadata, Viewport } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import MessageConfig from "./message-config";
import Providers from "./providers";
import "./globals.css";

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
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
        className="antialiased"
      >
        <AntdRegistry>
          <Providers>
            <MessageConfig />
            {children}
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
