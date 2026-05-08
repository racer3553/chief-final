import SetupSheetBuilder from '@/components/race-chief/SetupSheetBuilder'
interface Props { params: { id: string } }
export default function EditSetupPage({ params }: Props) { return <SetupSheetBuilder setupId={params.id} /> }
