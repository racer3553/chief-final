// Deprecated — FFB & Hardware page removed. Vendor settings now show inside
// Steering (Simucube), Brakes (SimPro Manager), and individual vendor pages.
// Redirect any bookmark to the main dashboard.
import { redirect } from 'next/navigation'

export default function DeprecatedHardwarePage() {
  redirect('/dashboard')
}
