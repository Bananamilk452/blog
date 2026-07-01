import { GoToDashboard } from "./GoToDashboard";
import { SocialIcon } from "./SocialIcon";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="px-2 pb-8 sm:px-4">
      <div className="shadow(--shadow) relative mx-auto w-[min(1120px,calc(100%_-_2rem))] rounded-3xl border-2 border-(--line) bg-(--paper)/90 px-6 py-6 text-center before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-(--accent-paper)/20 max-[900px]:w-[calc(100%_-_1rem)]">
        <div className="relative z-10 mb-4 flex flex-wrap justify-center gap-3">
          <SocialIcon name="twitter" label="Twitter" href="https://x.com/lemon_gr_/" />
          <SocialIcon name="bluesky" label="Bluesky" href="https://bsky.app/profile/seoa.dev" />
          <SocialIcon name="misskey" label="Misskey" href="https://serafuku.moe/@starterdroid" />
          <SocialIcon
            name="github"
            label="GitHub"
            href="https://github.com/Bananamilk452/blog-astro"
          />
        </div>
        <p className="relative z-10 m-0">Copyright &copy; {year} 윤서아. All rights reserved.</p>
        <GoToDashboard />
      </div>
    </footer>
  );
}
