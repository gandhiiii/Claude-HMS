// Notification Dispatch Engine (Real SMS Gateway & EmailJS API + Fallback)

export const getNotificationGatewayConfig = () => {
  const saved = localStorage.getItem('carepulse_notif_config');
  return saved ? JSON.parse(saved) : {
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromPhone: '',
    emailJsServiceId: '',
    emailJsTemplateId: '',
    emailJsPublicKey: '',
    enableRealSms: false,
    enableRealEmail: false
  };
};

export const saveNotificationGatewayConfig = (config) => {
  localStorage.setItem('carepulse_notif_config', JSON.stringify(config));
};

/**
 * Sends real SMS via Twilio API if credentials are configured
 */
export const sendRealTwilioSms = async (toPhone, messageBody) => {
  const config = getNotificationGatewayConfig();
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromPhone) {
    console.warn('Twilio credentials not configured for real SMS.');
    return { success: false, reason: 'Twilio credentials missing' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('To', toPhone);
    formData.append('From', config.twilioFromPhone);
    formData.append('Body', messageBody);

    const auth = btoa(`${config.twilioAccountSid}:${config.twilioAuthToken}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await res.json();
    if (res.ok) {
      return { success: true, sid: data.sid };
    } else {
      return { success: false, reason: data.message || 'Twilio API Error' };
    }
  } catch (err) {
    console.error('Twilio SMS Dispatch Error:', err);
    return { success: false, reason: err.message };
  }
};

/**
 * Sends real email via EmailJS API if configured
 */
export const sendRealEmailJS = async (toEmail, toName, subject, messageBody) => {
  const config = getNotificationGatewayConfig();
  if (!config.emailJsServiceId || !config.emailJsTemplateId || !config.emailJsPublicKey) {
    return { success: false, reason: 'EmailJS credentials missing' };
  }

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: config.emailJsServiceId,
        template_id: config.emailJsTemplateId,
        user_id: config.emailJsPublicKey,
        template_params: {
          to_email: toEmail,
          to_name: toName,
          subject: subject,
          message: messageBody
        }
      })
    });

    if (res.ok) {
      return { success: true };
    } else {
      return { success: false, reason: 'EmailJS dispatch failed' };
    }
  } catch (err) {
    return { success: false, reason: err.message };
  }
};

/**
 * Main dispatch function called across the app
 */
export const sendNotification = ({ type, recipient, role, requestCode, patientName, discountVal, status, amount }) => {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isSMS = type === 'SMS';
  
  let subject = '';
  let body = '';

  if (status === 'NEW_REQUEST') {
    subject = `[URGENT] Discount Approval Request ${requestCode}`;
    body = `CarePulse Hospital Alert: New Discount Request ${requestCode} for Patient ${patientName}. Bill: ₹${amount.toLocaleString('en-IN')} | Requested Discount: ${discountVal}%. Permission requested from ${role}.`;
  } else if (status === 'ESCALATED_TO_CFO') {
    subject = `[ESCALATED] High Amount Discount ${requestCode} Escalated to CFO`;
    body = `CarePulse Hospital Alert: Discount Request ${requestCode} (${discountVal}%, ₹${amount.toLocaleString('en-IN')}) for ${patientName} escalated by Chief Accountant to CFO for permission.`;
  } else if (status === 'ESCALATED_TO_EXECUTIVE') {
    subject = `[ESCALATED] Too High Amount Discount ${requestCode} Escalated to Executive Board`;
    body = `CarePulse Hospital Alert: Discount Request ${requestCode} (${discountVal}%, ₹${amount.toLocaleString('en-IN')}) for ${patientName} escalated by CFO to MD / Vice Chairman / Chairman for permission.`;
  } else if (status === 'DIRECT_EXECUTIVE_GRANT') {
    subject = `[DIRECT GRANT] Executive Discount Issued for ${patientName}`;
    body = `CarePulse Hospital Notice: Direct Executive Discount ${requestCode} of ${discountVal}% (₹${amount.toLocaleString('en-IN')}) issued by ${role} directly to patient ${patientName}. Active on Billing Desk!`;
  } else if (status === 'APPROVED') {
    subject = `[APPROVED] Discount Authorization Granted for ${requestCode}`;
    body = `CarePulse Hospital Notice: Discount Request ${requestCode} of ${discountVal}% (₹${amount.toLocaleString('en-IN')}) for ${patientName} has been APPROVED by ${role}. Ready for billing payment!`;
  } else if (status === 'REJECTED') {
    subject = `[REJECTED] Discount Request ${requestCode}`;
    body = `CarePulse Hospital Alert: Discount Request ${requestCode} for ${patientName} has been REJECTED by ${role}. Check audit logs.`;
  } else {
    subject = `[UPDATE] Discount Status Changed for ${requestCode}`;
    body = `CarePulse Hospital Notice: Status for ${requestCode} updated to ${status}.`;
  }

  const phone = recipient.phone || recipient.recipientContact || '';
  const email = recipient.email || recipient.recipientContact || '';

  // Trigger real background API call if real SMS is enabled
  const config = getNotificationGatewayConfig();
  let realStatus = 'DELIVERED (SIMULATED)';

  if (isSMS && config.enableRealSms && phone) {
    sendRealTwilioSms(phone, body).then(res => {
      if (res.success) {
        console.log('Real SMS sent via Twilio to:', phone);
      }
    });
    realStatus = 'REAL SMS DISPATCHED';
  }

  if (!isSMS && config.enableRealEmail && email) {
    sendRealEmailJS(email, recipient.name || 'User', subject, body).then(res => {
      if (res.success) {
        console.log('Real Email sent via EmailJS to:', email);
      }
    });
    realStatus = 'REAL EMAIL DISPATCHED';
  }

  // Trigger Native Browser Web Notification if supported
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(subject, { body, icon: '/favicon.svg' });
    } catch (e) {}
  }

  return {
    id: 'NOTIF-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    type: isSMS ? 'SMS' : 'EMAIL',
    recipientName: recipient.name || recipient.recipientName || 'User',
    recipientContact: isSMS ? phone : email,
    role: recipient.role || role,
    subject,
    body,
    timestamp,
    status: realStatus,
    gateway: isSMS ? (config.enableRealSms ? 'Twilio Live SMS Gateway' : 'Twilio SMS Gateway (Simulated)') : (config.enableRealEmail ? 'EmailJS Live SMTP' : 'SendGrid SMTP Service (Simulated)')
  };
};

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'NOTIF-88219A',
    type: 'SMS',
    recipientName: 'Dr. Arthur Pendelton (Chairman)',
    recipientContact: '+1 (555) 019-2834',
    role: 'CHAIRMAN',
    subject: '[URGENT] High-Value Discount Authorization',
    body: 'CarePulse Alert: Discount Request #DISC-9042 for Patient Robert Chen (Bill ₹1,85,000, Discount 100%) requires Chairman approval for Below Poverty Line Emergency Charity.',
    timestamp: '14:22:05',
    status: 'DELIVERED',
    gateway: 'Twilio SMS Gateway'
  },
  {
    id: 'NOTIF-33912B',
    type: 'EMAIL',
    recipientName: 'Dr. Evelyn Vance (MD)',
    recipientContact: 'md.office@carepulse-hospital.com',
    role: 'MD',
    subject: '[APPROVED] Discount Request #DISC-8819 Granted',
    body: 'CarePulse Email: Discount of 30% (₹21,000) on total bill of ₹70,000 for Patient Sarah Connor was approved by Managing Director.',
    timestamp: '11:05:40',
    status: 'DELIVERED',
    gateway: 'SendGrid SMTP Service'
  }
];
