// services/calendarClient.ts (replace previous addToGoogleCalendar function with this)
const GOOGLE_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY as string;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID as string;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(new Error('Failed to load script: ' + src));
    document.head.appendChild(s);
  });
}

async function ensureGapiAndGisLoaded() {
  await loadScript('https://accounts.google.com/gsi/client'); // GIS
  await loadScript('https://apis.google.com/js/api.js');     // gapi
  if (!(window as any).gapi) throw new Error('gapi did not load');
  if (!(window as any).google) throw new Error('google (GIS) did not load');
}

// Helper: parse time strings like "11:30 AM", "11:30", "23:15" -> "HH:MM"
function parseTimeToHHMM(t?: string): string | null {
  if (!t) return null;
  const s = String(t).trim().toLowerCase();

  // "hh:mm"
  const hhmmMatch = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const h = Number(hhmmMatch[1]);
    const m = hhmmMatch[2].padStart(2, '0');
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:${m}`;
  }

  // "hh:mm am/pm" or "h:mmam"
  const ampmMatch = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/) || s.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
  if (ampmMatch) {
    let h = Number(ampmMatch[1]);
    const m = ampmMatch[2].padStart(2, '0');
    const ampm = ampmMatch[3];
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:${m}`;
  }

  return null;
}

// Helper: Given appointment-like object, coerce into a JS Date (local timezone)
function coerceAppointmentToDate(appointment: any, fallbackTimeMinutes = 60): Date | null {
  // If it's already a Date
  if (appointment?.date instanceof Date && !isNaN(appointment.date.getTime())) {
    return appointment.date;
  }

  // If date is a string that is parseable by Date
  if (typeof appointment?.date === 'string') {
    // try direct ISO parse
    const tryIso = new Date(appointment.date);
    if (!isNaN(tryIso.getTime())) return tryIso;

    // try date-only "YYYY-MM-DD" + time from appointment.time (maybe "11:30 AM")
    const dateOnly = appointment.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const [, yr, mo, day] = dateOnly;
      // time may be provided separately as appointment.time
      let timeHHMM = parseTimeToHHMM(appointment.time) || parseTimeToHHMM((appointment as any).startTime) || null;
      if (!timeHHMM) {
        // maybe appointment.date itself contained time-like token (e.g., "2025-11-29 11:30")
        const inline = appointment.date.match(/\d{1,2}:\d{2}/);
        if (inline) timeHHMM = inline[0];
      }
      if (!timeHHMM) {
        // fallback to 09:00
        timeHHMM = '09:00';
      }
      const [hh, mm] = timeHHMM.split(':').map(Number);
      // JS Date uses month 0-indexed
      const d = new Date(Number(yr), Number(mo) - 1, Number(day), hh, mm, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // if appointment has separate numeric components (yr, mo, day, hour, minute)
  if (appointment?.year && appointment?.month && appointment?.day) {
    const h = appointment.hour ?? 9;
    const m = appointment.minute ?? 0;
    const d = new Date(appointment.year, appointment.month - 1, appointment.day, h, m, 0);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function formatToGCalDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
}

export function openGoogleCalendarTemplate(appointment: any) {
  const startDate = coerceAppointmentToDate(appointment);
  if (!startDate || isNaN(startDate.getTime())) {
    throw new Error('Invalid appointment date');
  }
  const duration = (appointment as any).durationMinutes ?? 60;
  const endDate = new Date(startDate.getTime() + duration * 60000);

  const startStr = formatToGCalDate(startDate);
  const endStr = formatToGCalDate(endDate);

  const title = `${appointment.serviceType ?? 'Appointment'}${appointment.providerName ? ' — ' + appointment.providerName : ''}`;
  const description = `Booked via Sola Voice Assistant`;
  const location = appointment.providerName ?? '';

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
  
  window.open(url, '_blank');
}

export async function addToGoogleCalendar(appointment: any): Promise<{ id: string; link?: string }> {
  if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
    console.log('[CALENDAR] Missing credentials, falling back to Web Template URL redirect');
    openGoogleCalendarTemplate(appointment);
    return { id: 'web-template', link: 'opened' };
  }

  await ensureGapiAndGisLoaded();

  // Init gapi.client
  await new Promise<void>((resolve, reject) => {
    try {
      (window as any).gapi.load('client', async () => {
        try {
          await (window as any).gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: [DISCOVERY_DOC]
          });
          console.log('[CALENDAR] gapi.client.init OK');
          resolve();
        } catch (err) {
          console.error('[CALENDAR] gapi.client.init failed:', err);
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });

  return new Promise<{ id: string; link?: string }>(async (resolve, reject) => {
    const gis = (window as any).google?.accounts?.oauth2;
    if (!gis || !gis.initTokenClient) {
      return reject(new Error('GIS token client not available (google.accounts.oauth2.initTokenClient missing)'));
    }

    const tokenClient = gis.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      prompt: '',
      callback: async (tokenResponse: any) => {
        try {
          if (!tokenResponse || !tokenResponse.access_token) {
            console.error('[CALENDAR] tokenResponse:', tokenResponse);
            return reject(new Error('No access token received'));
          }

          (window as any).gapi.client.setToken({ access_token: tokenResponse.access_token });

          // Robustly coerce appointment to Date
          const startDate = coerceAppointmentToDate(appointment);
          if (!startDate || isNaN(startDate.getTime())) {
            console.error('[CALENDAR] Invalid startDate after coercion. appointment=', appointment);
            return reject(new Error('Invalid appointment date: ' + String(appointment.date)));
          }

          const duration = (appointment as any).durationMinutes ?? 60;
          const end = new Date(startDate.getTime() + duration * 60000);

          const event = {
            summary: `${(appointment as any).serviceType ?? 'Appointment'}${(appointment as any).providerName ? ' — ' + (appointment as any).providerName : ''}`,
            description: `Booked via app${(appointment as any).location ? ' — ' + (appointment as any).location : ''}`,
            start: { dateTime: startDate.toISOString(), timeZone: 'Asia/Kolkata' },
            end:   { dateTime: end.toISOString(), timeZone: 'Asia/Kolkata' },
          };

          console.log('[CALENDAR] Inserting event:', event);

          const resp = await (window as any).gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: event,
          });

          console.log('[CALENDAR] insert response full:', resp);
          if (resp?.result?.id) {
            resolve({ id: resp.result.id, link: resp.result.htmlLink });
          } else {
            reject(new Error('Event insertion succeeded but no id returned: ' + JSON.stringify(resp)));
          }
        } catch (err) {
          console.error('[CALENDAR] insertion failed full:', err);
          try { console.error('stringified:', JSON.stringify(err, null, 2)); } catch (_) {}
          reject(err);
        }
      }
    });

    try {
      tokenClient.requestAccessToken();
    } catch (err) {
      console.error('[CALENDAR] token request error:', err);
      reject(err);
    }
  });
}

