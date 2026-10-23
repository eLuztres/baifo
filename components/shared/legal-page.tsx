import PageHeader from '@/components/shared/page-header';

interface LegalPageProps {
  title: string;
  /** Paragraphs split by a blank line; a paragraph starting with "## " is a heading. */
  text: string;
}

/** Privacy policy and legal notice: plain text from brand/messages, so each shop pastes in its own. */
export default function LegalPage({ title, text }: LegalPageProps) {
  const blocks = text.split(/\n\s*\n/);

  return (
    <article className='max-w-3xl space-y-8'>
      <PageHeader title={title} />
      <div className='space-y-4 text-sm leading-7 text-foreground/85 sm:text-base'>
        {blocks.map((block, index) => {
          const [firstLine, ...rest] = block.trim().split('\n');
          if (!firstLine.startsWith('## ')) {
            return <p key={index} className='whitespace-pre-line'>{block.trim()}</p>;
          }
          return (
            <section key={index} className='space-y-2 pt-2'>
              <h2 className='text-xl sm:text-2xl'>{firstLine.slice(3)}</h2>
              {rest.length > 0 && <p className='whitespace-pre-line'>{rest.join('\n')}</p>}
            </section>
          );
        })}
      </div>
    </article>
  );
}
