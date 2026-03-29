import Image from 'next/image';

type AuthSplitLayoutProps = {
  children: React.ReactNode;
  /** Wider form column for signup with many fields */
  wideForm?: boolean;
  /** Lock to viewport height to avoid page scroll (e.g. multi-step signup) */
  fitViewport?: boolean;
};

export function AuthSplitLayout({ children, wideForm, fitViewport }: AuthSplitLayoutProps) {
  const shell = fitViewport
    ? 'flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden lg:flex-row'
    : 'flex min-h-screen flex-col lg:flex-row';

  /* Image hidden below lg — form is full width on phones */
  const imageCol = fitViewport
    ? 'hidden lg:block relative lg:h-full lg:min-h-0 lg:w-1/2'
    : 'hidden lg:block relative lg:h-auto lg:min-h-screen lg:w-1/2';

  const formCol = fitViewport
    ? 'flex min-h-0 flex-1 flex-col justify-center overflow-y-auto overscroll-contain bg-white px-5 py-5 sm:px-6 sm:py-6 lg:min-h-0 lg:w-1/2 lg:px-10 lg:py-8'
    : 'flex w-full min-h-screen flex-1 items-center justify-center bg-white px-5 py-8 sm:px-6 sm:py-10 lg:min-h-screen lg:w-1/2 lg:px-12 lg:py-16';

  const innerMax = wideForm ? 'max-w-md' : 'max-w-sm';

  return (
    <div className={shell}>
      <div className={imageCol}>
        <Image
          src="/images/login.jpg"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="(max-width: 1023px) 0px, 50vw"
        />
      </div>
      <div className={formCol}>
        <div className={`mx-auto w-full min-h-0 ${innerMax}`}>{children}</div>
      </div>
    </div>
  );
}
