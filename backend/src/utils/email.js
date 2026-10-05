import { receiptTemplate } from './receiptTemplate.js';

export async function sendPaymentReceipt(userEmail, userName, amount, paymentId, itemName) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || apiKey.includes('your-new-xkeysib-api-key')) {
    console.warn('⚠️ BREVO_API_KEY is not configured. Skipping receipt email.');
    return;
  }

  const htmlContent = receiptTemplate(userName, userEmail, amount, paymentId, itemName);

  const payload = {
    sender: { name: "ArenaHub", email: senderEmail },
    to: [{ email: userEmail, name: userName }],
    subject: `ArenaHub Receipt - ${itemName}`,
    htmlContent: htmlContent
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (errorData?.code === 'unauthorized' && errorData?.message?.includes('unrecognised IP')) {
        console.warn(`⚠️ BREVO IP SECURITY BLOCK: Your current IP is not authorized in Brevo.`);
        console.warn(`👉 Please visit https://app.brevo.com/security/authorised_ips and add your IP or disable IP restrictions.`);
      }
      throw new Error(`Brevo API Error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`✅ Receipt email sent to ${userEmail}. Message ID: ${data.messageId}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to send receipt email to ${userEmail}:`, error.message);
  }
}
