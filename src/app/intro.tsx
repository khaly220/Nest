import { Redirect } from 'expo-router';

/** Legacy introduction URL: onboarding is now determined from the local store. */
export default function IntroduceScreen() {
  return <Redirect href="/" />;
}
