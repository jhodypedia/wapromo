export const operatorPrefixes = {
  telkomsel: ["62811","62812","62813","62821","62822","62823","62851","62852","62853"],
  indosat:   ["62814","62815","62816","62855","62856","62857","62858"],
  xl:        ["62817","62818","62819","62859","62877","62878"],
  axis:      ["62831","62832","62833","62838"],
  tri:       ["62895","62896","62897","62898","62899"],
  smartfren: ["62881","62882","62883","62884","62885","62886","62887","62888","62889"],
  byu:       ["62851"]
};

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
