import Image from "next/image";

import { Image as ImageType, User } from "~/generated/prisma";

type UserWithAvatar = User & { avatar: ImageType | null };

export function UserCard({ user }: { user: UserWithAvatar }) {
  return (
    <div className="shadow(--shadow-soft) mx-auto flex w-fit items-center gap-3 rounded-3xl border-2 border-(--line) bg-(--paper) p-4">
      {user.avatar?.url ? (
        <Image
          src={user.avatar.url}
          alt="Avatar"
          width={96}
          height={96}
          className="size-18 rounded-full border-4 border-(--paper-note)/95 object-cover"
        />
      ) : (
        <div className="flex size-18 items-center justify-center rounded-full border-4 border-(--paper-note)/95 bg-(--accent-muted)">
          <span className="text-sm text-(--ink-soft)">아바타 없음</span>
        </div>
      )}
      <div className="flex flex-col">
        <h2 className="text-lg font-bold text-(--ink)">{user.name}</h2>
        <p className="text-sm text-(--ink-soft)">@{user.username}</p>
      </div>
    </div>
  );
}
