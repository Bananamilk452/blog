import { useRouter } from "next/navigation";

import { Button } from "./ui/button";

export function BackButton({ children }: { children?: React.ReactNode }) {
  const router = useRouter();

  function onGoBack() {
    if (history.length > 2) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <Button variant="white" onClick={onGoBack}>
      {children}
    </Button>
  );
}
