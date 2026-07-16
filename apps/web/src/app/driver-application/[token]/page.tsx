import { DriverApplicationWizard } from '@/components/driver-intake/DriverApplicationWizard';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function DriverApplicationPage({ params }: PageProps) {
  const { token } = await params;
  return <DriverApplicationWizard token={token} />;
}
