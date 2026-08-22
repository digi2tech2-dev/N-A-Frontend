import React from 'react';

const SidebarToggleIcon = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={`sidebar-toggle-icon ${className}`}
  >
    <rect
      x="2.75"
      y="3.75"
      width="18.5"
      height="16.5"
      rx="4.25"
      className="sidebar-toggle-icon__frame"
    />
    <path d="M14.75 4.2v15.6" className="sidebar-toggle-icon__rail" />
    <path d="M6.25 8.25h5.15M6.25 12h3.7M6.25 15.75h5.15" className="sidebar-toggle-icon__content" />
    <path d="m18.55 9.45-2.5 2.55 2.5 2.55" className="sidebar-toggle-icon__arrow" />
  </svg>
);

export default SidebarToggleIcon;
