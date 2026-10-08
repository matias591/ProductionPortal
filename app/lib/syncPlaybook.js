// Plain-language playbook for portal sync failures. The category is stored with each failure;
// the wording lives here so edits apply to existing rows too. Add a rule when a new error shows up.

export const SOURCES = {
  seapod_build:      { label: 'Seapod build → NetSuite', target: 'NetSuite', recordType: 'Seapod', retry: true },
  shipping_netsuite: { label: 'Shipping → NetSuite',     target: 'NetSuite', recordType: 'Order',  retry: true },
  shipping_notify:   { label: 'Shipping notification',   target: 'Automation', recordType: 'Order', retry: true },
  vessel_check:      { label: 'Vessel lookup → Salesforce', target: 'Salesforce', recordType: 'Vessel', retry: false },
};

// fix: where the admin goes to correct the cause. {label} is the record label (serial / order number).
export const CATEGORIES = {
  missing_ns_item: {
    title: 'Item has no NetSuite ID',
    what: 'A component on this record is not linked to a NetSuite item, so NetSuite rejected it.',
    action: 'Set the NetSuite ID for the item in Master Items (or remove the placeholder component), then press Retry.',
    fix: { label: 'Open Master Items', href: () => '/admin/items' },
    severity: 'fixable',
  },
  ns_connection: {
    title: 'NetSuite did not respond',
    what: 'The connection to NetSuite dropped or timed out. This is usually temporary and the data itself is fine.',
    action: 'Press Retry. If it keeps failing for more than an hour, tell BizzApps.',
    severity: 'temporary',
  },
  ns_rate_limit: {
    title: 'NetSuite is busy',
    what: 'NetSuite asked us to slow down because too many requests arrived at once.',
    action: 'Wait a minute, then press Retry.',
    severity: 'temporary',
  },
  ns_auth: {
    title: 'NetSuite access problem',
    what: 'NetSuite refused the login used by the integration. This is not caused by the data.',
    action: 'Contact BizzApps. Retry will not help until access is restored.',
    severity: 'blocked',
  },
  ns_not_found: {
    title: 'Not found in NetSuite',
    what: 'The assembly, bill of materials or record this sync points to does not exist in NetSuite.',
    action: 'Check the assembly item and BOM on the record. If they are correct, tell BizzApps.',
    severity: 'fixable',
  },
  ns_rejected: {
    title: 'NetSuite rejected the data',
    what: 'NetSuite refused the update because a value was not valid. Details are under "Technical detail".',
    action: 'Check the record for missing or unusual values, fix them, then press Retry. If unsure, tell BizzApps.',
    severity: 'fixable',
  },
  automation_down: {
    title: 'Automation service unavailable',
    what: 'The portal could not reach the automation that talks to NetSuite / Salesforce.',
    action: 'Press Retry in a few minutes. If it persists, tell BizzApps.',
    severity: 'temporary',
  },
  sf_lookup: {
    title: 'Salesforce lookup failed',
    what: 'The vessel could not be checked against Salesforce, so the account name was not filled in.',
    action: 'Re-open the order and re-enter the vessel name. If it keeps failing, tell BizzApps.',
    severity: 'temporary',
  },
  unknown: {
    title: 'Unexpected sync error',
    what: 'This error is not in the playbook yet. Details are under "Technical detail".',
    action: 'Press Retry once. If it fails again, send the technical detail to BizzApps.',
    severity: 'unknown',
  },
};

// Order matters: first match wins.
const RULES = [
  [/invalid value for the resource or sub-resource field 'item'|missing netsuite id/i, 'missing_ns_item'],
  [/space your requests|\b429\b|too many requests|concurrency/i, 'ns_rate_limit'],
  [/econnreset|etimedout|econnrefused|socket hang up|timeout|\b50[234]\b|network|fetch failed/i, 'ns_connection'],
  [/\b40[13]\b|invalid_login|unauthorized|forbidden|invalid token/i, 'ns_auth'],
  [/\b404\b|rcrd_dsnt_exist|not found|does not exist/i, 'ns_not_found'],
  [/\b400\b|\b422\b|invalid_value|bad request|invalid/i, 'ns_rejected'],
];

export function classify(source, rawError) {
  const text = String(rawError || '');
  if (source === 'vessel_check') return 'sf_lookup';
  if (/webhook failed|webhook (url )?(is )?not|n8n/i.test(text)) return 'automation_down';
  for (const [re, cat] of RULES) if (re.test(text)) return cat;
  return 'unknown';
}
