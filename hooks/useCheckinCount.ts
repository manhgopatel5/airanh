import { useState, useEffect } from 'react';

export function useCheckinCount(eventId: string) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const fetchCount = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/checkin?eventId=${eventId}`);
        const data = await res.json();
        if (res.ok) {
          setCount(data.count || 0);
        }
      } catch (error) {
        console.error('Fetch checkin count failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [eventId]);

  return { count, loading };
}