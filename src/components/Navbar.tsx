import Image from "next/image";

export function Navbar() {
  return (
    <nav className="bg-accent flex shadow-lg">
      <div className="mx-auto w-full px-4 py-4 sm:w-2/3 sm:px-8">
        <Logo />
      </div>
    </nav>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-4 select-none">
      <Image
        src="/logo.jpg"
        alt="Logo"
        width={64}
        height={64}
        className="size-12 rounded-full sm:size-16"
      />
      <p className="font-mono text-2xl font-semibold sm:text-4xl">
        &lt;seoa.dev /&gt;
      </p>
    </div>
  );
}
