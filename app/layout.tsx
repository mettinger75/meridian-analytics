import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Site-of-Service Necessity Analysis | Meridian Anesthesia",
  description:
    "Algorithmic proof that Medical City Arlington requires all 10 non-L&D anesthesia sites of service. October–December 2025 analysis.",
  openGraph: {
    title: "MCA Site-of-Service Analysis | Meridian Anesthesia",
    description:
      "Interactive analysis proving Medical City Arlington consistently needs 10+ concurrent non-L&D anesthesia sites.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
