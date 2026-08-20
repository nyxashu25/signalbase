// Predefined subjects a ticket must pick from — kept server-side (not free
// text) so the admin queue stays scannable, same reasoning as the credit
// packages in creditPackages.js. Mirrored on the frontend's ticket forms via
// GET /tickets/subjects rather than duplicated in a second source file.
export const TICKET_SUBJECTS = {
  SUPPORT: [
    'Bug report',
    'Account access issue',
    'Billing or payment issue',
    'Data quality issue',
    'Other',
  ],
  SALES: ['Upgrade my plan', 'Request a demo', 'Custom pricing', 'Add seats / team', 'Other'],
};

// Applies to every message body — the opening message and every reply,
// admin included — so a thread never carries content the UI's word counter
// wouldn't have allowed the sender to type in the first place.
export const TICKET_BODY_MAX_WORDS = 200;

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
