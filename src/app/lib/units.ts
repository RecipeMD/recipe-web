import Fraction from "fraction.js";

export function simplifyUnit(quantity: Fraction, unit: string): { quantity: Fraction, unit: string } {
  let q = parseFloat(quantity.valueOf().toFixed(2));
  if (q >= 1000 && ['g', 'ml', 'mL'].includes(unit)) {
    switch (unit) {
      case 'g': unit = 'kg'; quantity = quantity.div(1000); break;
      case 'ml': unit = 'l'; quantity = quantity.div(1000); break;
      case 'mL': unit = 'L'; quantity = quantity.div(1000); break;
    }
  } else if (q < 1 && ['kg', 'l', 'L'].includes(unit)) {
    switch (unit) {
      case 'kg': unit = 'g'; quantity = quantity.mul(1000); break;
      case 'l': unit = 'ml'; quantity = quantity.mul(1000); break;
      case 'L': unit = 'mL'; quantity = quantity.mul(1000); break;
    }
  }

  // enable conversion chaining from here, so TL -> EL -> cup is possible
  if (['tl', 'tsp'].includes(unit.toLowerCase()) && q > 5) {
    quantity = quantity.div(3);
    unit = unit.toLowerCase() === 'tl' ? 'EL' : 'Tbsp';
    q = parseFloat(quantity.valueOf().toFixed(2));
  }

  if (['el', 'tbsp'].includes(unit.toLowerCase())) {
    if (q < 1) {
      quantity = quantity.mul(3);
      unit = unit.toLowerCase() === 'el' ? 'TL' : 'tsp';
      // } else if (q >= 8) {
      //   quantity = quantity.div(16);
      //   if (parseFloat(quantity.valueOf().toFixed(2)) === 1) {
      //     unit = unit.toLowerCase() === 'el' ? 'Tasse' : 'cup';
      //   } else {
      //     unit = unit.toLowerCase() === 'el' ? 'Tassen' : 'cups';
      //   }
    }
  }

  return { quantity, unit };
}

export function convertTemperature(temperature: string): string {
  const matches = temperature.match(/([0-9]+[0-9.,]*)([\s°]*?)(C|F)/);
  if (!matches) {
    throw new Error("No temperature found");
  }
  let result = new Fraction(matches[1]);
  if (matches[3] === 'F') {
    result = result.sub(32).mul(5).div(9).roundTo(5);
    return temperature.replace(matches[0], `${result.valueOf()}${matches[2]}C`);
  }
  result = result.mul(9).div(5).add(32).roundTo(5);
  return temperature.replace(matches[0], `${result.valueOf()}${matches[2]}F`);
}
