import { useQuery } from "@tanstack/react-query";

import { authClient } from "~/lib/auth-client";

export function useSession() {
  const { data } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      return await authClient.getSession();
    },
  });

  return data;
}
