import { cn } from "~/lib/utils";

export function AuthContainer({
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-6 p-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
