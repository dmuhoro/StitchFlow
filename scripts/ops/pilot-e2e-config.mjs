export const PILOT_E2E_DEFAULT_BASE_URL = 'https://stitchflow-coral.vercel.app';
export const PILOT_E2E_OWN_ORDER = 'PILOT-A-001';
export const PILOT_E2E_FOREIGN_ORDER = 'PILOT-B-001';
export const PILOT_E2E_BOOKING_REQUEST_LABEL = 'Ruracio bridal basted fitting';

/** @param {(key: string, value: string) => string} envLine */
export function pilotE2EConfigLines(envLine) {
  return [
    envLine('STITCHFLOW_E2E_OWN_ORDER', PILOT_E2E_OWN_ORDER),
    envLine('STITCHFLOW_E2E_FOREIGN_ORDER', PILOT_E2E_FOREIGN_ORDER),
    envLine('STITCHFLOW_E2E_BOOKING_REQUEST_LABEL', PILOT_E2E_BOOKING_REQUEST_LABEL),
  ];
}
