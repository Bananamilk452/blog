import Image from "next/image";

import { getMainActor } from "~/lib/actions/actor";

export function ActorCard({ actor }: { actor: Awaited<ReturnType<typeof getMainActor>>["actor"] }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-[#d8d0c5] bg-[#fffdf5] shadow-[var(--shadow)]">
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
          <div className="flex h-36 w-full items-center justify-center bg-[#e6d6bf]">
            <span className="text-sm text-[#655648]">배너 없음</span>
          </div>
        )}
      </div>

      <div className="relative flex flex-col bg-[#fffdf5]">
        <div className="absolute -translate-y-1/2 p-4">
          {actor.avatar?.url ? (
            <Image
              src={actor.avatar.url}
              alt="Avatar"
              width={96}
              height={96}
              className="mb-4 size-24 rounded-full border-4 border-[#fff7cc]/95 object-cover"
            />
          ) : (
            <div className="mb-4 flex size-24 items-center justify-center rounded-full border-4 border-[#fff7cc]/95 bg-[#e6d6bf]">
              <span className="text-sm text-[#655648]">아바타 없음</span>
            </div>
          )}
        </div>

        <div className="mt-8 p-4">
          <h2 className="text-2xl font-bold text-[#40342b]">{actor.name}</h2>
          <p className="text-sm text-[#655648]">@{actor.username}</p>

          <p
            className="mt-2 text-sm whitespace-pre-wrap text-[#40342b]"
            dangerouslySetInnerHTML={{
              __html: actor.summary ?? "자기소개 없음",
            }}
          />
        </div>
      </div>
    </div>
  );
}
