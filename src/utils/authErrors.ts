/**
 * Formats Supabase and network errors into clean, user-friendly messages.
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = typeof error === 'string' ? error : error.message || '';
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'Invalid email address or password. Please verify your credentials and try again.';
  }

  if (lower.includes('user already registered') || lower.includes('already exists') || lower.includes('email address is already in use')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }

  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'Password is too weak. Please ensure it has at least 6 characters.';
  }

  if (lower.includes('invalid email') || lower.includes('email address is invalid')) {
    return 'Please enter a valid email address.';
  }

  if (lower.includes('email not confirmed') || lower.includes('not verified')) {
    return 'Your email has not been verified yet. Please check your inbox for the confirmation link.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many login attempts. Please wait a few moments before trying again.';
  }

  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Unable to reach the server. Please check your internet connection or verify your Supabase configuration.';
  }

  return message || 'An error occurred during authentication. Please try again.';
}
