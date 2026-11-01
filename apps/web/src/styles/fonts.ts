import { Inter, Space_Grotesk } from "next/font/google";

export const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

export const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans-face",
  display: "swap",
});

export const fontVariables = `${displayFont.variable} ${sansFont.variable}`;
