import { ExtracurricularsContent } from '@/components/extracurriculars/ExtracurricularsContent';
import { getProjects } from '@/lib/server-data';

export default async function ExtracurricularsPage() {
  const projects = await getProjects();
  return <ExtracurricularsContent initialProjects={projects} />;
}
