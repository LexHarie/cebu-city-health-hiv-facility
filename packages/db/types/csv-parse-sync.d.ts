declare module 'csv-parse/sync' {
  export interface CsvParseOptions {
    columns?: boolean | string[];
    skip_empty_lines?: boolean;
  }
  export function parse<T = Record<string, string>>(input: Buffer | string, options?: CsvParseOptions): T[];
}

