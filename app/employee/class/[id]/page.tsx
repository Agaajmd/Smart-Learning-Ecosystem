import EmployeeClassClient from "./client-page"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EmployeeClassPage({ params }: PageProps) {
  const { id } = await params
  return <EmployeeClassClient id={id} />
}
