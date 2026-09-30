const fs = require('fs');

let page = fs.readFileSync('src/app/campaigns/[id]/page.tsx', 'utf8');

// 1. Add state for delete modal
page = page.replace(
  'const [showEditModal, setShowEditModal] = useState(false);',
  'const [showEditModal, setShowEditModal] = useState(false);\n  const [showDeleteModal, setShowDeleteModal] = useState(false);\n  const [isDeleting, setIsDeleting] = useState(false);'
);

// 2. Rewrite handleDelete to NOT use window.confirm, but handle the actual deletion
const newDeleteLogic = `
  const performDelete = async () => {
    setIsDeleting(true);
    try {
      await db.campaigns.delete(campaignId);
      for (const l of rawLeads) {
         await db.campaignLeads.delete(l.id);
      }
      router.push('/campaigns');
    } catch(e) {
      console.error(e);
      alert("Error deleting campaign");
      setIsDeleting(false);
    }
  };
`;

page = page.replace(/const handleDelete = async \(\) => \{[\s\S]*?alert\("Error deleting campaign"\);\s*\}\s*\};/, newDeleteLogic);

// 3. Update the onClick to open the modal
page = page.replace(
  'onClick={handleDelete}',
  'onClick={() => setShowDeleteModal(true)}'
);

// 4. Inject the Custom Delete Modal at the bottom
const deleteModal = `
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 400, textAlign: 'center' }}>
            <Trash2 size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ marginBottom: 12 }}>Delete Campaign?</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
              Are you sure you want to permanently delete this campaign and all of its lead data? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteModal(false)} className="secondary-btn" disabled={isDeleting}>Cancel</button>
              <button onClick={performDelete} className="primary-btn" style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Yes, Delete It"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
`;

page = page.replace('    </div>\n  );\n', deleteModal);

fs.writeFileSync('src/app/campaigns/[id]/page.tsx', page, 'utf8');
