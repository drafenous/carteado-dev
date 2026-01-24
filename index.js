function sevenSegmentify(time) {
  const digits = {
    0: [" _ ", "| |", "|_|"],
    1: ["   ", "  |", "  |"],
    2: [" _ ", " _|", "|_ "],
    3: [" _ ", " _|", " _|"],
    4: ["   ", "|_|", "  |"],
    5: [" _ ", "|_ ", " _|"],
    6: [" _ ", "|_ ", "|_|"],
    7: [" _ ", "  |", "  |"],
    8: [" _ ", "|_|", "|_|"],
    9: [" _ ", "|_|", " _|"],
  };

  const blank = ["   ", "   ", "   "];
  const separator = ["   ", " . ", " . "];

  const [hours, minutes] = time.split(":");
  const h1 = hours[0];
  const h2 = hours[1];
  const m1 = minutes[0];
  const m2 = minutes[1];

  // Left zero rule for hours.
  const char1 = h1 === "0" ? blank : digits[h1];
  const char2 = digits[h2];
  const char3 = digits[m1];
  const char4 = digits[m2];

  const line1 = char1[0] + char2[0] + separator[0] + char3[0] + char4[0];
  const line2 = char1[1] + char2[1] + separator[1] + char3[1] + char4[1];
  const line3 = char1[2] + char2[2] + separator[2] + char3[2] + char4[2];

  return `${line1}\n${line2}\n${line3}`;
}

module.exports = sevenSegmentify;
module.exports.sevenSegmentify = sevenSegmentify;
module.exports.convertTime = sevenSegmentify;
