import { Facebook, Instagram, Linkedin, Youtube, Twitter, Music2 } from 'lucide-react';
import type { SiteContact } from '@/lib/siteInfo';

const NETWORKS = [
    ['facebook', 'Facebook', Facebook],
    ['instagram', 'Instagram', Instagram],
    ['linkedin', 'LinkedIn', Linkedin],
    ['x', 'X (Twitter)', Twitter],
    ['tiktok', 'TikTok', Music2],
    ['youtube', 'YouTube', Youtube],
] as const;

// Icons for whichever social profiles are filled in (Settings → Website content)
export default function SocialLinks({ social, size = 16, className }: { social: SiteContact['social']; size?: number; className?: string }) {
    return (
        <>
            {NETWORKS.filter(([key]) => social?.[key]).map(([key, label, Icon]) => (
                <a key={key} href={social[key]} target="_blank" rel="noopener noreferrer" aria-label={label} className={className}>
                    <Icon size={size} />
                </a>
            ))}
        </>
    );
}
