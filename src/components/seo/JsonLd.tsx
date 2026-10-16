/** Datos estructurados (schema.org) en una etiqueta JSON-LD. «<» se escapa para que nada cierre la etiqueta. */
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
