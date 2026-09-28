const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

content = content.replace('import React, { useState } from "react";', 'import React, { useState, useEffect } from "react";');

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
console.log('Fixed imports in page.tsx');
