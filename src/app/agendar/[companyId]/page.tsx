import { BookAppointmentForm } from "@/components/appointments/BookAppointmentForm";

interface PageProps {
  params: Promise<{ companyId: string }>;
}

export default async function BookAppointmentPage({ params }: Readonly<PageProps>) {
  const { companyId } = await params;
  return <BookAppointmentForm companyId={companyId} />;
}
