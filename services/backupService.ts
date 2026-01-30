
import { db } from '../db';
import { BackupJob } from '../officeTypes';
import JSZip from 'jszip';
import { cloudService } from './cloudService';
import { cryptoService } from './cryptoService';

/**
 * BACKUP SERVICE MIT VERSCHLÜSSELUNG
 *
 * GeBüV-konform:
 * - Backups werden vor Cloud-Upload AES-256-GCM verschlüsselt
 * - IV wird im Dateinamen gespeichert für Wiederherstellung
 * - Lokale Exporte optional verschlüsselt (je nach Einstellung)
 */

const MAX_RETRIES = 3;

export class BackupService {
    
    public async scheduleBackup(type: 'auto_restore' | 'manual_export' = 'auto_restore'): Promise<void> {
        const pending = await db.backupJobs
            .where('status')
            .equals('pending')
            .filter(j => j.type === type)
            .count();

        if (pending === 0) {
            await db.backupJobs.add({
                type,
                status: 'pending',
                createdAt: new Date().toISOString(),
                attempts: 0
            });
            console.log(`[Backup] Job scheduled: ${type}`);
        }
        
        this.processQueue();
    }

    public async processQueue(): Promise<void> {
        const jobs = await db.backupJobs.where('status').equals('pending').toArray();
        if (jobs.length === 0) return;

        for (const job of jobs) {
            await this.executeJob(job);
        }
    }

    private async executeJob(job: BackupJob): Promise<void> {
        if (!job.id) return;

        try {
            await db.backupJobs.update(job.id, { status: 'processing' });

            // 1. Daten sammeln
            const data = await this.collectData();
            
            // 2. Artefakte erstellen (ZIP)
            const zipBlob = await this.createZip(data, job.type);
            
            // 3. Upload / Speichern
            const settings = await db.settings.toArray();
            const encryptBackups = settings[0]?.backup?.encryptBackups ?? true;

            if (job.type === 'manual_export') {
                // Manueller Export - optional verschlüsselt
                if (encryptBackups && cryptoService.isReady()) {
                    const { encryptedBlob, iv } = await cryptoService.encryptBlob(zipBlob);
                    // IV im Dateinamen für spätere Entschlüsselung
                    const filename = `Export_MalerBorer_${new Date().toISOString().split('T')[0]}_enc_${iv}.zip.encrypted`;
                    this.triggerDownload(encryptedBlob, filename);
                    console.log('[Backup] Verschlüsselter Export erstellt');
                } else {
                    this.triggerDownload(zipBlob, `Export_MalerBorer_${new Date().toISOString().split('T')[0]}.zip`);
                }
            } else {
                // CLOUD UPLOAD LOGIK - IMMER verschlüsselt
                if (cloudService.isConnected) {
                    if (!cryptoService.isReady()) {
                        throw new Error('CryptoService nicht initialisiert - Cloud-Backup abgebrochen (Sicherheit)');
                    }

                    // Verschlüsseln vor Upload
                    const { encryptedBlob, iv } = await cryptoService.encryptBlob(zipBlob);

                    // IV im Dateinamen speichern für Wiederherstellung
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const filename = `Backup_Auto_${timestamp}_iv_${iv}.encrypted`;

                    await cloudService.uploadFile(filename, encryptedBlob);
                    console.log(`[Backup] Verschlüsselt hochgeladen zu ${cloudService.provider}`);
                } else {
                    console.warn('[Backup] Cloud nicht verbunden, überspringe.');
                }
                
                // Update Settings Last Success
                if (settings.length) {
                    await db.settings.update(settings[0].id!, {
                        backup: { ...settings[0].backup, lastSuccess: new Date().toISOString() }
                    });
                }
            }

            // 4. Cleanup & Success Log
            await db.backupJobs.update(job.id, { status: 'completed' });
            await db.backupLogs.add({
                jobId: job.id,
                timestamp: new Date().toISOString(),
                status: 'success',
                details: `Backup type ${job.type} successful. Size: ${zipBlob.size}`,
                sizeBytes: zipBlob.size
            });

        } catch (err: any) {
            console.error('[Backup] Job failed', err);
            const nextAttempts = job.attempts + 1;
            const newStatus = nextAttempts >= MAX_RETRIES ? 'failed' : 'pending';
            
            await db.backupJobs.update(job.id, { 
                status: newStatus,
                attempts: nextAttempts,
                lastError: err.message
            });

            await db.backupLogs.add({
                jobId: job.id,
                timestamp: new Date().toISOString(),
                status: 'error',
                details: err.message
            });
        }
    }

    private async collectData() {
        return {
            documents: await db.documents.toArray(),
            customers: await db.customers.toArray(),
            projects: await db.projects.toArray(),
            expenses: await db.expenses.toArray(),
            settings: await db.settings.toArray(),
            products: await db.products.toArray(),
            accounts: await db.accounts.toArray(),
            transactions: await db.transactions.toArray()
        };
    }

