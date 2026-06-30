import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "~/lib/utils";

import type { VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive handwritten inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#a46d43]/10 text-[#655648] [a&]:hover:bg-[#a46d43]/15",
        secondary:
          "border-transparent bg-[#fff7cc] text-[#40342b] [a&]:hover:bg-[#fff7cc]",
        destructive:
          "bg-destructive [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 border-transparent text-white",
        outline: "border-[#d8d0c5] text-[#40342b] [a&]:hover:bg-[#fff7cc]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
