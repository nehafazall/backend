// Phone prefix to country mapping
export const PHONE_COUNTRY_MAP = {
    '+971': 'UAE',
    '+91': 'India',
    '+966': 'Saudi Arabia',
    '+974': 'Qatar',
    '+965': 'Kuwait',
    '+973': 'Bahrain',
    '+968': 'Oman',
    '+92': 'Pakistan',
    '+880': 'Bangladesh',
    '+63': 'Philippines',
    '+44': 'UK',
    '+1': 'USA/Canada',
    '+61': 'Australia',
    '+49': 'Germany',
    '+33': 'France',
    '+39': 'Italy',
    '+34': 'Spain',
    '+81': 'Japan',
    '+86': 'China',
    '+82': 'South Korea',
    '+65': 'Singapore',
    '+60': 'Malaysia',
    '+62': 'Indonesia',
    '+66': 'Thailand',
    '+84': 'Vietnam',
    '+20': 'Egypt',
    '+27': 'South Africa',
    '+234': 'Nigeria',
    '+254': 'Kenya',
    '+212': 'Morocco',
    '+90': 'Turkey',
    '+7': 'Russia',
    '+380': 'Ukraine',
    '+48': 'Poland',
    '+31': 'Netherlands',
    '+32': 'Belgium',
    '+41': 'Switzerland',
    '+43': 'Austria',
    '+46': 'Sweden',
    '+47': 'Norway',
    '+45': 'Denmark',
    '+358': 'Finland',
    '+353': 'Ireland',
    '+351': 'Portugal',
    '+30': 'Greece',
    '+972': 'Israel',
    '+961': 'Lebanon',
    '+962': 'Jordan',
    '+964': 'Iraq',
    '+98': 'Iran',
    '+93': 'Afghanistan',
    '+94': 'Sri Lanka',
    '+977': 'Nepal',
    '+95': 'Myanmar',
    '+855': 'Cambodia',
    '+856': 'Laos',
    '+52': 'Mexico',
    '+55': 'Brazil',
    '+54': 'Argentina',
    '+56': 'Chile',
    '+57': 'Colombia',
    '+51': 'Peru',
    '+58': 'Venezuela',
};

// List of countries for dropdown
export const COUNTRIES = [
    'UAE',
    'India',
    'Saudi Arabia',
    'Qatar',
    'Kuwait',
    'Bahrain',
    'Oman',
    'Pakistan',
    'Bangladesh',
    'Philippines',
    'UK',
    'USA/Canada',
    'Australia',
    'Germany',
    'France',
    'Italy',
    'Spain',
    'Japan',
    'China',
    'South Korea',
    'Singapore',
    'Malaysia',
    'Indonesia',
    'Thailand',
    'Vietnam',
    'Egypt',
    'South Africa',
    'Nigeria',
    'Kenya',
    'Morocco',
    'Turkey',
    'Russia',
    'Ukraine',
    'Poland',
    'Netherlands',
    'Belgium',
    'Switzerland',
    'Austria',
    'Sweden',
    'Norway',
    'Denmark',
    'Finland',
    'Ireland',
    'Portugal',
    'Greece',
    'Israel',
    'Lebanon',
    'Jordan',
    'Iraq',
    'Iran',
    'Afghanistan',
    'Sri Lanka',
    'Nepal',
    'Myanmar',
    'Cambodia',
    'Laos',
    'Mexico',
    'Brazil',
    'Argentina',
    'Chile',
    'Colombia',
    'Peru',
    'Venezuela',
    'Other',
];

// Lead sources
export const LEAD_SOURCES = [
    { id: 'facebook', label: 'Facebook' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'google_ads', label: 'Google Ads' },
    { id: 'website', label: 'Website' },
    { id: 'referral', label: 'Referral' },
    { id: 'walk_in', label: 'Walk-in' },
    { id: 'cold_call', label: 'Cold Call' },
    { id: 'other', label: 'Other' },
];

/**
 * Detect country from phone number
 * @param {string} phone - Phone number (can include +, spaces, dashes)
 * @returns {string|null} - Country name or null if not detected
 */
export function detectCountryFromPhone(phone) {
    if (!phone) return null;
    
    // Clean up the phone number - keep only digits and +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // If doesn't start with +, try adding it
    const phoneWithPlus = cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone;
    
    // Try matching from longest prefix to shortest
    const prefixes = Object.keys(PHONE_COUNTRY_MAP).sort((a, b) => b.length - a.length);
    
    for (const prefix of prefixes) {
        if (phoneWithPlus.startsWith(prefix)) {
            return PHONE_COUNTRY_MAP[prefix];
        }
    }
    
    return null;
}

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string} - Formatted phone number
 */
export function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Basic cleanup
    let clean = phone.replace(/[^\d+]/g, '');
    
    // Add + if missing and looks like international
    if (!clean.startsWith('+') && clean.length > 10) {
        clean = '+' + clean;
    }
    
    return clean;
}
