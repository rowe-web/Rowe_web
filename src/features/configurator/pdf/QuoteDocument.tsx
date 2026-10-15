import { readFileSync } from "node:fs";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { parseRich } from "@/lib/rich-text";
import type { Quote } from "../engine";
import { range } from "../format";
import type { ConfiguratorSettings } from "../settings";

const ASSETS = path.join(process.cwd(), "src/assets");
const font = (f: string) => path.join(ASSETS, "fonts", f);

Font.register({ family: "Inter Tight", fonts: [{ src: font("inter-tight-latin-400-normal.woff") }, { src: font("inter-tight-latin-500-normal.woff"), fontWeight: 500 }] });
Font.register({
  family: "Instrument Serif",
  fonts: [{ src: font("instrument-serif-latin-400-normal.woff") }, { src: font("instrument-serif-latin-400-italic.woff"), fontStyle: "italic" }],
});
Font.register({ family: "JetBrains Mono", src: font("jetbrains-mono-latin-400-normal.woff") });
Font.registerHyphenationCallback((w) => [w]); // sin guiones de partición

// Logo oficial leído una vez (react-pdf no siempre resuelve rutas locales en Windows)
const LOGO = { data: readFileSync(path.join(ASSETS, "brand/rowe-logo-negro.png")), format: "png" as const };

const C = { ink: "#0A0A0A", bone: "#EDEAE4", ghost: "#4A4844", line: "#cfcac2" };
const s = StyleSheet.create({
  page: { backgroundColor: C.bone, color: C.ink, padding: 48, fontFamily: "Inter Tight", fontSize: 10 },
  mono: { fontFamily: "JetBrains Mono", fontSize: 7, letterSpacing: 0.9, textTransform: "uppercase", color: C.ghost },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontFamily: "Instrument Serif", fontSize: 40, lineHeight: 0.95, marginTop: 30, marginBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.line },
  totals: { flexDirection: "row", marginTop: "auto", gap: 12 },
  total: { flex: 1, gap: 4 },
  big: { fontFamily: "Instrument Serif", fontSize: 22, lineHeight: 1 },
  note: { fontSize: 8.5, lineHeight: 1.6, color: C.ghost, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 12, marginTop: 22 },
  foot: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
});

interface Props {
  quote: Quote;
  number: string;
  date: string;
  settings: ConfiguratorSettings;
  footer: string[];
}

/** PDF del presupuesto (A4) — misma composición que la vista previa del diseño. */
export function QuoteDocument({ quote, number, date, settings, footer }: Props) {
  return (
    <Document title={`${settings.pdf.label} ${number}`} author="ROWE" subject={settings.pdf.label} language="es">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf, no es <img> */}
          <Image src={LOGO} style={{ height: 20, width: 81 }} />
          <View style={{ alignItems: "flex-end", gap: 3 }}>
            <Text style={s.mono}>{settings.pdf.label}</Text>
            <Text style={s.mono}>Nº {number}</Text>
            <Text style={s.mono}>{date}</Text>
          </View>
        </View>

        <Text style={s.title}>
          {parseRich(settings.pdf.title).map((t, i) =>
            t.type === "br" ? "\n" : <Text key={i} style={t.type === "em" ? { fontStyle: "italic" } : undefined}>{t.value}</Text>,
          )}
        </Text>

        <View style={{ borderTopWidth: 0.5, borderTopColor: C.ink }}>
          {quote.items.map((i) => (
            <View key={i.key} style={s.row}>
              <Text style={[s.mono, { width: 26 }]}>{i.track}</Text>
              <Text style={{ flex: 1, fontSize: 10.5 }}>{i.label}</Text>
              <Text style={{ fontFamily: "JetBrains Mono", fontSize: 8.5 }}>
                {range(i.min, i.max)}
                {i.monthly ? "/mes" : ""}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.total}>
            <Text style={s.mono}>Pago único</Text>
            <Text style={s.big}>{range(quote.one[0], quote.one[1])}</Text>
          </View>
          <View style={s.total}>
            <Text style={s.mono}>Mensual</Text>
            <Text style={s.big}>{quote.monthly[1] ? range(quote.monthly[0], quote.monthly[1]) : "—"}</Text>
          </View>
          <View style={s.total}>
            <Text style={s.mono}>Plazo</Text>
            <Text style={s.big}>{`${quote.weeks[0]}–${quote.weeks[1]} semanas`}</Text>
          </View>
        </View>

        <Text style={s.note}>{settings.pdf.note}</Text>
        <View style={s.foot}>
          {footer.map((f) => (
            <Text key={f} style={s.mono}>
              {f}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}
