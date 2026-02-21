export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wsUrl =
    process.env.WS_URL ||
    process.env.PARTYKIT_WS_URL ||
    process.env.NEXT_PUBLIC_WS_URL ||
    '';

  return res.status(200).json({ wsUrl });
}
