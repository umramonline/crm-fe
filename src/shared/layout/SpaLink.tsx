import type { LinkComponent } from "@adminlte/react";

export const SpaLink: LinkComponent = ({ href, children, onClick, ...rest }) => (
  <a
    href={href}
    {...rest}
    onClick={(event) => {
      onClick?.(event);
      if (event.defaultPrevented) {
        return;
      }

      event.preventDefault();
      window.history.pushState(null, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }}
  >
    {children}
  </a>
);
