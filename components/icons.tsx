import React from 'react';

export const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-11.664 0l3.181-3.183a8.25 8.25 0 00-11.664 0l3.181 3.183" />
  </svg>
);

export const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const DiceIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M15.5 2h-11A2.5 2.5 0 002 4.5v11A2.5 2.5 0 004.5 18h11a2.5 2.5 0 002.5-2.5v-11A2.5 2.5 0 0015.5 2zM10 5a1 1 0 100 2 1 1 0 000-2zM6 9a1 1 0 100 2 1 1 0 000-2zm8 0a1 1 0 100 2 1 1 0 000-2zm-4 4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
    </svg>
);

export const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

export const ImageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

export const COMPULSIVO_LOGO_BASE64 = `data:image/png;base64,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`;