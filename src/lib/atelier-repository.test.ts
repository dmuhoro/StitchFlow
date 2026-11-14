import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireSupabaseMock } = vi.hoisted(() => ({
  requireSupabaseMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: null,
  requireSupabase: requireSupabaseMock,
}));

import {
  createInvitation,
  persistAppointment,
  persistAppointmentStatus,
  persistAtelierSettings,
  persistFeedback,
  persistFeedbackStatus,
  persistLookbookItem,
  persistMeasurement,
  persistOrder,
  persistOrderStatus,
  persistTailorAssignment,
  revokeInvitation,
} from './atelier-repository';

interface Row {
  id: string;
  atelier_id: string;
  order_code?: string;
  status?: string;
  assigned_tailor_id?: string | null;
  resolution_status?: string;
}

interface QueryRecord {
  table: string;
  operation: string;
  filters: Array<[string, string]>;
}

function createMockClient(rows: Record<string, Row[]>) {
  const queries: QueryRecord[] = [];

  return {
    queries,
    client: {
      from(table: string) {
        const query: QueryRecord = { table, operation: 'select', filters: [] };
        queries.push(query);
        let payload: Record<string, unknown> = {};
        const builder = {
          select() {
            return builder;
          },
          update(values: Record<string, unknown>) {
            query.operation = 'update';
            payload = values;
            return builder;
          },
          eq(column: string, value: string) {
            query.filters.push([column, value]);
            return builder;
          },
          async maybeSingle() {
            const row = (rows[table] ?? []).find(candidate =>
              query.filters.every(([column, value]) => candidate[column as keyof Row] === value)
            );
            if (row && query.operation === 'update') Object.assign(row, payload);
            return { data: row ?? null, error: null };
          },
          insert() {
            return Promise.resolve({ error: null });
          },
        };
        return builder;
      },
    },
  };
}

describe('atelier-scoped repository writes', () => {
  beforeEach(() => {
    requireSupabaseMock.mockReset();
  });

  it('does not request the Supabase client for any repository write when atelier resolution is missing', async () => {
    const order = {
      id: 'SHARED-001',
      client_id: 'patron-a',
      client_name: 'Patron A',
      client_phone: '',
      assigned_tailor_id: '',
      assigned_tailor_name: '',
      status: 'stitching' as const,
      description: '',
      garment_type: 'Buba',
      fabric_details: '',
      estimated_delivery: '',
      deposit_amount: 0,
      balance_due: 0,
      currency: 'KES' as const,
      photo_url: '',
      progress_notes: [],
      created_at: '',
    };
    const actions = [
      () => createInvitation({ atelierId: '', email: 'staff@example.com', role: 'employee', invitedBy: 'owner-a' }),
      () => revokeInvitation('', 'invite-a'),
      () => persistOrderStatus('', 'SHARED-001', 'ready', undefined, null),
      () => persistOrder('', order),
      () => persistTailorAssignment('', 'SHARED-001', 'tailor-a'),
      () => persistMeasurement('', {
        id: 'measurement-a', client_id: 'patron-a', client_name: 'Patron A', unit: 'in',
        chest: 0, waist: 0, hips: 0, length: 0, sleeve: 0, shoulder: 0, inseam: 0,
        neck: 0, posture_notes: '', updated_at: '',
      }),
      () => persistAppointment('', {
        id: 'appointment-a', client_id: null, client_name: 'Patron A', client_phone: '',
        assigned_tailor_id: '', service_type: 'basted_fitting', slot_datetime: '',
        status: 'pending',
      }),
      () => persistAppointmentStatus('', 'appointment-a', 'confirmed'),
      () => persistFeedback('', {
        order_id: 'SHARED-001', client_id: 'patron-a', client_name: 'Patron A',
        rating: 5, fit_rating: 'perfect', comments: '',
      }),
      () => persistFeedbackStatus('', 'feedback-a', 'resolved'),
      () => persistLookbookItem('', {
        title: '', category: 'Grand Agbada & Boubou', description: '', fabric: '',
        price_range: '', turnaround_days: 0, image_url: '', tags: [], cultural_origin: '',
        is_featured: false,
      }),
      () => persistAtelierSettings('', {
        atelier_name: '', studio_tagline: '', whatsapp_number: '', currency: 'KES',
        default_unit: 'in', theme_mode: 'system', notifications_enabled: false, auto_backup: false,
      }),
    ];

    for (const action of actions) {
      await expect(action()).rejects.toThrow('atelier_not_resolved');
    }
    expect(requireSupabaseMock).not.toHaveBeenCalled();
  });

  it('updates only the selected atelier when order codes repeat across tenants', async () => {
    const fixtures: Record<string, Row[]> = {
      orders: [
        { id: 'order-a', atelier_id: 'atelier-a', order_code: 'SHARED-001', status: 'stitching', assigned_tailor_id: null },
        { id: 'order-b', atelier_id: 'atelier-b', order_code: 'SHARED-001', status: 'cutting', assigned_tailor_id: null },
      ],
      order_progress_notes: [],
    };
    const { client, queries } = createMockClient(fixtures);
    requireSupabaseMock.mockReturnValue(client);

    await persistOrderStatus('atelier-a', 'SHARED-001', 'ready', 'Final fitting complete', null);
    await persistTailorAssignment('atelier-a', 'SHARED-001', 'tailor-a');

    expect(fixtures.orders[0]).toMatchObject({ status: 'ready', assigned_tailor_id: 'tailor-a' });
    expect(fixtures.orders[1]).toMatchObject({ status: 'cutting', assigned_tailor_id: null });
    expect(queries.filter(query => query.operation === 'update')).toHaveLength(2);
    expect(queries.filter(query => query.operation === 'update').every(query =>
      query.filters.some(([column, value]) => column === 'atelier_id' && value === 'atelier-a')
    )).toBe(true);
  });

  it('scopes feedback status by atelier as well as feedback id', async () => {
    const fixtures: Record<string, Row[]> = {
      feedback: [
        { id: 'feedback-b', atelier_id: 'atelier-b', resolution_status: 'open' },
      ],
    };
    const { client, queries } = createMockClient(fixtures);
    requireSupabaseMock.mockReturnValue(client);

    await expect(
      persistFeedbackStatus('atelier-a', 'feedback-b', 'resolved'),
    ).rejects.toThrow('Feedback not found or not accessible.');

    expect(fixtures.feedback[0].resolution_status).toBe('open');
    expect(queries[0].filters).toEqual([
      ['atelier_id', 'atelier-a'],
      ['id', 'feedback-b'],
    ]);
  });
});
