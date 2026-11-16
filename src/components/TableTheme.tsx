import React from 'react';

export function getTableBackgroundStyle(tableId: string): React.CSSProperties {
  switch (tableId) {
    case 'table_walnut':
      return {
        background:
          'radial-gradient(circle at 50% 35%, #5c3721 0%, #3d2213 55%, #24130a 100%)',
      };
    case 'table_indigo':
      return {
        background:
          'radial-gradient(circle at 50% 35%, #1e3a8a 0%, #111c44 58%, #090e24 100%)',
      };
    case 'table_terracotta':
      return {
        background:
          'radial-gradient(circle at 50% 35%, #7c3b2f 0%, #52241c 58%, #2e130e 100%)',
      };
    case 'table_emerald':
    default:
      return {
        background:
          'radial-gradient(circle at 50% 35%, #134e44 0%, #0b332c 58%, #061d19 100%)',
      };
  }
}

export function AvatarEmblem({
  avatarId,
  size = 36,
}: {
  avatarId: string;
  size?: number;
}) {
  if (avatarId === 'avatar_2') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="#3B2F2F" stroke="#F59E0B" strokeWidth="2" />
        <path d="M13 30V15l7-5 7 5v15H13z" fill="#D97706" />
        <rect x="17" y="21" width="6" height="9" rx="3" fill="#291E1E" />
        <circle cx="20" cy="14" r="2" fill="#FEF3C7" />
      </svg>
    );
  }
  if (avatarId === 'avatar_3') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="#1E293B" stroke="#34D399" strokeWidth="2" />
        <polygon points="20,8 30,20 20,32 10,20" fill="none" stroke="#34D399" strokeWidth="2" />
        <polygon points="20,13 25,20 20,27 15,20" fill="#10B981" />
      </svg>
    );
  }
  if (avatarId === 'avatar_4') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
        <path d="M9 24c3-3 6-3 9 0s6 3 9 0 4-2 4-2" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="20,9 22,15 28,15 23,19 25,25 20,21 15,25 17,19 12,15 18,15" fill="#FBBF24" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#0E3E35" stroke="#FBBF24" strokeWidth="2" />
      <rect x="13" y="9" width="14" height="22" rx="3" fill="#FAF6EE" stroke="#D97706" strokeWidth="1.5" />
      <line x1="15" y1="20" x2="25" y2="20" stroke="#92400E" strokeWidth="1.5" />
      <circle cx="20" cy="14.5" r="2" fill="#DC2626" />
      <circle cx="17.5" cy="25.5" r="1.6" fill="#1D4ED8" />
      <circle cx="22.5" cy="25.5" r="1.6" fill="#1D4ED8" />
    </svg>
  );
}
