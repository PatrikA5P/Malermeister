
/**
 * ZERO-KNOWLEDGE ENCRYPTION ENGINE
 * 
 * Diese Datei handhabt die gesamte Verschlüsselung im Browser.
 * Wichtig: Der Master-Key verlässt NIEMALS unverschlüsselt den Browser.
 */

// Konfiguration
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // Standard für GCM
const ITERATIONS = 100000; // PBKDF2 Iterationen (Sicherheit vs Performance)

export interface EncryptedData {
    cipherText: string; // Base64
    iv: string; // Base64 (Initialization Vector)
}

export class CryptoService {
    private masterKey: CryptoKey | null = null;

    /**
     * Prüft, ob der Service bereit ist (Key geladen)
     */
    public isReady(): boolean {
        return this.masterKey !== null;
    }

    /**
     * Generiert einen neuen zufälligen Master-Key (bei Registrierung)
     */
    public async generateMasterKey(): Promise<CryptoKey> {
        this.masterKey = await window.crypto.subtle.generateKey(
            { name: ALGORITHM, length: KEY_LENGTH },
            true, // Extractable (für Backup/Recovery)
            ['encrypt', 'decrypt']
        );
        return this.masterKey;
    }

    /**
     * DEV-MODE: Lädt einen unsicheren Hardcoded-Key für die Entwicklung.
     * NIEMALS IN PRODUKTION VERWENDEN!
     */
    public async loadDevKey(): Promise<void> {
        const rawKey = new TextEncoder().encode('DEV_KEY_MUST_BE_32_BYTES_LONG_!!'); // 32 chars
        this.masterKey = await window.crypto.subtle.importKey(
            'raw',
            rawKey,
            ALGORITHM,
            true,
            ['encrypt', 'decrypt']
        );
        console.warn('⚠️ CRYPTO: Dev-Key geladen. Daten sind NICHT sicher!');
    }

    /**
     * Verschlüsselt Text/JSON
     */
    public async encrypt(data: string | object): Promise<EncryptedData> {
        if (!this.masterKey) throw new Error('CryptoService not initialized');

        const text = typeof data === 'string' ? data : JSON.stringify(data);
        const encoded = new TextEncoder().encode(text);
        const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: ALGORITHM, iv },
            this.masterKey,
            encoded
        );

        return {
            cipherText: this.arrayBufferToBase64(encryptedBuffer),
            iv: this.arrayBufferToBase64(iv)
        };
    }

    /**
     * Entschlüsselt zu Text/JSON
     */
    public async decrypt(data: EncryptedData): Promise<any> {
        if (!this.masterKey) throw new Error('CryptoService not initialized');

        const iv = this.base64ToArrayBuffer(data.iv);
        const cipher = this.base64ToArrayBuffer(data.cipherText);

        try {
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: ALGORITHM, iv },
                this.masterKey,
                cipher
            );

            const decoded = new TextDecoder().decode(decryptedBuffer);
            
            // Versuch JSON zu parsen, sonst Text zurückgeben
            try {
                return JSON.parse(decoded);
            } catch {
                return decoded;
            }
        } catch (e) {
            console.error('Decryption failed', e);
            throw new Error('Entschlüsselung fehlgeschlagen. Falscher Key?');
        }
    }

    /**
     * Verschlüsselt Dateien (Blobs/Files) für Upload
     */
    public async encryptFile(file: File): Promise<{ encryptedBlob: Blob, iv: string }> {
        if (!this.masterKey) throw new Error('CryptoService not initialized');

        const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const arrayBuffer = await file.arrayBuffer();

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: ALGORITHM, iv },
            this.masterKey,
            arrayBuffer
        );

        return {
            encryptedBlob: new Blob([encryptedBuffer]),
            iv: this.arrayBufferToBase64(iv)
        };
    }

    /**
     * Hilfsfunktionen für Base64 Konvertierung
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): Uint8Array {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    }
}

export const cryptoService = new CryptoService();
