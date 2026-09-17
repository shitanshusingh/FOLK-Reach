"use client";
// @ts-nocheck
import { db } from "@/lib/db";

import { useState } from "react";
import styles from "./Settings.module.css";
import { Download, Upload, Database, RefreshCw } from "lucide-react";
import { CustomFieldsConfig } from "@/components/settings/CustomFieldsConfig";
import { SyncDataBtn } from "@/components/settings/SyncDataBtn";

export default function SettingsPage() {
  const [status, setStatus] = useState<string | null>(null);


  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your application data and preferences.</p>
      </header>

      {status && (
        <div className={styles.statusMessage}>{status}</div>
      )}

      <SyncDataBtn />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Custom Fields</h2>
        <CustomFieldsConfig />
      </section>
    </div>
  );
}
