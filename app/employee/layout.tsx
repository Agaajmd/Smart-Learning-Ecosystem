import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { mockEmployees } from "@/lib/mock-data"

export default function EmployeeLayout({ children }: { children: ReactNode }) {
	const employee = mockEmployees[0]

	return (
		<DashboardLayout role="EMPLOYEE" userName={employee.name} userAvatar={employee.avatar}>
			{children}
		</DashboardLayout>
	)
}
