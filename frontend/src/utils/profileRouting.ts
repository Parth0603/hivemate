import type { NavigateFunction } from 'react-router-dom';

type ProfileLike =
  | string
  | null
  | undefined
  | {
      userId?: unknown;
      id?: unknown;
      _id?: unknown;
    };

const normalizeId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$oid === 'string') return obj.$oid.trim();
    if (obj._id) return normalizeId(obj._id);
    if (typeof obj.toString === 'function') {
      const text = obj.toString();
      if (text && text !== '[object Object]') return text.trim();
    }
  }
  return String(value).trim();
};

export const resolveProfileTarget = (input: ProfileLike): string => {
  if (!input) return '';
  if (typeof input === 'string') return normalizeId(input);

  const source = input as Record<string, unknown>;
  return normalizeId(source.userId) || normalizeId(source.id) || normalizeId(source._id);
};

export const goToProfile = (navigate: NavigateFunction, target: ProfileLike) => {
  const resolvedTarget = resolveProfileTarget(target);
  if (!resolvedTarget) return;

  const currentUserId = normalizeId(localStorage.getItem('userId'));
  if (resolvedTarget === currentUserId) {
    navigate('/profile');
    return;
  }

  navigate(`/profile/${resolvedTarget}`);
};

