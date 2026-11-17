/**
 * Valores monetários. Tudo é tratado em centavos (inteiros) para evitar
 * erro de ponto flutuante na soma dos itens.
 */
(function (NS) {
  'use strict';

  /** "1.234,56" | "R$ 47,09" → 123456 | 4709 */
  function parseBRL(text) {
    const clean = String(text ?? '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const value = Number(clean);
    return Number.isFinite(value) ? Math.round(value * 100) : 0;
  }

  /** 123456 → "1.234,56" */
  function formatBRL(cents) {
    return (cents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /** 8799 → 8700 (trunca, nunca arredonda para cima) */
  function truncateCents(cents) {
    return cents - (cents % 100);
  }

  NS.money = { parseBRL, formatBRL, truncateCents };
})((globalThis.NFCe = globalThis.NFCe || {}));
