import { Navbar } from "~/components/Navbar";

export function DefaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full p-8 sm:w-2/3">{children}</main>
    </>
  );
}
