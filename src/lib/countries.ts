// Country names → ISO codes and emoji flags (used by the "Countries we ship to" band and its editor)

// Common short names people type that Intl doesn't use
const ALIASES: Record<string, string> = {
    uae: 'AE', usa: 'US', us: 'US', 'united states of america': 'US', uk: 'GB', 'great britain': 'GB', england: 'GB',
    drc: 'CD', 'dr congo': 'CD', 'democratic republic of congo': 'CD', 'congo-kinshasa': 'CD', 'congo-brazzaville': 'CG',
    'ivory coast': 'CI', "cote d'ivoire": 'CI', turkey: 'TR', 'south korea': 'KR', russia: 'RU', 'czech republic': 'CZ',
    swaziland: 'SZ', eswatini: 'SZ', burma: 'MM', somaliland: 'SO', puntland: 'SO', zanzibar: 'TZ',
    'republic of the congo': 'CG', 'congo republic': 'CG', dubai: 'AE', 'uae – dubai': 'AE', 'uae - dubai': 'AE',
    'northern kenya': 'KE',
};

// Country name → ISO code, built from the browser's own list of region names
let lookup: Map<string, string> | null = null;
export const countryCode = (name: string) => {
    if (!lookup) {
        lookup = new Map();
        try {
            const names = new Intl.DisplayNames(['en'], { type: 'region' });
            for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
                const code = String.fromCharCode(a, b);
                const label = names.of(code);
                if (label && label !== code) lookup.set(label.toLowerCase(), code);
            }
        } catch { /* older browsers: no flags */ }
    }
    const key = name.trim().toLowerCase();
    return ALIASES[key] || lookup.get(key) || (/^[a-z]{2}$/i.test(key) ? key.toUpperCase() : null);
};

// Regional-indicator emoji flag for a country name, or null when the name isn't recognised
export const countryFlag = (name: string) => {
    const code = countryCode(name);
    return code ? String.fromCodePoint(...[...code].map(c => 0x1f1a5 + c.charCodeAt(0))) : null;
};

// Every country name the browser knows, for suggestions while typing
let names: string[] | null = null;
export const allCountryNames = () => {
    if (!names) {
        const set = new Set<string>();
        try {
            const dn = new Intl.DisplayNames(['en'], { type: 'region' });
            for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
                const code = String.fromCharCode(a, b);
                const label = dn.of(code);
                if (label && label !== code && !/^(European Union|Eurozone|United Nations|Unknown Region|Outlying Oceania|Pseudo-)/.test(label)) set.add(label);
            }
        } catch { /* no suggestions */ }
        names = [...set].sort((x, y) => x.localeCompare(y));
    }
    return names;
};
