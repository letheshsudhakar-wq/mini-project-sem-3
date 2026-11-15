# CivicFix translation coverage

Updated: 2026-11-15

## Dictionary coverage

The locale dictionaries contain the same 268 translation keys. A source comparison found no missing or extra keys and no mismatched interpolation placeholders.

| Language | Entries | Missing keys |
| --- | ---: | ---: |
| English (default) | 268 | 0 |
| Hindi (हिन्दी) | 268 | 0 |
| Kannada (ಕನ್ನಡ) | 268 | 0 |
| Tamil (தமிழ்) | 268 | 0 |

## Verification

- Production build: passed.
- Lint: passed with existing warnings.
- Browser check: switched through all four locales on the landing page and confirmed Tamil remained selected after refresh.
- Browser check: the login form's missing-email validation appeared in each selected language.
- Locale formatting uses `en-IN`, `hi-IN`, `kn-IN`, and `ta-IN`.
- Language preferences are stored locally and can sync to `profiles.preferred_language`.

## Remaining UI coverage

Matching dictionary keys do not mean every visible string in the application is localized. Existing government-dashboard, complaint-detail, and modal components still contain hardcoded English copy, including some dynamic priority explanations and accessible labels. Authenticated dashboard flows also need browser verification with a configured Supabase project. Therefore, full application translation is **not yet complete**.

Apply `supabase/migrations/20261115_multilingual_language_support.sql` to existing databases before syncing Kannada or Tamil profile preferences.
