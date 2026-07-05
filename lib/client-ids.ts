export function createObjectIdString(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0')
    .slice(-8);
  const bytes = new Uint8Array(8);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return `${timestamp}${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
