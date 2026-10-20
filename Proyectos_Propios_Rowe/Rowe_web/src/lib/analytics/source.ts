/** Origen legible de la visita (para «De dónde llegan» del panel). */
export function classifySource(referrer: string, host: string): string {
  if (!referrer) return "Directo";
  let h = "";
  try {
    h = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "Otros";
  }
  if (h === host.replace(/^www\./, "").split(":")[0] || h === "localhost") return "Interno";
  if (/(^|\.)instagram\.com$|^l\.instagram\.com$/.test(h)) return "Instagram";
  if (/(^|\.)google\./.test(h)) return "Google";
  if (/(^|\.)tiktok\.com$/.test(h)) return "TikTok";
  if (/(^|\.)(facebook\.com|fb\.me|l\.facebook\.com)$/.test(h)) return "Facebook";
  if (/(^|\.)(linkedin\.com|lnkd\.in)$/.test(h)) return "LinkedIn";
  if (/(^|\.)(bing\.com|duckduckgo\.com|search\.yahoo\.com|ecosia\.org)$/.test(h)) return "Buscadores";
  return "Otros";
}
