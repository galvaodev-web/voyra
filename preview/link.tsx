import type { AnchorHTMLAttributes } from "react";
import { routeHref, navigate } from "./navigation";
type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};
export default function Link({
  href,
  prefetch: _prefetch,
  replace = false,
  scroll: _scroll,
  onClick,
  ...props
}: Props) {
  const internal = href.startsWith("/") && !href.startsWith("//");
  return (
    <a
      {...props}
      href={internal ? routeHref(href) : href}
      onClick={(event) => {
        onClick?.(event);
        if (
          !internal ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank"
        )
          return;
        event.preventDefault();
        navigate(href, replace);
      }}
    />
  );
}
