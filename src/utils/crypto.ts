export class CryptoUtils {
  private static encoder = new TextEncoder()
  private static decoder = new TextDecoder()

  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key)
    return this.arrayBufferToBase64(exported)
  }

  static async importKey(keyString: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyString)
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  static async encrypt(data: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encodedData = this.encoder.encode(data)
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    )

    return {
      encrypted: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv),
    }
  }

  static async decrypt(encryptedData: string, key: CryptoKey, iv: string): Promise<string> {
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedData)
    const ivBuffer = this.base64ToArrayBuffer(iv)
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      key,
      encryptedBuffer
    )

    return this.decoder.decode(decrypted)
  }

  static generateUrlSafeId(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return this.arrayBufferToBase64(array.buffer)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  static encodeKeyForUrl(key: string): string {
    return key.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  static decodeKeyFromUrl(encodedKey: string): string {
    let key = encodedKey.replace(/-/g, '+').replace(/_/g, '/')
    while (key.length % 4) {
      key += '='
    }
    return key
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }
}