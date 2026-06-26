import { useEffect, useState } from "react";
import { subscribe } from "./storage";

export function useStore<T>(getter: () => T): T {
  const [value, setValue] = useState<T>(() => {
    try {
      return getter();
    } catch {
      return undefined as unknown as T;
    }
  });
  useEffect(() => {
    setValue(getter());
    return subscribe(() => setValue(getter()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}
