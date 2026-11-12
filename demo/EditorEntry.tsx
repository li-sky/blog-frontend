import { useEffect, useState } from 'react';

/** Local development entry: authenticate with the isolated backend, then use Admin. */
export default function EditorEntry() {
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    void fetch('/__demo/session', { method: 'POST' }).then(async response => {
      if (!response.ok) throw new Error('试玩后台不可用');
      const data = await response.json();
      if (!alive) return;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.replace(`/admin?edit=${data.postId}`);
    }).catch(reason => { if (alive) setError(reason.message); });
    return () => { alive = false; };
  }, []);
  return error ? <p role="alert">{error}</p> : null;
}
