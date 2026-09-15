"use client";
// @ts-nocheck
import { db } from "@/lib/db";

import { useState } from "react";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { seedTopicsIfEmpty } from "@/lib/db";;
import { seedDemoData } from "@/lib/seed";
import "dexie-export-import";
import styles from "./Settings.module.css";
import { Download, Upload, Database, RefreshCw } from "lucide-react";
import { CustomFieldsConfig } from "@/components/settings/CustomFieldsConfig";

export default function SettingsPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setStatus("Exporting data...");
      
      const blob = await db.export({ prettyJson: true });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const date = new Date().toISOString().split("T")[0];
      link.download = `folkreach-backup-${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setStatus("Export complete! Check your downloads.");
    } catch (error) {
      console.error(error);
      setStatus("Error exporting data. See console.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setStatus("Importing data...");
      
      // We overwrite existing data
      await db.delete();
      await db.open(); // re-open empty db
      await db.import(file);
      
      setStatus("Import successful! Your data has been restored.");
    } catch (error) {
      console.error(error);
      setStatus("Error importing data. See console.");
    } finally {
      setIsImporting(false);
      // reset file input
      event.target.value = '';
    }
  };
  
  const handleSeed = async () => {
    try {
      setStatus("Seeding topics...");
      await seedTopicsIfEmpty();
      setStatus("Topics seeded successfully!");
    } catch(err) {
      console.error(err);
      setStatus("Error seeding topics.");
    }
  }
  
  const handleSeedDemo = async () => {
    try {
      setStatus("Seeding demo data...");
      await seedDemoData();
      setStatus("Demo data seeded! Check Dashboard.");
    } catch(err) {
      console.error(err);
      setStatus("Error seeding demo data.");
    }
  }

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone!")) {
      await db.delete();
      await db.open();
      setStatus("Database cleared.");
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your application data and preferences.</p>
      </header>

      {status && (
        <div className={styles.statusMessage}>{status}</div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Backup & Restore</h2>
        <p className={styles.subtitle}>
          Since you are currently using the local version of FOLKReach, all your data is stored in your browser. 
          Please export your data regularly to prevent data loss.
        </p>

        <div className={styles.buttonGroup}>
          <button 
            className={styles.btnPrimary} 
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download size={18} />
            {isExporting ? "Exporting..." : "Download JSON Backup"}
          </button>

          <div>
            <input 
              type="file" 
              accept=".json" 
              id="import-file" 
              style={{ display: 'none' }}
              onChange={handleImport}
              disabled={isImporting}
            />
            <label htmlFor="import-file" className={styles.btnPrimary} style={{ cursor: 'pointer' }}>
              <Upload size={18} />
              {isImporting ? "Importing..." : "Restore from JSON"}
            </label>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Database Management</h2>
        <p className={styles.subtitle}>Advanced options for managing the local database.</p>
        
        <div className={styles.buttonGroup}>
          <button className={styles.btnPrimary} onClick={handleSeed}>
            <Database size={18} />
            Seed Default Topics
          </button>
          
          <button className={styles.btnPrimary} onClick={handleSeedDemo}>
            <Database size={18} />
            Seed Demo Data
          </button>
          
          <button className={styles.btnDanger} onClick={handleClear}>
            <RefreshCw size={18} />
            Clear All Data
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Custom Fields</h2>
        <CustomFieldsConfig />
      </section>
    </div>
  );
}
