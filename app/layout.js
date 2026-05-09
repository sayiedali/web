import { Montserrat } from "next/font/google";
import "./globals.css";
import Providers from "./_components/_provider/Provider";

const mon = Montserrat({ subsets: ["latin"] });

export const metadata = {
  title: "Jomaa's Pizza & Donair Admin Panel ",
  description: "This is the admin panel of Jomaa's Pizza & Donair",
  icons: {
    icon: "https://i.postimg.cc/rwnxStLC/fav.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={mon.className} suppressHydrationWarning={true}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
