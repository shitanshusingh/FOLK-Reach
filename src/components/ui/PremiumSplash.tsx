import React from 'react';
import Image from 'next/image';
import styles from './PremiumSplash.module.css';

export function PremiumSplash({ message = "Loading FOLKReach..." }: { message?: string }) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logoWrapper}>
          <div className={styles.pulseRing}></div>
          <div className={styles.pulseRingDelayed}></div>
          <Image 
            src="/logo.png" 
            alt="FOLKReach" 
            width={120} 
            height={120} 
            className={styles.logo}
            priority
          />
        </div>
        <h1 className={styles.title}>FOLKReach</h1>
        <p className={styles.subtitle}>{message}</p>
        <div className={styles.loader}>
          <div className={styles.loaderBar}></div>
        </div>
      </div>
    </div>
  );
}
