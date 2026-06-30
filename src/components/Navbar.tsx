import Link from "next/link";

import { SocialIcon } from "./SocialIcon";

export function Navbar() {
  return (
    <header className="px-2 pt-5 sm:px-4">
      <nav className="relative mx-auto flex w-[min(1120px,calc(100%_-_2rem))] flex-wrap items-center justify-between gap-4 rounded-[28px] border-2 border-[#d8d0c5] bg-[#fffdf5]/95 px-5 py-3 shadow-[var(--shadow)] backdrop-blur-sm before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-[#a46d43]/20 max-[900px]:w-[calc(100%_-_1rem)] max-[900px]:items-start max-[900px]:px-4 max-[560px]:px-3">
        <Logo />
        <ul className="relative z-10 m-0 flex list-none flex-wrap items-center justify-center gap-2 p-0 max-[900px]:w-full max-[900px]:justify-start">
          <li>
            <SocialIcon name="twitter" label="Twitter" href="https://x.com/lemon_gr_/" />
          </li>
          <li>
            <SocialIcon name="bluesky" label="Bluesky" href="https://bsky.app/profile/seoa.dev" />
          </li>
          <li>
            <SocialIcon name="misskey" label="Misskey" href="https://serafuku.moe/@starterdroid" />
          </li>
        </ul>
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <div className="relative z-10 flex flex-col gap-1 select-none">
      <Link
        href="/"
        className="cursor-pointer text-3xl leading-none font-bold text-[#40342b] no-underline hover:text-[#40342b]"
      >
        윤서아의 블로그
      </Link>
    </div>
  );
}
