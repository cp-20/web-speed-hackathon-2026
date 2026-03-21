import { AnchorHTMLAttributes, forwardRef } from "react";
import { Link as RouterLink } from "wouter";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
};

export const Link = forwardRef<HTMLAnchorElement, Props>((props, ref) => {
  return <RouterLink ref={ref} {...props} />;
});

Link.displayName = "Link";
