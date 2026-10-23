import { Button } from '@/components/ui/button'
import { Metadata } from 'next'
import Link from 'next/link'
import { getT } from '@/lib/i18n-server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  return { title: t('UNAUTHORIZED_TITLE') }
}

export default async function UnauthorizedPage() {
  const { t } = await getT()

  return (
    <div className='container mx-auto flex h-[calc(100vh-200px)] flex-col items-center justify-center space-y-4 px-4 text-center'>
      <h1 className='h1-bold text-4xl'>{t('UNAUTHORIZED_TITLE')}</h1>
      <p className='text-muted-foreground'>
        {t('UNAUTHORIZED_TEXT')}
      </p>
      <Button asChild>
        <Link href='/'>{t('NOT_FOUND_HOME')}</Link>
      </Button>
    </div>
  )
}
