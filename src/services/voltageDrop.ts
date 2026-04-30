/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Resisivity of Copper at 70°C (PVC Insulation) in Ohm.mm2/m
// NBR 5410 standard value is approx 0.0225 for calculation at operating temperature
const COPPER_RESISTIVITY = 0.0225;

export interface VoltageDropResult {
  voltageDrop: number; // Volts
  percentageDrop: number; // %
  isWithinLimit: boolean;
  suggestedGauge: number; // mm2
  current: number; // Amperes
}

/**
 * Calculates voltage drop for a circuit
 * @param power Power in Watts (for force) or VA (for lighting)
 * @param length Distance in meters (one way)
 * @param gauge Cross-section in mm2
 * @param voltage Nominal voltage (127 or 220)
 * @param isThreePhase Whether the circuit is three-phase
 * @param limit Percentage limit (e.g., 4 for 4%)
 * @param cosPhi Power factor (default 1.0 for simplification)
 */
export function calculateVoltageDrop(
  power: number,
  length: number,
  gauge: number,
  voltage: number,
  isThreePhase: boolean = false,
  limit: number = 4,
  cosPhi: number = 0.95
): VoltageDropResult {
  // 1. Calculate Current (I)
  // Single Phase: I = P / (V * cosPhi)
  // Three Phase: I = P / (sqrt(3) * V_L * cosPhi)
  let current: number;
  if (isThreePhase) {
    current = power / (Math.sqrt(3) * voltage * cosPhi);
  } else {
    current = power / (voltage * cosPhi);
  }

  // 2. Voltage Drop (dV)
  // Single Phase: dV = (2 * rho * L * I * cosPhi) / S
  // Three Phase: dV = (sqrt(3) * rho * L * I * cosPhi) / S
  let dV: number;
  if (isThreePhase) {
    // rho * L * I * sqrt(3)
    // Actually dV between phases is sqrt(3) * RI cosPhi
    dV = (Math.sqrt(3) * COPPER_RESISTIVITY * length * current * cosPhi) / gauge;
  } else {
    dV = (2 * COPPER_RESISTIVITY * length * current * cosPhi) / gauge;
  }

  const percentageDrop = (dV / voltage) * 100;
  const isWithinLimit = percentageDrop <= limit;

  // 3. Suggest Gauge if needed
  let suggestedGauge = gauge;
  if (!isWithinLimit) {
    const standardGauges = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
    for (const s of standardGauges) {
      if (s <= gauge) continue;
      
      let testDV: number;
      if (isThreePhase) {
        testDV = (Math.sqrt(3) * COPPER_RESISTIVITY * length * current * cosPhi) / s;
      } else {
        testDV = (2 * COPPER_RESISTIVITY * length * current * cosPhi) / s;
      }
      
      if ((testDV / voltage) * 100 <= limit) {
        suggestedGauge = s;
        break;
      }
    }
  }

  return {
    voltageDrop: dV,
    percentageDrop,
    isWithinLimit,
    suggestedGauge,
    current
  };
}
