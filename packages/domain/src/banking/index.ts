export type { BankingProvider, ProviderCapabilities } from "./core/provider";
export { ProviderError } from "./core/errors";
export { getProvider, getProviderForInstitution } from "./core/registry";

// MonobankProvider re-exported by the next commit (first concrete adapter).
