export default function FlagBadge({ flag }) {
  if (!flag) return <span className="flag-badge flag-gray">—</span>;
  let cls = "flag-gray";
  if (flag.includes("SUPERA 100%") || flag.includes("CRÍTICO")) cls = "flag-red";
  else if (flag.includes("MENOS DEL 20%")) cls = "flag-yellow";
  else if (flag.includes("ENTRE 20%") || flag.includes("ALTO")) cls = "flag-orange";
  else if (flag.includes("CUMPLE") || flag === "OK") cls = "flag-green";
  return <span className={`flag-badge ${cls}`}>{flag}</span>;
}
