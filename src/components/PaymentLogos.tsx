import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Authentic DANA Official Brand Logo SVG
 * Using official DANA blue (#118EEA), white typography and accent
 */
export const DanaLogo: React.FC<LogoProps> = ({ className = 'h-6' }) => {
  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 140 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto max-h-8"
        aria-label="Logo Resmi DANA"
      >
        {/* DANA Rounded Blue Background Plaque */}
        <rect width="140" height="40" rx="8" fill="#118EEA" />
        
        {/* Authentic DANA Typography & Identity */}
        <g fill="#FFFFFF">
          {/* Letter D */}
          <path
            d="M26 12H35.5C41.299 12 46 16.701 46 22.5C46 28.299 41.299 33 35.5 33H26V12ZM31.6 28H35.2C38.4 28 40.5 25.6 40.5 22.5C40.5 19.4 38.4 17 35.2 17H31.6V28Z"
          />
          {/* Letter A */}
          <path
            d="M58.2 12H64.8L73.5 33H67.6L65.9 28.5H57.1L55.4 33H49.5L58.2 12ZM64.3 24.2L61.5 16.8L58.7 24.2H64.3Z"
          />
          {/* Letter N */}
          <path
            d="M78 12H83.8L93.2 26.2V12H98.6V33H93L83.4 18.5V33H78V12Z"
          />
          {/* Letter A */}
          <path
            d="M109.2 12H115.8L124.5 33H118.6L116.9 28.5H108.1L106.4 33H100.5L109.2 12ZM115.3 24.2L112.5 16.8L109.7 24.2H115.3Z"
          />
        </g>
        
        {/* Small Indonesia Trust Emblem */}
        <circle cx="16" cy="20" r="4.5" fill="#FFFFFF" />
        <path
          d="M14.5 20L15.8 21.3L18 19"
          stroke="#118EEA"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/**
 * Authentic GoPay Official Brand Logo SVG
 * Using official GoPay cyan/blue (#00AED6) emblem and typography
 */
export const GopayLogo: React.FC<LogoProps> = ({ className = 'h-6' }) => {
  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 140 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto max-h-8"
        aria-label="Logo Resmi GoPay"
      >
        {/* GoPay Rounded Brand Background Plaque */}
        <rect width="140" height="40" rx="8" fill="#00AED6" />

        {/* GoPay Iconic Stylized Circular Ring Emblem */}
        <g transform="translate(12, 10)">
          <circle cx="10" cy="10" r="8.5" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="10" cy="10" r="3.2" fill="#FFFFFF" />
        </g>

        {/* Official "gopay" bold brand lettering */}
        <g fill="#FFFFFF">
          <text
            x="40"
            y="26"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="18"
            fontWeight="900"
            letterSpacing="-0.5px"
          >
            gopay
          </text>
        </g>
      </svg>
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
