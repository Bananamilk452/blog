import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "~/lib/utils";

import type { VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-(--accent-strong) bg-(--paper-note) text-sm font-medium whitespace-nowrap text-(--ink) shadow-[3px_4px_0_rgba(129,82,50,0.28)] transition-all outline-none hover:-translate-y-0.5 hover:shadow-[4px_6px_0_rgba(129,82,50,0.22)] focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-(--paper-note) text-(--ink) hover:bg-(--paper-note)",
        destructive:
          "border-destructive bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 text-white",
        outline: "border-(--accent-strong) bg-(--paper) text-(--ink) hover:bg-(--paper-note)",
        secondary: "border-(--line) bg-(--paper) text-(--ink-soft) hover:bg-(--paper-note)",
        ghost:
          "border-transparent bg-transparent shadow-none hover:bg-(--accent-paper)/10 hover:shadow-none",
        link: "border-transparent bg-transparent text-(--accent-strong) underline-offset-4 shadow-none hover:translate-y-0 hover:underline hover:shadow-none",
        white: "bg-(--paper) text-(--ink) hover:bg-(--paper-note)",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
