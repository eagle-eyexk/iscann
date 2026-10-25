import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function stripIpv6Brackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

export function isPublicNetworkAddress(address: string): boolean {
  const normalized = stripIpv6Brackets(address).split("%", 1)[0]?.toLowerCase() ?? "";
  const family = isIP(normalized);

  if (family === 4) {
    const octets = normalized.split(".").map(Number);
    const [a = 0, b = 0, c = 0] = octets;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    ) {
      return false;
    }
    return true;
  }

  if (family !== 6) return false;
  if (normalized.startsWith("::ffff:") || normalized === "::" || normalized === "::1") {
    return false;
  }
  const firstHextet = Number.parseInt(normalized.split(":")[0] || "0", 16);
  if (firstHextet < 0x2000 || firstHextet > 0x3fff) return false;
  if (
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("2001:0000:") ||
    normalized.startsWith("2002:")
  ) {
    return false;
  }
  return true;
}

export function isPublicHost(host: string): boolean {
  const normalized = stripIpv6Brackets(host).toLowerCase().replace(/\.$/, "");
  if (
    !normalized ||
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".home.arpa") ||
    normalized.endsWith(".test") ||
    normalized.endsWith(".invalid") ||
    normalized.endsWith(".example") ||
    normalized.endsWith(".arpa")
  ) {
    return false;
  }

  if (isIP(normalized)) return isPublicNetworkAddress(normalized);
  return true;
}

export async function resolvePublicAddress(host: string): Promise<{
  address: string;
  family: 4 | 6;
}> {
  const normalized = stripIpv6Brackets(host);
  if (!isPublicHost(normalized)) {
    throw Object.assign(new Error("Refusing to connect to a non-public host."), {
      code: "PRIVATE_HOST",
    });
  }

  const addresses = isIP(normalized)
    ? [{ address: normalized, family: isIP(normalized) as 4 | 6 }]
    : await lookup(normalized, { all: true, verbatim: true });

  if (
    addresses.length === 0 ||
    addresses.some((entry) => !isPublicNetworkAddress(entry.address))
  ) {
    throw Object.assign(new Error("Host resolves to a non-public network address."), {
      code: "PRIVATE_HOST",
    });
  }

  const address = addresses[0];
  if (!address) {
    throw Object.assign(new Error("Host did not resolve to a public address."), {
      code: "PRIVATE_HOST",
    });
  }
  return { address: address.address, family: address.family as 4 | 6 };
}
