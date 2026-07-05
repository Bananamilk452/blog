import { Skeleton } from "~/components/ui/skeleton";
import { DefaultLayout } from "~/layouts/default";

export default function HomeLoading() {
  return (
    <DefaultLayout>
      <HomeLoadingContent />
    </DefaultLayout>
  );
}

export function HomeLoadingContent() {
  return (
    <>
      <section className="shadow(--shadow) relative mx-auto mb-8 grid max-w-[880px] gap-4 rounded-[26px] border-2 border-(--line) bg-(--paper) p-8 before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-(--accent-paper)/20 max-[900px]:p-5">
        <Skeleton className="relative z-10 h-9 w-56" />
        <Skeleton className="relative z-10 h-5 w-full max-w-[36rem]" />
        <div className="relative z-10 flex gap-2.5">
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full" />
        </div>
      </section>

      <section className="mt-10">
        <div className="mx-auto mb-4 max-w-[880px] px-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-2 h-5 w-48" />
        </div>

        <ul className="mx-auto grid max-w-[1000px] list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <li key={index}>
              <div className="shadow(--shadow) relative grid gap-4 rounded-3xl border-2 border-(--line) bg-(--paper) p-5 before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-(--accent-paper)/20 odd:-rotate-[0.6deg] even:rotate-[0.6deg]">
                <Skeleton className="shadow(--shadow-soft) relative z-10 aspect-[16/10] rounded-2xl" />
                <div className="relative z-10 grid gap-3">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
