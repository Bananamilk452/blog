import { Footer } from "~/components/Footer";
import { Navbar } from "~/components/Navbar";
import { cn } from "~/lib/utils";

export function DefaultLayout({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main
        className={cn(
          "mx-auto w-[min(1120px,calc(100%_-_2rem))] py-8 max-[900px]:w-[min(100%,calc(100%_-_1rem))] max-[900px]:pt-5",
          className,
        )}
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
