import useSWR from "swr";

interface ReturnValues<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

interface Options<T> {
  initialData?: T;
}

export function useFetch<T>(
  apiPath: string,
  fetcher: (apiPath: string) => Promise<T>,
  options?: Options<T>,
): ReturnValues<T> {
  const { data, error, isLoading } = useSWR<T>(
    apiPath ? apiPath : null,
    fetcher,
    {
      fallbackData: options?.initialData,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    },
  );

  return {
    data: data ?? null,
    error: error ?? null,
    isLoading: data === undefined ? isLoading : false,
  };
}
