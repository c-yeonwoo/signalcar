/** Alert delivery remains closed until price evidence, consent and opt-out are verified. */
export function priceAlertsEnabled() {
  return process.env.SIGNALCAR_PRICE_ALERTS_ENABLED === "true";
}
