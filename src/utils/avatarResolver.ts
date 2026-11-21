export function isMockAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = url.trim().toLowerCase();
  if (!cleaned) return false;

  const mockPatterns = [
    'images.unsplash.com',
    'unsplash.com',
    'images.pexels.com',
    'pexels.com',
    'placeholder.com',
    'via.placeholder.com',
    'pravatar.cc',
    'randomuser.me',
    'dummyimage.com',
    'placekitten.com',
  ];

  return mockPatterns.some((pattern) => cleaned.includes(pattern));
}

function sanitizeLocalStorageAvatars(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let cleanedCount = 0;

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      const rawValue = window.localStorage.getItem(key);
      if (!rawValue) continue;

      if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
        try {
          const parsed = JSON.parse(rawValue);
          let modified = false;

          const sanitizeObject = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            for (const prop of Object.keys(obj)) {
              if (
                (prop === 'avatar_url' || prop === 'avatar' || prop === 'photoUrl') &&
                typeof obj[prop] === 'string' &&
                isMockAvatarUrl(obj[prop])
              ) {
                obj[prop] = '';
                modified = true;
                cleanedCount++;
              } else if (typeof obj[prop] === 'object') {
                sanitizeObject(obj[prop]);
              }
            }
          };

          sanitizeObject(parsed);

          if (modified) {
            window.localStorage.setItem(key, JSON.stringify(parsed));
          }
        } catch {
        }
      } else if (isMockAvatarUrl(rawValue)) {
        window.localStorage.removeItem(key);
        cleanedCount++;
      }
    }
  } catch {
  }

  return cleanedCount;
}

if (typeof window !== 'undefined') {
  sanitizeLocalStorageAvatars();
}
