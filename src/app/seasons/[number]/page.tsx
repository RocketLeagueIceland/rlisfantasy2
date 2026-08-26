import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ number: string }>;
}

export default async function SeasonIndexPage({ params }: Props) {
  const { number } = await params;
  redirect(`/seasons/${number}/scoreboard`);
}
