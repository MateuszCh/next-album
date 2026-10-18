// Inline icons: 24×24 viewBox, `currentColor`, round caps and joins — the app's
// one stroke style (no icon library).

type IconProps = { size?: number; className?: string };

const STAR_PATH = 'M12 17.3l-5.4 3.2 1.4-6.1-4.7-4.1 6.2-.5L12 4l2.5 5.8 6.2.5-4.7 4.1 1.4 6.1z';

export function StarIcon({
    size = 24,
    filled = false,
    strokeWidth = 1.6,
}: IconProps & {
    filled?: boolean;
    strokeWidth?: number;
}) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d={STAR_PATH}
                fill={filled ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Skip-forward: the round play button. */
export function SkipIcon({ size = 34 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 5.5v13l10-6.5-10-6.5z" fill="currentColor" />
            <path d="M18 5.5v13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
    );
}

/** Double play: the Tuner Next key. */
export function FastForwardIcon({ size = 26 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 6v12l8-6-8-6zM12 6v12l8-6-8-6z" fill="currentColor" />
        </svg>
    );
}

export function SlidersIcon({ size = 24 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d="M4 7h10M18 7h2M4 17h4M12 17h8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <circle cx="16" cy="7" r="2" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="10" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}

/** Disc with a play triangle — the brand mark, also the Losuj tab. */
export function DiscIcon({ size = 22, strokeWidth = 2 }: IconProps & { strokeWidth?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={strokeWidth} />
            <path d="M10.5 9.2v5.6l4.4-2.8-4.4-2.8z" fill="currentColor" />
        </svg>
    );
}

export function ClockIcon({ size = 22, strokeWidth = 1.8 }: IconProps & { strokeWidth?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={strokeWidth} />
            <path
                d="M12 7v5l3.5 2"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function UserIcon({ size = 22, strokeWidth = 1.8 }: IconProps & { strokeWidth?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={strokeWidth} />
            <path
                d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
        </svg>
    );
}

export function LogoutIcon({ size = 20 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Opens in a new tab (listen links). */
export function ExternalIcon({ size = 14 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d="M8 16L16 8M9 8h7v7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Guma's four-point sparkle (decoration and the wordmark). */
export function SparkleIcon({ size = 18, className }: IconProps) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <path d="M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z" />
        </svg>
    );
}

/** Arrow: Guma's Next button. */
export function ArrowIcon({ size = 18 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d="M5 12h13M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Kaseta's three-stripe bar (orange / amber / red): the logo, the card, the nav. */
export function Stripes({ className = '' }: { className?: string }) {
    return (
        <span className={`stripes ${className}`} aria-hidden>
            <span />
            <span />
            <span />
        </span>
    );
}
