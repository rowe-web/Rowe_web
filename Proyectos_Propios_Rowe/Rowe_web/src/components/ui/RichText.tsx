import { Fragment, type ElementType, type ComponentPropsWithoutRef } from "react";
import { parseRich } from "@/lib/rich-text";

type Props<T extends ElementType> = {
  as?: T;
  text: string;
} & Omit<ComponentPropsWithoutRef<T>, "children">;

/** Muestra un texto editable con *cursivas* y saltos de línea, sin interpretar HTML. */
export function RichText<T extends ElementType = "span">({ as, text, ...rest }: Props<T>) {
  const Tag = (as ?? "span") as ElementType;
  return (
    <Tag {...rest}>
      {parseRich(text).map((t, i) =>
        t.type === "br" ? <br key={i} /> : t.type === "em" ? <em key={i}>{t.value}</em> : <Fragment key={i}>{t.value}</Fragment>,
      )}
    </Tag>
  );
}
