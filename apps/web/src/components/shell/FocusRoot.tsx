"use client";

import { init } from "@noriginmedia/norigin-spatial-navigation-core";
import { IconContext } from "@phosphor-icons/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useEffect, type ReactNode } from "react";
import { isTv } from "@/lib/tv";

let spatialNavReady = false;

/** App-wide client providers. In TV mode, also boots norigin spatial navigation. */
export function FocusRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isTv()) return;
    document.documentElement.dataset.tv = "true";
    if (!spatialNavReady) {
      init({ shouldFocusDOMNode: true, throttle: 80 });
      spatialNavReady = true;
    }
  }, []);

  return (
    <IconContext.Provider value={{ weight: "regular", size: 20 }}>
      <Tooltip.Provider delayDuration={300}>{children}</Tooltip.Provider>
    </IconContext.Provider>
  );
}
