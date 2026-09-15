// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './GlassSelect.module.css';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function GlassSelect({ value, onChange, options, placeholder = "Select an option", className = "" }: GlassSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`${styles.container} ${className}`} ref={containerRef}>
      <button 
        type="button" 
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <select 
          className={styles.nativeSelect}
          value={value}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(false);
          }}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
          {selectedOption ? (
            <>
              {selectedOption.icon}
              {selectedOption.label}
            </>
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>{placeholder}</span>
          )}
        </span>
        <ChevronDown size={18} className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`} style={{ pointerEvents: 'none' }} />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {options.map((option) => (
            <div
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              className={`${styles.option} ${value === option.value ? styles.optionSelected : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.icon}
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
