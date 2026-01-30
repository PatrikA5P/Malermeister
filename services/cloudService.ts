
/**
 * Cloud Storage Adapter
 * Handhabt die Verbindung zu Google Drive und OneDrive.
 * 
 * HINWEIS FÜR PRODUCTION:
 * Für echte API-Calls müssen hier die echten OAuth-Flows implementiert werden.
 * Aktuell läuft dies im Simulations-Modus.
 */

export type CloudProvider = 'google' | 'onedrive' | 'local';

export interface CloudUserProfile {
    name: string;
    email: string;
    avatar?: string;
}

class CloudService {
    private _isConnected: boolean = false;
    private _provider: CloudProvider = 'local';
    private _user: CloudUserProfile | null = null;

    constructor() {
        // Lade Status aus LocalStorage
        const saved = localStorage.getItem('borer_cloud_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            this._isConnected = parsed.isConnected;
            this._provider = parsed.provider;
            this._user = parsed.user;
        }
    }

    get isConnected() { return this._isConnected; }
    get provider() { return this._provider; }
    get user() { return this._user; }

    /**
     * Startet den OAuth Flow (Simuliert)
     */
    async connect(provider: CloudProvider): Promise<boolean> {
        return new Promise((resolve) => {
            console.log(`[CloudService] Connecting to ${provider}...`);
            
            // Simuliere Popup & Auth Delay
            setTimeout(() => {
                this._isConnected = true;
                this._provider = provider;
                this._user = {
                    name: provider === 'google' ? 'Toni Borer (Google)' : 'Toni Borer (MS)',
                    email: 'toni@borer-maler.ch',
                    avatar: provider === 'google' 
                        ? 'https://lh3.googleusercontent.com/a/default-user=s96-c' 
                        : undefined
                };
                this.persist();
                resolve(true);
            }, 1500);
        });
    }

    /**
     * Trennt die Verbindung
     */
    async disconnect(): Promise<void> {
        this._isConnected = false;
        this._provider = 'local';
        this._user = null;
        this.persist();
    }

    /**
     * Lädt eine Datei hoch (Simuliert)
     */
    async uploadFile(filename: string, blob: Blob): Promise<string> {
        if (!this._isConnected) throw new Error("Nicht verbunden");

        console.log(`[CloudService] Uploading ${filename} (${blob.size} bytes) to ${this._provider}...`);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                // Return fake URL
                resolve(`https://${this._provider}.com/borer-backups/${filename}`);
            }, 2000);
        });
    }

    private persist() {
        localStorage.setItem('borer_cloud_config', JSON.stringify({
            isConnected: this._isConnected,
            provider: this._provider,
            user: this._user
        }));
    }
}

export const cloudService = new CloudService();