export function generateICS(appointment: any): string {
  const startDate = coerceAppointmentToDate(appointment);
  if (!startDate || isNaN(startDate.getTime())) return '';
  
  const duration = (appointment as any).durationMinutes ?? 60;
  const endDate = new Date(startDate.getTime() + duration * 60000);
  
  const startStr = formatToGCalDate(startDate);
  const endStr = formatToGCalDate(endDate);
  
  const title = `${appointment.serviceType ?? 'Appointment'}${appointment.providerName ? ' — ' + appointment.providerName : ''}`;
  const description = `Booked via Sola Voice Assistant`;
  const location = appointment.providerName ?? '';
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sola Assistant//Calendar Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    'STATUS:CONFIRMED',
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export async function sendCalendarEmail(appointment: any, toEmail: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  
  if (!apiKey) {
    console.warn('[CALENDAR] Resend API key missing.');
    return false;
  }
  
  const icsContent = generateICS(appointment);
  if (!icsContent) return false;
  
  // Convert ICS content to base64
  const base64Ics = btoa(unescape(encodeURIComponent(icsContent)));
  
  const title = `${appointment.serviceType ?? 'Appointment'} - ${appointment.providerName ?? 'Booking'}`;
  
  try {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
    const emailUrl = isLocalhost ? '/api-resend/emails' : 'https://api.resend.com/emails';
    
    const response = await fetch(emailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Sola Assistant <${fromEmail}>`,
        to: toEmail,
        subject: `📅 Appointment Confirmed: ${title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fafafa; color: #18181b;">
            <h2 style="color: #10b981; margin-top: 0;">Booking Confirmed!</h2>
            <p>Your appointment has been booked successfully via Sola Assistant.</p>
            <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
            <p><strong>Provider:</strong> ${appointment.providerName}</p>
            <p><strong>Service:</strong> ${appointment.serviceType}</p>
            <p><strong>Date & Time:</strong> ${new Date(appointment.date).toLocaleString()}</p>
            <p style="font-size: 12px; color: #71717a; margin-top: 20px;">We have attached a calendar event file to this email. Your email client should automatically add it to your calendar.</p>
          </div>
        `,
        attachments: [
          {
            filename: 'appointment.ics',
            content: base64Ics
          }
        ]
      })
    });
    
    if (response.ok) {
      console.log('[CALENDAR] Email sent successfully');
      return true;
    } else {
      const errData = await response.json();
      console.error('[CALENDAR] Failed to send email:', errData);
      return false;
    }
  } catch (err) {
    console.error('[CALENDAR] Exception sending email:', err);
    return false;
  }
}
