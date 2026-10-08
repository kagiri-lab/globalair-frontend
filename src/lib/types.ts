// ── Core Entities ─────────────────────────────────────────────────────────────

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    /** 'customer' for shipping customers; staff roles are listed in lib/roles.ts */
    role: string;
    permissions?: string[] | string;
    is_active: boolean;
    created_at: string;
    /** Account made with a temporary password: must choose their own before using the portal */
    must_change_password?: boolean | number;
}

export interface ProductCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    min_weight_kg: number;
    max_weight_kg: number | null;
    requires_special_handling: boolean;
    allowed_modes?: TransportMode[] | null;     // null = every mode
    default_fragile?: boolean;
    default_hazardous?: boolean;
    default_refrigeration?: boolean;
    requires_declared_value?: boolean;
    // Staff-only fields (admin API)
    price_adjustment_pct?: number;
    handling_fee?: number;
}

export interface ShipmentItem {
    id: string;
    shipment_id: string;
    category_id: string;
    category_name?: string;
    category_icon?: string;
    description: string;
    weight_kg: number;
    length_cm?: number | null;
    width_cm?: number | null;
    height_cm?: number | null;
    quantity: number;
    declared_value?: number | null;
    is_fragile: boolean;
    is_hazardous: boolean;
    requires_refrigeration: boolean;
    special_instructions?: string;
    item_price?: number;
}

export type ShipmentStatus =
    | 'draft'
    | 'pending'
    | 'confirmed'
    | 'picked_up'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'failed';

export type ShipmentType = 'standard' | 'express' | 'overnight';
export type TransportMode = 'air' | 'sea' | 'road';

export interface Shipment {
    id: string;
    tracking_number: string;
    user_id: string;
    pickup_address: string;
    pickup_city: string;
    pickup_state?: string;
    pickup_country: string;
    pickup_postal_code?: string;
    pickup_contact_name?: string;
    pickup_contact_phone?: string;
    destination_address: string;
    destination_city: string;
    destination_state?: string;
    destination_country: string;
    destination_postal_code?: string;
    destination_contact_name?: string;
    destination_contact_phone?: string;
    status: ShipmentStatus;
    shipment_type: ShipmentType;
    transport_mode: TransportMode;
    total_price?: number;
    total_weight_kg?: number;
    estimated_delivery?: string;
    picked_up_at?: string;
    delivered_at?: string;
    notes?: string;
    /** Billing: 'prepaid' (invoice, pay before pickup) or 'monthly' (on the account's statement) */
    billing?: 'prepaid' | 'monthly';
    payment_status?: 'unpaid' | 'paid' | 'on_account';
    invoice_sent_at?: string | null;
    paid_at?: string | null;
    items?: ShipmentItem[];
    tracking_events?: TrackingEvent[];
    created_at: string;
    updated_at: string;
}

export interface TrackingEvent {
    id: string;
    shipment_id: string;
    status: ShipmentStatus;
    title: string;
    description?: string;
    location?: string;
    event_time: string;
    attribution?: string | null;
}

// ── Request Payloads ──────────────────────────────────────────────────────────

export interface NewItemPayload {
    category_id: string;
    description: string;
    weight_kg: number;
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    quantity: number;
    declared_value?: number;
    is_fragile?: boolean;
    is_hazardous?: boolean;
    requires_refrigeration?: boolean;
    special_instructions?: string;
}

export interface NewShipmentPayload {
    pickup_address: string;
    pickup_city: string;
    pickup_state?: string;
    pickup_country: string;
    pickup_postal_code?: string;
    pickup_contact_name?: string;
    pickup_contact_phone?: string;
    destination_address: string;
    destination_city: string;
    destination_state?: string;
    destination_country: string;
    destination_postal_code?: string;
    destination_contact_name?: string;
    destination_contact_phone?: string;
    shipment_type: ShipmentType;
    transport_mode: TransportMode;
    notes?: string;
    items: NewItemPayload[];
}

export interface QuotePayload {
    pickup_country: string;
    destination_country: string;
    shipment_type: ShipmentType;
    transport_mode: TransportMode;
    items: Pick<NewItemPayload, 'category_id' | 'weight_kg' | 'quantity'>[];
}

export interface QuoteLine { key: string; label: string; detail?: string; amount: number }

export interface QuoteResult {
    total_price: number;
    subtotal?: number;
    tax?: number;
    currency: string;
    chargeable_weight?: number;
    estimated_days?: number;
    estimated_delivery: string;
    shipment_type: ShipmentType;
    breakdown?: QuoteLine[];
    item_breakdown: { description: string; category: string; weight_kg: number; quantity: number; chargeable_weight?: number; price: number }[];
}

/** Why a route/shipment couldn't be priced (422 from /shipments/quote) */
export interface QuoteProblem { code?: string; message: string; contact?: boolean; available_modes?: TransportMode[]; allowed_modes?: TransportMode[] }

// ── API Response wrapper ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
    errors?: { msg: string; path: string }[];
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: { page: number; limit: number; total: number; pages: number };
}
