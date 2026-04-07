import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTimeZone } from "next-intl/server";
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
        <html lang={locale} className={notoSans.variable} data-scroll-behavior="smooth">
            <body className="antialiased font-sans">
                <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
                    {children}
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
