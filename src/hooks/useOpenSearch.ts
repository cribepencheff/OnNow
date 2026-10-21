// Goes to the Search tab in typing mode (CRI-133): from Shows' search
// field, "Search more" at the end of Top picks, and "Add your first show".

import { useCallback } from "react";

import { requestSearchFocus } from "./search-focus";
import { useGuardedRouter } from "./useGuardedRouter";

export function useOpenSearch(): () => void {
  const router = useGuardedRouter();
  return useCallback(() => {
    requestSearchFocus();
    router.push("/search");
  }, [router]);
}
