import type {
  ProviderSearchResult,
  TravelProvider,
  TravelSearchInput,
} from "@/lib/travel/contracts";

type AggregatorOptions = {
  timeoutMs?: number;
  retries?: number;
  cacheTtlMs?: number;
  failureThreshold?: number;
  circuitResetMs?: number;
};

type Circuit = { failures: number; openedAt?: number };
type CacheEntry = { expiresAt: number; value: ProviderSearchResult };

export class ProviderAggregator {
  private readonly circuits = new Map<string, Circuit>();
  private readonly cache = new Map<string, CacheEntry>();
  private readonly options: Required<AggregatorOptions>;

  constructor(
    private readonly providers: TravelProvider[],
    options: AggregatorOptions = {},
  ) {
    this.options = {
      timeoutMs: options.timeoutMs ?? 3_500,
      retries: options.retries ?? 1,
      cacheTtlMs: options.cacheTtlMs ?? 60_000,
      failureThreshold: options.failureThreshold ?? 3,
      circuitResetMs: options.circuitResetMs ?? 30_000,
    };
  }

  async search(input: TravelSearchInput): Promise<ProviderSearchResult[]> {
    return Promise.all(this.providers.map((provider) => this.searchProvider(provider, input)));
  }

  private async searchProvider(provider: TravelProvider, input: TravelSearchInput) {
    const cacheKey = `${provider.name}:${JSON.stringify(input)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const circuit = this.circuits.get(provider.name) ?? { failures: 0 };
    if (circuit.openedAt && Date.now() - circuit.openedAt < this.options.circuitResetMs) {
      return this.unavailable(provider, "CIRCUIT_OPEN");
    }

    const startedAt = Date.now();
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.options.retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
      try {
        const offers = await provider.search(input, controller.signal);
        clearTimeout(timer);
        this.circuits.set(provider.name, { failures: 0 });
        const value: ProviderSearchResult = {
          provider: provider.name,
          kind: provider.kind,
          status: "SUCCESS",
          latencyMs: Date.now() - startedAt,
          offers,
        };
        this.cache.set(cacheKey, {
          expiresAt: Date.now() + this.options.cacheTtlMs,
          value,
        });
        return value;
      } catch (error) {
        clearTimeout(timer);
        lastError = error;
      }
    }

    const failures = circuit.failures + 1;
    this.circuits.set(provider.name, {
      failures,
      openedAt: failures >= this.options.failureThreshold ? Date.now() : undefined,
    });
    return {
      ...this.unavailable(
        provider,
        lastError instanceof DOMException && lastError.name === "AbortError"
          ? "TIMEOUT"
          : "PROVIDER_ERROR",
      ),
      latencyMs: Date.now() - startedAt,
    };
  }

  private unavailable(provider: TravelProvider, errorCode: string): ProviderSearchResult {
    return {
      provider: provider.name,
      kind: provider.kind,
      status: "UNAVAILABLE",
      latencyMs: 0,
      offers: [],
      errorCode,
    };
  }
}
