/** Opens an external URL in the system browser. */
export interface OpenerPort {
  open(url: string): Promise<void>;
}
