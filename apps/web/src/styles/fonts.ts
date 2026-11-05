import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

export const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-face",
  axes: ["opsz"],
  display: "swap",
});

export const sansFont = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans-face",
  display: "swap",
});

export const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-face",
  display: "swap",
});

export const fontVariables = `${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`;
