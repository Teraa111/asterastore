import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Authentic DANA Official Brand Logo
 * Using uploaded official asset: /assets/aistudio/images_8db3e262.png
 */
export const DanaLogo: React.FC<LogoProps> = ({ className = 'h-6' }) => {
  return (
    <div className={`inline-flex items-center justify-center shrink-0 bg-white rounded-md px-1.5 py-0.5 ${className}`}>
      <img
        src="/assets/aistudio/images_8db3e262.png"
        alt="Logo Resmi DANA"
        className="h-full w-auto max-h-7 object-contain"
        loading="lazy"
      />
    </div>
  );
};

/**
 * Authentic GoPay Official Brand Logo
 * Using uploaded official asset: /assets/aistudio/2oYgiVPUa27XyepRpUf6O2SEcnG_cover_294_4c24c3d3.png
 */
export const GopayLogo: React.FC<LogoProps> = ({ className = 'h-6' }) => {
  return (
    <div className={`inline-flex items-center justify-center shrink-0 bg-white rounded-md px-1.5 py-0.5 ${className}`}>
      <img
        src="/assets/aistudio/2oYgiVPUa27XyepRpUf6O2SEcnG_cover_294_4c24c3d3.png"
        alt="Logo Resmi GoPay"
        className="h-full w-auto max-h-7 object-contain"
        loading="lazy"
      />
    </div>
  );
};

/**
 * Authentic Indonesian National QRIS Logo SVG
 * Standard red chevron & black lettering
 */
export const QrisLogo: React.FC<LogoProps> = ({ className = 'h-6' }) => {
  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 120 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto max-h-8"
        aria-label="Logo Resmi QRIS"
      >
        <rect width="120" height="40" rx="8" fill="#FFFFFF" />
        
        {/* Red QRIS Chevron Triangle Accent */}
        <path
          d="M14 10L24 20L14 30H20L30 20L20 10H14Z"
          fill="#EE2E24"
        />
        <path
          d="M22 10L32 20L22 30H27L37 20L27 10H22Z"
          fill="#1C1C1E"
        />

        {/* QRIS Official Typography */}
        <g fill="#1C1C1E">
          <text
            x="42"
            y="25"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="17"
            fontWeight="900"
            letterSpacing="0.5px"
          >
            QRIS
          </text>
          <text
            x="42"
            y="32"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="5.5"
            fontWeight="700"
            letterSpacing="0.2px"
            fill="#6B7280"
          >
            NATIONAL QR
          </text>
        </g>
      </svg>
    </div>
  );
};
