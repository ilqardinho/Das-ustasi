import React from 'react';
import { Volume2 } from 'lucide-react';
import { DominiEvent, DominiMood } from '../game/domini';

interface DominiMascotProps {
  event: DominiEvent | null;
  visible: boolean;
  soundEnabled?: boolean;
  spotlight?: boolean;
  onTap?: () => void;
}

function getBubbleAccent(mood: DominiMood) {
  switch (mood) {
    case 'endgame':
      return 'border-amber-400 bg-stone-900/95 text-amber-200';
    case 'hype':
      return 'border-emerald-400 bg-stone-900/95 text-emerald-200';
    case 'sad':
      return 'border-sky-400/80 bg-slate-950/95 text-sky-100';
    case 'warning':
      return 'border-rose-500 bg-rose-950/95 text-rose-100';
    case 'oops':
      return 'border-amber-400/80 bg-stone-900/95 text-amber-200';
    case 'happy':
    default:
      return 'border-amber-300/70 bg-stone-900/95 text-white';
  }
}

export const DominiMascot: React.FC<DominiMascotProps> = ({
  event,
  visible,
  soundEnabled = true,
  spotlight = false,
  onTap,
}) => {
  const mood: DominiMood = event?.mood ?? 'happy';
  const isAlarm = mood === 'warning';
  const isSad = mood === 'sad';

  if (spotlight) {
    return (
      <div
        data-testid="domini-mascot"
        data-visible={visible ? 'true' : 'false'}
        data-mood={mood}
        data-spotlight="true"
        aria-live="polite"
        className={`fixed inset-0 z-[90] pointer-events-none flex items-center justify-center px-4 transition-opacity duration-300 ${
          visible ? 'opacity-100 bg-black/45' : 'opacity-0 bg-transparent'
        }`}
      >
        <div
          key={event?.id ?? 'spotlight'}
          className={`flex flex-col items-center gap-3 ${
            visible ? 'animate-domini-center-zoom-out' : ''
          }`}
        >
          {/* Centered Domini Character with Sad Emotions */}
          <button
            type="button"
            onClick={onTap}
            tabIndex={visible ? 0 : -1}
            aria-label="Domini"
            className="pointer-events-auto relative shrink-0 focus:outline-none cursor-pointer active:scale-95 transition-transform"
            style={{
              filter: isSad
                ? 'drop-shadow(0 12px 28px rgba(56, 189, 248, 0.42))'
                : isAlarm
                ? 'drop-shadow(0 12px 28px rgba(244, 63, 94, 0.65))'
                : 'drop-shadow(0 12px 24px rgba(0, 0, 0, 0.55))',
            }}
          >
            <svg
              width="96"
              height="122"
              viewBox="0 0 66 84"
              className="w-24 h-[122px] sm:w-28 sm:h-[142px]"
              aria-hidden="true"
            >
              {/* Drooped sympathetic hand when sad, raised when urgent */}
              <path
                d={
                  isSad
                    ? 'M14 48 C8 54, 8 61, 12 65'
                    : 'M14 42 C6 34, 5 24, 10 20'
                }
                fill="none"
                stroke={isSad ? '#64748B' : isAlarm ? '#FB7185' : '#F59E0B'}
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <circle
                cx={isSad ? 12 : 10}
                cy={isSad ? 65 : 20}
                r="3.5"
                fill={isSad ? '#CBD5E1' : isAlarm ? '#FECDD3' : '#FDE68A'}
              />

              {/* Subtle broken-heart / teardrop accent only when not sad? No, clean sad face without angry ! */}
              {isAlarm && (
                <g>
                  <circle cx="8" cy="11" r="7" fill="#E11D48" stroke="#FFF1F2" strokeWidth="1.5" />
                  <text
                    x="8"
                    y="14.5"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="10"
                    fontWeight="900"
                  >
                    !
                  </text>
                </g>
              )}

              <rect x="16" y="10" width="42" height="66" rx="10" fill={isSad ? '#7C8BA1' : '#A89370'} />
              <rect
                x="13"
                y="7"
                width="42"
                height="66"
                rx="10"
                fill="#FAF6EE"
                stroke={isSad ? '#60A5FA' : isAlarm ? '#F43F5E' : '#E5DBC7'}
                strokeWidth="2"
              />
              <path
                d="M15 15 C15 10, 18 8, 23 8 H45 C50 8, 53 10, 53 15 V17 H15 Z"
                fill={isSad ? '#475569' : isAlarm ? '#E11D48' : '#10B981'}
              />

              {isSad ? (
                <>
                  {/* Upturned inner sad eyebrows */}
                  <line x1="21" y1="25.5" x2="29.5" y2="21.5" stroke="#334155" strokeWidth="2.1" strokeLinecap="round" />
                  <line x1="47" y1="25.5" x2="38.5" y2="21.5" stroke="#334155" strokeWidth="2.1" strokeLinecap="round" />

                  {/* Big soulful watery eyes */}
                  <circle cx="26.5" cy="29" r="3.6" fill="#1E293B" />
                  <circle cx="41.5" cy="29" r="3.6" fill="#1E293B" />
                  <circle cx="25.4" cy="27.7" r="1.25" fill="#FFFFFF" />
                  <circle cx="40.4" cy="27.7" r="1.25" fill="#FFFFFF" />
                  <circle cx="27.6" cy="30.6" r="0.9" fill="#7DD3FC" />
                  <circle cx="42.6" cy="30.6" r="0.9" fill="#7DD3FC" />

                  {/* Glistening teardrops */}
                  <path
                    d="M23.2 32.5 C23.2 32.5, 25.3 35.6, 25.3 36.9 A2.1 2.1 0 1 1 21.1 36.9 C21.1 35.6, 23.2 32.5, 23.2 32.5 Z"
                    fill="#38BDF8"
                  />
                  <path
                    d="M44.8 32.5 C44.8 32.5, 46.9 35.6, 46.9 36.9 A2.1 2.1 0 1 1 42.7 36.9 C42.7 35.6, 44.8 32.5, 44.8 32.5 Z"
                    fill="#38BDF8"
                  />

                  {/* Soft blushing cheeks */}
                  <circle cx="20.5" cy="34.5" r="2.2" fill="#FDA4AF" opacity="0.6" />
                  <circle cx="47.5" cy="34.5" r="2.2" fill="#FDA4AF" opacity="0.6" />

                  {/* Sad quivering frown mouth */}
                  <path
                    d="M27.5 39.5 Q34 34 40.5 39.5"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  {/* Furrowed warning eyebrows + wide eyes */}
                  <line x1="22" y1="22" x2="30" y2="25" stroke="#9F1239" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="46" y1="22" x2="38" y2="25" stroke="#9F1239" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="26.5" cy="28.5" r="3.4" fill="#1E293B" />
                  <circle cx="41.5" cy="28.5" r="3.4" fill="#1E293B" />
                  <circle cx="27.5" cy="27.4" r="1.1" fill="#FFFFFF" />
                  <circle cx="42.5" cy="27.4" r="1.1" fill="#FFFFFF" />

                  <circle cx="21" cy="33" r="2.3" fill="#FDA4AF" opacity="0.7" />
                  <circle cx="47" cy="33" r="2.3" fill="#FDA4AF" opacity="0.7" />
                  <ellipse cx="34" cy="37" rx="3.2" ry="2.6" fill="#E11D48" stroke="#1E293B" strokeWidth="1.4" />
                </>
              )}

              <line
                x1="19"
                y1="45"
                x2="49"
                y2="45"
                stroke="#94A3B8"
                strokeOpacity="0.45"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="26" cy="57" r="3.2" fill="#2563EB" />
              <circle cx="42" cy="57" r="3.2" fill="#DC2626" />
            </svg>
          </button>

          {/* Centered Defeat Speech Bubble */}
          {event && (
            <button
              type="button"
              onClick={onTap}
              tabIndex={visible ? 0 : -1}
              data-testid="domini-bubble"
              className={`pointer-events-auto relative max-w-[280px] sm:max-w-[340px] rounded-2xl border-2 px-5 py-2.5 text-center text-sm sm:text-base font-display font-extrabold shadow-2xl cursor-pointer ${getBubbleAccent(
                mood
              )}`}
            >
              <span className="flex items-center justify-center gap-2 leading-snug">
                {soundEnabled && <Volume2 className="w-4 h-4 shrink-0 opacity-90" />}
                <span>{event.message}</span>
              </span>
              <span
                aria-hidden="true"
                className={`absolute left-1/2 -top-[7px] -translate-x-1/2 w-3 h-3 -rotate-45 border-r-2 border-t-2 border-inherit ${
                  isSad ? 'bg-slate-950' : isAlarm ? 'bg-rose-950' : 'bg-stone-900'
                }`}
              />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="domini-mascot"
      data-visible={visible ? 'true' : 'false'}
      data-mood={mood}
      data-spotlight="false"
      aria-live="polite"
      className="fixed right-0 top-[64px] sm:top-[72px] z-30 pointer-events-none flex items-start gap-2 pr-2 sm:pr-4"
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition:
          'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 220ms ease-out',
      }}
    >
      {/* Speech Bubble */}
      {event && (
        <button
          type="button"
          onClick={onTap}
          tabIndex={visible ? 0 : -1}
          data-testid="domini-bubble"
          className={`pointer-events-auto relative mt-1.5 max-w-[210px] sm:max-w-[260px] rounded-2xl border-2 px-3.5 py-2 text-left text-xs sm:text-sm font-display font-bold shadow-2xl cursor-pointer ${getBubbleAccent(
            mood
          )}`}
        >
          <span className="flex items-start gap-1.5 leading-snug">
            {soundEnabled && <Volume2 className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-80" />}
            <span>{event.message}</span>
          </span>
          {/* Speech tail pointing right toward Domini */}
          <span
            aria-hidden="true"
            className={`absolute right-[-7px] top-3.5 w-3 h-3 rotate-45 border-r-2 border-t-2 border-inherit ${
              isSad ? 'bg-slate-950' : isAlarm ? 'bg-rose-950' : 'bg-stone-900'
            }`}
          />
        </button>
      )}

      {/* Domini Character — Peeking from Top-Right Edge */}
      <button
        type="button"
        onClick={onTap}
        tabIndex={visible ? 0 : -1}
        aria-label="Domini"
        className="pointer-events-auto relative shrink-0 focus:outline-none cursor-pointer active:scale-95 transition-transform"
        style={{
          filter: isAlarm
            ? 'drop-shadow(0 8px 18px rgba(244, 63, 94, 0.55))'
            : 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.48))',
        }}
      >
        <svg
          width="66"
          height="84"
          viewBox="0 0 66 84"
          className="w-14 h-[72px] sm:w-[66px] sm:h-[84px]"
          aria-hidden="true"
        >
          {/* Left waving hand */}
          <path
            d={
              mood === 'hype' || mood === 'endgame' || mood === 'warning'
                ? 'M14 42 C6 34, 5 24, 10 20'
                : isSad
                ? 'M14 48 C8 54, 8 61, 12 65'
                : 'M14 46 C7 44, 6 37, 10 33'
            }
            fill="none"
            stroke={isSad ? '#64748B' : isAlarm ? '#FB7185' : '#F59E0B'}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle
            cx={isSad ? 12 : 10}
            cy={
              isSad
                ? 65
                : mood === 'hype' || mood === 'endgame' || mood === 'warning'
                ? 20
                : 33
            }
            r="3.5"
            fill={isSad ? '#CBD5E1' : isAlarm ? '#FECDD3' : '#FDE68A'}
          />

          {/* Urgent warning exclamation sign */}
          {isAlarm && (
            <g>
              <circle cx="8" cy="11" r="7" fill="#E11D48" stroke="#FFF1F2" strokeWidth="1.5" />
              <text
                x="8"
                y="14.5"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="900"
              >
                !
              </text>
            </g>
          )}

          {/* 3D Side Depth */}
          <rect
            x="16"
            y="10"
            width="42"
            height="66"
            rx="10"
            fill={isSad ? '#7C8BA1' : '#A89370'}
          />

          {/* Ivory Domino Body */}
          <rect
            x="13"
            y="7"
            width="42"
            height="66"
            rx="10"
            fill="#FAF6EE"
            stroke={isSad ? '#60A5FA' : isAlarm ? '#F43F5E' : mood === 'endgame' ? '#F59E0B' : '#E5DBC7'}
            strokeWidth="2"
          />

          {/* Craft Cap / Crown / Warning Stripe */}
          <path
            d="M15 15 C15 10, 18 8, 23 8 H45 C50 8, 53 10, 53 15 V17 H15 Z"
            fill={isSad ? '#475569' : isAlarm ? '#E11D48' : mood === 'endgame' ? '#F59E0B' : '#10B981'}
          />

          {/* Eyes */}
          {mood === 'oops' ? (
            <>
              <line x1="24" y1="26" x2="29" y2="30" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="29" y1="26" x2="24" y2="30" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="39" y1="26" x2="44" y2="30" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="44" y1="26" x2="39" y2="30" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
            </>
          ) : isSad ? (
            <>
              <line x1="21" y1="25.5" x2="29.5" y2="21.5" stroke="#334155" strokeWidth="2.1" strokeLinecap="round" />
              <line x1="47" y1="25.5" x2="38.5" y2="21.5" stroke="#334155" strokeWidth="2.1" strokeLinecap="round" />
              <circle cx="26.5" cy="29" r="3.6" fill="#1E293B" />
              <circle cx="41.5" cy="29" r="3.6" fill="#1E293B" />
              <circle cx="25.4" cy="27.7" r="1.2" fill="#FFFFFF" />
              <circle cx="40.4" cy="27.7" r="1.2" fill="#FFFFFF" />
              <path
                d="M23.2 32.5 C23.2 32.5, 25.3 35.6, 25.3 36.9 A2.1 2.1 0 1 1 21.1 36.9 C21.1 35.6, 23.2 32.5, 23.2 32.5 Z"
                fill="#38BDF8"
              />
            </>
          ) : isAlarm ? (
            <>
              {/* Furrowed warning eyebrows + wide eyes */}
              <line x1="22" y1="22" x2="30" y2="25" stroke="#9F1239" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="46" y1="22" x2="38" y2="25" stroke="#9F1239" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="26.5" cy="28.5" r="3.4" fill="#1E293B" />
              <circle cx="41.5" cy="28.5" r="3.4" fill="#1E293B" />
              <circle cx="27.5" cy="27.4" r="1.1" fill="#FFFFFF" />
              <circle cx="42.5" cy="27.4" r="1.1" fill="#FFFFFF" />
            </>
          ) : (
            <>
              <circle cx="26.5" cy="27.5" r="3.4" fill="#1E293B" />
              <circle cx="41.5" cy="27.5" r="3.4" fill="#1E293B" />
              <circle cx="27.6" cy="26.4" r="1.1" fill="#FFFFFF" />
              <circle cx="42.6" cy="26.4" r="1.1" fill="#FFFFFF" />
            </>
          )}

          {/* Cheeks */}
          <circle cx="21" cy="33" r="2.3" fill="#FDA4AF" opacity="0.7" />
          <circle cx="47" cy="33" r="2.3" fill="#FDA4AF" opacity="0.7" />

          {/* Expressive Mouth */}
          {mood === 'hype' || mood === 'endgame' ? (
            <path
              d="M28 34 Q34 42 40 34 Z"
              fill="#DC2626"
              stroke="#1E293B"
              strokeWidth="1.4"
            />
          ) : isSad ? (
            <path
              d="M27.5 39.5 Q34 34 40.5 39.5"
              fill="none"
              stroke="#1E293B"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ) : mood === 'oops' || isAlarm ? (
            <ellipse cx="34" cy="37" rx="3.2" ry="2.6" fill="#E11D48" stroke="#1E293B" strokeWidth="1.4" />
          ) : (
            <path
              d="M28 34 Q34 40 40 34"
              fill="none"
              stroke="#1E293B"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}

          {/* Center Domino Divider */}
          <line
            x1="19"
            y1="45"
            x2="49"
            y2="45"
            stroke="#94A3B8"
            strokeOpacity="0.45"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Bottom Domino Pips (2-pip signature) */}
          <circle cx="26" cy="57" r="3.2" fill="#2563EB" />
          <circle cx="42" cy="57" r="3.2" fill="#DC2626" />
        </svg>
      </button>
    </div>
  );
};
