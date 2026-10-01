export function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1),
  );
  return sortedAsc[idx];
}

export function createMetrics() {
  /** @type {Array<{name:string,ok:boolean,status:number,ms:number,expectedFailure?:boolean,error?:string,meta?:any}>} */
  const samples = [];

  return {
    record(sample) {
      samples.push(sample);
    },
    samples() {
      return samples;
    },
    summarize() {
      const byName = new Map();
      let unexpectedErrors = 0;
      let expectedFailures = 0;
      const collisionBooked = [];

      for (const s of samples) {
        if (!byName.has(s.name)) {
          byName.set(s.name, []);
        }
        byName.get(s.name).push(s);
        if (s.expectedFailure) expectedFailures += 1;
        else if (!s.ok) unexpectedErrors += 1;
        if (s.meta?.collision && s.meta?.booked) {
          collisionBooked.push(s.meta.scheduledAt);
        }
      }

      const routes = {};
      for (const [name, list] of byName) {
        const latencies = list.map((x) => x.ms).sort((a, b) => a - b);
        const errors = list.filter((x) => !x.ok && !x.expectedFailure).length;
        const statuses = {};
        for (const x of list) {
          const key = String(x.status);
          statuses[key] = (statuses[key] ?? 0) + 1;
        }
        routes[name] = {
          count: list.length,
          errors,
          errorRate: list.length ? errors / list.length : 0,
          p50: percentile(latencies, 50),
          p95: percentile(latencies, 95),
          p99: percentile(latencies, 99),
          max: latencies[latencies.length - 1] ?? 0,
          statuses,
        };
      }

      const allLatencies = samples.map((s) => s.ms).sort((a, b) => a - b);
      const writeNames = [
        "POST /api/appointments/book",
        "POST /api/appointments/book (collision)",
        "POST /api/admin/queue",
        "PATCH /api/admin/queue",
        "POST /api/appointments/arrive",
        "POST /api/queue/withdraw",
        "POST /api/appointments (confirm)",
      ];
      const writeSamples = samples.filter((s) => writeNames.includes(s.name));
      const writeLatencies = writeSamples.map((s) => s.ms).sort((a, b) => a - b);
      const writeErrors = writeSamples.filter(
        (s) => !s.ok && !s.expectedFailure,
      ).length;

      // Duplicatas no mesmo horário (colisão): contar quantos booked por scheduledAt
      const bookedBySlot = new Map();
      for (const s of samples) {
        if (
          (s.name === "POST /api/appointments/book" ||
            s.name === "POST /api/appointments/book (collision)") &&
          s.ok &&
          !s.expectedFailure &&
          s.meta?.scheduledAt
        ) {
          const key = s.meta.scheduledAt;
          bookedBySlot.set(key, (bookedBySlot.get(key) ?? 0) + 1);
        }
      }
      const duplicateSlots = [...bookedBySlot.entries()]
        .filter(([, count]) => count > 1)
        .map(([scheduledAt, count]) => ({ scheduledAt, count }));

      return {
        totalRequests: samples.length,
        unexpectedErrors,
        expectedFailures,
        errorRate: samples.length ? unexpectedErrors / samples.length : 0,
        p50: percentile(allLatencies, 50),
        p95: percentile(allLatencies, 95),
        p99: percentile(allLatencies, 99),
        write: {
          count: writeSamples.length,
          errors: writeErrors,
          errorRate: writeSamples.length ? writeErrors / writeSamples.length : 0,
          p50: percentile(writeLatencies, 50),
          p95: percentile(writeLatencies, 95),
          p99: percentile(writeLatencies, 99),
        },
        duplicateSlots,
        collisionBookedCount: collisionBooked.length,
        routes,
      };
    },
  };
}
