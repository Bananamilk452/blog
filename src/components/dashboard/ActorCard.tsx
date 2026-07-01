import Image from "next/image";

import { getMainActor } from "~/lib/actions/actor";

export function ActorCard({ actor }: { actor: Awaited<ReturnType<typeof getMainActor>>["actor"] }) {
  return (
    <div className="shadow(--shadow) mx-auto flex max-w-lg min-w-md flex-col overflow-hidden rounded-3xl border-2 border-(--line) bg-(--paper)">
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
          <div className="flex h-36 w-full items-center justify-center bg-(--accent-muted)">
            <span className="text-sm text-(--ink-soft)">배너 없음</span>
          </div>
        )}
      </div>

      <div className="relative flex flex-col bg-(--paper)">
        <div className="absolute -translate-y-1/2 p-4">
          {actor.avatar?.url ? (
            <Image
              src={actor.avatar.url}
              alt="Avatar"
              width={96}
              height={96}
              className="mb-4 size-24 rounded-full border-4 border-(--paper-note)/95 object-cover"
            />
          ) : (
            <div className="mb-4 flex size-24 items-center justify-center rounded-full border-4 border-(--paper-note)/95 bg-(--accent-muted)">
              <span className="text-sm text-(--ink-soft)">아바타 없음</span>
            </div>
          )}
        </div>

        <div className="mt-8 p-4">
          <h2 className="text-2xl font-bold text-(--ink)">{actor.name}</h2>
          <p className="text-sm text-(--ink-soft)">@{actor.username}</p>

          <p
            className="mt-2 text-sm whitespace-pre-wrap text-(--ink)"
            dangerouslySetInnerHTML={{
              __html: actor.summary ?? "자기소개 없음",
            }}
          />
        </div>
      </div>
    </div>
  );
}
