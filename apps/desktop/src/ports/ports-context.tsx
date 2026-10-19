import { createContext, useContext, type ReactNode } from "react";

import type { Ports } from "./index";

const PortsContext = createContext<Ports | null>(null);

interface PortsProviderProps {
  ports: Ports;
  children: ReactNode;
}

export function PortsProvider({ ports, children }: PortsProviderProps) {
  return <PortsContext value={ports}>{children}</PortsContext>;
}

/** Read the composition root. Throws when used outside `PortsProvider`. */
export function usePorts(): Ports {
  const ports = useContext(PortsContext);
  if (!ports) {
    throw new Error("usePorts must be used inside PortsProvider");
  }
  return ports;
}
