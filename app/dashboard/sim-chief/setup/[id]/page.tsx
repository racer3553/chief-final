import SimSetupBuilder from '@/components/sim-chief/SimSetupBuilder'
interface Props { params: { id: string } }
export default function EditSimSetup({ params }: Props) { return <SimSetupBuilder setupId={params.id} /> }
