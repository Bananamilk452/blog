import Image from "next/image";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="bg-accent flex shadow-lg">
      <div className="mx-auto w-full px-4 py-4 sm:w-1/2 sm:px-8">
        <Logo />
      </div>
    </nav>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-4 select-none">
      {/* <Image
        src="/logo.jpg"
        alt="Logo"
        width={128}
        height={128}
        className="size-8 rounded-full sm:size-16"
      /> */}
      <Link
        href="/"
        className="cursor-pointer font-mono text-2xl font-semibold sm:text-3xl"
      >
        &lt;seoa.dev /&gt;
      </Link>
    </div>
  );
}
