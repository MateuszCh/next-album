/**
 * Brand mark + wordmark. The SVG glyph is a stylised disc / "play" — a record
 * spinning with a play triangle at its centre.
 */
export function LogoMark({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M10.5 9.2v5.6l4.4-2.8-4.4-2.8Z" fill="currentColor" />
        </svg>
    );
}

export function Logo() {
    return (
        <span className="logo">
            <span className="logo-word">
                <b>next</b>
                <span>·</span>
                <b>album</b>
            </span>
        </span>
    );
}
