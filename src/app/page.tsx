import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
  // Il codice sotto non verrà mai eseguito
  return null;
}
