"use client";
// @ts-nocheck
import { db } from "@/lib/db";

import { useState } from "react";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { CustomFieldDef } from "@/lib/db";;
import { GlassSelect } from "@/components/ui/GlassSelect";
import styles from "./CustomFieldsConfig.module.css";

export function CustomFieldsConfig() {
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldDef['type']>("TEXT");
  const [optionsStr, setOptionsStr] = useState("");

  const fields = useFirestoreQuery('customFields');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let options: string[] | undefined = undefined;
    if (type === 'DROPDOWN' && optionsStr) {
      options = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
    }

    await db.customFields.add({
      name: name.trim(),
      type,
      options
    });

    setName("");
    setType("TEXT");
    setOptionsStr("");
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure? Data for this field in profiles won't be deleted, but the field won't show up in forms anymore.")) {
      await firestoreAPI.delete('customFields', id);
    }
  };

  return (
    <div className={styles.container}>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Define dynamic custom fields to be shown on person profiles.
      </p>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Field Name</label>
          <input 
            className={styles.input} 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            placeholder="e.g. T-Shirt Size"
          />
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.label}>Type</label>
          <GlassSelect 
            value={type} 
            onChange={val => setType(val as CustomFieldDef['type'])}
            options={[
              { value: "TEXT", label: "Text" },
              { value: "NUMBER", label: "Number" },
              { value: "DATE", label: "Date" },
              { value: "DROPDOWN", label: "Dropdown" },
              { value: "CHECKBOX", label: "Checkbox" }
            ]}
          />
        </div>

        {type === 'DROPDOWN' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Options (comma separated)</label>
            <input 
              className={styles.input} 
              value={optionsStr} 
              onChange={e => setOptionsStr(e.target.value)} 
              required 
              placeholder="S, M, L, XL"
            />
          </div>
        )}

        <button type="submit" className={styles.btnPrimary}>Add Field</button>
      </form>

      {fields && fields.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Type</th>
              <th className={styles.th}>Options</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(f => (
              <tr key={f.id} className={styles.tr}>
                <td className={styles.td}>{f.name}</td>
                <td className={styles.td}>{f.type}</td>
                <td className={styles.td}>{f.options?.join(', ') || '-'}</td>
                <td className={styles.td}>
                  <button className={styles.btnDanger} onClick={() => handleDelete(f.id!)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
