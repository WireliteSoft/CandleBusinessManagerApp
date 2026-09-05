declare module 'node:crypto' {
  export function randomBytes(size: number): Uint8Array & { toString(encoding: 'hex'): string };
  export function scryptSync(password: string, salt: string, keylen: number): Uint8Array & { toString(encoding: 'hex'): string };
  export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}
