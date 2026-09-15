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

const replacements = [
  // useLiveQuery(() => db.people.toArray()) -> useFirestoreQuery('people')
  {
    regex: /useLiveQuery\(\s*\(\)\s*=>\s*db\.([a-zA-Z]+)\.toArray\(\)\s*\)/g,
    replace: "useFirestoreQuery('$1')"
  },
  // useLiveQuery(() => db.people.where('ownerId').equals(id).toArray(), [id])
  {
    regex: /useLiveQuery\(\s*\(\)\s*=>\s*db\.([a-zA-Z]+)\.where\('([a-zA-Z]+)'\)\.equals\((.*?)\)\.toArray\(\)\s*,\s*\[(.*?)\]\s*\)/g,
    replace: "useFirestoreQuery('$1', [where('$2', '==', $3)], [$4])"
  },
  // useLiveQuery(() => db.people.where('ownerId').equals(id).toArray())
  {
    regex: /useLiveQuery\(\s*\(\)\s*=>\s*db\.([a-zA-Z]+)\.where\('([a-zA-Z]+)'\)\.equals\((.*?)\)\.toArray\(\)\s*\)/g,
    replace: "useFirestoreQuery('$1', [where('$2', '==', $3)])"
  },
  // useLiveQuery(() => db.people.get(id), [id])
  {
    regex: /useLiveQuery\(\s*async\s*\(\)\s*=>\s*await\s*db\.([a-zA-Z]+)\.get\((.*?)\)\s*,\s*\[(.*?)\]\s*\)/g,
    replace: "useFirestoreDoc('$1', $2)"
  },
  {
    regex: /useLiveQuery\(\s*\(\)\s*=>\s*db\.([a-zA-Z]+)\.get\((.*?)\)\s*,\s*\[(.*?)\]\s*\)/g,
    replace: "useFirestoreDoc('$1', $2)"
  },
  // db.people.add(data) -> firestoreAPI.add('people', data)
  {
    regex: /db\.([a-zA-Z]+)\.add\((.*?)\)/g,
    replace: "firestoreAPI.add('$1', $2)"
  },
  // db.people.update(id, data)
  {
    regex: /db\.([a-zA-Z]+)\.update\((.*?),\s*(\{[\s\S]*?\})\)/g,
    replace: "firestoreAPI.update('$1', $2, $3)"
  },
  // db.people.delete(id)
  {
    regex: /db\.([a-zA-Z]+)\.delete\((.*?)\)/g,
    replace: "firestoreAPI.delete('$1', $2)"
  },
  // import { db } from "@/lib/db" -> import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore"
  {
    regex: /import \{([^}]*)db([^}]*)\} from ["']@\/lib\/db["']/g,
    replace: (match, p1, p2) => {
      // Keep other imports like Person, Task
      const others = (p1 + p2).replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
      let res = `import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";\nimport { where } from "firebase/firestore";`;
      if (others.length > 0) {
        res += `\nimport { ${others.join(', ')} } from "@/lib/db";`;
      }
      return res;
    }
  },
  // import { useLiveQuery } from "dexie-react-hooks" -> remove
  {
    regex: /import \{ useLiveQuery \} from ["']dexie-react-hooks["'];?\n?/g,
    replace: ""
  }
];

walkDir(srcDir, function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    // Skip these core files
    if (filePath.includes('lib\\db.ts') || filePath.includes('lib\\firebase.ts') || filePath.includes('lib\\firestore.ts') || filePath.includes('AuthContext.tsx') || filePath.includes('login\\page.tsx')) {
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    replacements.forEach(rule => {
      content = content.replace(rule.regex, rule.replace);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
