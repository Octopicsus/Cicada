export type { BankingProvider, ProviderCapabilities } from "./core/provider";
export { ProviderError } from "./core/errors";
export { getProvider, getProviderForInstitution } from "./core/registry";

export { MonobankProvider } from "./providers/monobank";
