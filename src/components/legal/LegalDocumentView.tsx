import type { LegalDocument } from "@/lib/legal/types";

interface LegalDocumentViewProps {
  document: LegalDocument;
}

export function LegalDocumentView({ document }: LegalDocumentViewProps) {
  return (
    <article className="space-y-8">
      <header className="space-y-2 border-b border-outline-variant/50 pb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
          {document.title}
        </h1>
        <p className="text-sm text-on-surface-variant">{document.description}</p>
        <p className="text-xs text-on-surface-variant">
          {document.lastUpdated}
        </p>
      </header>

      <div className="space-y-8">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3">
            <h2 className="font-heading text-lg font-semibold text-on-surface">
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="text-sm leading-relaxed text-on-surface-variant"
              >
                {paragraph}
              </p>
            ))}
            {section.list && section.list.length > 0 && (
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-on-surface-variant">
                {section.list.map((item) => (
                  <li key={item.slice(0, 48)}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
