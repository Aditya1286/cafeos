import React from 'react';
import { Link } from 'react-router-dom';
import { FooterLink } from './footerContent';

interface FooterAnchorProps {
  link: FooterLink;
  className?: string;
}

/** A footer link: a router link inside the app, a plain anchor for WhatsApp, email and Instagram. */
export const FooterAnchor: React.FC<FooterAnchorProps> = ({ link, className }) =>
  link.external ? (
    <a href={link.to} target="_blank" rel="noopener noreferrer" className={className}>
      {link.label}
    </a>
  ) : (
    <Link to={link.to} className={className}>
      {link.label}
    </Link>
  );
