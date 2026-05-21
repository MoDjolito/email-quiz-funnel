export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID || 5);

  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API Brevo manquante côté serveur' });
  }

  const { email, attributes, notification } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email manquant' });
  }

  const headers = {
    'api-key': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    // 1. Ajout du contact dans la liste Brevo
    const payload = {
      email,
      updateEnabled: true,
      attributes: attributes || {},
    };
    if (listId > 0) payload.listIds = [listId];

    const contactResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const contactData = await contactResponse.json().catch(() => ({}));

    if (!contactResponse.ok) {
      return res.status(400).json({ error: 'Erreur Brevo contacts', contact: contactData });
    }

    // 2. Email de notification vers heliosredaction.jordan@gmail.com
    if (notification) {
      const { prenom, boutique, grade, scores, quizAnswers } = notification;

      let answersHtml = '';
      let currentCat = '';
      (quizAnswers || []).forEach(function(qa) {
        if (qa.category !== currentCat) {
          if (currentCat) answersHtml += '</table>';
          answersHtml += `<p style="margin:20px 0 8px;font-size:11px;font-weight:700;color:#4F46E5;text-transform:uppercase;letter-spacing:1.5px;">${qa.category}</p>`;
          answersHtml += '<table width="100%" cellpadding="0" cellspacing="0">';
          currentCat = qa.category;
        }
        answersHtml += `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
          <div style="font-size:12px;color:#888;margin-bottom:3px;">${qa.question}</div>
          <div style="font-size:13px;font-weight:600;color:#1a1a2e;">${qa.answer}</div>
        </td></tr>`;
      });
      if (currentCat) answersHtml += '</table>';

      const scoreGlobal = scores && scores.globalScore !== undefined ? Math.round(scores.globalScore) : '—';
      const scoreFlows = scores && scores.catScores ? Math.round(scores.catScores.flows) : '—';
      const scoreNewsletter = scores && scores.catScores ? Math.round(scores.catScores.newsletter) : '—';
      const scoreDelivrabilite = scores && scores.catScores ? Math.round(scores.catScores.deliverabilite) : '—';
      const scoreSegmentation = scores && scores.catScores ? Math.round(scores.catScores.segmentation) : '—';
      const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f4f4f8;font-family:Arial,sans-serif;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0;">
  <tr><td style="background:#4F46E5;padding:28px 32px;">
    <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1.5px;">Hélios Rédaction — Quiz Email</p>
    <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">Nouveau résultat : ${prenom || 'Prospect'}</h1>
    <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.6);">${date}</p>
  </td></tr>
  <tr><td style="padding:28px 32px;">

    <!-- Infos contact -->
    <h2 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1a1a2e;border-bottom:2px solid #f0f0f0;padding-bottom:8px;">Contact</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:6px 0;font-size:12px;color:#888;width:120px;">Email</td>
        <td style="font-size:13px;font-weight:600;color:#1a1a2e;">${email}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:12px;color:#888;">Prénom</td>
        <td style="font-size:13px;font-weight:600;color:#1a1a2e;">${prenom || '—'}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:12px;color:#888;">Boutique</td>
        <td style="font-size:13px;font-weight:600;color:#1a1a2e;">${boutique || '—'}</td>
      </tr>
    </table>

    <!-- Scores -->
    <h2 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1a1a2e;border-bottom:2px solid #f0f0f0;padding-bottom:8px;">Résultats</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="text-align:center;padding:20px 16px;border-right:1px solid #ede9fe;">
          <div style="font-size:32px;font-weight:900;color:#4F46E5;line-height:1;">${scoreGlobal}%</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Score global</div>
        </td>
        <td style="text-align:center;padding:20px 16px;">
          <div style="font-size:32px;font-weight:900;color:#4F46E5;line-height:1;">${grade || '—'}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Grade</div>
        </td>
      </tr>
      <tr><td colspan="2" style="padding:0 16px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#666;padding:5px 0;">Flows automatisés</td>
            <td style="font-size:12px;font-weight:700;color:#4F46E5;text-align:right;">${scoreFlows}%</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#666;padding:5px 0;">Newsletters</td>
            <td style="font-size:12px;font-weight:700;color:#4F46E5;text-align:right;">${scoreNewsletter}%</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#666;padding:5px 0;">Délivrabilité</td>
            <td style="font-size:12px;font-weight:700;color:#4F46E5;text-align:right;">${scoreDelivrabilite}%</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#666;padding:5px 0;">Segmentation</td>
            <td style="font-size:12px;font-weight:700;color:#4F46E5;text-align:right;">${scoreSegmentation}%</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Réponses -->
    <h2 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1a1a2e;border-bottom:2px solid #f0f0f0;padding-bottom:8px;">Réponses au quiz</h2>
    ${answersHtml}

  </td></tr>
  <tr><td style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #e0e0e0;">
    <p style="margin:0;font-size:11px;color:#aaa;">Quiz Hélios Rédaction</p>
  </td></tr>
</table>
</body></html>`;

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sender: { name: 'Quiz Hélios', email: 'jordan@heliosredaction.fr' },
          to: [{ email: 'heliosredaction.jordan@gmail.com', name: 'Jordan' }],
          subject: `Résultat quiz ${prenom || 'Prospect'}`,
          htmlContent,
        }),
      }).catch(() => {});
    }

    return res.status(200).json({ ok: true, contact: contactData });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
