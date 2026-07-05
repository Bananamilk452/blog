import { Skeleton } from "~/components/ui/skeleton";

export default function PostLoading() {
  return (
    <div className="relative min-h-screen">
      <article className="mx-auto grid w-[min(860px,100%)] gap-5">
        <div className="shadow(--shadow) relative min-h-[300px] overflow-hidden rounded-[28px] bg-(--paper)/95 sm:min-h-[420px]" />

        <section className="shadow(--shadow) relative rounded-[30px] border-2 border-(--line) bg-(--paper)/95 p-8 before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-(--accent-paper)/20 max-[900px]:p-5">
          <div className="relative z-10 grid gap-5">
            <Skeleton className="h-9 w-2/3" />
            <div className="flex items-center gap-4 border-t-2 border-dashed border-(--line) pt-5">
              <Skeleton className="size-17 rounded-full" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
        </section>

        <section className="shadow(--shadow) relative rounded-[30px] border-2 border-(--line) bg-(--paper)/95 p-8 before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-(--accent-paper)/20 max-[900px]:p-5">
          <div className="relative z-10 grid gap-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-10/12" />
            <Skeleton className="mt-4 h-32 w-full rounded-[18px]" />
          </div>
        </section>

        <section className="shadow(--shadow) relative rounded-[30px] border-2 border-(--line) bg-(--paper)/95 p-8 before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-(--accent-paper)/20 max-[900px]:p-5">
          <div className="relative z-10 grid gap-4">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-16 w-full rounded-[18px]" />
            <Skeleton className="h-16 w-5/6 rounded-[18px]" />
          </div>
        </section>
      </article>
    </div>
  );
}
