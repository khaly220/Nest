import { Redirect } from 'expo-router';

/** Legacy onboarding URL: send users through the automatic local setup check. */
export default function WelcomeScreen() {
  return <Redirect href="/" />;
}
