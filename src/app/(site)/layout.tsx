import './site.css';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import PromoPopup from '@/components/site/PromoPopup';
import { getPromo } from '@/lib/promo';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
    const promo = await getPromo();
    return (
        <div className="site-theme">
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
            <PromoPopup promo={promo} />
        </div>
    );
}
