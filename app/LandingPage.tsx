import { OnboardingCarousel } from './components/onboarding/OnboardingCarousel'

// The logged-out entry screen: a swipeable onboarding carousel with persistent
// sign-in actions. Returning users can sign in from any slide; new users swipe
// through the core Onduler concepts before getting started.
export function LandingPage() {
  return <OnboardingCarousel />
}
