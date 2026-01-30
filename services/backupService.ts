
import { db } from '../db';
import { BackupJob } from '../officeTypes';
import JSZip from 'jszip'; 
import { cloudService } from './cloudService';

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
            if (job.type === 'manual_export') {
                this.triggerDownload(zipBlob, `Export_MalerBorer_${new Date().toISOString().split('T')[0]}.zip`);
            } else {
                // CLOUD UPLOAD LOGIK
                if (cloudService.isConnected) {
                    const filename = `Backup_Auto_${new Date().toISOString()}.zip`;
                    await cloudService.uploadFile(filename, zipBlob);
                    console.log(`[Backup] Uploaded to ${cloudService.provider}`);
                } else {
                    console.warn('[Backup] Cloud not connected, saving locally/skipping.');
                }
                
                // Update Settings Last Success
                const settings = await db.settings.toArray();
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
}

export const backupService = new BackupService();
