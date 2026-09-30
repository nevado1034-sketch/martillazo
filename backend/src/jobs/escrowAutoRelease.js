/**
 * Libera custodia automáticamente 24 h después de delivered/received
 * si el comprador no confirmó ni reclamó.
 */
export class EscrowAutoReleaseJob {
  constructor({ escrowService, intervalMs = 60_000 }) {
    this.escrowService = escrowService;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  start() {
    this.runOnce().catch((err) =>
      console.error('[escrow-auto] primer ciclo:', err.message),
    );
    this.timer = setInterval(
      () =>
        this.runOnce().catch((err) =>
          console.error('[escrow-auto] error:', err.message),
        ),
      this.intervalMs,
    );
    this.timer.unref?.();
    console.log(
      `[escrow-auto] activo (cada ${this.intervalMs} ms) — reloj desde entrega`,
    );
    return this;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce() {
    const results = await this.escrowService.processAutoReleases();
    if (results.length) {
      console.log(`[escrow-auto] procesados ${results.length}`, results);
    }
    return results;
  }
}