    private async createZip(data: any, type: 'auto_restore' | 'manual_export'): Promise<Blob> {
        const zip = new JSZip();
        
        const manifest: any = {
            version: '2.0',
            created: new Date().toISOString(),
            type: type,
            files: {},
            counts: {
                documents: data.documents.length,
                customers: data.customers.length
            }
        };

        const dbJson = JSON.stringify(data, null, 2);
        
        if (type === 'auto_restore') {
            zip.file('database_dump.json', dbJson);
            manifest.files['database_dump.json'] = await this.computeHash(dbJson);
        } 
        else {
            zip.file('raw_data.json', dbJson);
            const customerCSV = this.jsonToCSV(data.customers);
            zip.file('Kunden_Liste.csv', customerCSV);
            const docsCSV = this.jsonToCSV(data.documents.map((d: any) => ({
                nr: d.docNumber,
                client: d.client.name,
                date: d.date,
                total: d.totalGross,
                status: d.status
            })));
            zip.file('Rechnungen_Liste.csv', docsCSV);
        }

        zip.file('manifest.json', JSON.stringify(manifest, null, 2));
        return await zip.generateAsync({ type: 'blob' });
    }

    private triggerDownload(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    private async computeHash(content: string): Promise<string> {
        const msgBuffer = new TextEncoder().encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private jsonToCSV(items: any[]): string {
        if (!items || !items.length) return '';
        const header = Object.keys(items[0]);
        const csv = [
            header.join(';'),
            ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], (key, value) => value === null ? '' : value)).join(';'))
        ].join('\r\n');
        return csv;
    }

    /**
     * Extrahiert IV aus verschlüsseltem Backup-Dateinamen
     */
    private extractIvFromFilename(filename: string): string | null {
        // Format: Backup_Auto_TIMESTAMP_iv_BASE64IV.encrypted
        // oder: Export_..._enc_BASE64IV.zip.encrypted
        const ivMatch = filename.match(/(?:_iv_|_enc_)([A-Za-z0-9+/=]+)\.(?:encrypted|zip\.encrypted)$/);
        return ivMatch ? ivMatch[1] : null;
    }

    /**
     * Entschlüsselt und stellt ein Backup wieder her
     */
    public async restoreEncryptedBackup(encryptedBlob: Blob, filename: string): Promise<void> {
        if (!cryptoService.isReady()) {
            throw new Error('CryptoService nicht initialisiert. Bitte zuerst mit Master-Passwort authentifizieren.');
        }

        const iv = this.extractIvFromFilename(filename);
        if (!iv) {
            throw new Error('Konnte IV nicht aus Dateinamen extrahieren. Ungültiges Backup-Format.');
        }

        // Entschlüsseln
        const decryptedBlob = await cryptoService.decryptBlob(encryptedBlob, iv);

        // ZIP entpacken
        const zip = await JSZip.loadAsync(decryptedBlob);

        // Manifest lesen
        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) {
            throw new Error('Backup ungültig: manifest.json fehlt');
        }

        const manifest = JSON.parse(await manifestFile.async('string'));
        console.log('[Backup] Wiederherstellung gestartet:', manifest);

        // Datenbank-Dump finden
        const dbFile = zip.file('database_dump.json') || zip.file('raw_data.json');
        if (!dbFile) {
            throw new Error('Backup ungültig: Keine Datenbankdatei gefunden');
        }

        const data = JSON.parse(await dbFile.async('string'));

        // Daten wiederherstellen (mit Bestätigung)
        await this.restoreData(data);

        console.log('[Backup] Wiederherstellung abgeschlossen');
    }

    /**
     * Stellt Daten aus Backup in DB wieder her
     */
    private async restoreData(data: any): Promise<void> {
        // Transaktionssicher alle Tabellen aktualisieren
        await db.transaction('rw', [
            db.documents, db.customers, db.projects,
            db.expenses, db.products, db.accounts, db.transactions
        ], async () => {
            // Bestehende Daten löschen und neue einfügen
            if (data.documents?.length) {
                await db.documents.clear();
                await db.documents.bulkAdd(data.documents);
            }
            if (data.customers?.length) {
                await db.customers.clear();
                await db.customers.bulkAdd(data.customers);
            }
            if (data.projects?.length) {
                await db.projects.clear();
                await db.projects.bulkAdd(data.projects);
            }
            if (data.expenses?.length) {
                await db.expenses.clear();
                await db.expenses.bulkAdd(data.expenses);
            }
            if (data.products?.length) {
                await db.products.clear();
                await db.products.bulkAdd(data.products);
            }
            if (data.accounts?.length) {
                await db.accounts.clear();
                await db.accounts.bulkAdd(data.accounts);
            }
            if (data.transactions?.length) {
                await db.transactions.clear();
                await db.transactions.bulkAdd(data.transactions);
            }
        });
    }

    /**
     * Stellt unverschlüsseltes Backup wieder her
     */
    public async restoreBackup(zipBlob: Blob): Promise<void> {
        const zip = await JSZip.loadAsync(zipBlob);

        const dbFile = zip.file('database_dump.json') || zip.file('raw_data.json');
        if (!dbFile) {
            throw new Error('Backup ungültig: Keine Datenbankdatei gefunden');
        }

        const data = JSON.parse(await dbFile.async('string'));
        await this.restoreData(data);
        console.log('[Backup] Unverschlüsselte Wiederherstellung abgeschlossen');
    }
}

export const backupService = new BackupService();
