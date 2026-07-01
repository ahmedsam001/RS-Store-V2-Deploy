import { type AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';

type CatalogLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export function CatalogLink({ href, ...props }: CatalogLinkProps) {
  return <Link to={href} {...props} />;
}
