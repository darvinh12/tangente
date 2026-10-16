import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "math-field": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        "math-virtual-keyboard-policy"?: string;
        "smart-fence"?: string;
        "aria-label"?: string;
      };
    }
  }
}
