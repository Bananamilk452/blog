import { useQuery } from "@tanstack/react-query";

import { authClient } from "~/lib/auth-client";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      return await authClient.getSession();
    },
    select: (data) => {
      if (!data.data) {
        return null;
      }

      return data.data;
    },
  });
}
