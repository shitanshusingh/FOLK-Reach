const fs = require('fs');

let content = fs.readFileSync('src/app/globals.css', 'utf8');

const btnStyles = `
/* Global Button Styles */
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: 10px 20px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
}

.primary-btn:hover {
  background: var(--color-primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.3);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
`;

content += btnStyles;
fs.writeFileSync('src/app/globals.css', content, 'utf8');
console.log('Added global .primary-btn style');
