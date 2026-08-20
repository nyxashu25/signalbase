import { useEffect, useRef, useState } from 'react';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let scriptLoadPromise = null;

// Google Identity Services attaches itself to window.google once loaded —
// there's no npm package for the button widget itself, only for verifying
// tokens server-side (google-auth-library, used in authService.js). Loaded
// lazily and cached so mounting the button twice (e.g. login/register mode
// toggle) doesn't inject the script twice.
function loadGoogleIdentityScript() {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Renders Google's own "Sign in with Google" / "Sign up with Google" button
 * widget. `onCredential` receives the raw ID token JWT to POST to
 * /auth/google — this component never inspects or trusts its contents,
 * that's the backend's job.
 */
export function GoogleSignInButton({ mode, onCredential, onError }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });
        setReady(true);
      })
      .catch(() => onError?.('Could not load Google sign-in. Please try again.'));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCredential/onError are stable per render cycle of the parent form
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    containerRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: 320,
      text: mode === 'register' ? 'signup_with' : 'signin_with',
    });
  }, [ready, mode]);

  if (!CLIENT_ID) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
