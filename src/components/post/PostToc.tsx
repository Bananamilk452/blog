export type TocHeading = {
  depth: number;
  slug: string;
  text: string;
};

export function PostToc({ headings }: { headings: TocHeading[] }) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <aside className="fixed top-[8.6rem] left-[1.4rem] hidden w-[190px] rounded-[22px] bg-[#fffdf5]/90 p-3.5 shadow-[var(--shadow-soft)] min-xl:block">
      <p className="muted m-0 mb-3">목차</p>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {headings.map((heading) => (
          <li
            key={heading.slug}
            className="text-sm leading-snug"
            style={{ paddingLeft: `${(heading.depth - 1) * 16}px` }}
          >
            <a
              className="muted no-underline hover:text-[#815232] hover:underline"
              href={`#${heading.slug}`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
