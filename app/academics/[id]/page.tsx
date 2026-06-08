import { AssignmentDetail } from '@/components/academics/AssignmentDetail';

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentDetail id={id} />;
}
