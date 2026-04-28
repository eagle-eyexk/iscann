declare module "psl" {
  export interface ParsedDomain {
    tld: string | null;
    sld: string | null;
    domain: string | null;
    subdomain: string | null;
    listed: boolean;
    input: string;
    error?: { code: string; message: string };
  }
  export function parse(domain: string): ParsedDomain;
  export function get(domain: string): string | null;
  export function isValid(domain: string): boolean;
  const _default: { parse: typeof parse; get: typeof get; isValid: typeof isValid };
  export default _default;
}
