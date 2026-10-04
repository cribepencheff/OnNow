// The user's region (FR-016, CRI-88, ADR 0014): the phone's locale region,
// unless the user picked one. Undefined until storage has been read.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocales } from "expo-localization";
import { useEffect } from "react";

import { currentRegion, detectRegion, type StoredRegion } from "@/logic/region";
import { getStoredRegion, saveStoredRegion } from "@/storage/region";

const REGION_QUERY_KEY = ["storedRegion"];

export function useRegion() {
  const queryClient = useQueryClient();
  const detected = detectRegion(useLocales());

  const storedQuery = useQuery({
    queryKey: REGION_QUERY_KEY,
    queryFn: getStoredRegion,
    staleTime: Infinity,
  });
  const stored = storedQuery.data;
  const loaded = storedQuery.isSuccess;

  const saveMutation = useMutation({
    mutationFn: saveStoredRegion,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: REGION_QUERY_KEY }),
  });
  const save = saveMutation.mutate;

  // Keep the stored region in step with the device unless overridden.
  useEffect(() => {
    if (loaded && stored?.source !== "manual" && stored?.code !== detected) {
      save({ code: detected, source: "device" });
    }
  }, [loaded, stored, detected, save]);

  return {
    region: loaded ? currentRegion(stored ?? null, detected) : undefined,
    detected,
    isManual: stored?.source === "manual",
    setRegion: (code: string) =>
      save({ code, source: "manual" } satisfies StoredRegion),
    followDeviceRegion: () => save({ code: detected, source: "device" }),
  };
}
