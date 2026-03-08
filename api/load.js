import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const slot = req.query?.slot || 'main';
    const key = `normies:rpg:${slot}`;
    const data = await redis.get(key);

    if (!data) {
      res.status(404).json({ ok: false, error: 'No cloud save found for this slot' });
      return;
    }

    res.status(200).json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || 'Failed to load save' });
  }
}
