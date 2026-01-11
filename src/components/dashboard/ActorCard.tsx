import Image from "next/image";

import { getMainActor } from "~/lib/actions/actor";

export function ActorCard({
  actor,
}: {
  actor: Awaited<ReturnType<typeof getMainActor>>["actor"];
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col overflow-hidden rounded-lg">
      <div className="h-36">
        {actor.banner?.url ? (
          <Image
            src={actor.banner.url}
            alt="Banner"
            width={640}
            height={144}
            className="h-36 w-full object-cover"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-gray-400">
            <span className="text-sm text-gray-600">배너 없음</span>
          </div>
        )}
      </div>

      <div className="relative flex flex-col bg-gray-100">
        <div className="absolute -translate-y-1/2 p-4">
          {actor.avatar?.url ? (
            <Image
              src={actor.avatar.url}
              alt="Avatar"
              width={96}
              height={96}
              className="mb-4 size-24 rounded-full"
            />
          ) : (
            <div className="mb-4 flex size-24 items-center justify-center rounded-full bg-gray-300">
              <span className="text-sm text-gray-600">아바타 없음</span>
            </div>
          )}
        </div>

        <div className="mt-8 p-4">
          <h2 className="text-2xl font-bold text-black">{actor.name}</h2>
          <p className="text-sm text-gray-600">@{actor.username}</p>

          <p
            className="mt-2 text-sm whitespace-pre-wrap text-gray-800"
            dangerouslySetInnerHTML={{
              __html: actor.summary ?? "자기소개 없음",
            }}
          />
        </div>
      </div>
    </div>
  );
}
