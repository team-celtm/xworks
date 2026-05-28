import React, { useEffect, useState } from 'react';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then(res => res.json())
      .then(data => {
        if (data.auditLogs) setLogs(data.auditLogs);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}><div className="dashboard-loader"></div></div>;
  }

  if (logs.length === 0) {
    return (
      <div className="admin-empty-state">
        <div className="admin-empty-icon">🛡️</div>
        <div className="admin-empty-text">No audit logs found.</div>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Action</th>
            <th>Performed By</th>
            <th>Entity</th>
            <th>Changes</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td data-label="Date">{new Date(log.created_at).toLocaleString()}</td>
              <td data-label="Action" style={{ fontWeight: 600 }}>{log.action}</td>
              <td data-label="Performed By">
                <div style={{ fontWeight: 600 }}>{log.first_name} {log.last_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{log.admin_email}</div>
              </td>
              <td data-label="Entity" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.entity_type} ({log.entity_id})</td>
              <td data-label="Changes" style={{ fontSize: '12px' }}>
                <pre style={{ margin: 0, background: 'var(--surface-2)', padding: '8px', borderRadius: '4px', overflowX: 'auto', maxWidth: '300px' }}>
                  {log.changes ? JSON.stringify(log.changes, null, 2) : 'None'}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
