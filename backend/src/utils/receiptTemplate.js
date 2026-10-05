export function receiptTemplate(userName, userEmail, amount, paymentId, itemName, paymentMethod = 'Visa • • • • 4242') {
  const date = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: ${fontFamily}; color: #f4f4f5;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 20px; font-family: ${fontFamily};">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" max-width="400" border="0" cellspacing="0" cellpadding="0" style="max-width: 400px; background-color: #000000; margin: 0 auto; text-align: left; font-family: ${fontFamily};">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding-bottom: 40px;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #f4f4f5; letter-spacing: 0.5px; text-transform: uppercase;">ARENAHUB</h1>
            </td>
          </tr>

          <!-- Receipt Title & Date -->
          <tr>
            <td style="padding-bottom: 20px; border-bottom: 1px dashed #333333;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: ${fontFamily};">
                <tr>
                  <td align="left"><h2 style="margin: 0; font-size: 18px; font-weight: 500; color: #f4f4f5;">Receipt</h2></td>
                  <td align="right"><span style="font-size: 14px; color: #8892a0;">${date}</span></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Item Row -->
          <tr>
            <td style="padding-top: 20px; padding-bottom: 8px;">
              <span style="font-size: 14px; color: #8892a0;">Payment for</span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: ${fontFamily};">
                <tr>
                  <td align="left" style="font-size: 15px; color: #f4f4f5; padding-right: 15px;">${itemName}</td>
                  <td align="right" valign="top" style="font-size: 15px; color: #f4f4f5; white-space: nowrap;">₹${amount}.00 INR</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="padding-bottom: 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: ${fontFamily};">
                <tr>
                  <td align="left" style="font-size: 14px; color: #8892a0;">Total paid</td>
                  <td align="right" style="font-size: 26px; font-weight: 600; color: #f4f4f5; letter-spacing: -0.5px;">₹${amount}.00 INR</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Bottom Divider -->
          <tr>
            <td style="border-bottom: 1px dashed #333333; padding-bottom: 0px;"></td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding-top: 20px;">
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px; font-family: ${fontFamily};">
                <tr><td align="left" style="font-size: 14px; color: #8892a0; padding-bottom: 4px;">Paid by</td></tr>
                <tr><td align="right" style="font-size: 14px; color: #f4f4f5;">${userName}<br><span style="color: #648ae6; font-size: 13px;">${userEmail}</span></td></tr>
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px; font-family: ${fontFamily};">
                <tr><td align="left" style="font-size: 14px; color: #8892a0; padding-bottom: 4px;">Paid on</td></tr>
                <tr><td align="right" style="font-size: 14px; color: #f4f4f5;">${date}</td></tr>
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px; font-family: ${fontFamily};">
                <tr><td align="left" style="font-size: 14px; color: #8892a0; padding-bottom: 4px;">Payment method</td></tr>
                <tr><td align="right" style="font-size: 14px; color: #f4f4f5;">${paymentMethod}</td></tr>
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px; font-family: ${fontFamily};">
                <tr><td align="left" style="font-size: 14px; color: #8892a0; padding-bottom: 4px;">Payment ID</td></tr>
                <tr><td align="right" style="font-size: 14px; color: #f4f4f5; word-break: break-all;">${paymentId}</td></tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
    <!-- Automated Footer & Support -->
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: #52525b; font-family: ${fontFamily}; line-height: 1.5; max-width: 350px;">
          This is an automated receipt from ArenaHub. Please do not reply directly to this email. 
          If you have questions about this receipt, please 
          <a href="mailto:arenahubsupport@gmail.com" style="color: #648ae6; text-decoration: none;">contact an administrator</a>.
        </p>
        <p style="margin: 15px 0 0 0; font-size: 12px; color: #52525b; font-family: ${fontFamily};">&copy; 2026 ArenaHub</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
