export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID || 5);

  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API Brevo manquante côté serveur' });
  }

  const { email, attributes } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email manquant' });
  }

  try {
    const payload = {
      email,
      updateEnabled: true,
      attributes: attributes || {},
    };
    if (listId > 0) payload.listIds = [listId];

    const contactResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contactData = await contactResponse.json().catch(() => ({}));

    if (!contactResponse.ok) {
      return res.status(400).json({ error: 'Erreur Brevo', contact: contactData });
    }

    return res.status(200).json({ ok: true, contact: contactData });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
