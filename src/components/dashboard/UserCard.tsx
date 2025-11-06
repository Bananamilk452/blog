import Image from "next/image";

import { Image as ImageType, User } from "~/generated/prisma";

type UserWithAvatar = User & { avatar: ImageType | null };

export function UserCard({ user }: { user: UserWithAvatar }) {
  return (
    <div className="mx-auto flex w-fit items-center gap-3 rounded-md bg-gray-200 p-4">
      {user.avatar?.url ? (
        <Image
          src={user.avatar.url}
          alt="Avatar"
          width={96}
          height={96}
          className="size-18 rounded-full"
        />
      ) : (
        <div className="flex size-18 items-center justify-center rounded-full bg-gray-300">
          <span className="text-sm text-gray-600">아바타 없음</span>
        </div>
      )}
      <div className="flex flex-col">
        <h2 className="text-lg font-bold text-black">{user.name}</h2>
        <p className="text-sm text-gray-700">@{user.username}</p>
      </div>
    </div>
  );
}
