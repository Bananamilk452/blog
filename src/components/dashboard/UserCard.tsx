import Image from "next/image";

import { Image as ImageType, User } from "~/generated/prisma";

type UserWithAvatar = User & { avatar: ImageType | null };

export function UserCard({ user }: { user: UserWithAvatar }) {
  return (
    <div className="mx-auto flex w-fit items-center gap-3 rounded-3xl border-2 border-[#d8d0c5] bg-[#fffdf5] p-4 shadow-[var(--shadow-soft)]">
      {user.avatar?.url ? (
        <Image
          src={user.avatar.url}
          alt="Avatar"
          width={96}
          height={96}
          className="size-18 rounded-full border-4 border-[#fff7cc]/95 object-cover"
        />
      ) : (
        <div className="flex size-18 items-center justify-center rounded-full border-4 border-[#fff7cc]/95 bg-[#e6d6bf]">
          <span className="text-sm text-[#655648]">아바타 없음</span>
        </div>
      )}
      <div className="flex flex-col">
        <h2 className="text-lg font-bold text-[#40342b]">{user.name}</h2>
        <p className="text-sm text-[#655648]">@{user.username}</p>
      </div>
    </div>
  );
}
