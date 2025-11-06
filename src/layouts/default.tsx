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
      <main className={cn("mx-auto w-full p-8 sm:w-2/3 md:w-1/2", className)}>
        {children}
      </main>
    </>
  );
}
