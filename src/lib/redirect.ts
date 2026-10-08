// Pull the most useful message out of an API error (express-validator errors first)
export function apiErrorMessage(err: any, fallback: string) {
    return err?.response?.data?.errors?.[0]?.msg || err?.response?.data?.message || fallback;
}
