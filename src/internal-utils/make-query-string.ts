import type { AnyQuery } from 'yaschema-api';

/** Converts a yaschema-api query value into a query string, which can be used in a URL */
export const makeQueryString = (query: AnyQuery) => {
  const output: string[] = [];

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) {
      continue; // Skipping
    }

    if (Array.isArray(value)) {
      const encodedKey = `${encodeURIComponent(key)}[]`;
      for (const v of value) {
        if (v === null || v === undefined) {
          continue; // Skipping
        }

        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        output.push(`${encodedKey}=${encodeURIComponent(String(v))}`);
      }
    } else {
      const encodedKey = encodeURIComponent(key);
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      output.push(`${encodedKey}=${encodeURIComponent(String(value))}`);
    }
  }

  return output.join('&');
};
