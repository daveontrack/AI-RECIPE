export default function LogoMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Chef hat outline */}
      <path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" />

      {/* Hat band */}
      <path d="M6 16.9h12" strokeWidth="1.9" />

      {/* Circuit traces rising from the band, stepped to match the original mark */}
      <path d="M9.9 13.4v3" strokeWidth="1.4" />
      <path d="M12 9.9v6.4" strokeWidth="1.4" />
      <path d="M14.1 12.7v3.7" strokeWidth="1.4" />

      {/* Solder nodes sitting exactly on the trace ends */}
      <circle cx="9.9" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="9" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.1" cy="11.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
