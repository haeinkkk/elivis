import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTimeZone } from "next-intl/server";
import Script from "next/script";

import { AppThemeProvider } from "@/components/AppThemeProvider";
import "./globals.css";

const notoSans = Noto_Sans_KR({
    subsets: ["latin"],
    variable: "--font-noto-sans",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Elivis",
    description: "A project management app with only the things that actually matter.",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    const messages = await getMessages();
    const timeZone = await getTimeZone();

    return (
        <html
            lang={locale}
            className={notoSans.variable}
            data-scroll-behavior="smooth"
            suppressHydrationWarning
        >
            <body className="antialiased font-sans">
                <Script
                    id="elivis-dark-init"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `try{var k="elivis-dark-mode";var v=localStorage.getItem(k);document.documentElement.classList.toggle("dark",v==="1"||v==="true");}catch(e){}`,
                    }}
                />
                <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
                    <AppThemeProvider>{children}</AppThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
