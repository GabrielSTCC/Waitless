/** Tempo estimado = tempo médio por atendimento × pessoas à frente (posição − 1). */
export function estimateWaitMin(position: number, avgServiceTimeMin: number): number {
  return Math.max(0, position - 1) * avgServiceTimeMin;
}
