const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(srcDir, function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Fix "use client" order
    if (content.includes('"use client"') || content.includes("'use client'")) {
      content = content.replace(/"use client";?\n?/g, '');
      content = content.replace(/'use client';?\n?/g, '');
      content = `"use client";\n${content}`;
    }

    // 2. Fix duplicate db imports in seed.ts or anywhere else
    if (content.includes('import { db } from "@/lib/db";\nimport { db,')) {
      content = content.replace('import { db } from "@/lib/db";\n', '');
    }
    
    // Quick fix for seed.ts specifically which imports db from ./db and "@/lib/db"
    if (filePath.endsWith('seed.ts')) {
      content = content.replace(/import \{ db \} from "@\/lib\/db";\n/g, '');
      content = content.replace(/import \{ db, seedTopicsIfEmpty, seedUsersIfEmpty, SessionAttendance \} from "\.\/db";/g, 'import { db, seedTopicsIfEmpty, seedUsersIfEmpty, SessionAttendance } from "@/lib/db";');
    }

    // Quick fix for firestore.ts using "use client" because of useState
    if (filePath.endsWith('firestore.ts') && !content.includes('"use client"')) {
        content = `"use client";\n${content}`;
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
    }
  }
});
