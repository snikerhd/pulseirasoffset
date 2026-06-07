export const MAX_PULSEIRAS_PER_COMMAND = 18;

export function uniqueCodes(codes: string[]) {
  return Array.from(new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean)));
}

export function parsePulseiraCodes(text: string) {
  const normalized = text.toUpperCase();

  const commandMatches = Array.from(normalized.matchAll(/LOCPULSEIRA\s+([A-Z0-9]+)/g)).map(
    (match) => match[1]
  );

  if (commandMatches.length > 0) {
    return uniqueCodes(commandMatches);
  }

  const rawMatches = normalized.match(/\b[A-Z0-9]{5,}\b/g) ?? [];
  return uniqueCodes(rawMatches.filter((item) => !['LOCPULSEIRA', 'BIND', 'KEYBOARD'].includes(item)));
}

export function buildLocPulseiraCommands(codes: string[], separator = ';') {
  const realSeparator = separator === '\\n' ? '\n' : separator;
  return codes.map((code) => `locpulseira ${code}`).join(realSeparator);
}

export function limitPulseiraCodes(codes: string[], max = MAX_PULSEIRAS_PER_COMMAND) {
  return uniqueCodes(codes).slice(0, max);
}

export function chunkCodes(codes: string[], size = MAX_PULSEIRAS_PER_COMMAND) {
  const unique = uniqueCodes(codes);
  const chunks: string[][] = [];

  for (let index = 0; index < unique.length; index += size) {
    chunks.push(unique.slice(index, index + size));
  }

  return chunks;
}
