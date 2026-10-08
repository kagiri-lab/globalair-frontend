import { Forward, Monitor, Package, Plane, Ship, Truck, Warehouse } from 'lucide-react';
import type { Service } from '@/lib/siteContent';

const ICONS = { Forward, Monitor, Package, Plane, Ship, Truck, Warehouse };

export default function ServiceIcon({ name, size = 22 }: { name: Service['icon']; size?: number }) {
    const Icon = ICONS[name];
    return <Icon size={size} />;
}
