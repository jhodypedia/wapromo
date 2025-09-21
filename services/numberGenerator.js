export const operatorPrefixes = {
  telkomsel: ["0811","0812","0813","0821","0822","0823","0851","0852","0853"],
  indosat:   ["0814","0815","0816","0855","0856","0857","0858"],
  xl:        ["0817","0818","0819","0859","0877","0878"],
  axis:      ["0831","0832","0833","0838"],
  tri:       ["0895","0896","0897","0898","0899"],
  smartfren: ["0881","0882","0883","0884","0885","0886","0887","0888","0889"],
  byu:       ["0851"]
};

/**
 * Generate random phone numbers by operator
 */
export function generateNumbers(operator, count = 10, length = 12) {
  const prefixes = operatorPrefixes[operator];
  if (!prefixes) throw new Error("Operator tidak valid");

  const results = [];
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const remaining = length - prefix.length;
    let num = prefix;
    for (let j = 0; j < remaining; j++) {
      num += Math.floor(Math.random() * 10);
    }
    results.push(num);
  }
  return results;
}
