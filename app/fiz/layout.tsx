import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'fiz',
};

export default function FizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}  